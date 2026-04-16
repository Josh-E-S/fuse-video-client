const { ipcMain } = require("electron");
const path = require("path");
const fs = require("fs");

let sherpa = null;
let recognizer = null;
let isRunning = false;

const isDev = !require("electron").app.isPackaged;

function getModelsDir() {
  return isDev
    ? path.join(__dirname, "..", "models")
    : path.join(process.resourcesPath, "models");
}

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
    console.error("[Transcription] Failed to load sherpa-onnx-node:", err.message);
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

    console.log("[Transcription] Parakeet model loaded");
    return true;
  } catch (err) {
    console.error("[Transcription] Failed to create recognizer:", err.message);
    recognizer = null;
    return false;
  }
}

// Per-speaker buffer state
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
    console.log("[Transcription] Started");
    return true;
  });

  ipcMain.handle("transcription:stop", () => {
    isRunning = false;
    const results = [];

    // Flush remaining audio from each speaker buffer
    for (const [speaker, buf] of Object.entries(buffers)) {
      if (buf.offset > 16000 * 0.5) {
        const text = decodeBuffer(buf.raw.subarray(0, buf.offset));
        if (text) results.push({ text, speaker });
      }
    }

    resetBuffers();
    console.log("[Transcription] Stopped");
    return results;
  });

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
          console.log(`[Transcription] [${speaker}] "${text}"`);
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
    console.error("[Transcription] Decode error:", err.message);
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

  ipcMain.handle("transcription:download-models", (event) => {
    return new Promise((resolve) => {
      const scriptPath = isDev
        ? path.join(__dirname, "..", "scripts", "download-models.sh")
        : path.join(process.resourcesPath, "scripts", "download-models.sh");

      if (!fs.existsSync(scriptPath)) {
        resolve({ success: false, error: "Download script not found" });
        return;
      }

      const modelsDir = getModelsDir();
      fs.mkdirSync(modelsDir, { recursive: true });

      const { spawn } = require("child_process");
      const child = spawn("bash", [scriptPath], {
        cwd: isDev ? path.join(__dirname, "..") : process.resourcesPath,
        env: { ...process.env },
      });

      let output = "";

      child.stdout.on("data", (data) => {
        const line = data.toString().trim();
        output += line + "\n";
        event.sender.send("transcription:download-progress", line);
      });

      child.stderr.on("data", (data) => {
        output += data.toString();
      });

      child.on("close", (code) => {
        if (code === 0 && modelsExist()) {
          resolve({ success: true });
        } else {
          resolve({ success: false, error: output.slice(-500) });
        }
      });

      child.on("error", (err) => {
        resolve({ success: false, error: err.message });
      });
    });
  });
}

module.exports = { registerTranscriptionHandlers, registerModelHandlers };
