// Summarizer worker — runs llama.cpp inference in an Electron utilityProcess
// so the main thread (and therefore the UI) stays responsive during summary
// generation. The parent (electron/summarizer.js) forks this script lazily on
// the first summarize:run call.
//
// Message protocol (parent <-> worker):
//   parent -> worker:
//     { type: 'run', runId, prompt, modelPath }
//     { type: 'shutdown' }
//   worker -> parent:
//     { type: 'log', level, message }
//     { type: 'progress', runId, tokenCount, elapsedMs }
//     { type: 'result', runId, ok: true, markdown, tokenCount, elapsedMs }
//     { type: 'result', runId, ok: false, error }

const path = require("path");
const fs = require("fs");

let llama = null;
let _model = null;
let _modelPath = null;
let isLoading = false;

function log(level, message) {
  try {
    process.parentPort.postMessage({ type: "log", level, message });
  } catch {
    // parentPort may not be writable during shutdown — swallow.
  }
}

// Load the llama.cpp bindings. Two paths because node's resolver looks up from
// the worker's own location: in dev the standard import works, but in a
// packaged build the worker sits at app.asar.unpacked/electron/ which can't
// see node-llama-cpp from there. The fallback walks into the unpacked
// standalone bundle and imports the entry file directly.
async function loadLlamaModule() {
  if (llama) return llama;
  try {
    llama = await import("node-llama-cpp").catch(async () => {
      const { pathToFileURL } = require("url");
      // From <unpacked>/electron/ go up one level into <unpacked>/.next/standalone/...
      const llamaEntry = path.resolve(
        __dirname,
        "..",
        ".next",
        "standalone",
        "node_modules",
        "node-llama-cpp",
        "dist",
        "index.js",
      );
      return await import(pathToFileURL(llamaEntry).href);
    });
    return llama;
  } catch (err) {
    log("error", `Failed to load node-llama-cpp: ${err && err.message ? err.message : String(err)}`);
    return null;
  }
}

async function ensureLoaded(modelPath) {
  if (_model && _modelPath === modelPath && fs.existsSync(modelPath)) return _model;

  if (!fs.existsSync(modelPath)) {
    log("error", `Model file missing at ${modelPath}`);
    return null;
  }

  // Single-caller assumption holds via the parent's isRunning guard, so the
  // poll-loop is a defense-in-depth against the model load racing itself.
  if (isLoading) {
    while (isLoading) await new Promise((r) => setTimeout(r, 100));
    return _model;
  }

  isLoading = true;
  try {
    const mod = await loadLlamaModule();
    if (!mod) return null;

    const llamaInstance = await mod.getLlama();
    _model = await llamaInstance.loadModel({ modelPath });
    _modelPath = modelPath;
    log("info", "Qwen3-0.6B loaded");
    return _model;
  } catch (err) {
    log("error", `Failed to load model: ${err && err.message ? err.message : String(err)}`);
    _model = null;
    return null;
  } finally {
    isLoading = false;
  }
}

function send(msg) {
  try {
    process.parentPort.postMessage(msg);
  } catch {
    // If the parent has gone away there's nothing we can do.
  }
}

async function handleRun({ runId, prompt, modelPath }) {
  if (typeof prompt !== "string" || prompt.trim().length === 0) {
    send({ type: "result", runId, ok: false, error: "Empty prompt" });
    return;
  }

  const model = await ensureLoaded(modelPath);
  if (!model) {
    if (!fs.existsSync(modelPath)) {
      send({ type: "result", runId, ok: false, error: "Summary model file missing. Re-download from Settings." });
      return;
    }
    if (!llama) {
      send({ type: "result", runId, ok: false, error: "Summary engine not available. Try reinstalling the app." });
      return;
    }
    send({ type: "result", runId, ok: false, error: "Couldn't load the summary model. Try restarting the app." });
    return;
  }

  const startedAt = Date.now();
  let tokenCount = 0;
  let lastEmit = 0;
  const EMIT_EVERY_MS = 250;

  let ctx = null;
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
          send({
            type: "progress",
            runId,
            tokenCount,
            elapsedMs: now - startedAt,
          });
        }
      },
    });

    const cleaned = raw.replace(/<think>[\s\S]*?<\/think>/g, "").trim();
    if (cleaned.length === 0) {
      send({ type: "result", runId, ok: false, error: "Summary came back empty. Try again." });
      return;
    }

    send({
      type: "result",
      runId,
      ok: true,
      markdown: cleaned,
      tokenCount,
      elapsedMs: Date.now() - startedAt,
    });
  } catch (err) {
    log("error", `Inference error: ${err && err.message ? err.message : String(err)}`);
    send({ type: "result", runId, ok: false, error: "Summary failed partway through. Try again." });
  } finally {
    try {
      await ctx?.dispose?.();
    } catch {}
  }
}

process.parentPort.on("message", async (event) => {
  const msg = event && event.data;
  if (!msg || typeof msg !== "object") return;
  if (msg.type === "run") {
    await handleRun(msg);
  } else if (msg.type === "shutdown") {
    process.exit(0);
  }
});
