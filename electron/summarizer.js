const { ipcMain } = require("electron");
const path = require("path");
const fs = require("fs");
const https = require("https");
const { execSync } = require("child_process");

let llama = null;
let _model = null;
let _modelPath = null;
let isLoading = false;
let isRunning = false;

const isDev = !require("electron").app.isPackaged;

function getModelsDir() {
  return isDev
    ? path.join(__dirname, "..", "models")
    : path.join(require("electron").app.getPath("userData"), "models");
}

function getModelPath() {
  return path.join(getModelsDir(), "qwen3-0.6b", "Qwen_Qwen3-0.6B-Q4_K_M.gguf");
}

function modelExists() {
  return fs.existsSync(getModelPath());
}

async function loadLlamaModule() {
  if (llama) return llama;
  try {
    if (isDev) {
      // node-llama-cpp@3.x is ESM-only with top-level await — must use dynamic import().
      llama = await import("node-llama-cpp");
    } else {
      const { pathToFileURL } = require("url");
      const unpackedPath = require("electron").app.getAppPath().replace("app.asar", "app.asar.unpacked");
      const llamaEntry = path.join(unpackedPath, ".next", "standalone", "node_modules", "node-llama-cpp", "dist", "index.js");
      llama = await import(pathToFileURL(llamaEntry).href);
    }
    return llama;
  } catch (err) {
    console.error("[Summarizer] Failed to load node-llama-cpp:", err.message);
    return null;
  }
}

async function ensureLoaded() {
  if (_model && _modelPath === getModelPath() && modelExists()) return _model;

  if (!modelExists()) {
    console.error("[Summarizer] Model file missing at", getModelPath());
    return null;
  }

  if (isLoading) {
    while (isLoading) await new Promise((r) => setTimeout(r, 100));
    return _model;
  }

  isLoading = true;
  try {
    const mod = await loadLlamaModule();
    if (!mod) return null;

    const llamaInstance = await mod.getLlama();
    _model = await llamaInstance.loadModel({ modelPath: getModelPath() });
    _modelPath = getModelPath();
    console.log("[Summarizer] Qwen3-0.6B loaded");
    return _model;
  } catch (err) {
    console.error("[Summarizer] Failed to load model:", err.message);
    _model = null;
    return null;
  } finally {
    isLoading = false;
  }
}

function registerSummarizerHandlers() {
  ipcMain.handle("summarize:models-status", () => ({ downloaded: modelExists() }));

  ipcMain.handle("summarize:available", async () => {
    if (!modelExists()) return false;
    // Don't load the model here — just confirm the file exists and the runtime
    // module can be located. The actual load happens on the first summarize:run.
    const mod = await loadLlamaModule();
    return Boolean(mod);
  });

  ipcMain.handle("summarize:run", async (event, prompt) => {
    if (typeof prompt !== "string" || prompt.trim().length === 0) {
      return { ok: false, error: "Empty prompt" };
    }

    if (isRunning) {
      return { ok: false, error: "A summary is already running." };
    }

    const model = await ensureLoaded();
    if (!model) {
      if (!modelExists()) {
        return { ok: false, error: "Summary model file missing. Re-download from Settings." };
      }
      if (!llama) {
        return { ok: false, error: "Summary engine not available. Try reinstalling the app." };
      }
      return { ok: false, error: "Couldn't load the summary model. Try restarting the app." };
    }

    isRunning = true;

    const startedAt = Date.now();
    let tokenCount = 0;
    let lastEmit = 0;
    const EMIT_EVERY_MS = 250;

    let ctx;
    try {
      ctx = await model.createContext({ contextSize: 4096 });
      const session = new llama.LlamaChatSession({ contextSequence: ctx.getSequence() });

      let raw = "";
      await session.prompt(prompt, {
        onTextChunk: (chunk) => {
          raw += chunk;
          tokenCount += 1;
          const now = Date.now();
          if (now - lastEmit >= EMIT_EVERY_MS) {
            lastEmit = now;
            event.sender.send("summarize:progress", { tokenCount, elapsedMs: now - startedAt });
          }
        },
      });

      const cleaned = raw.replace(/<think>[\s\S]*?<\/think>/g, "").trim();
      if (cleaned.length === 0) {
        return { ok: false, error: "Summary came back empty. Try again." };
      }

      return {
        ok: true,
        markdown: cleaned,
        tokenCount,
        elapsedMs: Date.now() - startedAt,
      };
    } catch (err) {
      console.error("[Summarizer] Inference error:", err);
      return { ok: false, error: "Summary failed partway through. Try again." };
    } finally {
      try {
        await ctx?.dispose?.();
      } catch {}
      isRunning = false;
    }
  });
}

function registerSummarizerModelHandlers() {
  ipcMain.handle("summarize:download-models", (event) => {
    const REPO = "Josh-E-S/fuse-video-client";
    const TAG = "models-v2";
    const URL = `https://github.com/${REPO}/releases/download/${TAG}/qwen3-0.6b-instruct-q4km.tar.bz2`;

    const modelsDir = getModelsDir();
    fs.mkdirSync(modelsDir, { recursive: true });
    const archivePath = path.join(modelsDir, "qwen3-0.6b-instruct-q4km.tar.bz2");

    function send(msg) {
      event.sender.send("summarize:download-progress", msg);
    }

    function followRedirects(url) {
      return new Promise((resolve, reject) => {
        const mod = url.startsWith("https") ? https : require("http");
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

    return new Promise(async (resolve) => {
      try {
        send("Connecting...");
        const res = await followRedirects(URL);
        const total = parseInt(res.headers["content-length"] || "0", 10);
        let downloaded = 0;
        let lastPct = -1;

        const file = fs.createWriteStream(archivePath);

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
          }
        });

        res.pipe(file);

        file.on("finish", () => {
          file.close();
          try {
            send("Extracting...");
            execSync(`tar xjf "${archivePath}" -C "${modelsDir}"`, { timeout: 120000 });
            fs.unlinkSync(archivePath);
            send("Summary model ready.");
            resolve({ success: modelExists() });
          } catch (err) {
            resolve({ success: false, error: `Extract failed: ${err.message}` });
          }
        });

        file.on("error", (err) => resolve({ success: false, error: err.message }));
        res.on("error", (err) => resolve({ success: false, error: err.message }));
      } catch (err) {
        resolve({ success: false, error: err.message });
      }
    });
  });
}

module.exports = { registerSummarizerHandlers, registerSummarizerModelHandlers };
