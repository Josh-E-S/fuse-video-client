// Local meeting summarizer. Runs the Qwen3-0.6B GGUF model in an Electron
// utility process via node-llama-cpp so the heavy generation work doesn't
// stall the main process. Single worker, lazily spawned on first run, kept
// alive for the app lifetime so the model only loads once.
//
// Flow:
//   renderer --summarize:run--> main (this file) --postMessage--> worker
//                                          ↑                          |
//                                          └── progress/result ───────┘
//
// Never log the prompt or generated markdown — they contain meeting content.

const { ipcMain, utilityProcess, app } = require("electron");
const path = require("path");
const fs = require("fs");
const https = require("https");
const http = require("http");
const { execSync } = require("child_process");
const { scoped } = require("./logger");

const log = scoped("summarizer");

const isDev = !app.isPackaged;

// Concurrent-run guard — kept in main so the IPC handler can short-circuit
// before forwarding to the worker.
let isRunning = false;

// Lazily-spawned utility process that owns the model. We keep a single worker
// for the lifetime of the app so the model only loads once.
let worker = null;
// Tracks in-flight runs so the worker's runId-tagged messages (progress/result)
// can route back to the right renderer caller. Cleared on result or worker exit.
const pending = new Map(); // runId -> { resolve, sender }
let nextRunId = 1;

function getModelsDir() {
  return isDev
    ? path.join(__dirname, "..", "models")
    : path.join(app.getPath("userData"), "models");
}

function getModelPath() {
  return path.join(getModelsDir(), "qwen3-0.6b", "Qwen_Qwen3-0.6B-Q4_K_M.gguf");
}

function modelExists() {
  return fs.existsSync(getModelPath());
}

function getWorkerPath() {
  if (isDev) {
    return path.join(__dirname, "summarizer-worker.js");
  }
  // In a packaged build the worker is unpacked from asar via the asarUnpack
  // entry in package.json, so utilityProcess.fork can resolve it on disk.
  return path.join(
    app.getAppPath().replace("app.asar", "app.asar.unpacked"),
    "electron",
    "summarizer-worker.js",
  );
}

function spawnWorker() {
  const w = utilityProcess.fork(getWorkerPath(), [], { stdio: "inherit" });

  w.on("message", (msg) => {
    if (!msg || typeof msg !== "object") return;

    if (msg.type === "log") {
      const fn = msg.level === "error" ? log.error : log.info;
      fn(msg.message);
      return;
    }

    if (msg.type === "progress") {
      const entry = pending.get(msg.runId);
      if (entry && entry.sender && !entry.sender.isDestroyed()) {
        entry.sender.send("summarize:progress", {
          tokenCount: msg.tokenCount,
          elapsedMs: msg.elapsedMs,
        });
      }
      return;
    }

    if (msg.type === "result") {
      const entry = pending.get(msg.runId);
      pending.delete(msg.runId);
      if (entry) {
        if (msg.ok) {
          entry.resolve({
            ok: true,
            markdown: msg.markdown,
            tokenCount: msg.tokenCount,
            elapsedMs: msg.elapsedMs,
          });
        } else {
          entry.resolve({ ok: false, error: msg.error });
        }
      }
    }
  });

  w.on("exit", (code) => {
    log.info(`Worker exited with code ${code}`);
    // Resolve any in-flight runs with an error so the renderer doesn't hang.
    for (const [, entry] of pending) {
      entry.resolve({ ok: false, error: "Summary worker exited unexpectedly. Try again." });
    }
    pending.clear();
    if (worker === w) worker = null;
  });

  return w;
}

function getOrSpawnWorker() {
  if (!worker) worker = spawnWorker();
  return worker;
}

function registerSummarizerHandlers() {
  ipcMain.handle("summarize:models-status", () => ({ downloaded: modelExists() }));

  // Cheap availability check — only confirms the model file is on disk.
  // Loading the model (and even forking the worker) is deferred until the
  // first summarize:run call.
  ipcMain.handle("summarize:available", () => modelExists());

  ipcMain.handle("summarize:run", async (event, prompt) => {
    if (typeof prompt !== "string" || prompt.trim().length === 0) {
      return { ok: false, error: "Empty prompt" };
    }

    if (isRunning) {
      return { ok: false, error: "A summary is already running." };
    }

    if (!modelExists()) {
      return { ok: false, error: "Summary model file missing. Re-download from Settings." };
    }

    isRunning = true;
    const runId = String(nextRunId++);

    return new Promise((resolve) => {
      pending.set(runId, {
        resolve: (result) => {
          isRunning = false;
          resolve(result);
        },
        sender: event.sender,
      });

      try {
        getOrSpawnWorker().postMessage({
          type: "run",
          runId,
          prompt,
          modelPath: getModelPath(),
        });
      } catch (err) {
        log.error("Failed to dispatch to worker:", err);
        pending.delete(runId);
        isRunning = false;
        resolve({ ok: false, error: "Couldn't start summary worker. Try again." });
      }
    });
  });
}

function registerSummarizerModelHandlers() {
  ipcMain.handle("summarize:download-models", async (event) => {
    const REPO = "Josh-E-S/fuse-video-client";
    const TAG = "models-v2";
    const URL = `https://github.com/${REPO}/releases/download/${TAG}/qwen3-0.6b-instruct-q4km.tar.bz2`;

    const modelsDir = getModelsDir();
    fs.mkdirSync(modelsDir, { recursive: true });
    const archivePath = path.join(modelsDir, "qwen3-0.6b-instruct-q4km.tar.bz2");

    const send = (msg) => event.sender.send("summarize:download-progress", msg);

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
      // Larger timeout than transcription model — 400 MB GGUF takes longer to extract.
      execSync(`tar xjf "${archivePath}" -C "${modelsDir}"`, { timeout: 120000 });
      cleanupArchive();
      send("Summary model ready.");
      return { success: modelExists() };
    } catch (err) {
      cleanupArchive();
      return { success: false, error: err.message };
    }
  });
}

function followRedirects(url) {
  return new Promise((resolve, reject) => {
    const mod = url.startsWith("https") ? https : http;
    mod
      .get(url, { headers: { "User-Agent": "fuse-video-client" } }, (res) => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          followRedirects(res.headers.location).then(resolve, reject);
        } else if (res.statusCode === 200) {
          resolve(res);
        } else {
          reject(new Error(`HTTP ${res.statusCode}`));
        }
      })
      .on("error", reject);
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

// Make sure we don't leak a llama.cpp child process across app restarts.
app.on("before-quit", () => {
  if (worker) {
    try {
      worker.postMessage({ type: "shutdown" });
    } catch {}
    worker = null;
  }
});

module.exports = { registerSummarizerHandlers, registerSummarizerModelHandlers };
