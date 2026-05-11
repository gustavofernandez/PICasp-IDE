// ============================================================
//  app.js — PICasp-IDE v1.0.0
// ============================================================

const state = {
  running: false,
  port: null,
  chip: null,
  hexPath: null,
  pythonOk: false,
}

const $ = id => document.getElementById(id)

const selPort = $('sel-port')
const selChip = $('sel-chip')
const inpHexPath = $('inp-hex-path')
const hexInfo = $('hex-info')
const logContent = $('log-content')
const progressBar = $('progress-bar')
const progressLabel = $('progress-label')
const progressPct = $('progress-pct')
const statusText = $('status-text')
const btnCancel = $('btn-cancel')
const pythonLabel = $('python-label')
const pythonIndicator = $('python-indicator')

const opButtons = document.querySelectorAll('.btn-operation')

const RE_PROGRESS = /\[([#\-]+)\]\s+(\d+)%/
const RE_OK = /✓|OK|EXITOSA|correctas/i
const RE_ERROR = /ERROR|FALLO/i
const RE_WARN = /ADVERTENCIA|warn|⚠/i

// ── Init ──────────────────────────────────────────────────────
async function init() {
  state.pythonOk = true
  await refreshPorts()
  setupEventListeners()
  setupDragAndDrop()
  log('PICasp v1.0.0 — Listo', 'system')
}

// ── Puertos ───────────────────────────────────────────────────
async function refreshPorts() {
  const ports = await window.picasp.getPorts()
  const prev = selPort.value
  selPort.innerHTML = '<option value="">— Seleccionar —</option>'

  if (ports.length === 0) {
    selPort.innerHTML += '<option value="" disabled>No se detectó ningún programador</option>'
    return
  }

  let autoSelect = null

  for (const p of ports) {
    const opt = document.createElement('option')
    opt.value = p.path
    // En la GUI, todos los puertos son programadores USB-ICSP
    opt.textContent = `⚡ ${p.path} — USB-ICSP`
    selPort.appendChild(opt)
    if (!autoSelect) autoSelect = p.path
  }

  if (prev && ports.find(p => p.path === prev)) {
    selPort.value = prev
  } else if (autoSelect) {
    selPort.value = autoSelect
    log(`⚡ Programador detectado en ${autoSelect}.`, 'ok')
  }
}

// ── Event listeners ───────────────────────────────────────────
function setupEventListeners() {
  $('btn-minimize').addEventListener('click', () => window.picasp.minimize())
  $('btn-maximize').addEventListener('click', () => window.picasp.maximize())
  $('btn-close').addEventListener('click', () => window.picasp.close())

  $('btn-refresh-ports').addEventListener('click', async () => {
    await refreshPorts()
    log('Puertos actualizados.', 'system')
  })

  $('btn-browse-hex').addEventListener('click', browseHex)
  $('btn-clear-log').addEventListener('click', clearLog)

  $('btn-fuses-config').addEventListener('click', () => {
    const chip = selChip.value
    if (!chip) { log('⚠ Seleccioná un chip primero.', 'warn'); return }
    window.fusesModal.open(chip)
  })

  document.getElementById('fuses-hex-input').addEventListener('input', function () {
    updateFieldsFromHex(this.value)
  })

  btnCancel.addEventListener('click', () => {
    window.picasp.cancel()
    log('Operación cancelada.', 'warn')
    setRunning(false)
    setProgress(0, 'Cancelado', 'error')
  })

  opButtons.forEach(btn => {
    btn.addEventListener('click', () => handleOperation(btn.dataset.op))
  })

  // ── Tab switcher ──────────────────────────────────────────────
  document.querySelectorAll('.app-tab').forEach(tab => {
    tab.addEventListener('click', async () => {
      const panel = tab.dataset.panel

      document.querySelectorAll('.app-tab').forEach(t =>
        t.classList.toggle('active', t === tab))

      document.querySelectorAll('.app-panel').forEach(p =>
        p.classList.remove('active'))

      requestAnimationFrame(() => {
        const target = document.getElementById(`panel-${panel}`)
        if (target) target.classList.add('active')
      })

      if (panel === 'ide') {
        window.picasp.removeOutputListeners()
        if (typeof ensureMonaco === 'function') {
          await ensureMonaco()
        }

        if (monacoEditor) {
          requestAnimationFrame(() => {
            requestAnimationFrame(() => {
              const container = document.getElementById('monaco-container')
              if (container) {
                monacoEditor.layout({
                  width:  container.clientWidth,
                  height: container.clientHeight,
                })
              } else {
                monacoEditor.layout()
              }
              monacoEditor.focus()
            })
          })
        }
      } else if (panel === 'programmer') {
        window.picasp.removeBuildListeners()
      }
    })
  })

  window.picasp.removePortsChangedListeners()
  window.picasp.onPortsChanged(async () => {
    await refreshPorts()
    log('Puerto conectado/desconectado — lista actualizada.', 'system')
  })
}

// ── Drag & drop ───────────────────────────────────────────────
function setupDragAndDrop() {
  const overlay = document.createElement('div')
  overlay.id = 'drop-overlay'
  overlay.textContent = '📂 Soltar archivo HEX aquí'
  document.body.appendChild(overlay)

  document.addEventListener('dragover', e => { e.preventDefault(); overlay.classList.add('active') })
  document.addEventListener('dragleave', e => { if (!e.relatedTarget) overlay.classList.remove('active') })
  document.addEventListener('drop', e => {
    e.preventDefault()
    overlay.classList.remove('active')
    const file = e.dataTransfer.files[0]
    if (file && file.name.endsWith('.hex') && file.path)
      setHexPath(file.path)
    else if (file && file.name.endsWith('.hex'))
      log('⚠ No se pudo obtener la ruta del archivo soltado.', 'warn')
    else
      log('Solo se aceptan archivos .hex', 'warn')
  })
}

// ── HEX ───────────────────────────────────────────────────────
async function browseHex() {
  const path = await window.picasp.openHexDialog()
  if (path) setHexPath(path)
}

function setHexPath(path) {
  state.hexPath = path
  inpHexPath.value = path
  const filename = path.split(/[\\/]/).pop()
  hexInfo.textContent = `📄 ${filename}`
  hexInfo.style.color = 'var(--accent-cyan)'
}

// ── Operaciones ───────────────────────────────────────────────
async function handleOperation(op) {
  if (state.running) return
  const port = selPort.value
  const chip = selChip.value

  if (!port) { log('⚠ Seleccioná un puerto serie.', 'warn'); return }
  if (op !== 'fw-version' && !chip) { log('⚠ Seleccioná un chip.', 'warn'); return }
  if (!state.pythonOk) { log('⚠ Python 3 no está disponible.', 'error'); return }

  if (['flash', 'write-eeprom', 'write-fuses'].includes(op) && !state.hexPath) {
    log('⚠ Esta operación requiere un archivo HEX.', 'warn'); return
  }

  let outFile = null
  if (op === 'dump') {
    outFile = await window.picasp.saveHexDialog()
    if (!outFile) return
  } else if (op === 'read-flash' || op === 'read-eeprom') {
    outFile = await window.picasp.saveHexDialog()
  }

  if (op === 'erase-eeprom') {
    if (!confirm(`¿Borrar la EEPROM completa del ${chip}?\nEsta acción no se puede deshacer.`)) return
  }
  if (op === 'erase-flash') {
    if (!confirm(`¿Borrar la Flash completa del ${chip}?\nEsta acción borrará el programa grabado.`)) return
  }

  clearLog()
  setRunning(true)
  setProgress(0, opLabel(op), 'running')
  statusText.textContent = `Ejecutando: ${opLabel(op)}...`
  log(`▶ ${opLabel(op)}${chip && op !== 'fw-version' ? ' — ' + chip : ''} @ ${port}`, 'info')
  log('─'.repeat(50), 'system')

  window.picasp.removeOutputListeners()
  window.picasp.onOutput(handleOutput)

  const result = await window.picasp.runFlash({
    operation: op, chip, port, hexFile: state.hexPath, outFile
  })
  if (!result.ok && result.error) {
    log(`✗ ${result.error}`, 'error')
    setProgress(0, 'Error', 'error')
  }

  setRunning(false)
}

async function handleOperationWithPayload(op, chip, payload) {
  const port = selPort.value
  if (!port) { log('⚠ Seleccioná un puerto serie.', 'warn'); return }
  if (!state.pythonOk) { log('⚠ Python no disponible.', 'error'); return }

  clearLog()
  setRunning(true)
  setProgress(0, 'Grabando Fuses...', 'running')
  statusText.textContent = 'Grabando Fuses...'
  log('▶ Grabar Fuses (modal) — ' + chip + ' @ ' + port, 'info')
  log('─'.repeat(50), 'system')

  window.picasp.removeOutputListeners()
  window.picasp.onOutput(handleOutput)

  const result = await window.picasp.runFlash({
    operation: 'write-fuses-direct',
    chip, port,
    hexFile: JSON.stringify(payload),
    outFile: null,
  })
  if (!result.ok && result.error) {
    log(`✗ ${result.error}`, 'error')
    setProgress(0, 'Error', 'error')
    setRunning(false)
  }
}

window.handleOperationWithPayload = handleOperationWithPayload

// ── Output handler ────────────────────────────────────────────
function handleOutput(data) {
  const { type, line, exitCode } = data
  if (type === 'done') {
    setRunning(false)
    if (exitCode === 0) {
      setProgress(100, '✓ Completado', 'success')
      statusText.textContent = '✓ Operación completada'
      log('─'.repeat(50), 'system')
      log('✓ Operación completada exitosamente.', 'ok')
    } else {
      setProgress(0, '✗ Error', 'error')
      statusText.textContent = '✗ La operación falló'
      log('─'.repeat(50), 'system')
      log('✗ La operación finalizó con errores.', 'error')
    }
    return
  }
  if (type === 'error') { log(`✗ ${line}`, 'error'); return }

  const progressMatch = line.match(RE_PROGRESS)
  if (progressMatch) {
    updateProgressFromLine(parseInt(progressMatch[2], 10), line)
    updateLastProgressLine(line)
    return
  }
  let cls = null
  if (RE_ERROR.test(line)) cls = 'error'
  else if (RE_OK.test(line)) cls = 'ok'
  else if (RE_WARN.test(line)) cls = 'warn'
  log(line, cls)
}

function updateProgressFromLine(pct, line) {
  progressBar.style.width = `${pct}%`
  progressPct.textContent = `${pct}%`
  if (/[Ee]scrib/i.test(line)) progressLabel.textContent = 'Escribiendo...'
  else if (/[Vv]erif/i.test(line)) progressLabel.textContent = 'Verificando...'
  else if (/EEPROM/i.test(line)) progressLabel.textContent = 'Procesando EEPROM...'
  else if (/[Ll]eyendo/i.test(line)) progressLabel.textContent = 'Leyendo...'
}

function updateLastProgressLine(line) {
  const lines = logContent.querySelectorAll('.log-line.progress-line')
  if (lines.length > 0) lines[lines.length - 1].textContent = `  ${line}`
  else log(line, 'progress-line')
}

// ── Helpers UI ────────────────────────────────────────────────
function log(text, type = null) {
  const div = document.createElement('div')
  div.className = type ? `log-line ${type}` : 'log-line'
  div.textContent = text
  logContent.appendChild(div)
  $('log-container').scrollTop = $('log-container').scrollHeight
}

function clearLog() {
  logContent.innerHTML = ''
  setProgress(0, 'Listo', null)
  progressPct.textContent = '—'
  statusText.textContent = 'Listo'
}

function setProgress(pct, label, st) {
  progressBar.style.width = `${pct}%`
  progressPct.textContent = pct > 0 ? `${pct}%` : '—'
  progressLabel.textContent = label
  progressBar.classList.remove('success', 'error', 'running')
  if (st) progressBar.classList.add(st)
  if (st === 'running' && pct === 0) progressBar.style.width = '5%'
}

function setRunning(running) {
  state.running = running
  opButtons.forEach(btn => btn.disabled = running)
  $('btn-browse-hex').disabled = running
  $('btn-refresh-ports').disabled = running
  $('btn-open-fw-modal').disabled = running
  $('btn-open-bl-modal').disabled = running
  $('btn-open-xc8-modal').disabled = running
  $('btn-fuses-config').disabled = running
  selPort.disabled = running
  selChip.disabled = running
  btnCancel.classList.toggle('d-none', !running)
}

function opLabel(op) {
  return {
    'flash': 'Grabar Flash',
    'read-flash': 'Leer Flash',
    'erase-flash': 'Borrar Flash',
    'read-fuses': 'Leer Fuses',
    'write-fuses': 'Grabar Fuses',
    'read-eeprom': 'Leer EEPROM',
    'write-eeprom': 'Grabar EEPROM',
    'erase-eeprom': 'Borrar EEPROM',
    'dump': 'Dump completo',
    'fw-version': 'Versión Firmware',
  }[op] || op
}

init()