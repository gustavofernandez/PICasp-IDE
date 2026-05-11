// ============================================================
//  main.js — PICasp-IDE v1.0.0
// ============================================================

const { app, BrowserWindow, ipcMain, dialog } = require('electron')
const path = require('path')
const { spawn, execSync } = require('child_process')
const os = require('os')
const { SerialPort } = require('serialport')
const fs = require('fs')
const { ReadlineParser } = require('@serialport/parser-readline')

// ── Rutas de binarios compilados ─────────────
const IS_WIN = process.platform === 'win32'

function resolvePythonTool(name) {
  const base    = app.isPackaged ? process.resourcesPath : __dirname
  const pyPath  = path.join(base, 'python', `${name}.py`)
  const binName = IS_WIN ? `${name}.exe` : name
  const binPath = path.join(base, 'python', binName)

  if (fs.existsSync(pyPath)) {
    const python = _findSystemPython()
    if (!python) return { executable: null, args: [], found: false, mode: 'script' }
    return { executable: python, args: [pyPath], found: true, mode: 'script' }
  }

  if (fs.existsSync(binPath)) {
    return { executable: binPath, args: [], found: true, mode: 'binary' }
  }

  return { executable: null, args: [], found: false, mode: null }
}

function _findSystemPython() {
  const bundled = app.isPackaged
    ? path.join(process.resourcesPath, 'python', 'python.exe')
    : path.join(__dirname, 'python', 'python.exe')
  if (fs.existsSync(bundled)) return bundled

  const candidates = ['python', 'python3', 'py']
  for (const cmd of candidates) {
    try {
      execSync(`${cmd} --version`, { stdio: 'ignore' })
      return cmd
    } catch (_) { }
  }
  return null
}

// Mantener compatibilidad con el handler check-python
function getPythonExecutable() {
  return _findSystemPython()
}

// ── Ventana principal ─────────────────────────────────────────
let mainWindow

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 720,
    minWidth: 1280,
    minHeight: 720,
    frame: false,
    backgroundColor: '#1a1a2e',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
    icon: app.isPackaged
      ? path.join(process.resourcesPath, 'assets', 'icon.ico')
      : path.join(__dirname, 'assets', 'icon.ico'),
  })
  mainWindow.loadFile(path.join(__dirname, 'renderer', 'index.html'))
  mainWindow.maximize()
}

// ── Polling de puertos ────────────────────────────────────────
let lastPortList = []
let portPoller = null

function startPortPolling() {
  portPoller = setInterval(async () => {
    try {
      const ports = await SerialPort.list()
      const current = ports
        .filter(p => p.path.startsWith('COM') || p.path.startsWith('/dev/'))
        .map(p => `${p.path}:${(p.vendorId || '').toLowerCase()}`)
        .sort().join(',')
      const previous = [...lastPortList].sort().join(',')

      if (current !== previous) {
        lastPortList = ports
          .filter(p => p.path.startsWith('COM') || p.path.startsWith('/dev/'))
          .map(p => `${p.path}:${(p.vendorId || '').toLowerCase()}`)
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.webContents.send('ports-changed')
        }
      }
    } catch (_) { }
  }, 5000)
}

function stopPortPolling() {
  if (portPoller) { clearInterval(portPoller); portPoller = null }
}

app.whenReady().then(() => {
  createWindow()
  startPortPolling()
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  stopPortPolling()
  if (process.platform !== 'darwin') app.quit()
})

// ── Helper: escapado HTML seguro ─────────────────────────────
function escapeHtml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

// ── Constantes de detección de puertos (nivel módulo) ─────────
const ARDUINO_VIDS = ['2341', '2a03', '1a86', '0403']

// ── IPC — Ventana ─────────────────────────────────────────────
ipcMain.on('window-minimize', () => {
  if (mainWindow && !mainWindow.isDestroyed()) mainWindow.minimize()
})
ipcMain.on('window-maximize', () => {
  if (!mainWindow || mainWindow.isDestroyed()) return
  mainWindow.isMaximized() ? mainWindow.unmaximize() : mainWindow.maximize()
})
ipcMain.on('window-close', () => {
  if (mainWindow && !mainWindow.isDestroyed()) mainWindow.close()
})

ipcMain.on('app-relaunch', () => {
  app.relaunch()
  app.exit(0)
})

// ── IPC — Puertos ─────────────────────────────────────────────
ipcMain.handle('get-ports', async () => {
  try {
    const ports = await SerialPort.list()
    const result = ports
      .filter(p => p.path.startsWith('COM') || p.path.startsWith('/dev/'))
      .map(p => {
        const vid = (p.vendorId || '').toLowerCase()
        const desc = (p.manufacturer || p.friendlyName || p.pnpId || '').toLowerCase()

        const isArduino = ARDUINO_VIDS.includes(vid) ||
          desc.includes('arduino') ||
          desc.includes('nano')

        const BOARD_VIDS = ['10c4', '067b', '04d8']  
        const isBoard = !isArduino && BOARD_VIDS.includes(vid)

        return {
          path: p.path,
          description: p.manufacturer || p.friendlyName || p.path,
          vendorId: p.vendorId || '',
          productId: p.productId || '',
          arduino: isArduino,
          board: isBoard,
          adapterType: isBoard ? 'USB-Serial' : 'Arduino',  
        }
      })
    return result
  } catch (e) {
    return []
  }
})

// ── IPC — Diálogos ────────────────────────────────────────────
ipcMain.handle('open-hex-dialog', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    title: 'Seleccionar archivo HEX',
    filters: [{ name: 'Intel HEX', extensions: ['hex'] }, { name: 'Todos', extensions: ['*'] }],
    properties: ['openFile'],
  })
  return result.canceled ? null : result.filePaths[0]
})

ipcMain.handle('save-hex-dialog', async () => {
  const result = await dialog.showSaveDialog(mainWindow, {
    title: 'Guardar como...',
    defaultPath: 'dump.hex',
    filters: [{ name: 'Intel HEX', extensions: ['hex'] }],
  })
  return result.canceled ? null : result.filePath
})

ipcMain.handle('open-folder-dialog', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    title: 'Elegir carpeta para el nuevo proyecto',
    properties: ['openDirectory', 'createDirectory'],
  })
  return result.canceled ? null : result.filePaths[0]
})

// ── IPC ────────
ipcMain.handle('show-input-dialog', async (_, { title, label, defaultValue }) => {
  return new Promise(resolve => {
    const win = new BrowserWindow({
      width: 420,
      height: 160,
      parent: mainWindow,
      modal: true,
      frame: false,
      resizable: false,
      backgroundColor: '#16213e',
      webPreferences: {
        nodeIntegration: true,
        contextIsolation: false,
      },
    })

    const safeLabel = escapeHtml(label)
    const safeDefaultValue = escapeHtml(defaultValue)
    const safeTitle = escapeHtml(title)

    const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    font-family: 'Segoe UI', system-ui, sans-serif;
    background:  #16213e;
    color:       #e2e8f0;
    padding:     18px 20px 16px;
    display:     flex;
    flex-direction: column;
    gap:         10px;
    height:      100vh;
    user-select: none;
  }
  .titlebar {
    font-size:   12px;
    font-weight: 600;
    color:       #94a3b8;
    margin-bottom: 2px;
    letter-spacing: 0.3px;
  }
  label {
    font-size: 12px;
    color:     #94a3b8;
  }
  input {
    width:        100%;
    padding:      6px 10px;
    background:   #0d1b2a;
    border:       1px solid #2d3748;
    border-radius: 4px;
    color:        #e2e8f0;
    font-size:    13px;
    outline:      none;
    font-family:  'Segoe UI', system-ui, sans-serif;
  }
  input:focus { border-color: #4361ee; box-shadow: 0 0 0 2px rgba(67,97,238,0.25); }
  .btns {
    display:         flex;
    gap:             8px;
    justify-content: flex-end;
    margin-top:      2px;
  }
  button {
    padding:       5px 18px;
    border-radius: 4px;
    border:        none;
    font-size:     12px;
    cursor:        pointer;
    font-family:   'Segoe UI', system-ui, sans-serif;
    transition:    background .15s;
  }
  .btn-ok     { background: #4361ee; color: #fff; }
  .btn-ok:hover { background: #3451d1; }
  .btn-cancel { background: #2d3748; color: #94a3b8; }
  .btn-cancel:hover { background: #3d4d60; color: #e2e8f0; }
</style>
</head>
<body>
  <div class="titlebar">${safeTitle}</div>
  <label>${safeLabel}</label>
  <input id="val" type="text" value="${safeDefaultValue}" autofocus spellcheck="false">
  <div class="btns">
    <button class="btn-cancel" onclick="cancel()">Cancelar</button>
    <button class="btn-ok"     onclick="ok()">Aceptar</button>
  </div>
  <script>
    const { ipcRenderer } = require('electron')
    const inp = document.getElementById('val')

    // Seleccionar todo al abrir
    inp.addEventListener('focus', () => inp.select())
    inp.focus()

    inp.addEventListener('keydown', e => {
      if (e.key === 'Enter')  ok()
      if (e.key === 'Escape') cancel()
    })

    function ok() {
      const val = inp.value.trim()
      ipcRenderer.send('input-dialog-result', val || null)
      window.close()
    }
    function cancel() {
      ipcRenderer.send('input-dialog-result', null)
      window.close()
    }
  <\/script>
</body>
</html>`

    win.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(html))

    const onResult = (_, value) => resolve(value)
    ipcMain.once('input-dialog-result', onResult)
    win.on('closed', () => {
      ipcMain.removeListener('input-dialog-result', onResult)
      resolve(null)
    })
  })
})

// ── IPC — Python ──────────────────────────────────────────────
ipcMain.handle('check-python', () => {
  const bundled = getBundledPythonPath()
  if (fs.existsSync(bundled))
    return { ok: true, executable: bundled, source: 'bundled' }
  const py = getPythonExecutable()
  return { ok: !!py, executable: py, source: 'system' }
})

// ── IPC — Ejecutar pic_flash.py ───────────────────────────────
let activeFlashProcess = null
let activeBuildProcess = null

ipcMain.handle('run-flash', async (event, { operation, chip, port, hexFile, outFile, progMode }) => {

  // ── Modo bootloader ─────────────────────────────────────────
  if (progMode === 'bootloader' && operation === 'flash') {
    const tool = resolvePythonTool('pic_bl_flash')
    if (!tool.found) return { ok: false, error: 'pic_bl_flash no encontrado.' }
    if (!fs.existsSync(hexFile))
      return { ok: false, error: `Archivo HEX no encontrado: ${hexFile}` }
    if (!port || port.trim() === '')
      return { ok: false, error: 'No hay puerto seleccionado para la grabación.' }

    const args = [...tool.args, `-${chip}`, hexFile, port]

    return new Promise((resolve) => {
      let resolved = false
      function safeResolve(val) {
        if (!resolved) { resolved = true; resolve(val) }
      }

      event.sender.send('flash-output', { type: 'stdout', line: `Iniciando grabación USB-Serial (${chip.toUpperCase()})...` })
      event.sender.send('flash-output', { type: 'stdout', line: '→ Conectá el USB si no está conectado' })

      const proc = spawn(tool.executable, args, { windowsHide: true, stdio: ['pipe', 'pipe', 'pipe'] })
      activeFlashProcess = proc

      proc.stdout.on('data', (data) => {
        for (const line of data.toString().split(/\r?\n/))
          if (line.trim()) event.sender.send('flash-output', { type: 'stdout', line: escapeHtml(line.trim()) })
      })
      proc.stderr.on('data', (data) => {
        for (const line of data.toString().split(/\r?\n/))
          if (line.trim()) event.sender.send('flash-output', { type: 'stderr', line: escapeHtml(line.trim()) })
      })
      proc.on('error', (err) => {
        activeFlashProcess = null
        event.sender.send('flash-output', { type: 'error', line: `Error: ${err.message}` })
        safeResolve({ ok: false, error: err.message })
      })
      proc.on('close', (code) => {
        activeFlashProcess = null
        event.sender.send('flash-output', { type: 'done', line: '', exitCode: code })
        safeResolve({ ok: code === 0 })
      })
    })
  }

  // ── Modo ICSP ──────────────────────────────────────────────
  const tool = resolvePythonTool('pic_flash')
  if (!tool.found) return { ok: false, error: 'pic_flash no encontrado.' }

  let args

  if (operation === 'fw-version') {
    args = [...tool.args, '--fw-version', port]
  } else {
    args = [...tool.args, `-${chip}`]
    switch (operation) {
      case 'flash':          args.push(hexFile, port); break
      case 'read-flash':     if (outFile) args.push('--read-flash', outFile, port); else args.push('--read-flash', port); break
      case 'erase-flash':    args.push('--erase-flash', port); break
      case 'read-fuses':     args.push('--read-fuses', port); break
      case 'write-fuses':    args.push('--write-fuses', hexFile, port); break
      case 'read-eeprom':    if (outFile) args.push('--read-eeprom', outFile, port); else args.push('--read-eeprom', port); break
      case 'write-eeprom':   args.push('--write-eeprom', hexFile, port); break
      case 'erase-eeprom':   args.push('--erase-eeprom', port); break
      case 'dump':           args.push('--dump', outFile, port); break
      case 'write-fuses-direct': args = [...tool.args, `-${chip}`, '--write-fuses-direct', hexFile, port]; break
      default: return { ok: false, error: `Operación desconocida: ${operation}` }
    }
  }

  return new Promise((resolve) => {
    let resolved = false
    function safeResolve(val) {
      if (!resolved) { resolved = true; resolve(val) }
    }

    const proc = spawn(tool.executable, args, { windowsHide: true })
    activeFlashProcess = proc

    proc.stdout.on('data', (data) => {
      for (const line of data.toString().split(/\r?\n/))
        if (line.trim()) event.sender.send('flash-output', { type: 'stdout', line: escapeHtml(line.trim()) })
    })
    proc.stderr.on('data', (data) => {
      for (const line of data.toString().split(/\r?\n/))
        if (line.trim()) event.sender.send('flash-output', { type: 'stderr', line: escapeHtml(line.trim()) })
    })
    proc.on('close', (code) => {
      activeFlashProcess = null
      event.sender.send('flash-output', { type: 'done', line: '', exitCode: code })
      safeResolve({ ok: code === 0 })
    })
    proc.on('error', (err) => {
      activeFlashProcess = null
      event.sender.send('flash-output', { type: 'error', line: err.message })
      safeResolve({ ok: false, error: err.message })
    })
  })
})

ipcMain.on('cancel-process', () => {
  if (activeBuildProcess) {
    try { activeBuildProcess.kill() } catch (_) { }
    activeBuildProcess = null
  }
  if (activeFlashProcess) {
    try { activeFlashProcess.kill() } catch (_) { }
    activeFlashProcess = null
  }
})

// ── Rutas firmware ────────────────────────────────────────────
function getFirmwarePath() {
  if (app.isPackaged)
    return path.join(process.resourcesPath, 'python', 'firmware', 'picasp_firmware.hex')
  return path.join(__dirname, 'python', 'firmware', 'picasp_firmware.hex')
}

function getAvrdudeDir() {
  if (app.isPackaged)
    return path.join(process.resourcesPath, 'python', 'firmware')
  return path.join(__dirname, 'python', 'firmware')
}

// ── URL de descarga XC8 ────────────────────────────────
const XC8_DOWNLOAD_URL = 'https://ww1.microchip.com/downloads/aemDocuments/documents/DEV/ProductDocuments/SoftwareTools/xc8-v3.10-full-install-windows-x64-installer.exe'
const XC8_INSTALLER_VERSION = 'v3.10'

// ── Verificar versión firmware actual del Arduino ─────────────
ipcMain.handle('check-arduino-fw', async (event, port) => {
  const tool = resolvePythonTool('pic_flash')
  if (!tool.found) return { ok: false, version: null }

  return new Promise((resolve) => {
    const proc = spawn(tool.executable, [...tool.args, '--fw-version', port], { windowsHide: true })
    let output = ''
    proc.stdout.on('data', d => output += d.toString())
    proc.stderr.on('data', d => output += d.toString())
    proc.on('close', () => {
      const match = output.match(/Firmware PICasp\s*:\s*v([\d.]+)/)
      if (match) resolve({ ok: true, version: match[1] })
      else resolve({ ok: false, version: null })
    })
    proc.on('error', () => resolve({ ok: false, version: null }))
  })
})

// ── Grabar firmware PICasp en Arduino ─────────────────────────
ipcMain.handle('flash-arduino-fw', async (event, { port }) => {
  const BAUD = 115200
  const avrdudeDir = getAvrdudeDir()
  const avrdudePath = path.join(avrdudeDir, 'avrdude.exe')
  const avrdudeConf = path.join(avrdudeDir, 'avrdude.conf')
  const hexPath = getFirmwarePath()

  if (!fs.existsSync(avrdudePath))
    return { ok: false, error: 'avrdude.exe no encontrado en python/firmware/' }
  if (!fs.existsSync(hexPath))
    return { ok: false, error: 'picasp_firmware.hex no encontrado en python/firmware/' }

  const args = [
    '-C', avrdudeConf, '-v',
    '-p', 'atmega328p',
    '-c', 'arduino',
    '-P', port,
    '-b', BAUD.toString(),
    '-D',
    '-U', `flash:w:${hexPath}:i`,
  ]

  return new Promise((resolve) => {
    const proc = spawn(avrdudePath, args, { windowsHide: true })

    proc.stdout.on('data', (data) => {
      for (const line of data.toString().split(/\r?\n/))
        if (line.trim()) event.sender.send('avrdude-output', { type: 'stdout', line: escapeHtml(line.trim()) })
    })
    proc.stderr.on('data', (data) => {
      for (const line of data.toString().split(/\r?\n/))
        if (line.trim()) event.sender.send('avrdude-output', { type: 'stderr', line: escapeHtml(line.trim()) })
    })
    proc.on('close', (code) => {
      event.sender.send('avrdude-output', { type: 'done', exitCode: code })
      resolve({ ok: code === 0 })
    })
    proc.on('error', (err) => {
      event.sender.send('avrdude-output', { type: 'error', line: err.message })
      resolve({ ok: false, error: err.message })
    })
  })
})

// ── Rutas bootloaders ─────────────────────────────────────────
function getBootloaderHexPath(board) {
  const base = app.isPackaged
    ? path.join(process.resourcesPath, 'python', 'firmware')
    : path.join(__dirname, 'python', 'firmware')
  const files = {
    'bootloader-k22': 'bootloader_k22.hex',
    'bootloader-2550': 'bootloader_2550.hex',
    'bootloader-252': 'bootloader_252.hex',
  }
  const filename = files[board]
  if (!filename) return null
  return path.join(base, filename)
}

// ── Grabar bootloader en PICasp Board ────────────────────────
ipcMain.handle('flash-bootloader', async (event, { port, board }) => {
  const tool = resolvePythonTool('pic_flash')
  if (!tool.found) return { ok: false, error: 'pic_flash no encontrado.' }

  const hexPath = getBootloaderHexPath(board)
  if (!hexPath) return { ok: false, error: `Bootloader desconocido: ${board}` }
  if (!fs.existsSync(hexPath)) return { ok: false, error: `Archivo HEX no encontrado: ${path.basename(hexPath)}` }

  const BOARD_CHIP = {
    'bootloader-k22': 'pic18f25k22',
    'bootloader-2550': 'pic18f2550',
    'bootloader-252': 'pic18f252',
  }
  const chip = BOARD_CHIP[board]
  const args = [...tool.args, `-${chip}`, hexPath, port]

  return new Promise((resolve) => {
    let resolved = false
    function safeResolve(val) {
      if (!resolved) { resolved = true; resolve(val) }
    }

    const proc = spawn(tool.executable, args, { windowsHide: true })
    activeFlashProcess = proc

    proc.stdout.on('data', (data) => {
      for (const line of data.toString().split(/\r?\n/))
        if (line.trim()) event.sender.send('bl-output', { type: 'stdout', line: escapeHtml(line.trim()) })
    })
    proc.stderr.on('data', (data) => {
      for (const line of data.toString().split(/\r?\n/))
        if (line.trim()) event.sender.send('bl-output', { type: 'stderr', line: escapeHtml(line.trim()) })
    })
    proc.on('close', (code) => {
      activeFlashProcess = null
      event.sender.send('bl-output', { type: 'done', line: '', exitCode: code })
      safeResolve({ ok: code === 0 })
    })
    proc.on('error', (err) => {
      activeFlashProcess = null
      event.sender.send('bl-output', { type: 'error', line: err.message })
      safeResolve({ ok: false, error: err.message })
    })
  })
})

// ── IPC — Verificar XC8 ───────────────────────────────────────
ipcMain.handle('check-xc8', async () => {
  const tool = resolvePythonTool('pic_build')
  if (!tool.found) return { ok: false, path: null, version: null }

  return new Promise(resolve => {
    const proc = spawn(tool.executable, [...tool.args, '--check-xc8'], { windowsHide: true })
    let output = ''
    proc.stdout.on('data', d => output += d.toString())
    proc.stderr.on('data', d => output += d.toString())
    proc.on('close', () => {
      const line = output.trim()
      if (line.startsWith('XC8_FOUND:')) {
        const rest = line.slice('XC8_FOUND:'.length)
        const lastColon = rest.lastIndexOf(':')
        const xc8Path = rest.slice(0, lastColon)
        const version = rest.slice(lastColon + 1).trim()
        resolve({ ok: true, path: xc8Path, version })
      } else {
        resolve({ ok: false, path: null, version: null })
      }
    })
    proc.on('error', () => resolve({ ok: false, path: null, version: null }))
  })
})

// ── IPC — Compilar proyecto ───────────────────────────────────
ipcMain.handle('run-build', async (event, { chip, srcFile, outHex, fCpu, oscillator, xc8Path, codeOffset }) => {
  const tool = resolvePythonTool('pic_build')
  if (!tool.found) return { ok: false, error: 'pic_build no encontrado.' }
  if (!fs.existsSync(srcFile)) return { ok: false, error: `Archivo fuente no encontrado: ${srcFile}` }

  const halRoot = path.join(
    app.isPackaged ? process.resourcesPath : __dirname,
    'hal'
  )

  const args = [
    ...tool.args,
    '--chip', chip,
    '--src', srcFile,
    '--out', outHex,
    '--fosc', String(fCpu || 4000000),
    '--osc', oscillator || 'XT',
    '--hal', halRoot,
  ]
  if (xc8Path) args.push('--xc8', xc8Path)
  if (codeOffset) args.push('--codeoffset', String(codeOffset))

  return new Promise(resolve => {
    let resolved = false
    function safeResolve(val) {
      if (!resolved) { resolved = true; resolve(val) }
    }

    const proc = spawn(tool.executable, args, { windowsHide: true })
    activeBuildProcess = proc

    proc.stdout.on('data', data => {
      for (const line of data.toString().split(/\r?\n/))
        if (line.trim()) event.sender.send('build-output', { type: 'stdout', line: escapeHtml(line.trim()) })
    })
    proc.stderr.on('data', data => {
      for (const line of data.toString().split(/\r?\n/))
        if (line.trim()) event.sender.send('build-output', { type: 'stderr', line: escapeHtml(line.trim()) })
    })
    proc.on('close', code => {
      activeBuildProcess = null
      event.sender.send('build-output', { type: 'done', exitCode: code })
      safeResolve({ ok: code === 0, hexFile: outHex })
    })
    proc.on('error', err => {
      activeBuildProcess = null
      event.sender.send('build-output', { type: 'error', line: err.message })
      safeResolve({ ok: false, error: err.message })
    })
  })
})

// ── IPC — Abrir/guardar proyectos (legacy) ────────────────────
ipcMain.handle('open-project-dialog', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    title: 'Abrir archivo .c',
    filters: [{ name: 'C source', extensions: ['c'] }, { name: 'Todos', extensions: ['*'] }],
    properties: ['openFile'],
  })
  if (result.canceled) return null
  const filePath = result.filePaths[0]
  return { path: filePath, content: fs.readFileSync(filePath, 'utf8') }
})

ipcMain.handle('save-project', async (_, { filePath, content }) => {
  try {
    fs.writeFileSync(filePath, content, 'utf8')
    return { ok: true }
  } catch (e) { return { ok: false, error: e.message } }
})

ipcMain.handle('save-project-dialog', async (_, { defaultName, content }) => {
  const result = await dialog.showSaveDialog(mainWindow, {
    title: 'Guardar proyecto',
    defaultPath: defaultName || 'main.c',
    filters: [{ name: 'C source', extensions: ['c'] }],
  })
  if (result.canceled) return { ok: false }
  try {
    fs.writeFileSync(result.filePath, content, 'utf8')
    return { ok: true, path: result.filePath }
  } catch (e) { return { ok: false, error: e.message } }
})

ipcMain.handle('get-temp-dir', () => {
  const tmp = path.join(app.getPath('temp'), 'picasp-build')
  fs.mkdirSync(tmp, { recursive: true })
  return tmp
})

// ── IPC — Sistema de proyectos ────────────────────────────────
ipcMain.handle('project-new', async (_, { projectName, folderPath, chip, boardId, oscillator, frequency, progMode }) => {
  try {
    const projectDir = path.join(folderPath, projectName)
    const srcDir = path.join(projectDir, 'src')
    const buildDir = path.join(projectDir, 'build')

    fs.mkdirSync(srcDir, { recursive: true })
    fs.mkdirSync(buildDir, { recursive: true })
    fs.writeFileSync(path.join(buildDir, '.gitkeep'), '', 'utf8')

    const gitignore =
      `# Artefactos de compilación PICasp — generados automáticamente
*.hex
*.elf
*.map
*.lst
*.sym
*.d
*.p1
*.pre
*.cmf
# Mantener la carpeta en git
!.gitkeep
`
    fs.writeFileSync(path.join(buildDir, '.gitignore'), gitignore, 'utf8')

    const config = {
      version: '1.0',
      chip,
      boardId: boardId || null,
      oscillator,
      frequency,
      progMode: progMode || 'icsp',
      port: '',
      libraries: []
    }
    fs.writeFileSync(
      path.join(projectDir, 'picasp.json'),
      JSON.stringify(config, null, 2),
      'utf8'
    )

    const BOARD_NAMES = {
      picasp_board_2550: 'PICasp Board 2550',
      picasp_board_252: 'PICasp Board 252',
      picasp_board_k22: 'PICasp Board K22',
    }
    const boardLabel = BOARD_NAMES[boardId] || boardId || 'Board'
    const blComment = progMode === 'bootloader'
      ? `//  Board: ${boardLabel} (USB-SERIAL Bootloader)\n`
      : `//  Modo: USB-ICSP\n`


    const mainC = `// ============================================================
//  ${projectName}
//  Chip: ${chip.toUpperCase()}
${blComment}// ============================================================
#include <picasp.h>

void setup() {

}

void loop() {

}
`
    const mainFileName = 'main.c'
    fs.writeFileSync(path.join(srcDir, mainFileName), mainC, 'utf8')
    return { ok: true, projectDir, mainFile: path.join(srcDir, mainFileName) }
  } catch (e) { return { ok: false, error: e.message } }
})

ipcMain.handle('project-open', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    title: 'Abrir carpeta de proyecto PICasp',
    properties: ['openDirectory'],
  })
  if (result.canceled) return null

  const projectDir = result.filePaths[0]
  const configPath = path.join(projectDir, 'picasp.json')

  if (!fs.existsSync(configPath))
    return { ok: false, error: 'No se encontró picasp.json en esta carpeta.' }

  const config = JSON.parse(fs.readFileSync(configPath, 'utf8'))
  const tree = readFileTree(projectDir)
  return { ok: true, projectDir, config, tree }
})

ipcMain.handle('project-save-config', async (_, { projectDir, config }) => {
  try {
    fs.writeFileSync(
      path.join(projectDir, 'picasp.json'),
      JSON.stringify(config, null, 2),
      'utf8'
    )
    return { ok: true }
  } catch (e) { return { ok: false, error: e.message } }
})

// ── IPC — Árbol y operaciones de archivos ─────────────────────
let _fsWatcher = null

ipcMain.handle('file-tree-read', async (_, { projectDir }) => {
  try { return { ok: true, tree: readFileTree(projectDir) } }
  catch (e) { return { ok: false, error: e.message } }
})

ipcMain.handle('file-read', async (_, { filePath }) => {
  try { return { ok: true, content: fs.readFileSync(filePath, 'utf8') } }
  catch (e) { return { ok: false, error: e.message } }
})

ipcMain.handle('file-write', async (_, { filePath, content }) => {
  try {
    fs.mkdirSync(path.dirname(filePath), { recursive: true })
    fs.writeFileSync(filePath, content, 'utf8')
    return { ok: true }
  } catch (e) { return { ok: false, error: e.message } }
})

ipcMain.handle('file-create', async (_, { parentDir, name, isDir }) => {
  try {
    const target = path.join(parentDir, name)
    if (isDir) {
      fs.mkdirSync(target, { recursive: true })
    } else {
      fs.mkdirSync(path.dirname(target), { recursive: true })
      fs.writeFileSync(target, '', 'utf8')
    }
    return { ok: true, path: target }
  } catch (e) { return { ok: false, error: e.message } }
})

ipcMain.handle('file-rename', async (_, { oldPath, newName }) => {
  try {
    const newPath = path.join(path.dirname(oldPath), newName)
    fs.renameSync(oldPath, newPath)
    return { ok: true, newPath }
  } catch (e) { return { ok: false, error: e.message } }
})

ipcMain.handle('file-delete', async (_, { targetPath }) => {
  try {
    fs.rmSync(targetPath, { recursive: true, force: true })
    return { ok: true }
  } catch (e) { return { ok: false, error: e.message } }
})

ipcMain.handle('watch-project', (_, projectDir) => {
  if (_fsWatcher) { _fsWatcher.close(); _fsWatcher = null }
  try {
    const watcherCallback = (eventType, filename) => {

      if (eventType === 'rename' && !fs.existsSync(projectDir)) {
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.webContents.send('project-removed')
        }
        _fsWatcher?.close()
        _fsWatcher = null
        return
      }

      if (eventType === 'rename' && filename) {
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.webContents.send('project-tree-changed', { filename })
        }
        return
      }

      if (eventType === 'change' && filename) {
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.webContents.send('project-file-changed', { filename })
        }
      }
    }

    if (process.platform === 'linux') {
      const dirsToWatch = [projectDir]
      const subDirs = ['src', 'lib', 'build']
      for (const sub of subDirs) {
        const full = path.join(projectDir, sub)
        if (fs.existsSync(full)) dirsToWatch.push(full)
      }

      const watchers = dirsToWatch.map(dir =>
        fs.watch(dir, { persistent: false }, watcherCallback)
      )

      _fsWatcher = {
        close: () => watchers.forEach(w => { try { w.close() } catch (_) { } })
      }
    } else {
      _fsWatcher = fs.watch(
        projectDir,
        { persistent: false, recursive: true },
        watcherCallback
      )
    }
  } catch (e) {
    console.error('[watch-project] Error al iniciar watcher:', e.message)
  }
})

ipcMain.handle('unwatch-project', () => {
  if (_fsWatcher) { _fsWatcher.close(); _fsWatcher = null }
})

// ── Helper: árbol recursivo de archivos ──────────────────────
function readFileTree(dir, depth = 0) {
  if (depth > 6) return []
  const SKIP = new Set(['node_modules', '.git', '__pycache__'])

  const entries = fs.readdirSync(dir, { withFileTypes: true })

  return entries
    .filter(e => !e.name.startsWith('.')
      && !SKIP.has(e.name))
    .sort((a, b) => {
      if (a.isDirectory() !== b.isDirectory()) return a.isDirectory() ? -1 : 1
      return a.name.localeCompare(b.name)
    })
    .map(e => {
      const fullPath = path.join(dir, e.name)
      const isDir = e.isDirectory()
      return {
        name: e.name,
        path: fullPath,
        isDir,
        ext: isDir ? null : path.extname(e.name).toLowerCase(),
        children: isDir ? readFileTree(fullPath, depth + 1) : [],
      }
    })
}

// ── IPC — Serial Monitor ──────────────────────────────────────
let activeSerialPort = null

ipcMain.handle('serial-open', async (event, { path, baudRate }) => {

  if (activeSerialPort) {
    try { await activeSerialPort.close() } catch (_) { }
    activeSerialPort = null
  }

  try {
    const port = new SerialPort({ path, baudRate, autoOpen: false })

    return new Promise((resolve) => {
      port.open(err => {
        if (err) {
          resolve({ ok: false, error: err.message })
          return
        }

        activeSerialPort = port

        const parser = port.pipe(new ReadlineParser({ delimiter: '\n' }))
        parser.on('data', (line) => {
          if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send('serial-data', line.trimEnd())
          }
        })

        port.on('close', () => {
          activeSerialPort = null
          port.unpipe(parser)
          parser.destroy()
          if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send('serial-closed')
          }
        })

        port.on('error', (err) => {
          if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send('serial-error', err.message)
          }
        })

        resolve({ ok: true })
      })
    })
  } catch (e) {
    return { ok: false, error: e.message }
  }
})

ipcMain.handle('serial-close', async () => {
  if (!activeSerialPort) return { ok: true }
  return new Promise((resolve) => {
    activeSerialPort.close(err => {
      activeSerialPort = null
      resolve({ ok: !err, error: err?.message })
    })
  })
})

ipcMain.handle('serial-send', async (_, { data }) => {
  if (!activeSerialPort?.isOpen) return { ok: false, error: 'Puerto no abierto.' }
  return new Promise((resolve) => {
    activeSerialPort.write(data, err => {
      resolve({ ok: !err, error: err?.message })
    })
  })
})

// ── IPC — Gestor de librerías GitHub ─────────────────────────
const fetch = require('node-fetch')
const https = require('https')

ipcMain.handle('github-get-tags', async (_, { repo }) => {
  try {
    const url = `https://api.github.com/repos/${repo}/tags`
    const res = await fetch(url, {
      headers: { 'User-Agent': 'PICasp-IDE' }
    })
    if (!res.ok) return { ok: false, error: `GitHub respondió ${res.status}` }
    const tags = await res.json()
    return { ok: true, tags: tags.map(t => t.name) }
  } catch (e) {
    return { ok: false, error: e.message }
  }
})

ipcMain.handle('lib-install', async (_, { repo, version, projectDir }) => {
  try {
    const libDir = path.join(projectDir, 'lib')
    const repoName = repo.split('/').pop()
    const destDir = path.join(libDir, repoName)

    fs.mkdirSync(libDir, { recursive: true })

    if (fs.existsSync(destDir))
      fs.rmSync(destDir, { recursive: true, force: true })

    const zipUrl = `https://github.com/${repo}/archive/refs/tags/${version}.zip`
    const zipPath = path.join(libDir, `${repoName}-${version}.zip`)

    await downloadFile(zipUrl, zipPath)
    await extractZip(zipPath, libDir, repoName)
    fs.unlinkSync(zipPath)

    return { ok: true, libDir: destDir }
  } catch (e) {
    return { ok: false, error: e.message }
  }
})

ipcMain.handle('lib-remove', async (_, { repo, projectDir }) => {
  try {
    const repoName = repo.split('/').pop()
    const destDir = path.join(projectDir, 'lib', repoName)
    if (fs.existsSync(destDir))
      fs.rmSync(destDir, { recursive: true, force: true })
    return { ok: true }
  } catch (e) {
    return { ok: false, error: e.message }
  }
})

// ── Helpers de descarga y extracción ─────────────────────────
function downloadFile(url, dest) {
  return new Promise((resolve, reject) => {

    const MAX_REDIRECTS = 10
    const follow = (currentUrl, depth = 0) => {
      if (depth > MAX_REDIRECTS) {
        reject(new Error('Demasiadas redirecciones al descargar el archivo'))
        return
      }
      https.get(currentUrl, { headers: { 'User-Agent': 'PICasp-IDE' } }, (res) => {
        if (res.statusCode === 301 || res.statusCode === 302) {
          follow(res.headers.location, depth + 1)
          return
        }
        if (res.statusCode !== 200) {
          reject(new Error(`Error HTTP ${res.statusCode}`))
          return
        }
        const file = fs.createWriteStream(dest)
        res.pipe(file)
        file.on('finish', () => { file.close(); resolve() })
        file.on('error', reject)
      }).on('error', reject)
    }
    follow(url)
  })
}

function extractZip(zipPath, destDir, repoName) {
  return new Promise((resolve, reject) => {
    const tmpDir = path.join(destDir, `_tmp_${repoName}`)

    let proc
    if (process.platform === 'win32') {

      const safeSrc = zipPath.replace(/'/g, "''")
      const safeDst = tmpDir.replace(/'/g, "''")
      proc = spawn('powershell', [
        '-NoProfile', '-NonInteractive', '-Command',
        `Expand-Archive -Path '${safeSrc}' -DestinationPath '${safeDst}' -Force`,
      ], { windowsHide: true })
    } else {
      proc = spawn('unzip', ['-o', zipPath, '-d', tmpDir])
    }

    proc.on('error', reject)
    proc.on('close', (code) => {
      if (code !== 0) { reject(new Error(`Descompresión falló (código ${code})`)); return }
      try {
  
        const entries = fs.readdirSync(tmpDir)
        const extracted = path.join(tmpDir, entries[0])
        const finalDir = path.join(destDir, repoName)

        if (fs.existsSync(finalDir))
          fs.rmSync(finalDir, { recursive: true, force: true })

        fs.renameSync(extracted, finalDir)
        fs.rmSync(tmpDir, { recursive: true, force: true })
        resolve()
      } catch (e) {
        reject(e)
      }
    })
  })
}

ipcMain.handle('download-xc8', async (event) => {
  const downloadPath = path.join(os.tmpdir(), `xc8-${XC8_INSTALLER_VERSION}-installer-${Date.now()}.exe`)

  return new Promise((resolve) => {
    const file = fs.createWriteStream(downloadPath)

    const follow = (url) => {
      https.get(url, { headers: { 'User-Agent': 'PICasp-IDE' } }, (res) => {
        if (res.statusCode === 301 || res.statusCode === 302) {
          follow(res.headers.location)
          return
        }
        if (res.statusCode !== 200) {
          event.sender.send('xc8-download-progress', {
            status: 'done', error: `HTTP ${res.statusCode}`
          })
          resolve({ ok: false, error: `HTTP ${res.statusCode}` })
          return
        }

        const total = parseInt(res.headers['content-length'] || '0')
        let downloaded = 0

        res.on('data', chunk => {
          downloaded += chunk.length
          file.write(chunk)
          if (total > 0) {
            const pct = Math.round(downloaded * 100 / total)
            event.sender.send('xc8-download-progress', { status: 'downloading', pct })
          }
        })

        res.on('end', () => {
          file.close(() => {
            event.sender.send('xc8-download-progress', { status: 'installing', pct: 100 })

            const { spawn } = require('child_process')
            const installer = spawn(downloadPath, [], {
              windowsHide: false,
              detached: true,
              stdio: 'ignore',
            })

            installer.on('error', (err) => {
              event.sender.send('xc8-download-progress', {
                status: 'done', error: err.message
              })
              resolve({ ok: false, error: err.message })
            })

            installer.unref()

            event.sender.send('xc8-download-progress', { status: 'done' })
            resolve({ ok: true })
          })
        })

        res.on('error', (err) => {
          event.sender.send('xc8-download-progress', {
            status: 'done', error: err.message
          })
          resolve({ ok: false, error: err.message })
        })
      }).on('error', (err) => {
        event.sender.send('xc8-download-progress', {
          status: 'done', error: err.message
        })
        resolve({ ok: false, error: err.message })
      })
    }

    follow(XC8_DOWNLOAD_URL)
  })
})