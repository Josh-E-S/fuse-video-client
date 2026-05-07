// Local speech-to-text via Parakeet ONNX (sherpa-onnx-node).
// Loads the model lazily on first use, buffers incoming audio per-speaker
// (local/remote), decodes 3-second chunks, and pushes transcripts back to the
// renderer over IPC. Also exposes handlers to check for and download the model
// from a GitHub release on first launch.
//
// Single-caller assumption: isRunning is a module-level flag with no locking.
// useScribe owns the lifecycle in the renderer; do not call start/stop in
// parallel from multiple components.

const { ipcMain } = require("electron");
const path = require("path");
const fs = require("fs");
const https = require("https");
const http = require("http");
const { execSync } = require("child_process");
const { scoped } = require("./logger");

const log = scoped("transcription");

let sherpa = null;
let recognizer = null;
let isRunning = false;

const isDev = !require("electron").app.isPackaged;

function getModelsDir() {
  return isDev
    ? path.join(__dirname, "..", "models")
    : path.join(require("electron").app.getPath("userData"), "models");
}

// Lazy-load the model. Cheap to call repeatedly — early-returns if already
// loaded. Returns false (not throws) on missing model files or load errors so
// the renderer can show a "needs setup" state without a crash boundary.
function ensureLoaded() {
  if (recognizer) return true;

  try {
    if (isDev) {
      sherpa = require("sherpa-onnx-node");
    } else {
      // In production, sherpa-onnx lives in the unpacked standalone node_modules
      const unpackedPath = require("electron").app.getAppPath().replace("app.asar", "app.asar.unpacked");
      const sherpaPath = path.join(unpackedPath, ".next", "standalone", "node_modules", "sherpa-onnx-node");
      sherpa = require(sherpaPath);
    }
  } catch (err) {
    log.error("Failed to load sherpa-onnx-node:", err.message);
    return false;
  }

  const modelsDir = getModelsDir();
  const parakeetDir = path.join(modelsDir, "parakeet");

  if (!fs.existsSync(path.join(parakeetDir, "model.int8.onnx"))) return false;

  try {
    recognizer = new sherpa.OfflineRecognizer({
      featConfig: { sampleRate: 16000, featureDim: 80 },
      modelConfig: {
        nemoCtc: {
          model: path.join(parakeetDir, "model.int8.onnx"),
        },
        tokens: path.join(parakeetDir, "tokens.txt"),
        numThreads: 2,
        provider: "cpu",
        debug: 0,
      },
    });

    log.info("Parakeet model loaded");
    return true;
  } catch (err) {
    log.error("Failed to create recognizer:", err.message);
    recognizer = null;
    return false;
  }
}

// Per-speaker buffer state. Decode in 3-second chunks at 16 kHz (the sample
// rate the Parakeet model expects). Three seconds is the trade-off: shorter
// chunks raise CPU and break up phrases mid-word; longer chunks make captions
// feel laggy.
const DECODE_SAMPLES = 16000 * 3;

function createSpeakerBuffer() {
  return { raw: new Float32Array(DECODE_SAMPLES), offset: 0 };
}

const buffers = {
  local: createSpeakerBuffer(),
  remote: createSpeakerBuffer(),
};

function resetBuffers() {
  buffers.local = createSpeakerBuffer();
  buffers.remote = createSpeakerBuffer();
}

function registerTranscriptionHandlers() {
  ipcMain.handle("transcription:available", () => {
    return ensureLoaded();
  });

  ipcMain.handle("transcription:start", () => {
    if (!ensureLoaded()) return false;
    isRunning = true;
    resetBuffers();
    log.info("Started");
    return true;
  });

  ipcMain.handle("transcription:stop", () => {
    isRunning = false;
    const results = [];

    // Flush remaining audio from each speaker buffer. Anything under half a
    // second decodes to garbage (Parakeet needs context), so we drop those.
    for (const [speaker, buf] of Object.entries(buffers)) {
      if (buf.offset > 16000 * 0.5) {
        const text = decodeBuffer(buf.raw.subarray(0, buf.offset));
        if (text) results.push({ text, speaker });
      }
    }

    resetBuffers();
    log.info("Stopped");
    return results;
  });

  // Receive PCM audio from the renderer and append it to the per-speaker
  // buffer. A single incoming packet may span a 3-second decode boundary, so
  // the loop drains the packet — emitting one transcript per filled chunk —
  // rather than assuming one packet = one decode.
  ipcMain.on("transcription:audio", (event, samples, speaker) => {
    if (!isRunning || !recognizer) return;

    const buf = buffers[speaker] || buffers.local;
    const pcm = new Float32Array(samples);
    let pcmOffset = 0;

    while (pcmOffset < pcm.length) {
      const toCopy = Math.min(pcm.length - pcmOffset, DECODE_SAMPLES - buf.offset);
      buf.raw.set(pcm.subarray(pcmOffset, pcmOffset + toCopy), buf.offset);
      buf.offset += toCopy;
      pcmOffset += toCopy;

      if (buf.offset >= DECODE_SAMPLES) {
        const text = decodeBuffer(buf.raw);
        if (text) {
          event.sender.send("transcription:result", text, speaker);
        }
        buf.raw = new Float32Array(DECODE_SAMPLES);
        buf.offset = 0;
      }
    }
  });
}

function decodeBuffer(audioSamples) {
  try {
    const stream = recognizer.createStream();
    stream.acceptWaveform({ sampleRate: 16000, samples: audioSamples });
    recognizer.decode(stream);
    const result = recognizer.getResult(stream);
    return result.text && result.text.trim().length > 0 ? result.text.trim() : null;
  } catch (err) {
    log.error("Decode error:", err.message);
    return null;
  }
}

function modelsExist() {
  const modelsDir = getModelsDir();
  return fs.existsSync(path.join(modelsDir, "parakeet", "model.int8.onnx"));
}

function registerModelHandlers() {
  ipcMain.handle("transcription:models-status", () => {
    return { downloaded: modelsExist() };
  });

  ipcMain.handle("transcription:download-models", async (event) => {
    const REPO = "Josh-E-S/fuse-video-client";
    const TAG = "models-v1";
    const URL = `https://github.com/${REPO}/releases/download/${TAG}/parakeet-tdt-ctc-110m-int8.tar.bz2`;

    const modelsDir = getModelsDir();
    fs.mkdirSync(modelsDir, { recursive: true });
    const archivePath = path.join(modelsDir, "parakeet.tar.bz2");

    const send = (msg) => event.sender.send("transcription:download-progress", msg);

    // Best-effort cleanup of a partial archive so a retry starts clean.
    const cleanupArchive = () => {
      try { fs.unlinkSync(archivePath); } catch { /* already gone */ }
    };

    try {
      send("Connecting...");
      const res = await followRedirects(URL);
      const total = parseInt(res.headers["content-length"] || "0", 10);

      await streamToFile(res, archivePath, total, send);

      send("Extracting...");
      execSync(`tar xjf "${archivePath}" -C "${modelsDir}"`, { timeout: 60000 });
      cleanupArchive();
      send("Parakeet model ready.");
      return { success: modelsExist() };
    } catch (err) {
      cleanupArchive();
      return { success: false, error: err.message };
    }
  });
}

function followRedirects(url) {
  return new Promise((resolve, reject) => {
    const mod = url.startsWith("https") ? https : http;
    mod.get(url, { headers: { "User-Agent": "fuse-video-client" } }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        followRedirects(res.headers.location).then(resolve, reject);
      } else if (res.statusCode === 200) {
        resolve(res);
      } else {
        reject(new Error(`HTTP ${res.statusCode}`));
      }
    }).on("error", reject);
  });
}

function streamToFile(res, archivePath, total, send) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(archivePath);
    let downloaded = 0;
    let lastPct = -1;

    res.on("data", (chunk) => {
      downloaded += chunk.length;
      if (total > 0) {
        const pct = Math.round((downloaded / total) * 100);
        if (pct !== lastPct) {
          lastPct = pct;
          const mb = (downloaded / 1048576).toFixed(1);
          const totalMb = (total / 1048576).toFixed(0);
          send(`${pct}% (${mb} / ${totalMb} MB)`);
        }
      } else {
        // No content-length header — show running total so the user knows it's working.
        const mb = (downloaded / 1048576).toFixed(1);
        send(`Downloading... ${mb} MB`);
      }
    });

    res.pipe(file);
    file.on("finish", () => file.close(resolve));
    file.on("error", reject);
    res.on("error", reject);
  });
}

module.exports = { registerTranscriptionHandlers, registerModelHandlers };
