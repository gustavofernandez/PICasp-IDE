// ============================================================
//  xc8-modal.js — PICasp-IDE v1.0.0 
//  Modal para instalar MPLAB XC8
// ============================================================

const XC8_DOWNLOAD_URL = 'https://ww1.microchip.com/downloads/aemDocuments/documents/DEV/ProductDocuments/SoftwareTools/xc8-v3.10-full-install-windows-x64-installer.exe'
const XC8_VERSION      = 'v3.10'

function initXc8Modal() {
  const modal       = document.getElementById('xc8-modal')
  const btnOpen     = document.getElementById('btn-open-xc8-modal')
  const btnDownload = document.getElementById('xc8-btn-download')
  const logContent  = document.getElementById('xc8-log-content')
  const statusEl    = document.getElementById('xc8-modal-status')
  const progressBar = document.getElementById('xc8-progress-bar')

  let isRunning = false

  // ── Abrir modal ───────────────────────────────────────────
  btnOpen.addEventListener('click', async () => {
    clearXc8Log()
    const existing = bootstrap.Modal.getInstance(modal)
    if (existing) existing.dispose()
    new bootstrap.Modal(modal, { backdrop: 'static', keyboard: false }).show()
    await checkXc8Status()
  })

  modal.addEventListener('hide.bs.modal', () => {
    if (isRunning) return
    window.picasp.removeXc8Listeners?.()
  })

  // ── Verificar si XC8 está instalado ──────────────────────
  async function checkXc8Status() {
    statusEl.textContent = 'Verificando...'
    statusEl.style.color = 'var(--text-muted)'

    const result = await window.picasp.checkXC8()

    if (result.ok) {
      statusEl.textContent = `✓ Instalado — ${result.version}`
      statusEl.style.color = 'var(--accent-green)'
      xc8Log('✓ MPLAB XC8 ya está instalado en este sistema.', 'ok')
      xc8Log(`  Versión : ${result.version}`, 'system')
      xc8Log(`  Ruta    : ${result.path}`, 'system')
      xc8Log('', 'system')
      xc8Log('No es necesario realizar ninguna acción.', 'system')
      xc8Log('PICasp utilizará esta instalación para compilar proyectos.', 'system')

      // ← Deshabilitar botón si ya está instalado
      btnDownload.disabled    = true
      btnDownload.textContent = '✓ Ya instalado'

    } else {
      statusEl.textContent = '✗ No instalado'
      statusEl.style.color = 'var(--accent-red)'
      xc8Log('⚠ MPLAB XC8 no está instalado.', 'warn')
      xc8Log('', 'system')
      xc8Log('Hacé clic en "Instalar XC8 v3.10" para descargarlo e instalarlo', 'system')
      xc8Log('automáticamente desde los servidores oficiales de Microchip.', 'system')
      xc8Log('', 'system')
      xc8Log('  • Tamaño aproximado: 200 MB', 'system')
      xc8Log('  • Reiniciá PICasp al finalizar.', 'system')

      // ← Habilitar botón solo si no está instalado
      btnDownload.disabled    = false
      btnDownload.textContent = '⬇ Instalar XC8'
    }
  }

  // ── Descargar e instalar XC8 ──────────────────────────────
  btnDownload.addEventListener('click', async () => {
    if (isRunning) return
    isRunning = true

    btnDownload.disabled = true
    setProgress(0)

    xc8Log('', 'system')
    xc8Log(`▶ Descargando MPLAB XC8 ${XC8_VERSION}...`, 'info')
    xc8Log(`  Fuente: ${XC8_DOWNLOAD_URL}`, 'system')
    xc8Log('─'.repeat(45), 'system')

    window.picasp.removeXc8Listeners?.()
    window.picasp.onXc8DownloadProgress(({ status, pct, error }) => {
      if (status === 'downloading') {
        setProgress(pct)
        statusEl.textContent = `Descargando... ${pct}%`
        statusEl.style.color = 'var(--text-muted)'
        // Actualizar última línea de progreso
        const lines = logContent.querySelectorAll('.log-line.progress-line')
        const bar   = '#'.repeat(Math.floor(pct / 5)) + '-'.repeat(20 - Math.floor(pct / 5))
        if (lines.length > 0) {
          lines[lines.length - 1].textContent = `  [${bar}] ${pct}%`
        } else {
          xc8Log(`  [${bar}] ${pct}%`, 'progress-line')
        }
      } else if (status === 'installing') {
        setProgress(100)
        statusEl.textContent = 'Instalando...'
        statusEl.style.color = 'var(--text-muted)'
        xc8Log('', 'system')
        xc8Log('▶ Instalando MPLAB XC8...', 'info')
        xc8Log('  Seguí el asistente si aparece en pantalla.', 'system')
      } else if (status === 'done') {
        isRunning = false
        btnDownload.disabled = false
        window.picasp.removeXc8Listeners?.()

        if (error) {
          setProgress(0, 'error')
          statusEl.textContent = '✗ Error en la instalación'
          statusEl.style.color = 'var(--accent-red)'
          xc8Log(`✗ Error: ${error}`, 'error')
          xc8Log('  Intentá descargarlo manualmente desde la página oficial.', 'system')
          btnDownload.textContent = `⬇ Reintentar`
        } else {
            setProgress(100, 'success')
            xc8Log('─'.repeat(45), 'system')
            xc8Log('✓ Instalador lanzado correctamente.', 'ok')
            xc8Log('  Completá la instalación en el asistente que se abrió.', 'system')
            xc8Log('  Seleccioná licencia "Free" cuando se solicite.', 'system')
            xc8Log('', 'system')
            xc8Log('⏳ Esperando que finalice la instalación...', 'system')
            btnDownload.textContent = '⏳ Instalando...'
            btnDownload.disabled    = true

            // Verificar cada 10 segundos si XC8 ya está instalado
            const pollInterval = setInterval(async () => {
                const check = await window.picasp.checkXC8()
                if (check.ok) {
                clearInterval(pollInterval)
                setProgress(100, 'success')
                statusEl.textContent = `✓ Instalado — ${check.version}`
                statusEl.style.color = 'var(--accent-green)'
                xc8Log('✓ MPLAB XC8 detectado correctamente.', 'ok')
                xc8Log(`  Versión : ${check.version}`, 'system')
                xc8Log(`  Ruta    : ${check.path}`, 'system')
                btnDownload.textContent = '✓ Instalado'

                // Solicitar reinicio
                const reiniciar = confirm(
                    '✓ MPLAB XC8 instalado correctamente.\n\n' +
                    '¿Reiniciar PICasp ahora para activar el compilador?'
                )
                if (reiniciar) {
                    window.picasp.relaunch()
                }
                }
            }, 10000)  
        }
      }
    })

    const res = await window.picasp.downloadXc8()
    if (!res.ok && res.error) {
      // Safety net — si el handler IPC no envió 'done'
      isRunning = false
      btnDownload.disabled = false
      setProgress(0, 'error')
      statusEl.textContent = '✗ Error'
      statusEl.style.color = 'var(--accent-red)'
      xc8Log(`✗ ${res.error}`, 'error')
      window.picasp.removeXc8Listeners?.()
    }
  })

  // ── Helpers ───────────────────────────────────────────────
  function xc8Log(text, type = null) {
    const div       = document.createElement('div')
    div.className   = type ? `log-line ${type}` : 'log-line'
    div.textContent = text
    logContent.appendChild(div)
    document.getElementById('xc8-log-container').scrollTop = 99999
    }

  function clearXc8Log() {
    logContent.innerHTML    = ''
    statusEl.textContent    = 'Verificando...'
    statusEl.style.color    = 'var(--text-muted)'
    btnDownload.textContent = '⬇ Instalar XC8 v3.10'
    btnDownload.disabled    = false   // se ajusta en checkXc8Status()
    isRunning               = false
    setProgress(0)
  }

  function setProgress(pct, state = null) {
    if (!progressBar) return
    progressBar.style.width = `${pct}%`
    progressBar.classList.remove('success', 'error', 'running')
    if (state) progressBar.classList.add(state)
    if (!state && pct > 0 && pct < 100) progressBar.classList.add('running')
  }
}

document.addEventListener('DOMContentLoaded', initXc8Modal)