// ============================================================
//  editor.js — PICasp-IDE v1.0.0
//  Monaco IDE — editor, explorador, compilación y grabación
// ============================================================

// ── Opciones de oscilador por chip ────────────────────────────
const OSC_OPTIONS = {
  // ── PICasp Boards ────────────────────────────────────────────
  picasp_board_2550: [
    { label: 'Cristal 16 MHz HS (Bootloader USB-Serial)', osc: 'HS', freq: 16000000 },
  ],
  picasp_board_252: [
    { label: 'Cristal 16 MHz HS (Bootloader USB-Serial)', osc: 'HS', freq: 16000000 },
  ],
  picasp_board_k22: [
    { label: 'Cristal 16 MHz HS (Bootloader USB-Serial)', osc: 'HS', freq: 16000000 },
  ],
  // ── PIC18F — DS41398B (K22) ──────────────────────────────────
  pic18f25k22: [
    { label: 'Cristal  4 MHz XT', osc: 'XT', freq: 4000000 },
    { label: 'Cristal  8 MHz HS', osc: 'HS', freq: 8000000 },
    { label: 'Cristal 16 MHz HS', osc: 'HS', freq: 16000000 },
    { label: 'Cristal 20 MHz HS', osc: 'HS', freq: 20000000 },
  ],
  // ── PIC18F con USB nativo (2455/2550/4455/4550) ──────────────
  pic18f2550: [
    { label: 'Interno  1 MHz', osc: 'INTOSC', freq: 1000000 },
    { label: 'Interno  2 MHz', osc: 'INTOSC', freq: 2000000 },
    { label: 'Interno  4 MHz', osc: 'INTOSC', freq: 4000000 },
    { label: 'Interno  8 MHz', osc: 'INTOSC', freq: 8000000 },
    { label: 'Cristal  4 MHz XT', osc: 'XT', freq: 4000000 },
    { label: 'Cristal  8 MHz XT', osc: 'XT', freq: 8000000 },
    { label: 'Cristal  8 MHz HS', osc: 'HS', freq: 8000000 },
    { label: 'Cristal 10 MHz HS', osc: 'HS', freq: 10000000 },
    { label: 'Cristal 12 MHz HS', osc: 'HS', freq: 12000000 },
    { label: 'Cristal 16 MHz HS', osc: 'HS', freq: 16000000 },
    { label: 'Cristal 20 MHz HS', osc: 'HS', freq: 20000000 },
    { label: 'Cristal 20 MHz HSPLL', osc: 'HSPLL', freq: 20000000 },
  ],
  pic18f4550: [
    { label: 'Interno  1 MHz', osc: 'INTOSC', freq: 1000000 },
    { label: 'Interno  2 MHz', osc: 'INTOSC', freq: 2000000 },
    { label: 'Interno  4 MHz', osc: 'INTOSC', freq: 4000000 },
    { label: 'Interno  8 MHz', osc: 'INTOSC', freq: 8000000 },
    { label: 'Cristal  4 MHz XT', osc: 'XT', freq: 4000000 },
    { label: 'Cristal  8 MHz XT', osc: 'XT', freq: 8000000 },
    { label: 'Cristal  8 MHz HS', osc: 'HS', freq: 8000000 },
    { label: 'Cristal 10 MHz HS', osc: 'HS', freq: 10000000 },
    { label: 'Cristal 12 MHz HS', osc: 'HS', freq: 12000000 },
    { label: 'Cristal 16 MHz HS', osc: 'HS', freq: 16000000 },
    { label: 'Cristal 20 MHz HS', osc: 'HS', freq: 20000000 },
    { label: 'Cristal 20 MHz HSPLL', osc: 'HSPLL', freq: 20000000 },
  ],
  pic18f2455: [
    { label: 'Interno  1 MHz', osc: 'INTOSC', freq: 1000000 },
    { label: 'Interno  2 MHz', osc: 'INTOSC', freq: 2000000 },
    { label: 'Interno  4 MHz', osc: 'INTOSC', freq: 4000000 },
    { label: 'Interno  8 MHz', osc: 'INTOSC', freq: 8000000 },
    { label: 'Cristal  4 MHz XT', osc: 'XT', freq: 4000000 },
    { label: 'Cristal  8 MHz XT', osc: 'XT', freq: 8000000 },
    { label: 'Cristal  8 MHz HS', osc: 'HS', freq: 8000000 },
    { label: 'Cristal 10 MHz HS', osc: 'HS', freq: 10000000 },
    { label: 'Cristal 12 MHz HS', osc: 'HS', freq: 12000000 },
    { label: 'Cristal 16 MHz HS', osc: 'HS', freq: 16000000 },
    { label: 'Cristal 20 MHz HS', osc: 'HS', freq: 20000000 },
    { label: 'Cristal 20 MHz HSPLL', osc: 'HSPLL', freq: 20000000 },
  ],
  pic18f4455: [
    { label: 'Interno  1 MHz', osc: 'INTOSC', freq: 1000000 },
    { label: 'Interno  2 MHz', osc: 'INTOSC', freq: 2000000 },
    { label: 'Interno  4 MHz', osc: 'INTOSC', freq: 4000000 },
    { label: 'Interno  8 MHz', osc: 'INTOSC', freq: 8000000 },
    { label: 'Cristal  4 MHz XT', osc: 'XT', freq: 4000000 },
    { label: 'Cristal  8 MHz XT', osc: 'XT', freq: 8000000 },
    { label: 'Cristal  8 MHz HS', osc: 'HS', freq: 8000000 },
    { label: 'Cristal 10 MHz HS', osc: 'HS', freq: 10000000 },
    { label: 'Cristal 12 MHz HS', osc: 'HS', freq: 12000000 },
    { label: 'Cristal 16 MHz HS', osc: 'HS', freq: 16000000 },
    { label: 'Cristal 20 MHz HS', osc: 'HS', freq: 20000000 },
    { label: 'Cristal 20 MHz HSPLL', osc: 'HSPLL', freq: 20000000 },
  ],

  // PIC18F252/452/242/442 - Solo cristal externo
  pic18f252: [
    { label: 'Cristal  4 MHz XT', osc: 'XT', freq: 4000000 },
    { label: 'Cristal  8 MHz XT', osc: 'XT', freq: 8000000 },
    { label: 'Cristal  8 MHz HS', osc: 'HS', freq: 8000000 },
    { label: 'Cristal 10 MHz HS', osc: 'HS', freq: 10000000 },
    { label: 'Cristal 12 MHz HS', osc: 'HS', freq: 12000000 },
    { label: 'Cristal 16 MHz HS', osc: 'HS', freq: 16000000 },
    { label: 'Cristal 20 MHz HS', osc: 'HS', freq: 20000000 },
  ],
  pic18f452: [
    { label: 'Cristal  4 MHz XT', osc: 'XT', freq: 4000000 },
    { label: 'Cristal  8 MHz XT', osc: 'XT', freq: 8000000 },
    { label: 'Cristal  8 MHz HS', osc: 'HS', freq: 8000000 },
    { label: 'Cristal 10 MHz HS', osc: 'HS', freq: 10000000 },
    { label: 'Cristal 12 MHz HS', osc: 'HS', freq: 12000000 },
    { label: 'Cristal 16 MHz HS', osc: 'HS', freq: 16000000 },
    { label: 'Cristal 20 MHz HS', osc: 'HS', freq: 20000000 },
  ],
  pic18f242: [
    { label: 'Cristal  4 MHz XT', osc: 'XT', freq: 4000000 },
    { label: 'Cristal  8 MHz XT', osc: 'XT', freq: 8000000 },
    { label: 'Cristal  8 MHz HS', osc: 'HS', freq: 8000000 },
    { label: 'Cristal 10 MHz HS', osc: 'HS', freq: 10000000 },
    { label: 'Cristal 12 MHz HS', osc: 'HS', freq: 12000000 },
    { label: 'Cristal 16 MHz HS', osc: 'HS', freq: 16000000 },
    { label: 'Cristal 20 MHz HS', osc: 'HS', freq: 20000000 },
  ],
  pic18f442: [
    { label: 'Cristal  4 MHz XT', osc: 'XT', freq: 4000000 },
    { label: 'Cristal  8 MHz XT', osc: 'XT', freq: 8000000 },
    { label: 'Cristal  8 MHz HS', osc: 'HS', freq: 8000000 },
    { label: 'Cristal 10 MHz HS', osc: 'HS', freq: 10000000 },
    { label: 'Cristal 12 MHz HS', osc: 'HS', freq: 12000000 },
    { label: 'Cristal 16 MHz HS', osc: 'HS', freq: 16000000 },
    { label: 'Cristal 20 MHz HS', osc: 'HS', freq: 20000000 },
  ],

  // PIC16F627A/628A/648A - Con oscilador interno 4 MHz
  pic16f627a: [
    { label: 'Interno  4 MHz', osc: 'INTOSC', freq: 4000000 },
    { label: 'Cristal  4 MHz XT', osc: 'XT', freq: 4000000 },
    { label: 'Cristal  8 MHz HS', osc: 'HS', freq: 8000000 },
    { label: 'Cristal 16 MHz HS', osc: 'HS', freq: 16000000 },
    { label: 'Cristal 20 MHz HS', osc: 'HS', freq: 20000000 },
  ],
  pic16f628a: [
    { label: 'Interno  4 MHz', osc: 'INTOSC', freq: 4000000 },
    { label: 'Cristal  4 MHz XT', osc: 'XT', freq: 4000000 },
    { label: 'Cristal  8 MHz HS', osc: 'HS', freq: 8000000 },
    { label: 'Cristal 16 MHz HS', osc: 'HS', freq: 16000000 },
    { label: 'Cristal 20 MHz HS', osc: 'HS', freq: 20000000 },
  ],
  pic16f648a: [
    { label: 'Interno  4 MHz', osc: 'INTOSC', freq: 4000000 },
    { label: 'Cristal  4 MHz XT', osc: 'XT', freq: 4000000 },
    { label: 'Cristal  8 MHz HS', osc: 'HS', freq: 8000000 },
    { label: 'Cristal 16 MHz HS', osc: 'HS', freq: 16000000 },
    { label: 'Cristal 20 MHz HS', osc: 'HS', freq: 20000000 },
  ],

  // PIC16F873A/874A/876A/877A - Solo cristal externo
  pic16f873a: [
    { label: 'Cristal  4 MHz XT', osc: 'XT', freq: 4000000 },
    { label: 'Cristal  8 MHz XT', osc: 'XT', freq: 8000000 },
    { label: 'Cristal  8 MHz HS', osc: 'HS', freq: 8000000 },
    { label: 'Cristal 10 MHz HS', osc: 'HS', freq: 10000000 },
    { label: 'Cristal 12 MHz HS', osc: 'HS', freq: 12000000 },
    { label: 'Cristal 16 MHz HS', osc: 'HS', freq: 16000000 },
    { label: 'Cristal 20 MHz HS', osc: 'HS', freq: 20000000 },
  ],
  pic16f874a: [
    { label: 'Cristal  4 MHz XT', osc: 'XT', freq: 4000000 },
    { label: 'Cristal  8 MHz XT', osc: 'XT', freq: 8000000 },
    { label: 'Cristal  8 MHz HS', osc: 'HS', freq: 8000000 },
    { label: 'Cristal 10 MHz HS', osc: 'HS', freq: 10000000 },
    { label: 'Cristal 12 MHz HS', osc: 'HS', freq: 12000000 },
    { label: 'Cristal 16 MHz HS', osc: 'HS', freq: 16000000 },
    { label: 'Cristal 20 MHz HS', osc: 'HS', freq: 20000000 },
  ],
  pic16f876a: [
    { label: 'Cristal  4 MHz XT', osc: 'XT', freq: 4000000 },
    { label: 'Cristal  8 MHz XT', osc: 'XT', freq: 8000000 },
    { label: 'Cristal  8 MHz HS', osc: 'HS', freq: 8000000 },
    { label: 'Cristal 10 MHz HS', osc: 'HS', freq: 10000000 },
    { label: 'Cristal 12 MHz HS', osc: 'HS', freq: 12000000 },
    { label: 'Cristal 16 MHz HS', osc: 'HS', freq: 16000000 },
    { label: 'Cristal 20 MHz HS', osc: 'HS', freq: 20000000 },
  ],
  pic16f877a: [
    { label: 'Cristal  4 MHz XT', osc: 'XT', freq: 4000000 },
    { label: 'Cristal  8 MHz XT', osc: 'XT', freq: 8000000 },
    { label: 'Cristal  8 MHz HS', osc: 'HS', freq: 8000000 },
    { label: 'Cristal 10 MHz HS', osc: 'HS', freq: 10000000 },
    { label: 'Cristal 12 MHz HS', osc: 'HS', freq: 12000000 },
    { label: 'Cristal 16 MHz HS', osc: 'HS', freq: 16000000 },
    { label: 'Cristal 20 MHz HS', osc: 'HS', freq: 20000000 },
  ],
}

// ── Estado global del IDE ─────────────────────────────────────
const ideState = {
  filePath: null,
  modified: false,
  building: false,
  xc8Path: null,
  projectDir: null,
  projectConfig: null,
  openTabs: [],
  _lastSaveTime: 0,    
}

window._ideState = ideState

const monacoModels = {}

let monacoEditor = null
let monacoReady = false

// ── Refs DOM lazy ─────────────────────────────────────────────
const ideSelChip = () => document.getElementById('np-chip')
const ideSelOsc = () => document.getElementById('np-osc')
const ideSelPort = () => document.getElementById('ide-sel-port')
const ideLogEl = () => document.getElementById('ide-log-content')
const ideErrEl = () => document.getElementById('ide-errors-content')
const ideStatEl = () => document.getElementById('ide-status-chip')
const ideCursorEl = () => document.getElementById('ide-cursor-pos')

// ══════════════════════════════════════════════════════════════
//  Helper: reemplaza prompt() — usa diálogo nativo via IPC
// ══════════════════════════════════════════════════════════════
async function idePrompt(label, defaultValue = '') {
  return await window.picasp.showInputDialog({
    title: 'PICasp IDE',
    label,
    defaultValue,
  })
}

// ══════════════════════════════════════════════════════════════
//  Oscilador
// ══════════════════════════════════════════════════════════════
function populateOscSelector(chip) {
  const sel = ideSelOsc()
  if (!sel) return
  const options = OSC_OPTIONS[chip] || []
  const prevLabel = sel.options[sel.selectedIndex]?.textContent || ''

  sel.innerHTML = ''

  if (options.length === 0) {
    const opt = document.createElement('option')
    opt.textContent = '— sin opciones —'
    sel.appendChild(opt)
    return
  }

  options.forEach((entry, i) => {
    const opt = document.createElement('option')
    opt.value = i
    opt.textContent = entry.label
    sel.appendChild(opt)
  })

  const prevIdx = options.findIndex(o => o.label === prevLabel)
  sel.selectedIndex = prevIdx >= 0 ? prevIdx : 0

  const hasIntosc = options.some(o => o.osc === 'INTOSC')
  const wasIntosc = prevLabel.includes('Interno')
  if (!hasIntosc && wasIntosc)
    ideLog(`⚠ ${chip.toUpperCase()} no tiene oscilador interno — seleccioná un cristal externo.`, 'warn')

  if (prevLabel !== '') {
    getChipWarnings(chip).forEach(w => ideLog(w.msg, w.type))
  }

  updateIDEStatusBar()
}

function getChipWarnings(chip) {
  const warnings = []
  const noADC = ['pic16f627a', 'pic16f628a', 'pic16f648a']
  const noUART = ['pic16f627a']
  const noMSSP = ['pic16f627a', 'pic16f628a', 'pic16f648a']
  const noPWM = ['pic16f627a', 'pic16f628a', 'pic16f648a']
  const hasEnhancedK = ['pic18f25k22']

  if (noADC.includes(chip))
    warnings.push({ msg: `ℹ ${chip.toUpperCase()}: analogRead, analogReadAvg no disponibles — sin ADC.`, type: 'system' })
  if (noUART.includes(chip))
    warnings.push({ msg: `ℹ ${chip.toUpperCase()}: Serial_* no disponible — sin UART.`, type: 'system' })
  if (noMSSP.includes(chip))
    warnings.push({ msg: `ℹ ${chip.toUpperCase()}: Wire_*, SPI_* no disponibles — sin módulo MSSP.`, type: 'system' })
  if (noPWM.includes(chip))
    warnings.push({ msg: `ℹ ${chip.toUpperCase()}: analogWrite no disponible — sin CCP/PWM.`, type: 'system' })
  if (hasEnhancedK.includes(chip))
    warnings.push({ msg: `ℹ ${chip.toUpperCase()}: Core mejorado — 2× EUSART, 2× MSSP, 5 timers. Solo cristal externo (XT/HS). LVP sin pin PGM.`, type: 'system' })

  return warnings
}

function getOscConfig() {
  const VALID_OSC = ['INTOSC', 'XT', 'HS']
  const osc = ideState.projectConfig?.oscillator
  const freq = ideState.projectConfig?.frequency
  const chip = ideState.projectConfig?.chip
  const k22NoIntosc = chip === 'pic18f25k22' && osc === 'INTOSC'
  const safeOsc = (!VALID_OSC.includes(osc) || k22NoIntosc) ? 'HS' : osc
  const safeFreq = (typeof freq === 'number' && freq > 0 && !k22NoIntosc) ? freq : 16000000

  return { osc: safeOsc, freq: safeFreq }
}

// ══════════════════════════════════════════════════════════════
//  Init
// ══════════════════════════════════════════════════════════════
async function initIDE() {
  await checkXC8()
  syncPortFromProgrammer()
  setupIDEEventListeners()
  renderFilesEmpty()
  setProjectUIState(false)   // ← garantiza estado correcto al arrancar
  ideLog('PICasp IDE — Listo.', 'system')

  setTimeout(() => {
    if (!monacoReady) {
      loadMonaco().then(() => {
        monacoReady = true
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            monacoEditor?.layout()
          })
        })
      })
    }
  }, 500)
}

// ── Monaco lazy init ──────────────────────────────────────────
async function ensureMonaco() {
  if (monacoReady) return
  ideLog('Iniciando editor...', 'system')
  await loadMonaco()
  monacoReady = true
}
window.ensureMonaco = ensureMonaco

// ══════════════════════════════════════════════════════════════
//  Monaco
// ══════════════════════════════════════════════════════════════

let _userClassNames = []

// ── Detección dinámica de clases y funciones de librerías ─────
async function updateLibraryTokens() {
  if (!ideState.projectDir) return

  const libDir = `${ideState.projectDir}/lib`
  const headers = []

  try {
    const tree = await window.picasp.fileTreeRead({ projectDir: libDir })
    if (!tree.ok) return

    const findHeaders = (nodes) => {
      for (const node of nodes) {
        if (!node.isDir && node.ext === '.h') headers.push(node.path)
        if (node.isDir) findHeaders(node.children)
      }
    }
    findHeaders(tree.tree)
  } catch (_) { return }

  const libClasses = []
  const libFunctions = []
  const libConstants = []
  const libHeaders = []

  for (const hPath of headers) {
    const res = await window.picasp.fileRead({ filePath: hPath })
    if (!res.ok) continue
    const content = res.content

    const classMatches = [...content.matchAll(/\bclass\s+([A-Z][A-Za-z0-9_]*)/g)]
    libClasses.push(...classMatches.map(m => m[1]))

    const fnMatches = [...content.matchAll(/^\s*(?:void|uint8_t|uint16_t|int8_t|int16_t|int32_t|uint32_t|float|double|bool|char|int)\s+([A-Za-z_][A-Za-z0-9_]*)\s*\(/gm)]
    libFunctions.push(...fnMatches.map(m => m[1]))

    const defMatches = [...content.matchAll(/^#define\s+([A-Z_][A-Z0-9_]{2,})/gm)]
    libConstants.push(...defMatches.map(m => m[1]))

    const prefixMatches = [...content.matchAll(
      /^\s*(?:void|uint8_t|uint16_t|uint32_t|int8_t|int16_t|int32_t|float|double|bool|char|int)\s+([A-Z][A-Z0-9]+)_[A-Za-z]/gm
    )]
    const prefixes = [...new Set(prefixMatches.map(m => m[1]))]
    libClasses.push(...prefixes)

    const sigMatches = [...content.matchAll(
      /^\s*(void|uint8_t|uint16_t|uint32_t|int8_t|int16_t|int32_t|float|double|bool|char|int)\s+([A-Z][A-Z0-9]+)_([A-Za-z][A-Za-z0-9_]*)\s*\(([^)]*)\)/gm
    )]
    for (const m of sigMatches) {
      const retType = m[1]
      const prefix = m[2]
      const method = m[3]
      const params = m[4].trim()

      const paramList = (params === 'void' || params === '')
        ? []
        : params.split(',').map(p => p.trim().split(/\s+/).pop().replace('*', ''))
      const snippet = paramList.map((p, i) => `\${${i + 1}:${p}}`).join(', ')

      libHeaders.push({
        label: `${prefix}.${method}`,
        detail: `${retType} ${prefix}.${method}(${params})`,
        insert: `${prefix}.${method}(${snippet})`,
      })
    }

  } 

  if (libClasses.length || libFunctions.length || libConstants.length) {
    monaco.languages.setMonarchTokensProvider('cpp', buildTokensProvider(
      [..._userClassNames, ...libClasses],
      libFunctions,
      libConstants
    ))
  }

  updateLibraryCompletions(libHeaders)
}

// ── Tokenizador parametrizado ─────────────────────────────────
function buildTokensProvider(userClasses = [], extraFunctions = [], extraConstants = []) {
  return {
    defaultToken: '',
    tokenPostfix: '.cpp',

    keywords: [
      'auto', 'break', 'case', 'char', 'const', 'continue', 'default', 'do',
      'double', 'else', 'enum', 'extern', 'float', 'for', 'goto', 'if', 'int',
      'long', 'register', 'return', 'short', 'signed', 'sizeof', 'static',
      'struct', 'switch', 'typedef', 'union', 'unsigned', 'void', 'volatile',
      'while', 'bool', 'true', 'false', 'NULL',
    ],

    types: [
      'uint8_t', 'uint16_t', 'uint32_t', 'uint64_t',
      'int8_t', 'int16_t', 'int32_t', 'int64_t',
      'pin_t', 'String',
    ],

    objects: [
      'Serial', 'Wire', 'SPI', 'EEPROM', 'DAC',
      ...userClasses,
    ],

    functions: [
      'setup', 'loop',
      'pinMode', 'digitalWrite', 'digitalRead', 'digitalToggle',
      'analogRead', 'analogWrite', 'analogReadAvg',
      'analogWriteClear',
      'delay', 'delayMicroseconds', 'millis', 'micros', 'pulseIn',
      'attachInterrupt', 'detachInterrupt',
      'tone', 'noTone',
      'shiftOut', 'shiftIn',
      'map_value', 'constrain_value',
      'toBCD', 'fromBCD',
      'Serial_printf',
    ],

    libfunctions: extraFunctions,

    constants: [
      'HIGH', 'LOW', 'INPUT', 'OUTPUT', 'INPUT_PULLUP',
      'RISING', 'FALLING', 'CHANGE',
      'MSBFIRST', 'LSBFIRST',
      'I2C_100K', 'I2C_400K',
      'SPI_MODE0', 'SPI_MODE1', 'SPI_MODE2', 'SPI_MODE3',
      'SPI_FOSC_4', 'SPI_FOSC_16', 'SPI_FOSC_64', 'SPI_FOSC_TMR2',
      'RA0', 'RA1', 'RA2', 'RA3', 'RA4', 'RA5',
      'RB0', 'RB1', 'RB2', 'RB3', 'RB4', 'RB5', 'RB6', 'RB7',
      'RC0', 'RC1', 'RC2', 'RC3', 'RC4', 'RC5', 'RC6', 'RC7',
      'RD0', 'RD1', 'RD2', 'RD3', 'RD4', 'RD5', 'RD6', 'RD7',
      'RE0', 'RE1', 'RE2',
      ...extraConstants,
    ],

    operators: [
      '=', '>>', '<<', '!', '~', '?', ':', '==', '<=', '>=', '!=',
      '&&', '||', '++', '--', '+', '-', '*', '/', '&', '|', '^', '%',
      '+=', '-=', '*=', '/=', '&=', '|=', '^=', '%=', '<<=', '>>=',
    ],

    symbols: /[=><!~?:&|+\-*\/\^%]+/,
    escapes: /\\(?:[abfnrtv\\"']|x[0-9A-Fa-f]{1,4}|u[0-9A-Fa-f]{4})/,

    tokenizer: {
      root: [
        [/[a-zA-Z_]\w*/, {
          cases: {
            '@keywords': 'keyword',
            '@types': 'type',
            '@objects': 'string',
            '@functions': 'keyword',
            '@libfunctions': 'lib-function',
            '@constants': 'number',
            '@default': 'identifier',
          }
        }],
        { include: '@whitespace' },
        [/[{}()\[\]]/, 'delimiter.bracket'],
        [/[<>](?!@symbols)/, 'delimiter.bracket'],
        [/@symbols/, {
          cases: {
            '@operators': 'operator',
            '@default': '',
          }
        }],
        [/\d*\.\d+([eE][\-+]?\d+)?[fFdD]?/, 'number.float'],
        [/0[xX][0-9a-fA-F]+[lL]?/, 'number.hex'],
        [/\d+[lL]?/, 'number'],
        [/"([^"\\]|\\.)*$/, 'string.invalid'],
        [/"/, { token: 'string.quote', next: '@string' }],
        [/'[^\\']'/, 'string'],
        [/#\s*\w+/, 'keyword.directive'],
      ],

      whitespace: [
        [/[ \t\r\n]+/, ''],
        [/\/\*/, 'comment', '@comment'],
        [/\/\/.*$/, 'comment'],
      ],

      comment: [
        [/[^\/*]+/, 'comment'],
        [/\/\*/, 'comment', '@push'],
        [/\*\//, 'comment', '@pop'],
        [/[\/*]/, 'comment'],
      ],

      string: [
        [/[^\\"]+/, 'string'],
        [/@escapes/, 'string.escape'],
        [/\\./, 'string.escape.invalid'],
        [/"/, { token: 'string.quote', next: '@pop' }],
      ],
    },
  }
}

function loadMonaco() {
  return new Promise(resolve => {
    require.config({
      paths: { vs: '../assets/monaco-editor/min/vs' }
    })
    require(['vs/editor/editor.main'], () => {

      monaco.editor.defineTheme('picasp-dark', {
        base: 'vs-dark', inherit: true,
        rules: [
          { token: 'comment', foreground: '5c6370', fontStyle: 'italic' },
          { token: 'keyword', foreground: '4cc9f0' },
          { token: 'keyword.directive', foreground: 'c678dd' },
          { token: 'type', foreground: 'e5c07b' },
          { token: 'number', foreground: 'ffd166' },
          { token: 'number.float', foreground: 'ffd166' },
          { token: 'number.hex', foreground: 'ffd166' },
          { token: 'string', foreground: '06d6a0' },
          { token: 'string.quote', foreground: '06d6a0' },
          { token: 'string.escape', foreground: '4cc9f0' },
          { token: 'delimiter.bracket', foreground: 'ffd166' },
          { token: 'delimiter', foreground: '94a3b8' },
          { token: 'operator', foreground: 'e06c75' },
          { token: 'identifier', foreground: 'e2e8f0' },
          { token: 'lib-function', foreground: 'ef476f' },
        ],
        colors: {
          'editor.background': '#0a0a14',
          'editor.foreground': '#e2e8f0',
          'editorLineNumber.foreground': '#4a5568',
          'editorCursor.foreground': '#4cc9f0',
          'editor.selectionBackground': '#4361ee44',
          'editor.lineHighlightBackground': '#1a1a2e',
          'editorGutter.background': '#0f0f1a',
        }
      })

      monaco.languages.setMonarchTokensProvider('cpp', buildTokensProvider())

      monacoEditor = monaco.editor.create(
        document.getElementById('monaco-container'),
        {
          language: 'cpp', theme: 'picasp-dark',
          fontSize: 15, fontFamily: "'Consolas', 'Courier New', monospace",
          lineNumbers: 'on', minimap: { enabled: false },
          scrollBeyondLastLine: false, automaticLayout: true,
          tabSize: 4, insertSpaces: true,
        }
      )

      registerHalCompletions()

      monacoEditor.onDidChangeCursorPosition(e => {
        const el = ideCursorEl()
        if (el) el.textContent = `Ln ${e.position.lineNumber}, Col ${e.position.column}`
      })

      monacoEditor.onDidChangeModelContent(() => {
        if (!ideState.modified) {
          ideState.modified = true
          updateIDETitle()
          const btnSave = document.getElementById('btn-ide-save')
          if (btnSave) btnSave.disabled = false
          if (ideState.filePath) markTabModified(ideState.filePath, true)
        }
      })

      monacoEditor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, saveCurrentFile)
      monacoEditor.addCommand(monaco.KeyCode.F5, () => buildProject(false))
      monacoEditor.addCommand(monaco.KeyCode.F6, () => buildProject(true))

      // Restaurar foco al restaurar la ventana desde minimizado
      window.addEventListener('focus', () => {
        if (monacoEditor && document.getElementById('panel-ide')?.classList.contains('active')) {
          setTimeout(() => monacoEditor.focus(), 150)
        }
      })

      resolve()
    })
  })
}

// ── Sugerencias dinámicas de librerías externas ───────────────
let _libCompletions = []

function updateLibraryCompletions(libHeaders) {
  _libCompletions = libHeaders || []
}

// ══════════════════════════════════════════════════════════════
//  HAL completions
// ══════════════════════════════════════════════════════════════
function registerHalCompletions() {
  const CHIP_CAPS = {
    pic16f627a:        { uart: false, adc: false, mssp: false, pwm: false, dac: false },
    pic16f628a:        { uart: true,  adc: false, mssp: false, pwm: false, dac: false },
    pic16f648a:        { uart: true,  adc: false, mssp: false, pwm: false, dac: false },
    pic16f873a:        { uart: true,  adc: true,  mssp: true,  pwm: true, dac: false },
    pic16f874a:        { uart: true,  adc: true,  mssp: true,  pwm: true, dac: false },
    pic16f876a:        { uart: true,  adc: true,  mssp: true,  pwm: true, dac: false },
    pic16f877a:        { uart: true,  adc: true,  mssp: true,  pwm: true, dac: false },
    pic18f242:         { uart: true,  adc: true,  mssp: true,  pwm: true, dac: false },
    pic18f252:         { uart: true,  adc: true,  mssp: true,  pwm: true, dac: false },
    pic18f442:         { uart: true,  adc: true,  mssp: true,  pwm: true, dac: false },
    pic18f452:         { uart: true,  adc: true,  mssp: true,  pwm: true, dac: false },
    pic18f2455:        { uart: true,  adc: true,  mssp: true,  pwm: true, dac: false },
    pic18f2550:        { uart: true,  adc: true,  mssp: true,  pwm: true, dac: false },
    pic18f4455:        { uart: true,  adc: true,  mssp: true,  pwm: true, dac: false },
    pic18f4550:        { uart: true,  adc: true,  mssp: true,  pwm: true, dac: false },
    pic18f25k22:       { uart: true,  adc: true,  mssp: true,  pwm: true, dac: true  },
    picasp_board_2550: { uart: true,  adc: true,  mssp: true,  pwm: true, dac: false },
    picasp_board_252:  { uart: true,  adc: true,  mssp: true,  pwm: true, dac: false },
    picasp_board_k22:  { uart: true,  adc: true,  mssp: true,  pwm: true, dac: true  },
  }

  const FNS = [
    // ── E/S digital ───────────────────────────────────────────
    { req: null, label: 'pinMode',        detail: 'void pinMode(pin, mode)',              insert: 'pinMode(${1:pin}, ${2:OUTPUT});' },
    { req: null, label: 'digitalWrite',   detail: 'void digitalWrite(pin, value)',        insert: 'digitalWrite(${1:pin}, ${2:HIGH});' },
    { req: null, label: 'digitalRead',    detail: 'uint8_t digitalRead(pin)',             insert: 'digitalRead(${1:pin})' },
    { req: null, label: 'digitalToggle',  detail: 'void digitalToggle(pin)',              insert: 'digitalToggle(${1:pin});' },

    // ── Tiempo ────────────────────────────────────────────────
    { req: null, label: 'delay',              detail: 'void delay(uint16_t ms)',              insert: 'delay(${1:ms});' },
    { req: null, label: 'delayMicroseconds',  detail: 'void delayMicroseconds(uint16_t us)', insert: 'delayMicroseconds(${1:us});' },
    { req: null, label: 'millis',             detail: 'uint32_t millis()',                   insert: 'millis()' },
    { req: null, label: 'micros',             detail: 'uint32_t micros()',                   insert: 'micros()' },
    { req: null, label: 'pulseIn',            detail: 'uint32_t pulseIn(pin, state, timeout)', insert: 'pulseIn(${1:pin}, ${2:HIGH}, ${3:1000000})' },

    // ── ADC ───────────────────────────────────────────────────
    { req: 'adc', label: 'analogRead',        detail: 'uint16_t analogRead(channel)',         insert: 'analogRead(${1:0})' },
    { req: 'adc', label: 'analogReadAvg',     detail: 'uint16_t analogReadAvg(channel, n)',   insert: 'analogReadAvg(${1:0}, ${2:8})' },
    { req: 'adc', label: 'analogReadVoltage', detail: 'uint16_t analogReadVoltage(channel)',  insert: 'analogReadVoltage(${1:0})' },

    // ── PWM ───────────────────────────────────────────────────
    { req: 'pwm', label: 'analogWrite',       detail: 'void analogWrite(pin, duty)',           insert: 'analogWrite(${1:RC2}, ${2:128});' },
    { req: 'pwm', label: 'analogWriteClear',  detail: 'void analogWriteClear(pin)',            insert: 'analogWriteClear(${1:RC2});' },
    { req: 'pwm', label: 'tone',              detail: 'void tone(pin, freq)',                  insert: 'tone(${1:RC2}, ${2:1000});' },
    { req: 'pwm', label: 'noTone',            detail: 'void noTone(pin)',                      insert: 'noTone(${1:RC2});' },

    // ── Serial — objeto ───────────────────────────────────────
    { req: 'uart', label: 'Serial.begin',      detail: 'void Serial.begin(baud)',                    insert: 'Serial.begin(${1:9600});' },
    { req: 'uart', label: 'Serial.print',      detail: 'void Serial.print(str)',                     insert: 'Serial.print(${1:"texto"});' },
    { req: 'uart', label: 'Serial.println',    detail: 'void Serial.println(str)',                   insert: 'Serial.println(${1:"texto"});' },
    { req: 'uart', label: 'Serial.printf',     detail: 'void Serial.printf(const char* fmt, ...)',   insert: 'Serial.printf("${1:formato}", ${2:valor})' },
    { req: 'uart', label: 'Serial.printInt',   detail: 'void Serial.printInt(val)',                  insert: 'Serial.printInt(${1:val});' },
    { req: 'uart', label: 'Serial.printFloat', detail: 'void Serial.printFloat(val, decimals)',      insert: 'Serial.printFloat(${1:val}, ${2:2});' },
    { req: 'uart', label: 'Serial.write',      detail: 'void Serial.write(byte)',                    insert: 'Serial.write(${1:byte});' },
    { req: 'uart', label: 'Serial.available',  detail: 'uint8_t Serial.available()',                 insert: 'Serial.available()' },
    { req: 'uart', label: 'Serial.read',       detail: 'uint8_t Serial.read()',                      insert: 'Serial.read()' },
    { req: 'uart', label: 'Serial.readLine',   detail: 'uint8_t Serial.readLine(buf, maxLen)',       insert: 'Serial.readLine(${1:buf}, ${2:sizeof(buf)})' },
    { req: 'uart', label: 'Serial.readInt',    detail: 'int32_t Serial.readInt()',                   insert: 'Serial.readInt()' },

    // ── Wire I2C — objeto ─────────────────────────────────────
    { req: 'mssp', label: 'Wire.begin',             detail: 'void Wire.begin(speed)',                     insert: 'Wire.begin(${1:I2C_100K});' },
    { req: 'mssp', label: 'Wire.beginSlave',        detail: 'void Wire.beginSlave(addr)',                 insert: 'Wire.beginSlave(${1:0x68});' },
    { req: 'mssp', label: 'Wire.beginTransmission', detail: 'void Wire.beginTransmission(addr)',          insert: 'Wire.beginTransmission(${1:0x68});' },
    { req: 'mssp', label: 'Wire.write',             detail: 'uint8_t Wire.write(data)',                   insert: 'Wire.write(${1:data});' },
    { req: 'mssp', label: 'Wire.endTransmission',   detail: 'uint8_t Wire.endTransmission()',             insert: 'Wire.endTransmission()' },
    { req: 'mssp', label: 'Wire.requestFrom',       detail: 'uint8_t Wire.requestFrom(addr, count)',      insert: 'Wire.requestFrom(${1:0x68}, ${2:1})' },
    { req: 'mssp', label: 'Wire.available',         detail: 'uint8_t Wire.available()',                   insert: 'Wire.available()' },
    { req: 'mssp', label: 'Wire.read',              detail: 'uint8_t Wire.read()',                        insert: 'Wire.read()' },
    { req: 'mssp', label: 'Wire.onReceive',         detail: 'void Wire.onReceive(callback)',              insert: 'Wire.onReceive(${1:onReceive});' },
    { req: 'mssp', label: 'Wire.onRequest',         detail: 'void Wire.onRequest(callback)',              insert: 'Wire.onRequest(${1:onRequest});' },
    { req: 'mssp', label: 'Wire.writeReg',          detail: 'uint8_t Wire.writeReg(addr, reg, val)',      insert: 'Wire.writeReg(${1:0x68}, ${2:reg}, ${3:val})' },
    { req: 'mssp', label: 'Wire.readReg',           detail: 'uint8_t Wire.readReg(addr, reg)',            insert: 'Wire.readReg(${1:0x68}, ${2:reg})' },
    { req: 'mssp', label: 'Wire.readRegWord',       detail: 'uint16_t Wire.readRegWord(addr, reg)',       insert: 'Wire.readRegWord(${1:0x68}, ${2:reg})' },
    { req: 'mssp', label: 'Wire.scan',              detail: 'void Wire.scan(callback)',                   insert: 'Wire.scan(${1:onDeviceFound});' },

    // ── SPI — objeto ──────────────────────────────────────────
    { req: 'mssp', label: 'SPI.begin',       detail: 'void SPI.begin(mode, speed)',          insert: 'SPI.begin(${1:SPI_MODE0}, ${2:SPI_FOSC_4});' },
    { req: 'mssp', label: 'SPI.transfer',    detail: 'uint8_t SPI.transfer(data)',           insert: 'SPI.transfer(${1:data})' },
    { req: 'mssp', label: 'SPI.end',         detail: 'void SPI.end()',                       insert: 'SPI.end();' },
    { req: 'mssp', label: 'SPI.write',       detail: 'void SPI.write(data)',                 insert: 'SPI.write(${1:data});' },
    { req: 'mssp', label: 'SPI.beginSlave',  detail: 'void SPI.beginSlave(mode)',            insert: 'SPI.beginSlave(${1:SPI_MODE0});' },
    { req: 'mssp', label: 'SPI.onReceive',   detail: 'void SPI.onReceive(callback)',         insert: 'SPI.onReceive(${1:onReceive});' },

    // ── EEPROM — objeto ───────────────────────────────────────
    { req: null, label: 'EEPROM.read',   detail: 'uint8_t EEPROM.read(addr)',          insert: 'EEPROM.read(${1:addr})' },
    { req: null, label: 'EEPROM.write',  detail: 'void EEPROM.write(addr, val)',       insert: 'EEPROM.write(${1:addr}, ${2:val});' },
    { req: null, label: 'EEPROM.update', detail: 'void EEPROM.update(addr, val)',      insert: 'EEPROM.update(${1:addr}, ${2:val});' },

    // ── DAC — solo PIC18F25K22 ────────────────────────────────
    { req: 'dac', label: 'DAC.begin', detail: 'void DAC.begin()',          insert: 'DAC.begin();' },
    { req: 'dac', label: 'DAC.write', detail: 'void DAC.write(value)',     insert: 'DAC.write(${1:15});' },
    { req: 'dac', label: 'DAC.stop',  detail: 'void DAC.stop()',           insert: 'DAC.stop();' },

    // ── Interrupciones ────────────────────────────────────────
    { req: null, label: 'attachInterrupt', detail: 'void attachInterrupt(pin, callback, mode)', insert: 'attachInterrupt(${1:RB0}, ${2:myISR}, ${3:FALLING});' },
    { req: null, label: 'detachInterrupt', detail: 'void detachInterrupt(pin)',                 insert: 'detachInterrupt(${1:RB0});' },

    // ── Utilidades ────────────────────────────────────────────
    { req: null, label: 'map_value',       detail: 'int32_t map_value(x, in_min, in_max, out_min, out_max)', insert: 'map_value(${1:x}, ${2:0}, ${3:1023}, ${4:0}, ${5:255})' },
    { req: null, label: 'constrain_value', detail: 'int32_t constrain_value(x, lo, hi)',                     insert: 'constrain_value(${1:x}, ${2:0}, ${3:255})' },
    { req: null, label: 'shiftOut',        detail: 'void shiftOut(dataPin, clkPin, bitOrder, value)',        insert: 'shiftOut(${1:dataPin}, ${2:clkPin}, ${3:MSBFIRST}, ${4:val});' },
    { req: null, label: 'shiftIn',         detail: 'uint8_t shiftIn(dataPin, clkPin, bitOrder)',             insert: 'shiftIn(${1:dataPin}, ${2:clkPin}, ${3:MSBFIRST})' },
    { req: null, label: 'toBCD',           detail: 'uint8_t toBCD(val)',                                     insert: 'toBCD(${1:val})' },
    { req: null, label: 'fromBCD',         detail: 'uint8_t fromBCD(bcd)',                                   insert: 'fromBCD(${1:bcd})' },
  ]

  const PINS = [
    'RA0', 'RA1', 'RA2', 'RA3', 'RA4', 'RA5',
    'RB0', 'RB1', 'RB2', 'RB3', 'RB4', 'RB5', 'RB6', 'RB7',
    'RC0', 'RC1', 'RC2', 'RC3', 'RC4', 'RC5', 'RC6', 'RC7',
    'RD0', 'RD1', 'RD2', 'RD3', 'RD4', 'RD5', 'RD6', 'RD7',
    'RE0', 'RE1', 'RE2',
  ]

  const CONSTS = [
    'INPUT', 'OUTPUT', 'INPUT_PULLUP', 'HIGH', 'LOW',
    'RISING', 'FALLING', 'CHANGE',
    'SPI_MODE0', 'SPI_MODE1', 'SPI_MODE2', 'SPI_MODE3',
    'SPI_FOSC_4', 'SPI_FOSC_16', 'SPI_FOSC_64', 'SPI_FOSC_TMR2',
    'I2C_100K', 'I2C_400K',
    'MSBFIRST', 'LSBFIRST',
  ]

  monaco.languages.registerCompletionItemProvider('cpp', {
    provideCompletionItems: (model, position) => {
      const word = model.getWordUntilPosition(position)
      const range = {
        startLineNumber: position.lineNumber, endLineNumber: position.lineNumber,
        startColumn: word.startColumn, endColumn: word.endColumn,
      }

      const chip = ideState.projectConfig?.chip || ideSelChip()?.value || 'pic18f2550'
      const caps = CHIP_CAPS[chip] || { uart: true, adc: true, mssp: true, pwm: true }
      const suggestions = []

      for (const fn of FNS) {
        if (fn.req !== null && !caps[fn.req]) continue
        suggestions.push({
          label: fn.label,
          kind: monaco.languages.CompletionItemKind.Function,
          detail: fn.detail,
          insertText: fn.insert,
          insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
          range,
        })
      }
      for (const pin of PINS)
        suggestions.push({ label: pin, kind: monaco.languages.CompletionItemKind.Constant, insertText: pin, range })
      for (const c of CONSTS)
        suggestions.push({ label: c, kind: monaco.languages.CompletionItemKind.EnumMember, insertText: c, range })

      for (const lib of _libCompletions) {
        suggestions.push({
          label: lib.label,
          kind: monaco.languages.CompletionItemKind.Function,
          detail: lib.detail,
          insertText: lib.insert,
          insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
          range,
        })
      }

      return { suggestions }
    }
  })
}

// ══════════════════════════════════════════════════════════════
//  XC8
// ══════════════════════════════════════════════════════════════
async function checkXC8() {
  const lbl = document.getElementById('xc8-label')
  const ind = document.getElementById('xc8-indicator')
  if (lbl) lbl.textContent = 'Buscando XC8...'
  if (ind) ind.className = 'indicator indicator-warn'

  const result = await window.picasp.checkXC8()
  if (result.ok) {
    ideState.xc8Path = result.path
    if (lbl) lbl.textContent = `XC8 v${result.version}`
    if (ind) ind.className = 'indicator indicator-ok'
    ideLog(`✓ XC8 v${result.version} — ${result.path}`, 'ok')
  } else {
    if (lbl) lbl.textContent = 'XC8 no encontrado'
    if (ind) ind.className = 'indicator indicator-err'
    ideLog('⚠ XC8 no encontrado. Instalá MPLAB XC8 de Microchip.', 'warn')
  }
}

// ══════════════════════════════════════════════════════════════
//  Sincronizar puerto con el panel Programador
// ══════════════════════════════════════════════════════════════
let _portSyncInitialized = false

function syncPortFromProgrammer() {
  if (_portSyncInitialized) return
  _portSyncInitialized = true

  const progPort = document.getElementById('sel-port')
  const idePort = document.getElementById('ide-sel-port')
  if (!progPort || !idePort) return

  progPort.addEventListener('change', () => {
    const progMode = ideState.projectConfig?.progMode || 'icsp'
    if (progMode === 'bootloader') return
    const match = [...idePort.options].find(o => o.value === progPort.value)
    if (match) idePort.value = progPort.value
  })

  idePort.addEventListener('change', () => {
    const progMode = ideState.projectConfig?.progMode || 'icsp'
    if (progMode === 'bootloader') return
    const match = [...progPort.options].find(o => o.value === idePort.value)
    if (match) progPort.value = idePort.value
  })

  refreshIDEPorts()
}

// ══════════════════════════════════════════════════════════════
//  Event listeners
// ══════════════════════════════════════════════════════════════
function setupIDEEventListeners() {
  document.getElementById('btn-ide-save').onclick = saveCurrentFile
  document.getElementById('btn-ide-build').onclick = () => buildProject(false)
  document.getElementById('btn-ide-build-flash').onclick = () => buildProject(true)
  document.getElementById('btn-ide-stop').onclick = cancelBuild
  document.getElementById('ide-btn-refresh-port').onclick = refreshIDEPorts
  document.getElementById('btn-ide-new-project').addEventListener('click', newProject)
  document.getElementById('btn-ide-open-project').addEventListener('click', openProject)
  document.getElementById('ide-sel-port').addEventListener('change', () => {
    if (ideState.projectDir && ideState.projectConfig) {
      ideState.projectConfig.port = document.getElementById('ide-sel-port').value
      window.picasp.projectSaveConfig({
        projectDir: ideState.projectDir,
        config: ideState.projectConfig,
      })
    }
  })

  document.querySelectorAll('.ide-sidebar-tab').forEach(tab => {
    tab.addEventListener('click', () => switchSideTab(tab.dataset.sidetab))
  })

  const resizer = document.getElementById('ide-sidebar-resizer')
  const sidebar = document.getElementById('ide-sidebar')
  let isResizing = false, startX = 0, startWidth = 0

  resizer.addEventListener('mousedown', e => {
    isResizing = true; startX = e.clientX; startWidth = sidebar.offsetWidth
    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'
    resizer.classList.add('active')
  })
  document.addEventListener('mousemove', e => {
    if (!isResizing) return
    const w = Math.min(window.innerWidth / 2, Math.max(300, startWidth + e.clientX - startX))
    sidebar.style.width = `${w}px`; sidebar.style.minWidth = `${w}px`
  })
  document.addEventListener('mouseup', () => {
    if (!isResizing) return
    isResizing = false
    document.body.style.cursor = ''; document.body.style.userSelect = ''
    resizer.classList.remove('active')
  })

  window.picasp.onPortsChanged(refreshIDEPorts)
}

// ── Refrescar puertos en el selector del IDE ──────────────────
async function refreshIDEPorts() {
  const ports = await window.picasp.getPorts()
  const el = document.getElementById('ide-sel-port')
  if (!el) return

  const prev = el.value
  const progMode = ideState.projectConfig?.progMode || 'icsp'

  el.innerHTML = '<option value="">— Puerto —</option>'
  let autoMatch = null

  for (const p of ports) {
    const opt = document.createElement('option')
    opt.value = p.path

    if (progMode === 'bootloader') {
      opt.textContent = `🔌 ${p.path} — PICasp Board (${p.adapterType})`
      opt.style.color = '#4cc9f0'
      if (!autoMatch) autoMatch = p.path
    } else {
      opt.textContent = `⚡ ${p.path} — USB-ICSP (${p.adapterType})`
      if (!autoMatch) autoMatch = p.path
    }

    el.appendChild(opt)
  }

  if (prev && ports.find(p => p.path === prev)) {
    el.value = prev
  } else if (autoMatch) {
    el.value = autoMatch
    const label = progMode === 'bootloader'
      ? `🔌 PICasp Board detectada en ${autoMatch}`
      : `⚡ Programador USB-ICSP detectado en ${autoMatch}`
    ideLog(label, 'ok')
  }
}

// ══════════════════════════════════════════════════════════════
//  Sistema de proyectos
// ══════════════════════════════════════════════════════════════

function showNewProjectModal() {
  return new Promise(resolve => {
    const modal = document.getElementById('new-project-modal')
    const inpName = document.getElementById('np-name')
    const selChip = document.getElementById('np-chip')
    const selOsc = document.getElementById('np-osc')
    const selProgMode = document.getElementById('np-prog-mode')
    const errSpan = document.getElementById('np-error')
    const btnOk = document.getElementById('np-btn-ok')
    const btnCancel = document.getElementById('np-btn-cancel')
    const BOARD_CHIPS = ['picasp_board_2550', 'picasp_board_252', 'picasp_board_k22']
    const BOARD_REAL_CHIP = {
      'picasp_board_2550': 'pic18f2550',
      'picasp_board_252': 'pic18f252',
      'picasp_board_k22': 'pic18f25k22',
    }

    // ═══════════════════════════════════════════════════════════
    //  Adaptar modo de grabación y oscilador según chip/board
    // ═══════════════════════════════════════════════════════════
    function updateModeForChip() {
      const chip = selChip.value
      const isBoard = BOARD_CHIPS.includes(chip)

      if (isBoard) {
        // ── Board con bootloader USB-Serial ─────────────────────
        selProgMode.value = 'bootloader'
        selProgMode.disabled = true

        // Forzar único oscilador disponible
        populateOscSelector(chip)
        selOsc.selectedIndex = 0
        selOsc.disabled = true
        selOsc.style.opacity = '0.6'

        const boardNames = {
          picasp_board_2550: 'PICasp Board 2550',
          picasp_board_252: 'PICasp Board 252',
          picasp_board_k22: 'PICasp Board K22',
        }
        errSpan.textContent = `ℹ ${boardNames[chip] || chip}: bootloader USB-Serial — 16 MHz HS`
        errSpan.style.color = '#4cc9f0'

      } else {
        // ── Chip normal: solo ICSP ──────────────────────────────
        selProgMode.value = 'icsp'
        selProgMode.disabled = true  

        populateOscSelector(chip)
        selOsc.disabled = false
        selOsc.style.opacity = '1'

        errSpan.textContent = ''
      }
    }

    updateModeForChip()

    selChip.addEventListener('change', updateModeForChip)

    modal.style.display = 'flex'
    inpName.value = ''
    inpName.focus()

    // ── Flag para garantizar cleanup único ────────────────────
    let _cleaned = false
    function cleanup() {
      if (_cleaned) return
      _cleaned = true
      modal.style.display = 'none'
      selChip.removeEventListener('change', updateModeForChip)
      document.removeEventListener('keydown', onKey)
      btnOk.onclick = null
      btnCancel.onclick = null
      modal.removeEventListener('click', onModalBackdrop)
    }

    // ── Cerrar al hacer click fuera del contenido del modal ───
    function onModalBackdrop(e) {
      if (e.target === modal) cancel()
    }
    modal.addEventListener('click', onModalBackdrop)

    function ok() {
      const name = inpName.value.trim()
      if (!name) {
        errSpan.textContent = 'El nombre no puede estar vacío.'
        errSpan.style.color = '#ef476f'
        inpName.focus()
        return
      }
      if (!/^[a-zA-Z0-9_\-]+$/.test(name)) {
        errSpan.textContent = 'Solo letras, números, guiones y guiones bajos.'
        errSpan.style.color = '#ef476f'
        inpName.focus()
        return
      }

      const selectedChip = selChip.value
      const isBoard = BOARD_CHIPS.includes(selectedChip)
      const realChip = isBoard ? BOARD_REAL_CHIP[selectedChip] : selectedChip
      const idx = parseInt(selOsc.value) || 0
      const opts = OSC_OPTIONS[selectedChip] || []
      const entry = opts[idx] || { osc: 'HSPLL', freq: 20000000 }

      errSpan.textContent = ''
      cleanup()
      resolve({
        projectName: name,
        chip: realChip,
        boardId: selectedChip,
        oscillator: entry.osc,
        frequency: entry.freq,
        progMode: selProgMode.value,
      })
    }

    function cancel() {
      if (_cleaned) return  
      cleanup()
      resolve(null)
    }

    function onKey(e) {
      if (e.key === 'Enter' && modal.style.display === 'flex') ok()
      if (e.key === 'Escape' && modal.style.display === 'flex') cancel()
    }

    btnOk.onclick = ok
    btnCancel.onclick = cancel
    document.addEventListener('keydown', onKey)
  })
}

async function newProject() {
  if (ideState.building) {
    ideLog('⚠ Hay una compilación en curso. Cancelala primero.', 'warn')
    return
  }

  if (ideState.projectDir) {
    await closeProject()
  }

  const result = await showNewProjectModal()
  if (!result) return

  const folderPath = await window.picasp.openFolderDialog()
  if (!folderPath) return

  const res = await window.picasp.projectNew({
    projectName: result.projectName,
    folderPath,
    chip: result.chip,
    boardId: result.boardId,
    oscillator: result.oscillator,
    frequency: result.frequency,
    progMode: result.progMode || 'icsp',
  })

  if (!res.ok) { ideLog(`✗ ${res.error}`, 'error'); return }

  await loadProject(res.projectDir, {
    chip: result.chip,
    boardId: result.boardId || null,
    oscillator: result.oscillator,
    frequency: result.frequency,
    progMode: result.progMode || 'icsp',
    port: '',
    libraries: [],
  })
  await openFileInEditor(res.mainFile)
  ideLog(`✓ Proyecto "${result.projectName}" creado en ${res.projectDir}`, 'ok')
}

async function openProject() {
  if (ideState.building) {
    ideLog('⚠ Hay una compilación en curso. Cancelala primero.', 'warn')
    return
  }

  if (ideState.projectDir) {
    await closeProject()
    if (ideState.projectDir) return
  }

  const res = await window.picasp.projectOpen()
  if (!res) return
  if (!res.ok) { ideLog(`✗ ${res.error}`, 'error'); return }

  await loadProject(res.projectDir, res.config)
  const mainC = findFirstSourceFile(res.tree)
  if (mainC) await openFileInEditor(mainC)
  ideLog(`✓ Proyecto abierto: ${res.projectDir}`, 'ok')
}

function findFirstSourceFile(tree) {
  const ext = '.c'
  for (const node of tree) {
    if (!node.isDir && node.ext === ext) return node.path
    if (node.isDir && node.children.length) {
      const found = findFirstSourceFile(node.children)
      if (found) return found
    }
  }
  return null
}

async function loadProject(projectDir, config) {
  ideState.projectDir = projectDir
  ideState.projectConfig = config

  const portSel = document.getElementById('ide-sel-port')
  if (portSel && config.port) portSel.value = config.port

  await refreshIDEPorts()                 
  if (portSel && config.port) portSel.value = config.port

  startProjectWatcher(projectDir)
  setProjectUIState(true)
  await refreshFileTree()
  switchSideTab('files')
  updateIDETitle()
  updateIDEStatusBar()

  const session = config.session
  if (session?.openFiles?.length) {
    for (const filePath of session.openFiles) {
      // Verificar que el archivo existe antes de abrirlo
      const check = await window.picasp.fileRead({ filePath })
      if (check.ok) {
        await openFileInEditor(filePath)
      }
    }

    if (session.activeFile) {
      const checkActive = await window.picasp.fileRead({ filePath: session.activeFile })
      if (checkActive.ok) {
        await openFileInEditor(session.activeFile)
      }
    }
    ideLog(`✓ Sesión restaurada — ${session.openFiles.length} archivo(s).`, 'system')
  }

  await updateLibraryTokens()
}

function startProjectWatcher(projectDir) {

  stopProjectWatcher()

  window.picasp.watchProject(projectDir)

  window.picasp.onProjectRemoved(() => {
    ideLog('⚠ La carpeta del proyecto fue eliminada externamente. Cerrando proyecto.', 'warn')
    closeProject()
  })

  window.picasp.onProjectTreeChanged(({ filename }) => {
    // Ignorar archivos temporales del compilador (.p1, .d, .pre, .lst, .sym, .map)
    const tempExts = ['.p1', '.d', '.pre', '.lst', '.sym', '.map', '.cmf', '.elf']
    const ext = filename ? ('.' + filename.split('.').pop().toLowerCase()) : ''
    if (tempExts.includes(ext)) return

    refreshFileTree()
  })

  window.picasp.onProjectFileChanged(({ filename }) => {
    if (!ideState.filePath || !filename) return
    if (Date.now() - ideState._lastSaveTime < 1500) return

    const openName = ideState.filePath.split(/[\\/]/).pop()
    const changedName = filename.split(/[\\/]/).pop()

    if (openName === changedName && !ideState.modified) {
      ideLog(`⚠ "${openName}" fue modificado externamente. Recargando...`, 'warn')
      reloadCurrentFile()
    } else if (openName === changedName && ideState.modified) {
      ideLog(`⚠ "${openName}" fue modificado externamente pero tenés cambios sin guardar — no se recargó.`, 'warn')
    }
  })
}

function stopProjectWatcher() {
  window.picasp.unwatchProject()
  window.picasp.removeProjectRemovedListeners()
  window.picasp.removeProjectTreeListeners()
  window.picasp.removeProjectFileListeners()
}

async function closeProject() {
  if (ideState.building) {
    ideLog('⚠ Hay una compilación en curso. Cancelala antes de cerrar el proyecto.', 'warn')
    return
  }

  const modifiedTabs = ideState.openTabs.filter(t => t.modified)
  if (modifiedTabs.length > 0) {
    const names = modifiedTabs.map(t => t.filePath.split(/[\\/]/).pop()).join(', ')
    const guardar = confirm(
      `Hay ${modifiedTabs.length} archivo(s) con cambios sin guardar:\n${names}\n\n¿Guardar antes de cerrar?`
    )
    if (guardar) {
      for (const tab of modifiedTabs) {
        await switchToTab(tab.filePath)
        await saveCurrentFile()
      }
    }
  }

  if (ideState.projectDir && ideState.projectConfig) {
    ideState.projectConfig.session = { openFiles: [], activeFile: null }
    await window.picasp.projectSaveConfig({
      projectDir: ideState.projectDir,
      config: ideState.projectConfig,
    }).catch(() => { })
  }

  stopProjectWatcher()

  ideState.projectDir = null
  ideState.projectConfig = null
  ideState.filePath = null
  ideState.modified = false

  Object.keys(monacoModels).forEach(key => {
    if (!monacoModels[key].isDisposed()) monacoModels[key].dispose()
    delete monacoModels[key]
  })

  if (monacoEditor) monacoEditor.setModel(null)

  ideState.openTabs = []
  renderTabs()
  updateIDETitle()
  updateIDEStatusBar()
  clearIDELog()
  setProjectUIState(false)
  renderFilesEmpty()
  switchSideTab('files')

  ideLog('Proyecto cerrado.', 'system')
}

// ── Recargar archivo activo desde disco ───────────────────────
async function reloadCurrentFile() {
  if (!ideState.filePath) return

  const res = await window.picasp.fileRead({ filePath: ideState.filePath })
  if (!res.ok) {
    ideLog(`✗ No se pudo recargar "${ideState.filePath.split(/[\\/]/).pop()}": ${res.error}`, 'error')
    return
  }

  const model = monacoEditor?.getModel()
  if (model) {
    model.setValue(res.content)
  }

  ideState.modified = false
  updateIDETitle()
}

// ══════════════════════════════════════════════════════════════
//  Explorador de archivos
// ══════════════════════════════════════════════════════════════

function setProjectUIState(projectOpen) {
  const filesToolbar = document.getElementById('ide-files-toolbar')
  if (filesToolbar) filesToolbar.style.display = projectOpen ? 'flex' : 'none'

    ;['btn-ide-save', 'btn-ide-build', 'btn-ide-build-flash',
      'ide-files-btn-newfile', 'ide-files-btn-newheader',
      'ide-files-btn-newfolder', 'ide-files-btn-refresh',
      'ide-files-btn-close', 'btn-ide-libs'].forEach(id => {
        const btn = document.getElementById(id)
        if (btn) btn.disabled = !projectOpen
      })

    ;['btn-ide-new-project', 'btn-ide-open-project'].forEach(id => {
      const btn = document.getElementById(id)
      if (btn) btn.disabled = projectOpen
    })


}

async function refreshFileTree() {
  if (!ideState.projectDir) return

  const res = await window.picasp.fileTreeRead({ projectDir: ideState.projectDir })
  if (!res.ok) return

  const nameSpan = document.getElementById('ide-files-project-name')
  if (nameSpan) nameSpan.textContent = ideState.projectDir.split(/[\\/]/).pop()

  const btnNewFile = document.getElementById('ide-files-btn-newfile')
  btnNewFile.onclick = () => createFile(`${ideState.projectDir}/src`, '.c')
  btnNewFile.title = 'Nuevo Archivo .c'
  btnNewFile.textContent = '📄'

  const btnNewHeader = document.getElementById('ide-files-btn-newheader')
  btnNewHeader.style.display = ''
  btnNewHeader.onclick = () => createFile(`${ideState.projectDir}/src`, '.h')

  document.getElementById('ide-files-btn-newfolder').onclick = () => createFolder(ideState.projectDir)
  document.getElementById('ide-files-btn-refresh').onclick = refreshFileTree
  document.getElementById('ide-files-btn-close').onclick = closeProject

  renderFileTree(res.tree, document.getElementById('ide-files-container'))
}

function renderFileTree(tree, container) {
  container.innerHTML = ''
  if (!tree.length) {
    container.innerHTML = '<div style="padding:10px;font-size:11px;color:var(--text-muted)">Carpeta vacía</div>'
    return
  }
  const ul = document.createElement('ul')
  ul.style.cssText = 'list-style:none;margin:0;padding:4px 0;'
  buildTreeNodes(tree, ul, 0)
  container.appendChild(ul)
}

function buildTreeNodes(nodes, parent, depth) {
  for (const node of nodes) {
    const li = document.createElement('li')
    li.style.cssText = 'padding:0;margin:0;'

    const row = document.createElement('div')
    row.className = 'file-tree-row'
    row.dataset.path = node.path
    row.style.paddingLeft = `${10 + depth * 14}px`

    const icon = node.isDir ? '📁' : fileIcon(node.ext)
    const arrow = node.isDir
      ? '<span class="ft-arrow">▶</span>'
      : '<span style="display:inline-block;width:12px"></span>'

    row.innerHTML = `${arrow}<span class="file-tree-icon">${icon}</span><span class="file-tree-name">${node.name}</span>`

    if (node.isDir) {
      row.addEventListener('click', e => {
        e.stopPropagation()
        const sub = li.querySelector('ul')
        const arrow = row.querySelector('.ft-arrow')
        if (sub) {
          const collapsed = sub.style.display === 'none'
          sub.style.display = collapsed ? '' : 'none'
          if (arrow) arrow.textContent = collapsed ? '▼' : '▶'
        }
      })
    } else {
      row.addEventListener('click', () => openFileInEditor(node.path))
    }

    row.addEventListener('contextmenu', e => {
      e.preventDefault()
      showContextMenu(e.clientX, e.clientY, node)
    })

    if (node.path === ideState.filePath) row.classList.add('active')

    li.appendChild(row)

    if (node.isDir && node.children.length) {
      const sub = document.createElement('ul')
      sub.style.cssText = 'list-style:none;margin:0;padding:0;display:none;' // ← colapsado por defecto
      buildTreeNodes(node.children, sub, depth + 1)
      li.appendChild(sub)
    }

    parent.appendChild(li)
  }
}

function fileIcon(ext) {
  const map = {
    '.c': '📄',
    '.cpp': '📄',
    '.h': '📋',
    '.hpp': '📋',
    '.hex': '⬡',
    '.json': '⚙️',
    '.md': '📝',
  }
  return map[ext] || '📃'
}

function renderFilesEmpty() {
  const nameSpan = document.getElementById('ide-files-project-name')
  const container = document.getElementById('ide-files-container')
  if (nameSpan) nameSpan.textContent = ''
  if (!container) return
  container.innerHTML = `
    <div class="ide-files-empty">
      <span>Iniciar Proyecto</span>
    </div>`
}

// ── Abrir archivo en Monaco ───────────────────────────────────
function renderTabs() {
  const bar = document.getElementById('ide-tabs-bar')
  if (!bar) return

  bar.style.display = ideState.openTabs.length > 0 ? 'flex' : 'none'

  bar.innerHTML = ''
  for (const tab of ideState.openTabs) {
    const el = document.createElement('div')
    el.className = 'ide-file-tab'
    el.dataset.path = tab.filePath
    if (tab.filePath === ideState.filePath) el.classList.add('active')
    if (tab.modified) el.classList.add('modified')

    const name = document.createElement('span')
    name.className = 'tab-name'
    name.textContent = tab.filePath.split(/[\\/]/).pop()

    const close = document.createElement('button')
    close.className = 'ide-tab-close'
    close.textContent = '×'
    close.title = 'Cerrar'
    close.addEventListener('click', e => {
      e.stopPropagation()
      closeTab(tab.filePath)
    })

    el.appendChild(name)
    el.appendChild(close)
    el.addEventListener('click', () => switchToTab(tab.filePath))
    bar.appendChild(el)
  }
}

function addTab(filePath) {
  const exists = ideState.openTabs.find(t => t.filePath === filePath)
  if (!exists) {
    ideState.openTabs.push({ filePath, modified: false })
  }
  renderTabs()
}

function removeTab(filePath) {
  ideState.openTabs = ideState.openTabs.filter(t => t.filePath !== filePath)
  renderTabs()
}

function markTabModified(filePath, modified) {
  const tab = ideState.openTabs.find(t => t.filePath === filePath)
  if (tab) { tab.modified = modified; renderTabs() }
}

async function switchToTab(filePath) {
  if (filePath === ideState.filePath) return
  await openFileInEditor(filePath)
}

async function closeTab(filePath) {
  const tab = ideState.openTabs.find(t => t.filePath === filePath)
  if (!tab) return

  if (tab.modified) {
    const fileName = filePath.split(/[\\/]/).pop()
    const guardar = confirm(`"${fileName}" tiene cambios sin guardar.\n\n¿Guardar antes de cerrar?`)
    if (guardar) {
      if (ideState.filePath !== filePath) await switchToTab(filePath)
      await saveCurrentFile()
    }

    saveSessionState()
  }

  removeTab(filePath)

  if (ideState.filePath === filePath) {
    if (ideState.openTabs.length > 0) {
      await switchToTab(ideState.openTabs[ideState.openTabs.length - 1].filePath)
    } else {
      ideState.filePath = null
      ideState.modified = false
      monacoEditor?.setModel(null)
      updateIDETitle()
      document.getElementById('btn-ide-save').disabled = true
    }
  }
}

async function openFileInEditor(filePath) {
  if (!filePath) return
  await ensureMonaco()

  const res = await window.picasp.fileRead({ filePath })
  if (!res.ok) { ideLog(`✗ No se pudo abrir: ${filePath}`, 'error'); return }

  const ext = filePath.split('.').pop().toLowerCase()
  const lang = (ext === 'c' || ext === 'h')
    ? 'cpp'
    : ext === 'json' ? 'json'
      : 'plaintext'
  const uri = monaco.Uri.file(filePath)
  const uriStr = uri.toString()

  let model = monacoModels[uriStr]
  if (!model || model.isDisposed()) {
    model = monaco.editor.createModel(res.content, lang, uri)
    monacoModels[uriStr] = model
  } else {
    if (model.getValue() !== res.content) model.setValue(res.content)
  }

  monacoEditor.setModel(model)
  ideState.filePath = filePath
  ideState.modified = false
  updateIDETitle()
  addTab(filePath)
  renderTabs()
  saveSessionState()

  document.querySelectorAll('.file-tree-row.active').forEach(r => r.classList.remove('active'))
  try {
    const sel = `.file-tree-row[data-path="${filePath.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"]`
    document.querySelector(sel)?.classList.add('active')
  } catch (_) { }
}

// ── Guardar archivo activo ────────────────────────────────────
async function saveCurrentFile() {
  if (!monacoEditor) return
  const content = monacoEditor.getValue()

  if (ideState.filePath) {
    ideState._lastSaveTime = Date.now()

    const res = await window.picasp.fileWrite({ filePath: ideState.filePath, content })
    if (res.ok) {
      ideState.modified = false
      updateIDETitle()
      document.getElementById('btn-ide-save').disabled = true
      markTabModified(ideState.filePath, false)
      ideLog(`Guardado: ${ideState.filePath}`, 'system')
    } else {
      ideLog(`✗ Error al guardar: ${res.error}`, 'error')
    }
  } else {
    if (ideState.projectDir) {
      const name = await idePrompt('Nombre del archivo:', 'main.c')
      if (!name?.trim()) return
      const filePath = `${ideState.projectDir}/src/${name.trim()}`
      const res = await window.picasp.fileWrite({ filePath, content })
      if (res.ok) {
        ideState.filePath = filePath
        ideState.modified = false
        updateIDETitle()
        document.getElementById('btn-ide-save').disabled = true
        markTabModified(ideState.filePath, false)
        await refreshFileTree()
        ideLog(`Guardado en proyecto: ${filePath}`, 'system')
      }
    } else {
      ideLog('⚠ No hay proyecto abierto. Creá un proyecto antes de guardar.', 'warn')
    }
  }
}

// ── Persistir sesión en picasp.json ──────────────────────────
let _saveSessionTimer = null

function saveSessionState() {
  if (!ideState.projectDir || !ideState.projectConfig) return
  ideState.projectConfig.session = {
    openFiles: ideState.openTabs.map(t => t.filePath),
    activeFile: ideState.filePath || null,
  }

  if (_saveSessionTimer) clearTimeout(_saveSessionTimer)
  _saveSessionTimer = setTimeout(() => {
    window.picasp.projectSaveConfig({
      projectDir: ideState.projectDir,
      config: ideState.projectConfig,
    }).catch(() => { })
    _saveSessionTimer = null
  }, 500)
}

// ── Menú contextual ───────────────────────────────────────────
function showContextMenu(x, y, node) {
  document.getElementById('file-context-menu')?.remove()

  const menu = document.createElement('div')
  menu.id = 'file-context-menu'
  menu.style.cssText = `
    position:fixed;left:${x}px;top:${y}px;z-index:9999;
    background:var(--bg-panel);border:1px solid var(--border-color);
    border-radius:6px;padding:4px 0;min-width:170px;
    font-size:12px;box-shadow:0 4px 14px rgba(0,0,0,.5);`

  const items = node.isDir
    ? [
      { label: '📄 Nuevo archivo .c', action: () => createFile(node.path, '.c') },
      { label: '📋 Nuevo archivo .h', action: () => createFile(node.path, '.h') },
      { label: '📁 Nueva carpeta', action: () => createFolder(node.path) },
      { sep: true },
      { label: '✏️ Renombrar', action: () => renameItem(node) },
      { label: '🗑️ Eliminar carpeta', action: () => deleteItem(node), danger: true },
    ]
    : [
      { label: '✏️ Renombrar', action: () => renameItem(node) },
      { label: '🗑️ Eliminar archivo', action: () => deleteItem(node), danger: true },
    ]

  for (const item of items) {
    if (item.sep) {
      const sep = document.createElement('div')
      sep.style.cssText = 'height:1px;background:var(--border-color);margin:3px 0;'
      menu.appendChild(sep)
      continue
    }
    const el = document.createElement('div')
    el.textContent = item.label
    el.style.cssText = `padding:5px 14px;cursor:pointer;
      color:${item.danger ? 'var(--accent-red)' : 'var(--text-primary)'};`
    el.addEventListener('mouseenter', () => el.style.background = 'var(--border-color)')
    el.addEventListener('mouseleave', () => el.style.background = '')
    el.addEventListener('click', () => { menu.remove(); item.action() })
    menu.appendChild(el)
  }

  document.body.appendChild(menu)
  const close = e => {
    if (!menu.contains(e.target)) { menu.remove(); document.removeEventListener('click', close) }
  }
  setTimeout(() => document.addEventListener('click', close), 0)
}

// ── Operaciones sobre archivos ────────────────────────────────
async function createFile(parentDir, ext) {
  const name = await idePrompt('Nombre del archivo (sin extensión):')
  if (!name?.trim()) return
  const res = await window.picasp.fileCreate({ parentDir, name: name.trim() + ext, isDir: false })
  if (res.ok) { await refreshFileTree(); await openFileInEditor(res.path) }
  else ideLog(`✗ ${res.error}`, 'error')
}

async function createFolder(parentDir) {
  const name = await idePrompt('Nombre de la carpeta:')
  if (!name?.trim()) return
  const res = await window.picasp.fileCreate({ parentDir, name: name.trim(), isDir: true })
  if (res.ok) await refreshFileTree()
  else ideLog(`✗ ${res.error}`, 'error')
}

async function renameItem(node) {
  const newName = await idePrompt('Nuevo nombre:', node.name)
  if (!newName?.trim() || newName === node.name) return

  const res = await window.picasp.fileRename({ oldPath: node.path, newName: newName.trim() })
  if (!res.ok) { ideLog(`✗ ${res.error}`, 'error'); return }

  if (!node.isDir) {
    const tabIdx = ideState.openTabs.findIndex(t => t.filePath === node.path)
    if (tabIdx !== -1) {
      const wasActive = ideState.filePath === node.path
      const wasModified = ideState.openTabs[tabIdx].modified

      ideState.openTabs[tabIdx].filePath = res.newPath

      const oldUri = monaco.Uri.file(node.path).toString()
      if (monacoModels[oldUri] && !monacoModels[oldUri].isDisposed()) {
        monacoModels[oldUri].dispose()
        delete monacoModels[oldUri]
      }

      if (wasActive) {
        ideState.filePath = res.newPath
        await openFileInEditor(res.newPath)
  
        if (wasModified) {
          ideState.modified = true
          markTabModified(res.newPath, true)
          updateIDETitle()
          document.getElementById('btn-ide-save').disabled = false
        }
      } else {
        renderTabs()
      }
    }
  }

  if (node.isDir) {
    const oldBase = node.path.replace(/\\/g, '/')
    const newBase = res.newPath.replace(/\\/g, '/')

    ideState.openTabs.forEach(tab => {
      const normalPath = tab.filePath.replace(/\\/g, '/')
      if (normalPath.startsWith(oldBase + '/')) {
        const newFilePath = newBase + normalPath.slice(oldBase.length)
        const oldUri = monaco.Uri.file(tab.filePath).toString()
        if (monacoModels[oldUri] && !monacoModels[oldUri].isDisposed()) {
          monacoModels[oldUri].dispose()
          delete monacoModels[oldUri]
        }

        tab.filePath = newFilePath
      }
    })

    if (ideState.filePath) {
      const normalActive = ideState.filePath.replace(/\\/g, '/')
      if (normalActive.startsWith(oldBase + '/')) {
        ideState.filePath = newBase + normalActive.slice(oldBase.length)
        await openFileInEditor(ideState.filePath)
      }
    }

    renderTabs()
  }

  await refreshFileTree()
}

async function deleteItem(node) {
  if (ideState.projectDir) {
    const normalProject = ideState.projectDir.replace(/\\/g, '/')
    const normalTarget = node.path.replace(/\\/g, '/')
    if (normalTarget === normalProject) {
      ideLog('⚠ No se puede eliminar la carpeta raíz del proyecto mientras está abierto. Cerrá el proyecto primero.', 'warn')
      return
    }
  }

  if (!confirm(`¿Eliminar "${node.name}"?\nEsta acción no se puede deshacer.`)) return

  const res = await window.picasp.fileDelete({ targetPath: node.path })
  if (!res.ok) { ideLog(`✗ ${res.error}`, 'error'); return }

  if (!node.isDir) {
    removeTab(node.path)
    if (ideState.filePath === node.path) {
      ideState.filePath = null
      ideState.modified = false
      monacoEditor?.setModel(null)
      updateIDETitle()
      document.getElementById('btn-ide-save').disabled = true
      if (ideState.openTabs.length > 0) {
        await switchToTab(ideState.openTabs[ideState.openTabs.length - 1].filePath)
      }
    }
  } else {
    const normalTarget = node.path.replace(/\\/g, '/')
    const tabsToClose = ideState.openTabs.filter(t =>
      t.filePath.replace(/\\/g, '/').startsWith(normalTarget + '/')
    )
    for (const tab of tabsToClose) {
      removeTab(tab.filePath)
    }

    if (ideState.filePath) {
      const normalActive = ideState.filePath.replace(/\\/g, '/')
      if (normalActive.startsWith(normalTarget + '/')) {
        ideState.filePath = null
        ideState.modified = false
        monacoEditor?.setModel(null)
        updateIDETitle()
        document.getElementById('btn-ide-save').disabled = true
        if (ideState.openTabs.length > 0) {
          await switchToTab(ideState.openTabs[ideState.openTabs.length - 1].filePath)
        }
      }
    }
  }

  await refreshFileTree()
}

// ══════════════════════════════════════════════════════════════
//  Build — con validación de proyecto
// ══════════════════════════════════════════════════════════════
async function buildProject(flashAfter = false) {
  if (ideState.building) return

  if (window.serialMonitor?.isConnected()) {
    const desconectar = confirm(
      'El Monitor Serie está conectado.\n\n' +
      '¿Desconectarlo para continuar con la grabación?'
    )
    if (desconectar) {
      await window.serialMonitor.disconnect()
    } else {
      ideLog('⚠ Grabación cancelada — desconectá el Monitor Serie primero.', 'warn')
      return
    }
  }

  if (!ideState.projectDir) {
    const crear = confirm(
      'No hay un proyecto abierto.\n\n' +
      '¿Querés crear un proyecto nuevo?\n' +
      '(Cancelar para abrir uno existente)'
    )
    if (crear) await newProject()
    else await openProject()
    if (!ideState.projectDir) {
      ideLog('⚠ Compilación cancelada — se requiere un proyecto abierto.', 'warn')
      return
    }
  }

  if (ideState.modified) await saveCurrentFile()

  if (!ideState.filePath) {
    ideLog('⚠ No hay archivo activo para compilar.', 'warn')
    return
  }

  const normalProject = ideState.projectDir.replace(/\\/g, '/')
  const normalFile = ideState.filePath.replace(/\\/g, '/')
  if (!normalFile.startsWith(normalProject)) {
    ideLog('⚠ El archivo activo está fuera del proyecto.', 'warn')
    return
  }

  if (!ideState.xc8Path) {
    ideLog('⚠ XC8 no encontrado. No se puede compilar.', 'error')
    return
  }

  const progMode = ideState.projectConfig?.progMode || 'icsp'

  if (progMode === 'bootloader') {
    const freq = ideState.projectConfig?.frequency || 0
    const osc = ideState.projectConfig?.oscillator || ''
    const chip = ideState.projectConfig?.chip || ''
    const validBootloader = (freq === 16000000 && osc === 'HS')

    if (!validBootloader) {
      clearIDELog()
      ideLog('═'.repeat(52), 'error')
      ideLog('⚠ ERROR: Configuración incompatible con bootloader USB-Serial', 'error')
      ideLog('═'.repeat(52), 'error')
      ideLog('', 'system')
      ideLog('El bootloader TinyBLD está grabado para 16 MHz HS.', 'warn')
      ideLog('Tu proyecto está configurado: ' + osc + ' @ ' + (freq >= 1000000 ? freq / 1000000 + ' MHz' : freq / 1000 + ' kHz'), 'warn')
      ideLog('', 'system')
      ideLog('Solución: cambiá el oscilador a "Cristal 16 MHz HS"', 'info')
      ideLog('═'.repeat(52), 'error')
      return
    }

    if (chip === 'pic18f25k22') {
      ideLog('ℹ Modo Bootloader USB-Serial K22: Cristal HS 16 MHz (fijo por bootloader)', 'system')
    } else {
      ideLog('ℹ Modo Bootloader USB-Serial: compilando con 16 MHz HS', 'system')
    }
  }

  const chip = ideState.projectConfig.chip
  const { osc, freq } = getOscConfig()
  const codeOffset = progMode === 'bootloader' ? 0x4000 : null
  const buildDir = ideState.projectDir.replace(/\\/g, '/') + '/build'
  const hexName = ideState.filePath.split(/[\\/]/).pop()
    .replace(/\.(c|cpp)$/i, '.hex')
  const hexOut = buildDir + '/' + hexName
  const oscLabel = `${osc} ${freq >= 1000000 ? freq / 1000000 + ' MHz' : freq / 1000 + ' kHz'}`

  clearIDELog()
  setBuilding(true)
  switchSideTab('log')

  ideLog(`▶ Compilando — ${chip?.toUpperCase()} | ${oscLabel} | ⚡ C99`, 'info')
  if (codeOffset) ideLog(`  Offset  : 0x${codeOffset.toString(16).toUpperCase().padStart(4, '0')} (bootloader USB-Serial)`, 'system')
  ideLog(`  Fuente : ${ideState.filePath.replace(/\\/g, '/')}`, 'system')
  ideLog(`  Salida : ${hexOut}`, 'system') 
  ideLog('─'.repeat(50), 'system')

  window.picasp.removeBuildListeners()
  window.picasp.removeFlashListeners()
  window.picasp.removeBLListeners()
  window.picasp.onBuildOutput(handleBuildOutput)

  const result = await window.picasp.runBuild({
    chip,
    srcFile: ideState.filePath,
    outHex: hexOut,
    fCpu: freq,
    oscillator: osc,
    xc8Path: ideState.xc8Path,
    codeOffset,
  })

  if (result.ok && flashAfter) {
    const flashPort = ideSelPort()?.value
    if (!flashPort || flashPort.trim() === '') {
      ideLog('⚠ No hay puerto seleccionado — grabación cancelada.', 'warn')
      ideLog('  Seleccioná un puerto en la barra del IDE y volvé a intentar.', 'system')
      setBuilding(false)
      return
    }
    ideLog('─'.repeat(50), 'system')
    ideLog('▶ Iniciando grabación...', 'info')
    ideLog(`  Puerto  : ${flashPort}`, 'system')
    window.picasp.removeOutputListeners()
    window.picasp.onOutput(handleFlashOutput)
    await window.picasp.runFlash({
      operation: 'flash',
      chip,
      port: flashPort,
      hexFile: hexOut,
      outFile: null,
      progMode,
    })
  } else if (result.ok && !flashAfter) {
    setBuilding(false)
  } else {
    setBuilding(false)
  }
}

function cancelBuild() {
  window.picasp.cancel()
  ideLog('Cancelado.', 'warn')
  setBuilding(false)
}

// ── Output handlers ───────────────────────────────────────────
function handleBuildOutput(data) {
  const { type, line, exitCode } = data
  if (type === 'done') {
    if (exitCode === 0) {
      ideLog('✓ Compilación exitosa.', 'ok')
      refreshFileTree()
    } else {
      ideLog('✗ Compilación fallida.', 'error')
      switchSideTab('log')
      parseIDEErrors()
      setBuilding(false)
    }
    return
  }
  if (type === 'error') {
    ideLog(line || 'Error desconocido en el proceso de compilación.', 'error')
    setBuilding(false)  
    return
  }

  if (type === 'stderr') { ideLog(line, 'error'); return }

  let cls = null
  if (/error:/i.test(line)) cls = 'error'
  else if (/warning:/i.test(line)) cls = 'warn'
  else if (/✓|OK/i.test(line)) cls = 'ok'
  ideLog(line, cls)
}

function handleFlashOutput(data) {
  const { type, line, exitCode } = data

  if (type === 'done') {
    setBuilding(false)
    if (exitCode === 0) ideLog('✓ Grabación exitosa.', 'ok')
    else ideLog('✗ Grabación fallida.', 'error')
    return
  }
  if (type === 'error') {
    ideLog(line || 'Error desconocido en el proceso de grabación.', 'error')
    setBuilding(false)
    return
  }
  if (type === 'stderr') { ideLog(line, 'error'); return }
  if (/\[([#\-]+)\]\s+(\d+)%/.test(line)) {
    const logEl = ideLogEl()
    if (!logEl) return
    const last = logEl.querySelector('.log-line.progress-line:last-child')
    if (last) last.textContent = line
    else ideLog(line, 'progress-line')
    return
  }
  let cls = null
  if (/error|FALLO/i.test(line)) cls = 'error'
  else if (/OK|✓/i.test(line)) cls = 'ok'
  else if (/warn/i.test(line)) cls = 'warn'
  ideLog(line, cls)
}

function parseIDEErrors() {
  const logEl = ideLogEl()
  const errEl = ideErrEl()
  const section = document.getElementById('ide-errors-section')
  if (!logEl || !errEl) return

  const lines = logEl.querySelectorAll('.log-line.error, .log-line.warn')
  errEl.innerHTML = ''

  if (!lines.length) {
    section?.classList.add('d-none')
    return
  }

  section?.classList.remove('d-none')
  lines.forEach(l => {
    const div = document.createElement('div')
    div.className = `ide-error-item ${l.classList.contains('error') ? 'error' : 'warn'}`
    div.textContent = l.textContent
    const m = l.textContent.match(/:(\d+):/)
    if (m) {
      div.classList.add('clickable')
      const lineNo = parseInt(m[1])
      div.addEventListener('click', () => {
        monacoEditor?.revealLineInCenter(lineNo)
        monacoEditor?.setPosition({ lineNumber: lineNo, column: 1 })
        monacoEditor?.focus()
      })
    }
    errEl.appendChild(div)
  })
}

// ══════════════════════════════════════════════════════════════
//  UI helpers
// ══════════════════════════════════════════════════════════════
function setBuilding(building) {
  ideState.building = building
  document.getElementById('btn-ide-build').disabled = building
  document.getElementById('btn-ide-build-flash').disabled = building
  document.getElementById('btn-ide-stop').classList.toggle('d-none', !building)
}

function updateIDETitle() {
  const projectName = ideState.projectDir
    ? ideState.projectDir.split(/[\\/]/).pop()
    : null
  const filename = ideState.filePath
    ? ideState.filePath.split(/[\\/]/).pop()
    : 'sin archivo'
  const modified = ideState.modified ? ' •' : ''
  document.title = projectName
    ? `PICasp — ${projectName} / ${filename}${modified}`
    : `PICasp — ${filename}${modified}`
}

function updateIDEStatusBar() {
  const el = ideStatEl()
  if (!el) return

  const BOARD_LABELS = {
    picasp_board_2550: 'PICasp Board 2550',
    picasp_board_252: 'PICasp Board 252',
    picasp_board_k22: 'PICasp Board K22',
  }

  const chip = ideState.projectConfig?.chip?.toUpperCase() || ''
  const boardId = ideState.projectConfig?.boardId || null
  const osc = ideState.projectConfig?.oscillator || ''
  const freq = ideState.projectConfig?.frequency
  const progMode = ideState.projectConfig?.progMode || 'icsp'

  const freqLabel = freq ? (freq >= 1000000 ? `${freq / 1000000} MHz` : `${freq / 1000} kHz`) : ''
  const modeLabel = progMode === 'bootloader' ? ' | 🔌 USB-Serial' : ' | ⚡ ICSP'
  const chipLabel = boardId ? (BOARD_LABELS[boardId] || chip) : chip
  el.textContent = chip ? `${chipLabel} | ${osc} ${freqLabel}${modeLabel} | ⚡ C` : ''
}

function switchSideTab(tab) {
  document.querySelectorAll('.ide-sidebar-tab').forEach(t =>
    t.classList.toggle('active', t.dataset.sidetab === tab))
  document.getElementById('ide-log-container').classList.toggle('d-none', tab !== 'log')
  document.getElementById('ide-terminal-container').classList.toggle('d-none', tab !== 'terminal')
  document.getElementById('ide-files-panel').classList.toggle('d-none', tab !== 'files')
}

function ideLog(text, type = null) {
  const el = ideLogEl()
  if (!el) return
  const div = document.createElement('div')
  div.className = type ? `log-line ${type}` : 'log-line'
  div.textContent = text
  el.appendChild(div)
  const container = document.getElementById('ide-log-container')
  if (container) container.scrollTop = container.scrollHeight
}

function clearIDELog() {
  const logEl = ideLogEl()
  const errEl = ideErrEl()
  const section = document.getElementById('ide-errors-section')
  if (logEl) logEl.innerHTML = ''
  if (errEl) errEl.innerHTML = ''
  section?.classList.add('d-none')
}

// ══════════════════════════════════════════════════════════════
//  Arrancar
// ══════════════════════════════════════════════════════════════
initIDE()