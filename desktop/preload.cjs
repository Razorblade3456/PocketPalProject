const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('desktopPet', {
  settings: () => ipcRenderer.invoke('pet:settings'),
  syncStatus: () => ipcRenderer.invoke('pet:sync-status'),
  beginPairing: () => ipcRenderer.invoke('pet:pair-begin'),
  forgetPairing: () => ipcRenderer.invoke('pet:pair-forget'),
  select: kind => ipcRenderer.invoke('pet:select', kind),
  importBackup: () => ipcRenderer.invoke('pet:import'),
  snapshot: value => ipcRenderer.invoke('pet:snapshot', value),
  popup: () => ipcRenderer.send('pet:popup'),
  menu: () => ipcRenderer.send('pet:menu'),
  close: () => ipcRenderer.send('pet:close'),
  timerVisible: visible => ipcRenderer.send('pet:timer-visible', visible),
  drag: action => ipcRenderer.send('pet:drag', action),
  onChange: callback => { const listener = () => callback(); ipcRenderer.on('pet:changed', listener); return () => ipcRenderer.removeListener('pet:changed', listener); },
});
