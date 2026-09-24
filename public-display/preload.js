const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
    getTTSAudio: (text, voice) => ipcRenderer.invoke('get-tts-audio', { text, voice }),
    
    // Auto-update hodisalari va amallari
    onUpdateAvailable: (callback) => ipcRenderer.on('update-available', (event, data) => callback(data)),
    onUpdateProgress: (callback) => ipcRenderer.on('update-progress', (event, data) => callback(data)),
    onUpdateDownloaded: (callback) => ipcRenderer.on('update-downloaded', (event, data) => callback(data)),
    onUpdateError: (callback) => ipcRenderer.on('update-error', (event, data) => callback(data)),
    
    startDownloadUpdate: () => ipcRenderer.invoke('start-download-update'),
    installUpdate: () => ipcRenderer.invoke('install-update'),
    getAppVersion: () => ipcRenderer.invoke('get-app-version')
});
