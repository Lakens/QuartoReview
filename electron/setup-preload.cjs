const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('setup', {
  save: (token) => ipcRenderer.send('setup-save', token),
  openGitHub: () => ipcRenderer.send('setup-open-github'),
});
