const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("electron", {
  isElectron: true,
  toggleExpand: () => ipcRenderer.invoke("toggle-expand"),
  getExpanded: () => ipcRenderer.invoke("get-expanded"),
  toggleMini: () => ipcRenderer.invoke("toggle-mini"),
  getMini: () => ipcRenderer.invoke("get-mini"),
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
});
