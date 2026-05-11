// ============================================================
//  bl-modal.js — PICasp-IDE v1.0.0 
//  Modal para grabar bootloader PICasp Boards
// ============================================================

let blModalRunning = false

function initBlModal() {
  const modal       = document.getElementById('bl-modal')
  const selPort     = document.getElementById('bl-sel-port')
  const selBoard    = document.getElementById('bl-sel-board')
  const btnRefresh  = document.getElementById('bl-btn-refresh')
  const btnFlash    = document.getElementById('bl-btn-flash')
  const logContent  = document.getElementById('bl-log-content')
  const progressBar = document.getElementById('bl-progress-bar')

  document.getElementById('btn-open-bl-modal').addEventListener('click', async () => {
    clearBlLog()
    await loadBlPorts()
    const existing = bootstrap.Modal.getInstance(modal)
    if (existing) existing.dispose()
    new bootstrap.Modal(modal, { backdrop: 'static', keyboard: false }).show()
  })

  btnRefresh.addEventListener('click', loadBlPorts)

    document.getElementById('bl-btn-cancel-modal').addEventListener('click', () => {
        if (blModalRunning) {
            window.picasp.cancel()
            blLog('⚠ Grabación cancelada por el usuario.', 'warn')
            setBlRunning(false)
            setBlProgress(0, 'error')
        }
        bootstrap.Modal.getInstance(modal)?.hide()
    })

    modal.addEventListener('show.bs.modal', () => {
        window.picasp.onPortsChanged(async () => {
            if (!blModalRunning) return
            const ports = await window.picasp.getPorts()
            const sigue = ports.find(p => p.path === selPort.value && p.arduino)
            if (!sigue) {
            window.picasp.cancel()
            blLog('✗ Programador desconectado — grabación interrumpida.', 'error')
            setBlRunning(false)
            setBlProgress(0, 'error')
            }
        })
    })

    modal.addEventListener('hide.bs.modal', () => {
        blModalRunning = false
        setBlRunning(false)
        window.picasp.removeBlListeners()
        window.picasp.removePortsChangedListeners()
    })

  btnFlash.addEventListener('click', async () => {
    if (blModalRunning) return
    const port  = selPort.value
    const board = selBoard.value

    if (!port)  { blLog('⚠ Seleccioná un puerto.', 'warn'); return }
    if (!board) { blLog('⚠ Seleccioná un bootloader.', 'warn'); return }

    clearBlLog()
    setBlRunning(true)
    setBlProgress(0)

    const boardLabels = {
      'bootloader-k22':  'PICasp Board K22',
      'bootloader-2550': 'PICasp Board 2550',
      'bootloader-252':  'PICasp Board 252',
    }
    blLog(`▶ Grabando ${boardLabels[board]} en ${port}...`, 'info')
    blLog('─'.repeat(45), 'system')

    window.picasp.removeBlListeners()
    window.picasp.onBlOutput(handleBlOutput)

    const result = await window.picasp.flashBootloader({ port, board })

    if (!result.ok && result.error) {
      blLog(`✗ ${result.error}`, 'error')
      setBlRunning(false)
      setBlProgress(0, 'error')
    }
  })

  function handleBlOutput(data) {
    const { type, line, exitCode } = data

    if (type === 'done') {
      setBlRunning(false)
      if (exitCode === 0) {
        setBlProgress(100, 'success')
        blLog('─'.repeat(45), 'system')
        blLog('✓ Bootloader grabado exitosamente.', 'ok')
        blLog('  Podés conectar la board via USB para programarla desde el IDE.', 'system')
      } else {
        setBlProgress(0, 'error')
        blLog('─'.repeat(45), 'system')
        blLog('✗ La grabación falló.', 'error')
        blLog('  Verificá que el programador USB-ICSP esté conectado y el chip alimentado.', 'warn')
      }
      return
    }

    if (type === 'error') { blLog(`✗ ${line}`, 'error'); return }

    const progMatch = line.match(/\[([#\-]+)\]\s+(\d+)%/)
    if (progMatch) {
      setBlProgress(parseInt(progMatch[2]))
      // Actualizar última línea de progreso en el log
      const lines = logContent.querySelectorAll('.log-line.progress-line')
      if (lines.length > 0) lines[lines.length - 1].textContent = `  ${line}`
      else blLog(line, 'progress-line')
      return
    }

    let cls = null
    if      (/error|FALLO/i.test(line))  cls = 'error'
    else if (/✓|OK|exitosa/i.test(line)) cls = 'ok'
    else if (/warn|⚠/i.test(line))      cls = 'warn'
    blLog(line, cls)
  }

  // ── Helpers ──────────────────────────────────────────────────
  async function loadBlPorts() {
    const ports = await window.picasp.getPorts()
    const prev  = selPort.value
    selPort.innerHTML = '<option value="">— Seleccionar —</option>'

    const icspPorts = ports.filter(p => p.arduino && !p.board)

    if (icspPorts.length === 0) {
      selPort.innerHTML += '<option value="" disabled>No se detectó PICasp USB-ICSP</option>'
      return
    }

    let autoSelected = null
    for (const p of icspPorts) {
      const opt       = document.createElement('option')
      opt.value       = p.path
      opt.textContent = `⚡ ${p.path} — USB-ICSP`
      selPort.appendChild(opt)
      if (!autoSelected) autoSelected = p.path
    }

    if (prev && icspPorts.find(p => p.path === prev)) {
      selPort.value = prev
    } else if (autoSelected) {
      selPort.value = autoSelected
    }
  }

  function blLog(text, type = null) {
    const div       = document.createElement('div')
    div.className   = type ? `log-line ${type}` : 'log-line'
    div.textContent = text
    logContent.appendChild(div)
    document.getElementById('bl-log-container').scrollTop = 99999
  }

  function clearBlLog() {
    logContent.innerHTML = ''
    setBlProgress(0)
  }

  function setBlRunning(running) {
    blModalRunning      = running
    btnFlash.disabled   = running
    btnRefresh.disabled = running
    selPort.disabled    = running
    selBoard.disabled   = running
    document.getElementById('bl-btn-cancel-modal').disabled = !running
  }

  function setBlProgress(pct, state = null) {
    progressBar.style.width = `${pct}%`
    progressBar.classList.remove('success', 'error', 'running')
    if (state) progressBar.classList.add(state)
    if (!state && pct > 0 && pct < 100) progressBar.classList.add('running')
  }
}

document.addEventListener('DOMContentLoaded', initBlModal)