// ============================================================
//  fuses-config.js — PICasp-IDE v1.0.0
//  Definición de fuses por familia y chip
// ============================================================

// Cada field tiene:
//   id:       identificador único
//   label:    nombre legible
//   bits:     array de posiciones de bit (MSb primero)
//   options:  array de { label, value } — value es el patrón de bits
//   tip:      descripción breve (opcional)

const FUSES_16F_41196 = {
  family:  'pic16f',
  dssheet: 'DS41196G',
  chips:   ['pic16f627a', 'pic16f628a', 'pic16f648a'],
  cfgAddr: 0x2007,
  blank:   0x3FFF,
  mask:    0x3FFF,
  fields: [
    {
      id: 'fosc', label: 'Oscillator (FOSC)', bits: [1, 0],
      tip: 'Oscillator selection',
      options: [
        { label: 'LP — Low Power Crystal',     value: 0b00 },
        { label: 'XT — Crystal / Resonator',   value: 0b01 },
        { label: 'HS — High Speed Crystal',    value: 0b10 },
        { label: 'RC — RC Oscillator',         value: 0b11 },
      ]
    },
    {
      id: 'wdte', label: 'Watchdog Timer (WDTE)', bits: [2],
      tip: 'WDT enabled/disabled',
      options: [
        { label: 'Disabled', value: 0 },
        { label: 'Enabled',  value: 1 },
      ]
    },
    {
      id: 'pwrte', label: 'Power-up Timer (PWRTE)', bits: [3],
      tip: 'PWRT enabled when bit = 0',
      options: [
        { label: 'Enabled  (bit=0)', value: 0 },
        { label: 'Disabled (bit=1)', value: 1 },
      ]
    },
    {
      id: 'mclre', label: 'MCLR Pin (MCLRE)', bits: [5],
      tip: 'MCLR pin function',
      options: [
        { label: 'RA5/MCLR is MCLR', value: 1 },
        { label: 'RA5/MCLR is I/O',  value: 0 },
      ]
    },
    {
      id: 'boren', label: 'Brown-out Reset (BOREN)', bits: [6],
      tip: 'BOR enabled/disabled',
      options: [
        { label: 'Disabled', value: 0 },
        { label: 'Enabled',  value: 1 },
      ]
    },
    {
      id: 'lvp', label: 'Low Voltage Programming (LVP)', bits: [7],
      tip: 'LVP on RB4/PGM pin',
      options: [
        { label: 'Disabled — RB4 is I/O', value: 0 },
        { label: 'Enabled  — RB4 is PGM', value: 1 },
      ]
    },
    {
      id: 'cpd', label: 'Data EE Protection (CPD)', bits: [8],
      tip: 'EEPROM data memory code protection',
      options: [
        { label: 'Protected',     value: 0 },
        { label: 'Not protected', value: 1 },
      ]
    },
    {
      id: 'cp', label: 'Code Protect (CP)', bits: [13],
      tip: 'Flash program memory code protection',
      options: [
        { label: 'Protected',     value: 0 },
        { label: 'Not protected', value: 1 },
      ]
    },
  ]
}

const FUSES_16F_39589 = {
  family:  'pic16f',
  dssheet: 'DS39589C',
  chips:   ['pic16f873a', 'pic16f874a', 'pic16f876a', 'pic16f877a'],
  cfgAddr: 0x2007,
  blank:   0x3FFF,
  mask:    0x3FFF,
  fields: [
    {
      id: 'fosc', label: 'Oscillator (FOSC)', bits: [1, 0],
      tip: 'Oscillator selection',
      options: [
        { label: 'LP — Low Power Crystal',   value: 0b00 },
        { label: 'XT — Crystal / Resonator', value: 0b01 },
        { label: 'HS — High Speed Crystal',  value: 0b10 },
        { label: 'RC — RC Oscillator',       value: 0b11 },
      ]
    },
    {
      id: 'wdte', label: 'Watchdog Timer (WDTE)', bits: [2],
      tip: 'WDT enabled/disabled',
      options: [
        { label: 'Disabled', value: 0 },
        { label: 'Enabled',  value: 1 },
      ]
    },
    {
      id: 'pwrte', label: 'Power-up Timer (PWRTE)', bits: [3],
      tip: 'PWRT enabled when bit = 0',
      options: [
        { label: 'Enabled  (bit=0)', value: 0 },
        { label: 'Disabled (bit=1)', value: 1 },
      ]
    },
    {
      id: 'boren', label: 'Brown-out Reset (BOREN)', bits: [6],
      tip: 'BOR enabled/disabled',
      options: [
        { label: 'Disabled', value: 0 },
        { label: 'Enabled',  value: 1 },
      ]
    },
    {
      id: 'lvp', label: 'Low Voltage Programming (LVP)', bits: [7],
      tip: 'LVP on RB3/PGM pin',
      options: [
        { label: 'Disabled — RB3 is I/O', value: 0 },
        { label: 'Enabled  — RB3 is PGM', value: 1 },
      ]
    },
    {
      id: 'cpd', label: 'Data EE Protection (CPD)', bits: [8],
      tip: 'EEPROM data memory code protection',
      options: [
        { label: 'Protected',     value: 0 },
        { label: 'Not protected', value: 1 },
      ]
    },
    {
      id: 'wrt', label: 'Flash Write Enable (WRT)', bits: [10, 9],
      tip: 'Write protection range',
      options: [
        { label: 'Write protection off',                    value: 0b11 },
        { label: '0x0000-0x00FF protected',                 value: 0b10 },
        { label: '0x0000-0x07FF protected (876A/877A)',      value: 0b01 },
        { label: '0x0000-0x0FFF protected (876A/877A)',      value: 0b00 },
      ]
    },
    {
      id: 'debug', label: 'Background Debugger (DEBUG)', bits: [11],
      tip: 'In-Circuit Debugger mode',
      options: [
        { label: 'Enabled  — RB6/RB7 dedicated', value: 0 },
        { label: 'Disabled — RB6/RB7 are I/O',   value: 1 },
      ]
    },
    {
      id: 'cp', label: 'Code Protect (CP)', bits: [13],
      tip: 'Flash program memory code protection',
      options: [
        { label: 'Protected',     value: 0 },
        { label: 'Not protected', value: 1 },
      ]
    },
  ]
}

// ── PIC18F DS39632E (2550/4550/2455/4455) ────────────────────
const FUSES_18F_39632 = {
  family:  'pic18f',
  dssheet: 'DS39632E',
  chips:   ['pic18f2550', 'pic18f4550', 'pic18f2455', 'pic18f4455'],
  registers: [
    {
      name: 'CONFIG1L', addr: 0x300000, blank: 0x27, mask: 0x3F,
      fields: [
        {
          id: 'plldiv', label: 'PLL Prescaler (PLLDIV)', bits: [2,1,0],
          tip: 'Divide by N before PLL',
          options: [
            { label: 'No prescale (4MHz input)',  value: 0b000 },
            { label: 'Divide by 2 (8MHz)',        value: 0b001 },
            { label: 'Divide by 3 (12MHz)',       value: 0b010 },
            { label: 'Divide by 4 (16MHz)',       value: 0b011 },
            { label: 'Divide by 5 (20MHz)',       value: 0b100 },
            { label: 'Divide by 6 (24MHz)',       value: 0b101 },
            { label: 'Divide by 10 (40MHz)',      value: 0b110 },
            { label: 'Divide by 12 (48MHz)',      value: 0b111 },
          ]
        },
        {
          id: 'cpudiv', label: 'CPU Clock Divider (CPUDIV)', bits: [4,3],
          tip: 'Post-PLL CPU clock',
          options: [
            { label: 'OSC1/OSC2 ÷ 1', value: 0b00 },
            { label: 'OSC1/OSC2 ÷ 2', value: 0b01 },
            { label: 'OSC1/OSC2 ÷ 3', value: 0b10 },
            { label: 'OSC1/OSC2 ÷ 4', value: 0b11 },
          ]
        },
        {
          id: 'usbdiv', label: 'USB Clock Divider (USBDIV)', bits: [5],
          tip: 'USB clock source',
          options: [
            { label: 'USB clock = OSC1/OSC2', value: 0 },
            { label: 'USB clock = PLL/2',     value: 1 },
          ]
        },
      ]
    },
    {
      name: 'CONFIG1H', addr: 0x300001, blank: 0x3A, mask: 0x3F,
      fields: [
        {
          id: 'fosc', label: 'Oscillator (FOSC)', bits: [3,2,1,0],
          tip: 'Oscillator selection',
          options: [
            { label: 'LP — Low Power',        value: 0b0000 },
            { label: 'XT — Crystal',          value: 0b0001 },
            { label: 'HS — High Speed',       value: 0b0010 },
            { label: 'HSPLL — HS + PLL',      value: 0b0011 },
            { label: 'EC — External Clock',   value: 0b0100 },
            { label: 'ECIO — EC + RA6 I/O',   value: 0b0101 },
            { label: 'ECPLL — EC + PLL',      value: 0b0110 },
            { label: 'ECPLIO — EC+PLL+RA6',   value: 0b0111 },
            { label: 'INTIO1 — INTRC+RA6+RA7',value: 0b1000 },
            { label: 'INTIO2 — INTRC+RA6',    value: 0b1001 },
          ]
        },
        {
          id: 'ieso', label: 'Int/Ext Switchover (IESO)', bits: [4],
          options: [
            { label: 'Disabled', value: 0 },
            { label: 'Enabled',  value: 1 },
          ]
        },
        {
          id: 'fcmen', label: 'Fail-Safe Clock Monitor (FCMEN)', bits: [5],
          options: [
            { label: 'Disabled', value: 0 },
            { label: 'Enabled',  value: 1 },
          ]
        },
      ]
    },
    {
      name: 'CONFIG2L', addr: 0x300002, blank: 0x1E, mask: 0x1F,
      fields: [
        {
          id: 'pwrten', label: 'Power-up Timer (PWRTEN)', bits: [0],
          tip: 'Enabled when bit = 0',
          options: [
            { label: 'Enabled  (bit=0)', value: 0 },
            { label: 'Disabled (bit=1)', value: 1 },
          ]
        },
        {
          id: 'boren', label: 'Brown-out Reset (BOREN)', bits: [2,1],
          options: [
            { label: 'Disabled',                   value: 0b00 },
            { label: 'SBOREN bit controls',        value: 0b01 },
            { label: 'Enabled during sleep',       value: 0b10 },
            { label: 'Enabled always',             value: 0b11 },
          ]
        },
        {
          id: 'borv', label: 'BOR Voltage (BORV)', bits: [4,3],
          options: [
            { label: '4.6V', value: 0b00 },
            { label: '4.2V', value: 0b01 },
            { label: '2.7V', value: 0b10 },
            { label: '2.2V', value: 0b11 },
          ]
        },
      ]
    },
    {
      name: 'CONFIG2H', addr: 0x300003, blank: 0x3F, mask: 0x3F,
      fields: [
        {
          id: 'wdten', label: 'Watchdog Timer (WDTEN)', bits: [0],
          options: [
            { label: 'Disabled', value: 0 },
            { label: 'Enabled',  value: 1 },
          ]
        },
        {
          id: 'wdtps', label: 'WDT Postscale (WDTPS)', bits: [4,3,2,1],
          options: [
            { label: '1:1',     value: 0b0000 },
            { label: '1:2',     value: 0b0001 },
            { label: '1:4',     value: 0b0010 },
            { label: '1:8',     value: 0b0011 },
            { label: '1:16',    value: 0b0100 },
            { label: '1:32',    value: 0b0101 },
            { label: '1:64',    value: 0b0110 },
            { label: '1:128',   value: 0b0111 },
            { label: '1:256',   value: 0b1000 },
            { label: '1:512',   value: 0b1001 },
            { label: '1:1024',  value: 0b1010 },
            { label: '1:2048',  value: 0b1011 },
            { label: '1:4096',  value: 0b1100 },
            { label: '1:8192',  value: 0b1101 },
            { label: '1:16384', value: 0b1110 },
            { label: '1:32768', value: 0b1111 },
          ]
        },
      ]
    },
    {
      name: 'CONFIG3H', addr: 0x300005, blank: 0x83, mask: 0xC7,
      fields: [
        {
          id: 'ccp2mx', label: 'CCP2 MUX (CCP2MX)', bits: [0],
          options: [
            { label: 'CCP2 on RC1', value: 1 },
            { label: 'CCP2 on RB3', value: 0 },
          ]
        },
        {
          id: 'pbaden', label: 'PORTB A/D (PBADEN)', bits: [1],
          tip: 'PORTB<4:0> analog on reset',
          options: [
            { label: 'Digital I/O', value: 0 },
            { label: 'Analog',      value: 1 },
          ]
        },
        {
          id: 'lpt1osc', label: 'LP T1 Oscillator (LPT1OSC)', bits: [2],
          options: [
            { label: 'High power', value: 0 },
            { label: 'Low power',  value: 1 },
          ]
        },
        {
          id: 'mclre', label: 'MCLR Pin (MCLRE)', bits: [7],
          options: [
            { label: 'RE3 input, MCLR disabled', value: 0 },
            { label: 'MCLR enabled',             value: 1 },
          ]
        },
      ]
    },
    {
      name: 'CONFIG4L', addr: 0x300006, blank: 0x81, mask: 0xC3,
      fields: [
        {
          id: 'stvren', label: 'Stack Overflow Reset (STVREN)', bits: [0],
          options: [
            { label: 'No reset', value: 0 },
            { label: 'Reset',    value: 1 },
          ]
        },
        {
          id: 'lvp', label: 'Low Voltage Programming (LVP)', bits: [1],
          options: [
            { label: 'Disabled — RB5 is I/O', value: 0 },
            { label: 'Enabled  — RB5 is PGM', value: 1 },
          ]
        },
        {
          id: 'debug', label: 'Background Debugger (DEBUG)', bits: [6],
          options: [
            { label: 'Enabled  — RB6/RB7 dedicated', value: 0 },
            { label: 'Disabled — RB6/RB7 are I/O',   value: 1 },
          ]
        },
        {
          id: 'xinst', label: 'Extended Instruction Set (XINST)', bits: [7],
          options: [
            { label: 'Disabled', value: 0 },
            { label: 'Enabled',  value: 1 },
          ]
        },
      ]
    },
  ]
}

// ── PIC18F DS39576C (252/452/242/442) ────────────────────────
const FUSES_18F_39576 = {
  family:  'pic18f',
  dssheet: 'DS39576C',
  chips:   ['pic18f252', 'pic18f452', 'pic18f242', 'pic18f442'],
  registers: [
    {
      name: 'CONFIG1H', addr: 0x300001, blank: 0x02, mask: 0x0F,
      fields: [
        {
          id: 'fosc', label: 'Oscillator (FOSC)', bits: [3,2,1,0],
          tip: 'Oscillator selection',
          options: [
            { label: 'LP — Low Power',           value: 0b0000 },
            { label: 'XT — Crystal',             value: 0b0001 },
            { label: 'HS — High Speed',          value: 0b0010 },
            { label: 'RC — RC Oscillator CLKO',  value: 0b0011 },
            { label: 'EC — External Clock CLKO', value: 0b0100 },
            { label: 'ECIO — EC + RA6 I/O',      value: 0b0101 },
            { label: 'HSPLL — HS + PLL',         value: 0b0110 },
            { label: 'RCIO — RC + RA6 I/O',      value: 0b0111 },
          ]
        },
      ]
    },
    {
      name: 'CONFIG2L', addr: 0x300002, blank: 0x1E, mask: 0x1F,
      fields: [
        {
          id: 'pwrten', label: 'Power-up Timer (PWRTEN)', bits: [0],
          options: [
            { label: 'Enabled  (bit=0)', value: 0 },
            { label: 'Disabled (bit=1)', value: 1 },
          ]
        },
        {
          id: 'boren', label: 'Brown-out Reset (BOREN)', bits: [2,1],
          options: [
            { label: 'Disabled',             value: 0b00 },
            { label: 'SBOREN bit controls',  value: 0b01 },
            { label: 'Enabled during sleep', value: 0b10 },
            { label: 'Enabled always',       value: 0b11 },
          ]
        },
        {
          id: 'borv', label: 'BOR Voltage (BORV)', bits: [4,3],
          options: [
            { label: '4.5V', value: 0b00 },
            { label: '4.2V', value: 0b01 },
            { label: '2.7V', value: 0b10 },
            { label: '4.5V alt', value: 0b11 },
          ]
        },
      ]
    },
    {
      name: 'CONFIG2H', addr: 0x300003, blank: 0x3F, mask: 0x3F,
      fields: [
        {
          id: 'wdten', label: 'Watchdog Timer (WDTEN)', bits: [0],
          options: [
            { label: 'Disabled', value: 0 },
            { label: 'Enabled',  value: 1 },
          ]
        },
        {
          id: 'wdtps', label: 'WDT Postscale (WDTPS)', bits: [4,3,2,1],
          options: [
            { label: '1:1',    value: 0b0000 },
            { label: '1:2',    value: 0b0001 },
            { label: '1:4',    value: 0b0010 },
            { label: '1:8',    value: 0b0011 },
            { label: '1:16',   value: 0b0100 },
            { label: '1:32',   value: 0b0101 },
            { label: '1:64',   value: 0b0110 },
            { label: '1:128',  value: 0b0111 },
          ]
        },
      ]
    },
    {
      name: 'CONFIG3H', addr: 0x300005, blank: 0x83, mask: 0x87,
      fields: [
        {
          id: 'ccp2mx', label: 'CCP2 MUX (CCP2MX)', bits: [0],
          options: [
            { label: 'CCP2 on RC1', value: 1 },
            { label: 'CCP2 on RB3', value: 0 },
          ]
        },
        {
          id: 'mclre', label: 'MCLR Pin (MCLRE)', bits: [7],
          options: [
            { label: 'RE3 is digital I/O, MCLR disabled', value: 0 },
            { label: 'MCLR enabled',                      value: 1 },
          ]
        },
      ]
    },
    {
      name: 'CONFIG4L', addr: 0x300006, blank: 0x81, mask: 0x83,
      fields: [
        {
          id: 'stvren', label: 'Stack Overflow Reset (STVREN)', bits: [0],
          options: [
            { label: 'No reset', value: 0 },
            { label: 'Reset',    value: 1 },
          ]
        },
        {
          id: 'lvp', label: 'Low Voltage Programming (LVP)', bits: [1],
          options: [
            { label: 'Disabled', value: 0 },
            { label: 'Enabled',  value: 1 },
          ]
        },
        {
          id: 'debug', label: 'Background Debugger (DEBUG)', bits: [6],
          options: [
            { label: 'Enabled  — RB6/RB7 dedicated', value: 0 },
            { label: 'Disabled — RB6/RB7 are I/O',   value: 1 },
          ]
        },
      ]
    },
  ]
}

// ── Lookup por chip ───────────────────────────────────────────
const FUSES_BY_CHIP = {}

for (const cfg of [FUSES_16F_41196, FUSES_16F_39589]) {
  for (const chip of cfg.chips) FUSES_BY_CHIP[chip] = cfg
}
for (const cfg of [FUSES_18F_39632, FUSES_18F_39576]) {
  for (const chip of cfg.chips) FUSES_BY_CHIP[chip] = cfg
}

if (typeof module !== 'undefined') module.exports = { FUSES_BY_CHIP }