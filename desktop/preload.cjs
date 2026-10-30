const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('desktopPet', {
  settings: () => ipcRenderer.invoke('pet:settings'),
  select: kind => ipcRenderer.invoke('pet:select', kind),
  importBackup: () => ipcRenderer.invoke('pet:import'),
  snapshot: value => ipcRenderer.invoke('pet:snapshot', value),
  popup: () => ipcRenderer.send('pet:popup'),
  menu: () => ipcRenderer.send('pet:menu'),
  drag: action => ipcRenderer.send('pet:drag', action),
  onChange: callback => { const listener = () => callback(); ipcRenderer.on('pet:changed', listener); return () => ipcRenderer.removeListener('pet:changed', listener); },
});
