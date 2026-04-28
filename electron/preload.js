const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("electron", {
  isElectron: true,
  toggleExpand: () => ipcRenderer.invoke("toggle-expand"),
  getExpanded: () => ipcRenderer.invoke("get-expanded"),
  toggleMini: () => ipcRenderer.invoke("toggle-mini"),
  getMini: () => ipcRenderer.invoke("get-mini"),
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

  // Fired when the OS resumes from sleep or the screen unlocks.
  onPowerResume: (callback) => {
    const listener = () => callback();
    ipcRenderer.on("power:resume", listener);
    return () => ipcRenderer.removeListener("power:resume", listener);
  },
});
