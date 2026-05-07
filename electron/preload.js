// Security bridge between the Electron main process and the React renderer.
// Each method here is the entire surface the UI can call via IPC — anything
// not listed is unreachable from the renderer.
//
// Channel names are hardcoded per-method (no dynamic channel argument), so a
// compromised renderer can't talk to handlers we didn't intend to expose.
// Subscriptions return an unsubscribe function — callers must invoke it
// (e.g. in a useEffect cleanup) or the listener leaks.
//
// TS mirror of this surface lives in src/hooks/useElectron.ts (ElectronBridge).

const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("electron", {
  isElectron: true,

  // Window mode controls — handled by registerWindowIpc() in main.js.
  toggleExpand: () => ipcRenderer.invoke("toggle-expand"),
  getExpanded: () => ipcRenderer.invoke("get-expanded"),
  toggleMini: () => ipcRenderer.invoke("toggle-mini"),
  getMini: () => ipcRenderer.invoke("get-mini"),
  toggleSidebar: () => ipcRenderer.invoke("toggle-sidebar"),
  getSidebar: () => ipcRenderer.invoke("get-sidebar"),
  promoteFromSidebar: () => ipcRenderer.invoke("promote-from-sidebar"),
  restoreSidebar: () => ipcRenderer.invoke("restore-sidebar"),
  resizeToState: (state) => ipcRenderer.invoke("resize-to-state", state),
  adjustWidth: (delta) => ipcRenderer.invoke("adjust-width", delta),

  // Local transcription
  transcriptionAvailable: () => ipcRenderer.invoke("transcription:available"),
  transcriptionStart: () => ipcRenderer.invoke("transcription:start"),
  transcriptionStop: () => ipcRenderer.invoke("transcription:stop"),
  transcriptionSendAudio: (samples, speaker) => {
    ipcRenderer.send("transcription:audio", samples.buffer, speaker || "local");
  },
  onTranscriptionResult: (callback) => {
    const listener = (_event, text, speaker) => callback(text, speaker);
    ipcRenderer.on("transcription:result", listener);
    return () => ipcRenderer.removeListener("transcription:result", listener);
  },

  // Model management
  modelsStatus: () => ipcRenderer.invoke("transcription:models-status"),
  downloadModels: () => ipcRenderer.invoke("transcription:download-models"),
  onDownloadProgress: (callback) => {
    const listener = (_event, line) => callback(line);
    ipcRenderer.on("transcription:download-progress", listener);
    return () => ipcRenderer.removeListener("transcription:download-progress", listener);
  },

  // Local summarization
  summarizeAvailable: () => ipcRenderer.invoke("summarize:available"),
  summarizeRun: (prompt) => ipcRenderer.invoke("summarize:run", prompt),
  summarizeModelStatus: () => ipcRenderer.invoke("summarize:models-status"),
  summarizeDownloadModel: () => ipcRenderer.invoke("summarize:download-models"),
  onSummarizeProgress: (callback) => {
    const listener = (_event, payload) => callback(payload);
    ipcRenderer.on("summarize:progress", listener);
    return () => ipcRenderer.removeListener("summarize:progress", listener);
  },
  onSummarizeDownloadProgress: (callback) => {
    const listener = (_event, line) => callback(line);
    ipcRenderer.on("summarize:download-progress", listener);
    return () => ipcRenderer.removeListener("summarize:download-progress", listener);
  },

  // Fired when the OS resumes from sleep or the screen unlocks.
  onPowerResume: (callback) => {
    const listener = () => callback();
    ipcRenderer.on("power:resume", listener);
    return () => ipcRenderer.removeListener("power:resume", listener);
  },
});
