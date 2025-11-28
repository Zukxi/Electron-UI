import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

const api = {
  minimize: () => ipcRenderer.send('minimize-window'),
  maximize: () => ipcRenderer.send('maximize-window'),
  close: () => ipcRenderer.send('close-window'),
  openFile: () => ipcRenderer.invoke('dialog:openFile'),
  fetchScripts: (mode, query, page) => ipcRenderer.invoke('api:fetchScripts', { mode, query, page }),
  // --- NEW FUNCTION ---
  setTopMost: (isTop) => ipcRenderer.send('set-top-most', isTop)
}

if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('api', api)
  } catch (error) {
    console.error(error)
  }
} else {
  window.electron = electronAPI
  window.api = api
}