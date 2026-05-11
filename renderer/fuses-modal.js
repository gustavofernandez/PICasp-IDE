// ============================================================
//  fuses-modal.js — PICasp-IDE v1.0.0 
//  Modal de configuración de fuses
// ============================================================

// ── Estado del modal ──────────────────────────────────────────
let fuseState = {
  chip:    null,
  config:  null,    // FUSES_BY_CHIP[chip]
  values:  {},      // { fieldId: numericValue }
  regVals: {},      // { addr: byteValue } — para PIC18F
}

// ── Abrir modal ───────────────────────────────────────────────
function openFusesModal(chip) {
  const config = FUSES_BY_CHIP[chip]
  if (!config) {
    alert(`No hay definición de fuses para ${chip}`)
    return
  }

  fuseState.chip    = chip
  fuseState.config  = config
  fuseState.values  = {}
  fuseState.regVals = {}

  renderModal(config, chip)

  if (typeof bootstrap === 'undefined') {
    console.error('Bootstrap no está disponible')
    alert('Error interno: Bootstrap no cargó correctamente.')
    return
  }

  const modalEl = document.getElementById('fuses-modal')
  if (!modalEl) {
    console.error('Elemento fuses-modal no encontrado en el DOM')
    return
  }

  const existing = bootstrap.Modal.getInstance(modalEl)
  if (existing) existing.dispose()

  const modal = new bootstrap.Modal(modalEl, { backdrop: true, keyboard: true })
  modal.show()
}

// ── Renderizar modal ──────────────────────────────────────────
function renderModal(config, chip) {
  const title   = document.getElementById('fuses-modal-title')
  const body    = document.getElementById('fuses-modal-body')
  const hexArea = document.getElementById('fuses-modal-hex')

  title.textContent = `Fuses — ${chip.toUpperCase()} (${config.dssheet})`

  body.innerHTML = ''

  if (config.family === 'pic16f') {
    renderPic16fFields(body, config)
    initPic16fValues(config)
  } else {
    renderPic18fFields(body, config)
    initPic18fValues(config)
  }

  updateHexDisplay()
}

// ── PIC16F — un solo config word ─────────────────────────────
function renderPic16fFields(container, config) {
  const table = document.createElement('div')
  table.className = 'fuse-table'

  for (const field of config.fields) {
    const row = document.createElement('div')
    row.className = 'fuse-row'

    const labelCol = document.createElement('div')
    labelCol.className = 'fuse-label'
    labelCol.innerHTML = `<span class="fuse-name">${field.label}</span>`
    if (field.tip) {
      const tip = document.createElement('span')
      tip.className   = 'fuse-tip'
      tip.textContent = field.tip
      labelCol.appendChild(tip)
    }

    const selectCol = document.createElement('div')
    selectCol.className = 'fuse-select-col'

    const sel = document.createElement('select')
    sel.className   = 'form-select form-select-sm fuse-select'
    sel.id          = `fuse-field-${field.id}`
    sel.dataset.fieldId = field.id

    for (const opt of field.options) {
      const o       = document.createElement('option')
      o.value       = opt.value
      o.textContent = opt.label
      sel.appendChild(o)
    }

    sel.addEventListener('change', () => {
      fuseState.values[field.id] = parseInt(sel.value)
      updateHexDisplay()
    })

    selectCol.appendChild(sel)
    row.appendChild(labelCol)
    row.appendChild(selectCol)
    table.appendChild(row)
  }

  container.appendChild(table)
}

function initPic16fValues(config) {
  for (const field of config.fields) {
    const defaultOpt = field.options[field.options.length - 1]
    fuseState.values[field.id] = defaultOpt.value
    const sel = document.getElementById(`fuse-field-${field.id}`)
    if (sel) sel.value = defaultOpt.value
  }
  updateHexDisplay()
}

// ── PIC18F — múltiples registros ─────────────────────────────
function renderPic18fFields(container, config) {
  for (const reg of config.registers) {
    const section = document.createElement('div')
    section.className = 'fuse-register-section'

    const regHeader = document.createElement('div')
    regHeader.className = 'fuse-register-header'
    regHeader.innerHTML =
      `<span class="fuse-reg-name">${reg.name}</span>` +
      `<span class="fuse-reg-addr">0x${reg.addr.toString(16).toUpperCase().padStart(6,'0')}</span>` +
      `<span class="fuse-reg-hex" id="reg-hex-${reg.addr}">0x${reg.blank.toString(16).toUpperCase().padStart(2,'0')}</span>`

    section.appendChild(regHeader)

    const table = document.createElement('div')
    table.className = 'fuse-table'

    for (const field of reg.fields) {
      const row = document.createElement('div')
      row.className = 'fuse-row'

      const labelCol = document.createElement('div')
      labelCol.className = 'fuse-label'
      labelCol.innerHTML = `<span class="fuse-name">${field.label}</span>`
      if (field.tip) {
        const tip = document.createElement('span')
        tip.className   = 'fuse-tip'
        tip.textContent = field.tip
        labelCol.appendChild(tip)
      }

      const selectCol = document.createElement('div')
      selectCol.className = 'fuse-select-col'

      const sel = document.createElement('select')
      sel.className         = 'form-select form-select-sm fuse-select'
      sel.id                = `fuse-field-${field.id}`
      sel.dataset.fieldId   = field.id
      sel.dataset.regAddr   = reg.addr

      for (const opt of field.options) {
        const o       = document.createElement('option')
        o.value       = opt.value
        o.textContent = opt.label
        sel.appendChild(o)
      }

      sel.addEventListener('change', () => {
        fuseState.values[field.id] = parseInt(sel.value)
        updateHexDisplay()
      })

      selectCol.appendChild(sel)
      row.appendChild(labelCol)
      row.appendChild(selectCol)
      table.appendChild(row)
    }

    section.appendChild(table)
    container.appendChild(section)
  }
}

function initPic18fValues(config) {
  for (const reg of config.registers) {
    fuseState.regVals[reg.addr] = reg.blank
    for (const field of reg.fields) {
      const defaultOpt = field.options[field.options.length - 1]
      fuseState.values[field.id] = defaultOpt.value
      const sel = document.getElementById(`fuse-field-${field.id}`)
      if (sel) sel.value = defaultOpt.value
    }
  }
  updateHexDisplay()
}

// ── Calcular hex desde fields ─────────────────────────────────
function calcHexFromFields() {
  const config = fuseState.config

  if (config.family === 'pic16f') {
    let word = config.blank
    for (const field of config.fields) {
      const val  = fuseState.values[field.id] ?? 0
      const bits = field.bits

      for (const b of bits) word &= ~(1 << b)

      if (bits.length === 1) {
        if (val) word |= (1 << bits[0])
      } else {
        for (let i = 0; i < bits.length; i++) {
          const bitIdx = bits[bits.length - 1 - i]
          if ((val >> i) & 1) word |= (1 << bitIdx)
        }
      }
    }
    return { word: word & config.mask }

  } else {
    const regs = {}
    for (const reg of config.registers) {
      let byte = reg.blank
      for (const field of reg.fields) {
        const val  = fuseState.values[field.id] ?? 0
        const bits = field.bits
        for (const b of bits) byte &= ~(1 << b)
        if (bits.length === 1) {
          if (val) byte |= (1 << bits[0])
        } else {
          for (let i = 0; i < bits.length; i++) {
            const bitIdx = bits[bits.length - 1 - i]
            if ((val >> i) & 1) byte |= (1 << bitIdx)
          }
        }
        byte &= reg.mask
      }
      regs[reg.addr] = byte
    }
    return { regs }
  }
}

// ── Actualizar display hex ────────────────────────────────────
function updateHexDisplay() {
  const result = calcHexFromFields()
  const config = fuseState.config

  if (config.family === 'pic16f') {
    const w   = result.word
    const hex = document.getElementById('fuses-hex-value')
    const bin = document.getElementById('fuses-bin-value')
    const bar = document.getElementById('fuses-bit-bar')
    if (hex) hex.textContent = `0x${w.toString(16).toUpperCase().padStart(4,'0')}`
    if (bin) bin.textContent = w.toString(2).padStart(14,'0')
    if (bar) renderBitBar(bar, w, 14)

  } else {
    for (const [addr, val] of Object.entries(result.regs)) {
      const span = document.getElementById(`reg-hex-${addr}`)
      if (span) span.textContent = `0x${val.toString(16).toUpperCase().padStart(2,'0')}`
    }
  
    const summary = document.getElementById('fuses-hex-value')
    if (summary) {
      const parts = Object.entries(result.regs)
        .map(([addr, val]) => {
          const reg = config.registers.find(r => r.addr == addr)
          return `${reg?.name || addr}: 0x${val.toString(16).toUpperCase().padStart(2,'0')}`
        })
        .join('  ')
      summary.textContent = parts
    }
  }
}

// ── Actualizar fields desde hex (entrada manual) ─────────────
function updateFieldsFromHex(hexStr) {
  const config = fuseState.config
  if (!config) return

  if (config.family === 'pic16f') {
    const w = parseInt(hexStr, 16)
    if (isNaN(w)) return

    for (const field of config.fields) {
      const bits = field.bits
      let val = 0
      if (bits.length === 1) {
        val = (w >> bits[0]) & 1
      } else {
        for (let i = 0; i < bits.length; i++) {
          const bitIdx = bits[bits.length - 1 - i]
          if ((w >> bitIdx) & 1) val |= (1 << i)
        }
      }
      fuseState.values[field.id] = val
      const sel = document.getElementById(`fuse-field-${field.id}`)
      if (sel) {
   
        let found = false
        for (const opt of field.options) {
          if (parseInt(opt.value) === val) {
            sel.value = opt.value
            found = true
            break
          }
        }
        if (!found) sel.value = field.options[0].value
      }
    }
  } else {
    const parts = hexStr.split(/\s+/)
    for (let i = 0; i < parts.length - 1; i++) {
      if (parts[i].endsWith(':')) {
        const regName = parts[i].slice(0, -1)
        const val     = parseInt(parts[i+1], 16)
        if (!isNaN(val)) {
          const reg = config.registers.find(r => r.name === regName)
          if (reg) {
            for (const field of reg.fields) {
              let fval = 0
              if (field.bits.length === 1) {
                fval = (val >> field.bits[0]) & 1
              } else {
                for (let j = 0; j < field.bits.length; j++) {
                  const bitIdx = field.bits[field.bits.length - 1 - j]
                  if ((val >> bitIdx) & 1) fval |= (1 << j)
                }
              }
              fuseState.values[field.id] = fval
              const sel = document.getElementById(`fuse-field-${field.id}`)
              if (sel) sel.value = fval
            }
          }
        }
      }
    }
  }

  updateHexDisplay()
}

// ── Render bit bar visual ─────────────────────────────────────
function renderBitBar(container, value, nbits) {
  container.innerHTML = ''
  for (let i = nbits - 1; i >= 0; i--) {
    const bit = document.createElement('div')
    bit.className   = `bit-cell ${(value >> i) & 1 ? 'bit-1' : 'bit-0'}`
    bit.textContent = (value >> i) & 1
    const lbl       = document.createElement('div')
    lbl.className   = 'bit-label'
    lbl.textContent = i
    const wrap      = document.createElement('div')
    wrap.className  = 'bit-wrap'
    wrap.appendChild(bit)
    wrap.appendChild(lbl)
    container.appendChild(wrap)
  }
}

// ── Construir payload para grabar ─────────────────────────────
function buildFusesPayload() {
    const config = fuseState.config
    const fields = {}

    if (config.family === 'pic16f') {
        for (const field of config.fields) {
            fields[field.id] = fuseState.values[field.id] ?? 0
        }
    } else {
        for (const reg of config.registers) {
            for (const field of reg.fields) {
                fields[field.id] = fuseState.values[field.id] ?? 0
            }
        }
    }

    return { fields }
}

// ── Grabar fuses ──────────────────────────────────────────────
async function writeFusesFromModal() {
  const payload = buildFusesPayload()
  const chip    = fuseState.chip

  const modalEl = document.getElementById('fuses-modal')
  const instance = bootstrap.Modal.getInstance(modalEl)
  if (instance) instance.hide()

  await window.handleOperationWithPayload('write-fuses-direct', chip, payload)
}

// ── Exportar para app.js ──────────────────────────────────────
window.fusesModal = {
  open:  openFusesModal,
  write: writeFusesFromModal,
}