// ============================================================
//  preload.js — PICasp-IDE v1.0.0
// ============================================================

const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('picasp', {
  // — IDE: XC8 y build —
  checkXC8: () => ipcRenderer.invoke('check-xc8'),
  runBuild: (params) => ipcRenderer.invoke('run-build', params),
  getTempDir: () => ipcRenderer.invoke('get-temp-dir'),

  openProject: () => ipcRenderer.invoke('open-project-dialog'),
  saveProject: (params) => ipcRenderer.invoke('save-project', params),
  saveProjectDialog: (p) => ipcRenderer.invoke('save-project-dialog', p),
  watchProject: (p) => ipcRenderer.invoke('watch-project', p),
  unwatchProject: () => ipcRenderer.invoke('unwatch-project'),

  onProjectRemoved: (cb) => ipcRenderer.on('project-removed', (_e) => cb()),
  removeProjectRemovedListeners: () => ipcRenderer.removeAllListeners('project-removed'),

  onProjectTreeChanged: (cb) => ipcRenderer.on('project-tree-changed', (_e, d) => cb(d)),
  removeProjectTreeListeners: () => ipcRenderer.removeAllListeners('project-tree-changed'),

  onProjectFileChanged: (cb) => ipcRenderer.on('project-file-changed', (_e, d) => cb(d)),
  removeProjectFileListeners: () => ipcRenderer.removeAllListeners('project-file-changed'),

  onBuildOutput: (cb) => ipcRenderer.on('build-output', (_e, d) => cb(d)),
  removeBuildListeners: () => ipcRenderer.removeAllListeners('build-output'),
  removeFlashListeners: () => ipcRenderer.removeAllListeners('flash-output'),
  removeBLListeners: () => ipcRenderer.removeAllListeners('bl-output'),
  removePortsChangedListeners: () => ipcRenderer.removeAllListeners('ports-changed'),
  checkArduinoFw: (port) => ipcRenderer.invoke('check-arduino-fw', port),
  flashArduinoFw: (port) => ipcRenderer.invoke('flash-arduino-fw', { port }),
  flashBootloader: (params) => ipcRenderer.invoke('flash-bootloader', params),
  onAvrdudeOutput: (cb) => ipcRenderer.on('avrdude-output', (_e, d) => cb(d)),
  removeAvrdudeListeners: () => ipcRenderer.removeAllListeners('avrdude-output'),
  onBlOutput: (cb) => ipcRenderer.on('bl-output', (_e, d) => cb(d)),
  removeBlListeners: () => ipcRenderer.removeAllListeners('bl-output'),

  minimize: () => ipcRenderer.send('window-minimize'),
  maximize: () => ipcRenderer.send('window-maximize'),
  close: () => ipcRenderer.send('window-close'),

  getPorts: () => ipcRenderer.invoke('get-ports'),
  openHexDialog: () => ipcRenderer.invoke('open-hex-dialog'),
  saveHexDialog: () => ipcRenderer.invoke('save-hex-dialog'),

  runFlash: (params) => ipcRenderer.invoke('run-flash', params),
  cancel: () => ipcRenderer.send('cancel-process'),

  onOutput: (callback) => {
    ipcRenderer.on('flash-output', (_event, data) => callback(data))
  },
  onPortsChanged: (callback) => {
    ipcRenderer.on('ports-changed', () => callback())
  },
  removeOutputListeners: () => {
    ipcRenderer.removeAllListeners('flash-output')
  },

  // — Sistema de proyectos —
  projectNew: (p) => ipcRenderer.invoke('project-new', p),
  projectOpen: () => ipcRenderer.invoke('project-open'),
  projectSaveConfig: (p) => ipcRenderer.invoke('project-save-config', p),
  openFolderDialog: () => ipcRenderer.invoke('open-folder-dialog'),
  showInputDialog: (p) => ipcRenderer.invoke('show-input-dialog', p),

  // — Árbol de archivos —
  fileTreeRead: (p) => ipcRenderer.invoke('file-tree-read', p),
  fileRead: (p) => ipcRenderer.invoke('file-read', p),
  fileWrite: (p) => ipcRenderer.invoke('file-write', p),
  fileCreate: (p) => ipcRenderer.invoke('file-create', p),
  fileRename: (p) => ipcRenderer.invoke('file-rename', p),
  fileDelete: (p) => ipcRenderer.invoke('file-delete', p),

  // — Serial Monitor —
  serialOpen: (p) => ipcRenderer.invoke('serial-open', p),
  serialClose: () => ipcRenderer.invoke('serial-close'),
  serialSend: (p) => ipcRenderer.invoke('serial-send', p),
  onSerialData: (cb) => ipcRenderer.on('serial-data', (_e, d) => cb(d)),
  onSerialClosed: (cb) => ipcRenderer.on('serial-closed', (_e) => cb()),
  onSerialError: (cb) => ipcRenderer.on('serial-error', (_e, d) => cb(d)),
  removeSerialListeners: () => {
    ipcRenderer.removeAllListeners('serial-data')
    ipcRenderer.removeAllListeners('serial-closed')
    ipcRenderer.removeAllListeners('serial-error')
  },

  // — Gestor de librerías —
  githubGetTags: (p) => ipcRenderer.invoke('github-get-tags', p),
  libInstall: (p) => ipcRenderer.invoke('lib-install', p),
  libRemove: (p) => ipcRenderer.invoke('lib-remove', p),

  // — Compilador XC8 —
  downloadXc8: () => ipcRenderer.invoke('download-xc8'),
  onXc8DownloadProgress: (cb) => ipcRenderer.on('xc8-download-progress', (_e, d) => cb(d)),
  removeXc8Listeners: () => ipcRenderer.removeAllListeners('xc8-download-progress'),
  openExternal: (url) => require('electron').shell.openExternal(url),
  relaunch: () => ipcRenderer.send('app-relaunch'),

})