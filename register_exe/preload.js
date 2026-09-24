const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  getPrinters: () => ipcRenderer.invoke('get-printers'),
  getSavedPrinter: () => ipcRenderer.invoke('get-saved-printer'),
  saveSelectedPrinter: (printerName) => ipcRenderer.invoke('save-selected-printer', printerName),
  printTicket: (html, options) => ipcRenderer.invoke('print-ticket', html, options),
  onShowPrinterModal: (callback) => ipcRenderer.on('show-printer-modal', callback),
  onRefreshData: (callback) => ipcRenderer.on('refresh-data', callback),
  onReprintTicket: (callback) => ipcRenderer.on('reprint-ticket', callback),
  onRestartApp: (callback) => ipcRenderer.on('restart-app', callback),
  logToFile: (message, level) => ipcRenderer.invoke('log-to-file', message, level),

  // Auto-updater hodisalari va amallari
  onUpdateAvailable: (callback) => ipcRenderer.on('update-available', (event, data) => callback(data)),
  onUpdateProgress: (callback) => ipcRenderer.on('update-progress', (event, data) => callback(data)),
  onUpdateDownloaded: (callback) => ipcRenderer.on('update-downloaded', (event, data) => callback(data)),
  onUpdateError: (callback) => ipcRenderer.on('update-error', (event, data) => callback(data)),
  startDownloadUpdate: () => ipcRenderer.invoke('start-download-update'),
  installUpdate: () => ipcRenderer.invoke('install-update'),
  getAppVersion: () => ipcRenderer.invoke('get-app-version'),
});