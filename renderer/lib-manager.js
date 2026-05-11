// ============================================================
//  lib-manager.js — PICasp-IDE v1.0.0 
//  Gestor de librerías GitHub
// ============================================================

function initLibManager() {
  const modal          = document.getElementById('lib-modal')
  const inpUrl         = document.getElementById('lib-inp-url')
  const btnSearch      = document.getElementById('lib-btn-search')
  const urlError       = document.getElementById('lib-url-error')
  const versionGroup   = document.getElementById('lib-version-group')
  const selVersion     = document.getElementById('lib-sel-version')
  const btnInstall     = document.getElementById('lib-btn-install')
  const logHeader      = document.getElementById('lib-log-header')
  const logContainer   = document.getElementById('lib-log-container')
  const logContent     = document.getElementById('lib-log-content')
  const installedList  = document.getElementById('lib-installed-list')
  const btnClose       = document.getElementById('lib-btn-close-modal')
  const btnCancel      = document.getElementById('lib-btn-cancel')

  let currentRepo = null
  let bsModal     = null

  // ── Abrir modal ───────────────────────────────────────────────
  document.getElementById('btn-ide-libs').addEventListener('click', () => {
    resetForm()
    renderInstalled()
    if (!bsModal) bsModal = new bootstrap.Modal(modal, { backdrop: 'static', keyboard: false })
    bsModal.show()
  })

  btnClose.addEventListener('click',  () => bsModal?.hide())
  btnCancel.addEventListener('click', () => bsModal?.hide())

  // ── Buscar tags en GitHub ─────────────────────────────────────
  btnSearch.addEventListener('click', searchTags)
  inpUrl.addEventListener('keydown', e => { if (e.key === 'Enter') searchTags() })

  async function searchTags() {
    const url = inpUrl.value.trim()
    urlError.textContent = ''
    versionGroup.style.display = 'none'
    selVersion.innerHTML = '<option value="">— Seleccionar versión —</option>'
    currentRepo = null

    if (!url) {
      urlError.textContent = 'Ingresá una URL de GitHub.'
      return
    }

    const match = url.match(/github\.com\/([^/]+\/[^/]+)/)
    if (!match) {
      urlError.textContent = 'URL inválida. Ejemplo: https://github.com/usuario/libreria'
      return
    }

    const repo = match[1].replace(/\.git$/, '')
    btnSearch.disabled   = true
    btnSearch.textContent = '⏳'

    const result = await window.picasp.githubGetTags({ repo })

    btnSearch.disabled    = false
    btnSearch.textContent = '🔍 Buscar'

    if (!result.ok) {
      urlError.textContent = `✗ ${result.error}`
      return
    }

    if (result.tags.length === 0) {
      urlError.textContent = '⚠ Este repositorio no tiene tags/releases. Necesitás una versión etiquetada.'
      return
    }

    currentRepo = repo
    result.tags.forEach(tag => {
      const opt       = document.createElement('option')
      opt.value       = tag
      opt.textContent = tag
      selVersion.appendChild(opt)
    })

    versionGroup.style.display = 'flex'
  }

  // ── Instalar librería ─────────────────────────────────────────
  btnInstall.addEventListener('click', async () => {
    if (!currentRepo) return
    const version    = selVersion.value
    const projectDir = window._ideState?.projectDir

    if (!version)    { urlError.textContent = '⚠ Seleccioná una versión.'; return }
    if (!projectDir) { urlError.textContent = '⚠ No hay proyecto abierto.'; return }

    const libs     = window._ideState?.projectConfig?.libraries || []
    const repoName = currentRepo.split('/').pop()
    const exists   = libs.find(l => l.name === repoName)
    if (exists) {
      urlError.textContent = `⚠ "${repoName}" ya está instalada (${exists.version}). Eliminala primero para reinstalar.`
      return
    }

    logHeader.style.display    = 'block'
    logContainer.style.display = 'block'
    logContent.innerHTML       = ''
    btnInstall.disabled        = true
    btnSearch.disabled         = true

    libLog(`▶ Instalando ${repoName} @ ${version}...`, 'info')
    libLog(`  Repo: ${currentRepo}`, 'system')
    libLog('─'.repeat(40), 'system')

    const result = await window.picasp.libInstall({ repo: currentRepo, version, projectDir })

    if (result.ok) {
      libLog(`✓ Librería instalada en lib/${repoName}`, 'ok')

      if (!window._ideState.projectConfig.libraries)
        window._ideState.projectConfig.libraries = []

      window._ideState.projectConfig.libraries.push({
        name:    repoName,
        repo:    currentRepo,
        version,
      })

      await window.picasp.projectSaveConfig({
        projectDir,
        config: window._ideState.projectConfig,
      })

      libLog('✓ Registrada en picasp.json', 'system')
      renderInstalled()
      resetForm()

      if (typeof refreshFileTree === 'function') refreshFileTree()
      if (typeof updateLibraryTokens === 'function') updateLibraryTokens() 

    } else {
      libLog(`✗ Error: ${result.error}`, 'error')
    }

    btnInstall.disabled = false
    btnSearch.disabled  = false
  })

  // ── Renderizar librerías instaladas ───────────────────────────
  function renderInstalled() {
    const libs = window._ideState?.projectConfig?.libraries || []
    installedList.innerHTML = ''

    if (!libs.length) {
      installedList.innerHTML = '<div class="lib-empty">Sin librerías instaladas en este proyecto.</div>'
      return
    }

    for (const lib of libs) {
      const item = document.createElement('div')
      item.className = 'lib-item'
      item.innerHTML = `
        <span class="lib-item-name">📦 ${lib.name}</span>
        <span class="lib-item-version">${lib.version}</span>
        <span class="lib-item-repo">${lib.repo}</span>
        <button class="lib-item-remove" title="Eliminar">🗑️</button>
      `

      item.querySelector('.lib-item-remove').addEventListener('click', async () => {
        if (!confirm(`¿Eliminar la librería "${lib.name}"?\nSe borrará la carpeta lib/${lib.name} del proyecto.`)) return
        await removeLib(lib)
      })

      installedList.appendChild(item)
    }
  }

  // ── Eliminar librería ─────────────────────────────────────────
  async function removeLib(lib) {
    const projectDir = window._ideState?.projectDir
    if (!projectDir) return

    const result = await window.picasp.libRemove({ repo: lib.repo, projectDir })

    if (result.ok) {
      window._ideState.projectConfig.libraries =
        window._ideState.projectConfig.libraries.filter(l => l.name !== lib.name)

      await window.picasp.projectSaveConfig({
        projectDir,
        config: window._ideState.projectConfig,
      })

      renderInstalled()
      if (typeof refreshFileTree === 'function') refreshFileTree()
    } else {
      alert(`Error al eliminar: ${result.error}`)
    }
  }

  // ── Helpers ───────────────────────────────────────────────────
  function libLog(text, type = null) {
    const div       = document.createElement('div')
    div.className   = type ? `log-line ${type}` : 'log-line'
    div.textContent = text
    logContent.appendChild(div)
    logContainer.scrollTop = logContainer.scrollHeight
  }

  function resetForm() {
    inpUrl.value              = ''
    urlError.textContent      = ''
    versionGroup.style.display = 'none'
    logHeader.style.display   = 'none'
    logContainer.style.display = 'none'
    logContent.innerHTML      = ''
    selVersion.innerHTML      = '<option value="">— Seleccionar versión —</option>'
    currentRepo               = null
  }
}

document.addEventListener('DOMContentLoaded', initLibManager)