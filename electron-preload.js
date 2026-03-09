const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("electronAPI", {
  zyphra: {
    setDraft: (args) => ipcRenderer.invoke("zyphra:setDraft", args),
    submit: (args) => ipcRenderer.invoke("zyphra:submit", args),
    send: (args) => ipcRenderer.invoke("zyphra:send", args),
  },
  dialog: {
    openFile: (args) => ipcRenderer.invoke("dialog:openFile", args),
  },
  fs: {
    readFile: (args) => ipcRenderer.invoke("fs:readFile", args),
    readPdfText: (args) => ipcRenderer.invoke("fs:readPdfText", args),
  },
  agent: {
    onTimeline: (cb) => {
      const handler = (_evt, payload) => cb(payload);
      ipcRenderer.on("agent:timeline", handler);
      return () => ipcRenderer.off("agent:timeline", handler);
    },
  },
});

