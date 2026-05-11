// ============================================================
//  fw-modal.js — PICasp-IDE v1.0.0 
//  Modal para grabar firmware PICasp en Arduino
// ============================================================

let fwModalRunning = false

function initFwModal() {
  const modal      = document.getElementById('fw-modal')
  const selPort    = document.getElementById('fw-sel-port')
  const btnRefresh = document.getElementById('fw-btn-refresh')
  const btnCheck   = document.getElementById('fw-btn-check')
  const btnFlash   = document.getElementById('fw-btn-flash')
  const logContent = document.getElementById('fw-log-content')
  const progressBar= document.getElementById('fw-progress-bar')
  const currentVer = document.getElementById('fw-current-version')

  document.getElementById('btn-open-fw-modal').addEventListener('click', async () => {
    clearFwLog()
    currentVer.textContent = '—'
    currentVer.style.color = 'var(--text-muted)'
    await loadFwPorts()

    const existing = bootstrap.Modal.getInstance(modal)
    if (existing) existing.dispose()
    new bootstrap.Modal(modal, { backdrop: 'static', keyboard: false }).show()
  })

  btnRefresh.addEventListener('click', loadFwPorts)

  document.getElementById('fw-btn-cancel-modal').addEventListener('click', () => {
    if (fwModalRunning) {
      window.picasp.cancel()
      fwLog('⚠ Grabación cancelada por el usuario.', 'warn')
      setFwRunning(false)
      setFwProgress(0, 'error')
    }
    bootstrap.Modal.getInstance(modal)?.hide()
  })

  modal.addEventListener('show.bs.modal', () => {
    window.picasp.onPortsChanged(async () => {
      if (!fwModalRunning) return
      const ports = await window.picasp.getPorts()
      const sigue = ports.find(p => p.path === selPort.value && p.arduino)
      if (!sigue) {
        window.picasp.cancel()
        fwLog('✗ Programador desconectado — grabación interrumpida.', 'error')
        setFwRunning(false)
        setFwProgress(0, 'error')
      }
    })
  })

  modal.addEventListener('hide.bs.modal', () => {
    fwModalRunning = false
    setFwRunning(false)
    window.picasp.removeAvrdudeListeners()
    window.picasp.removePortsChangedListeners()
  })

  btnCheck.addEventListener('click', async () => {
    const port = selPort.value
    if (!port) {
      fwLog('⚠ Seleccioná un puerto.', 'warn'); return
    }
    currentVer.textContent = 'Verificando...'
    currentVer.style.color = 'var(--text-muted)'
    fwLog('Verificando firmware actual...', 'system')

    const result = await window.picasp.checkArduinoFw(port)
    if (result.ok) {
      currentVer.textContent = `v${result.version}`
      currentVer.style.color = 'var(--accent-green)'
      fwLog(`✓ Firmware actual: v${result.version}`, 'ok')
    } else {
      currentVer.textContent = 'No detectado'
      currentVer.style.color = 'var(--accent-yellow)'
      fwLog('⚠ No se detectó firmware PICasp — el Arduino puede estar vacío o con otro firmware.', 'warn')
    }
  })

  btnFlash.addEventListener('click', async () => {
    if (fwModalRunning) return
    const port = selPort.value

    if (!port) {
      fwLog('⚠ Seleccioná un puerto.', 'warn'); return
    }

    clearFwLog()
    setFwRunning(true)
    setFwProgress(0)
    fwLog(`▶ Grabando firmware PICasp en ${port}...`, 'info')
    fwLog('─'.repeat(45), 'system')

    window.picasp.removeAvrdudeListeners()
    window.picasp.onAvrdudeOutput(handleAvrdudeOutput)

    const result = await window.picasp.flashArduinoFw(port)

    if (!result.ok && result.error) {
      fwLog(`✗ ${result.error}`, 'error')
      setFwRunning(false)
      setFwProgress(0, 'error')
    }
  })

  function handleAvrdudeOutput(data) {
    const { type, line, exitCode } = data

    if (type === 'done') {
      setFwRunning(false)
      if (exitCode === 0) {
        setFwProgress(100, 'success')
        fwLog('─'.repeat(45), 'system')
        fwLog('✓ Firmware grabado exitosamente.', 'ok')
        fwLog('  Desconectá y reconectá el Arduino para que inicie como programador PICasp.', 'system')
        const port = selPort.value
        setTimeout(async () => {
          try {
            const r = await window.picasp.checkArduinoFw(port)
            if (r.ok) {
              document.getElementById('fw-current-version').textContent = `v${r.version}`
              document.getElementById('fw-current-version').style.color = 'var(--accent-green)'
            }
          } catch (_) {
            // Puerto desconectado despues de grabar 
          }
        }, 2000)
      } else {
        setFwProgress(0, 'error')
        fwLog('─'.repeat(45), 'system')
        fwLog('✗ La grabación falló.', 'error')
        fwLog('  Verificá que el Arduino esté en modo bootloader (reset reciente).', 'warn')
      }
      return
    }

    if (type === 'error') {
      fwLog(`✗ ${line}`, 'error')
      return
    }

    const progMatch = line.match(/(\d+)%/)
    if (progMatch) {
      setFwProgress(parseInt(progMatch[1]))
    }

    let cls = null
    if (/error|Error/i.test(line))   cls = 'error'
    else if (/done|verified|Thank/i.test(line)) cls = 'ok'
    else if (/warning/i.test(line))  cls = 'warn'

    fwLog(line, cls)
  }

  // ── Helpers ────────────────────────────────────────────────
  async function loadFwPorts() {
    const ports    = await window.picasp.getPorts()
    const prev     = selPort.value
    selPort.innerHTML = '<option value="">— Seleccionar —</option>'

    const arduinoPorts = ports.filter(p => p.arduino && !p.board)

    if (arduinoPorts.length === 0) {
      selPort.innerHTML += '<option value="" disabled>No se detectó Arduino USB-ICSP</option>'
      return
    }

    let autoSelected = null
    for (const p of arduinoPorts) {
      const opt       = document.createElement('option')
      opt.value       = p.path
      opt.textContent = `⚡ ${p.path} — USB-ICSP`
      selPort.appendChild(opt)
      if (!autoSelected) autoSelected = p.path
    }

    if (prev && arduinoPorts.find(p => p.path === prev)) {
      selPort.value = prev
    } else if (autoSelected) {
      selPort.value = autoSelected
    }
  }

  function fwLog(text, type = null) {
    const div       = document.createElement('div')
    div.className   = type ? `log-line ${type}` : 'log-line'
    div.textContent = text
    logContent.appendChild(div)
    document.getElementById('fw-log-container').scrollTop = 99999
  }

  function clearFwLog() {
    logContent.innerHTML = ''
    setFwProgress(0)
  }

  function setFwRunning(running) {
    fwModalRunning    = running
    btnFlash.disabled = running
    btnCheck.disabled = running
    selPort.disabled  = running
    document.getElementById('fw-btn-cancel-modal').disabled = !running
  }

  function setFwProgress(pct, state = null) {
    progressBar.style.width = `${pct}%`
    progressBar.classList.remove('success', 'error', 'running')
    if (state)   progressBar.classList.add(state)
    if (!state && pct > 0 && pct < 100) progressBar.classList.add('running')
  }
}

document.addEventListener('DOMContentLoaded', initFwModal)