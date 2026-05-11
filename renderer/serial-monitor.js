// ============================================================
//  serial-monitor.js — PICasp-IDE v1.0.0 
//  Monitor serie del IDE
// ============================================================

let serialConnected = false

// ── Límite de líneas del terminal ─────────────────────────────
const MAX_SERIAL_LINES = 500

// ── Buffer de batching ────────────────────────────────────────
let _serialBuffer = []
let _serialFlushTimer = null

// ── Refs DOM ──────────────────────────────────────────────────
let _smSelPort = null
let _smSelBaud = null
let _smBtnConnect = null
let _smOutput = null
let _smInput = null
let _smBtnSend = null
let _smBtnClear = null
let _smSelEnding = null

function serialLog(text, type = 'rx') {
  const container = document.getElementById('serial-output-container')
  if (!container || !_smOutput) return

  const chkTs = document.getElementById('serial-chk-timestamp')
  const prefix = (chkTs?.checked && type === 'rx')
    ? `[${new Date().toLocaleTimeString('es-AR', { hour12: false })}] `
    : ''

  const div = document.createElement('div')
  div.className = `serial-line-${type}`
  div.textContent = type === 'tx' ? `> ${text}` : `${prefix}${text}`

  _smOutput.appendChild(div)

  while (_smOutput.childElementCount > MAX_SERIAL_LINES) {
    _smOutput.removeChild(_smOutput.firstChild)
  }

  const chkAs = document.getElementById('serial-chk-autoscroll')
  if (chkAs?.checked) {
    container.scrollTop = container.scrollHeight
  }
}

function serialLogBuffered(text, type = 'rx') {
  _serialBuffer.push({ text, type })
  if (!_serialFlushTimer) {
    _serialFlushTimer = setTimeout(flushSerialBuffer, 50)
  }
}

function flushSerialBuffer() {
  _serialFlushTimer = null
  if (!_smOutput || !_serialBuffer.length) return

  const chkTs = document.getElementById('serial-chk-timestamp')
  const fragment = document.createDocumentFragment()

  for (const { text, type } of _serialBuffer) {
    const prefix = (chkTs?.checked && type === 'rx')
      ? `[${new Date().toLocaleTimeString('es-AR', { hour12: false })}] `
      : ''
    const div = document.createElement('div')
    div.className = `serial-line-${type}`
    div.textContent = type === 'tx' ? `> ${text}` : `${prefix}${text}`
    fragment.appendChild(div)
  }
  _serialBuffer = []

  _smOutput.appendChild(fragment)

  while (_smOutput.childElementCount > MAX_SERIAL_LINES) {
    _smOutput.removeChild(_smOutput.firstChild)
  }

  const chkAs = document.getElementById('serial-chk-autoscroll')
  const container = document.getElementById('serial-output-container')
  if (chkAs?.checked && container) {
    container.scrollTop = container.scrollHeight
  }
}

function setSerialConnected(connected) {
  serialConnected = connected
  if (_smInput) _smInput.disabled = !connected
  if (_smBtnSend) _smBtnSend.disabled = !connected
  if (_smBtnConnect) {
    _smBtnConnect.textContent = connected ? '■' : '⚡'
    _smBtnConnect.className = connected
      ? 'btn btn-sm btn-outline-danger'
      : 'btn btn-sm btn-outline-success'
  }
  if (_smSelPort) _smSelPort.disabled = connected
  if (_smSelBaud) _smSelBaud.disabled = connected
}

function initSerialMonitor() {
  _smSelPort = document.getElementById('serial-sel-port')
  _smSelBaud = document.getElementById('serial-sel-baud')
  _smBtnConnect = document.getElementById('serial-btn-connect')
  _smOutput = document.getElementById('serial-output')
  _smInput = document.getElementById('serial-input')
  _smBtnSend = document.getElementById('serial-btn-send')
  _smBtnClear = document.getElementById('serial-btn-clear')
  _smSelEnding = document.getElementById('serial-sel-ending')
  const chkAutoscroll = document.getElementById('serial-chk-autoscroll')
  const chkTimestamp = document.getElementById('serial-chk-timestamp')

  // ── Cargar puertos al abrir la tab Y al iniciar ───────────────
  document.querySelector('[data-sidetab="terminal"]')
    .addEventListener('click', loadSerialPorts)

  loadSerialPorts()

  // ── Refresh de puertos automático ────────────────────────────
  window.picasp.removePortsChangedListeners()
  window.picasp.onPortsChanged(async () => {
    await loadSerialPorts()
    if (serialConnected) {
      const ports = await window.picasp.getPorts()
      const sigue = ports.find(p => p.path === _smSelPort.value)
      if (!sigue) {
        await window.picasp.serialClose()
        setSerialConnected(false)
        _serialBuffer = []
        if (_serialFlushTimer) {
          clearTimeout(_serialFlushTimer)
          _serialFlushTimer = null
        }
        serialLog('✗ Dispositivo desconectado.', 'error')
      }
    }
  })

  // ── Conectar / Desconectar ────────────────────────────────────
  _smBtnConnect.addEventListener('click', async () => {
    if (serialConnected) {
      await window.picasp.serialClose()
      setSerialConnected(false)
      _serialBuffer = []
      if (_serialFlushTimer) {
        clearTimeout(_serialFlushTimer)
        _serialFlushTimer = null
      }
      serialLog('— Desconectado.', 'system')
      return     
    }

    const portPath = _smSelPort.value
    const baudRate = parseInt(_smSelBaud.value)

    if (!portPath) { serialLog('⚠ Seleccioná un puerto.', 'error'); return }

    serialLog(`— Conectando a ${portPath} @ ${baudRate}...`, 'system')

    window.picasp.removeSerialListeners()
    window.picasp.onSerialData(data => serialLogBuffered(data, 'rx'))
    window.picasp.onSerialClosed(() => {
      serialLog('— Puerto cerrado.', 'system')
      setSerialConnected(false)
    })
    window.picasp.onSerialError(err => {
      serialLog(`✗ Error: ${err}`, 'error')
      setSerialConnected(false)
    })

    const result = await window.picasp.serialOpen({ path: portPath, baudRate })
    if (result.ok) {
      setSerialConnected(true)
      serialLog(`— Conectado a ${portPath} @ ${baudRate}.`, 'system')
    } else {
      serialLog(`✗ ${result.error}`, 'error')
      window.picasp.removeSerialListeners()
    }
  })

  // ── Enviar datos ──────────────────────────────────────────────
  async function sendData() {
    if (!serialConnected) return
    const text = _smInput.value
    const ending = _smSelEnding.value
    if (!text && !ending) return

    const data = text + ending
    serialLog(text || '↵', 'tx')
    _smInput.value = ''

    const result = await window.picasp.serialSend({ data })
    if (!result.ok) serialLog(`✗ Error al enviar: ${result.error}`, 'error')
  }

  _smBtnSend.addEventListener('click', sendData)
  _smInput.addEventListener('keydown', e => {
    if (e.key === 'Enter') sendData()
  })

  // ── Limpiar output ────────────────────────────────────────────
  _smBtnClear.addEventListener('click', () => {
    _smOutput.innerHTML = ''
  })

  // ── Helpers ───────────────────────────────────────────────────
  async function loadSerialPorts() {
    const ports = await window.picasp.getPorts()
    const prev  = _smSelPort.value
    _smSelPort.innerHTML = '<option value="">— Puerto —</option>'

    for (const p of ports) {
      const opt = document.createElement('option')
      opt.value = p.path

      if (p.arduino) {
        opt.textContent = `🔌 ${p.path}`
        opt.style.color = '#4cc9f0'
      } else if (p.board) {
        opt.textContent = `🔌 ${p.path} (${p.adapterType})`
        opt.style.color = '#4cc9f0'
      } else {
        opt.textContent = `🔌 ${p.path} — ${p.description || p.adapterType || p.path}`
      }

      _smSelPort.appendChild(opt)
    }

    if (prev && ports.find(p => p.path === prev)) {
      _smSelPort.value = prev
    } else {
      const preferred = ports.find(p => !p.arduino)
      if (preferred) _smSelPort.value = preferred.path
      else if (ports.length > 0) _smSelPort.value = ports[0].path
    }
  }
}

// ── API pública para el IDE ───────────────────────────────────
async function serialMonitorDisconnect() {
  if (!serialConnected) return
  await window.picasp.serialClose()
  setSerialConnected(false)
  serialLog('— Desconectado por grabación en curso.', 'system')
}

window.serialMonitor = {
  disconnect: serialMonitorDisconnect,
  isConnected: () => serialConnected,
}

document.addEventListener('DOMContentLoaded', initSerialMonitor)