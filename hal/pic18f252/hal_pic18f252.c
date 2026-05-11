/* ============================================================
   hal_pic18f252.c — HAL PIC18F242/252/442/452 v2.1
   Datasheet: DS39576C

   Modos de operación:
   A) BOOTLOADER (PICASP_BOOTLOADER=1):
      - millis() y delay() por polling de TMR0IF — sin ISR
      - ISRs vacías
      - Timer0 con prescaler 1:8
   B) ICSP (sin PICASP_BOOTLOADER):
      - millis() por ISR de Timer0 — sin prescaler
      - micros() por Timer1 con ISR overflow
      - tone() por CCP1 + Timer1 con ISR
      - delay() usa millis()

   Cambios v2.0:
   [C1]  TMR0_RELOAD diferenciado por modo BOOTLOADER/ICSP
   [C2]  picasp_timer0_init() diferenciado por modo
   [C3]  ISR diferenciada por modo — vacía en BL, funcional en ICSP
   [C4]  millis() diferenciado — ICSP lee _millis_count por ISR
   [C5]  delay() diferenciado — ICSP usa millis(), BL usa polling
   [C6]  _timer1_init() usa ISR overflow en lugar de polling
   [C7]  micros() usa F_CPU dinámico
   [C8]  tone() habilita PIE1bits.CCP1IE — bug corregido
   [C9]  main() diferenciado por modo
   [C10] PIC18F252 no tiene OSCILLATOR_INTOSC — eliminado bloque

   Cambios v2.1:
   [C11] ADC: _adc_init() parte de todos digitales. PCFG dinámico
         por canal. Tabla DS39576C Table 11-3.
   [C12] ADC: máscara defensiva (channel & 0x07u) en ADCON0.
   [C14] PWM: duty escalado — ccpr=duty*(PR2+1)/255.
   [C15] PWM: TMR2=0 antes de encender Timer2.
   [C16] PWM: variables de módulo, analogWriteClear con LATCbits,
         Timer2 off cuando ambos canales libres.
   [C17] PWM: Timer2 apagado cuando ambos canales inactivos.
   [C18] PWM: _pwm_ready=0 al apagar Timer2.
   [C19] main(): ADCON1=0b10001111 — consistente con _adc_init().
         Antes: 0b10001110 dejaba AN0 analógico al arrancar.
   [C20] Serial_read: manejo de OERR y FERR.
   [C21] _i2c_idle: timeout anti-deadlock con reset de MSSP.
         Wire_beginTransmission y Wire_requestFrom verifican retorno.
   [C22] attachInterrupt: eliminado RCONbits.IPEN=0.
   [C23] noTone: libera tracking PWM, apaga Timer2 si ambos libres.
   ============================================================ */

#include <picasp.h>

/* ── Timing TMR0 ─────────────────────────────────────────────
   BOOTLOADER : prescaler 1:8 → F_CPU/(4×8×1000)
   ICSP       : sin prescaler  → F_CPU/(4×1000)
   ──────────────────────────────────────────────────────────── */
#if defined(PICASP_BOOTLOADER)
  #define TMR0_RELOAD  (65536UL - (F_CPU / 32000UL))
#else
  #define TMR0_RELOAD  (65536UL - (F_CPU / 4000UL))
#endif
#define TMR0_H  ((uint8_t)((TMR0_RELOAD) >> 8))
#define TMR0_L  ((uint8_t)((TMR0_RELOAD) & 0xFF))

static volatile uint32_t _millis_count    = 0;
static volatile uint16_t _micros_overflow = 0;
static          uint8_t  _tone_active     = 0;
static          uint8_t  _timer1_ready    = 0;
static void (*_int_callback)(void)        = 0;
static void (*_spi_on_receive)(uint8_t)   = 0;
static void (*_i2c_on_receive)(uint8_t)   = 0;
static void (*_i2c_on_request)(void)      = 0;

static uint8_t _i2c_rx_buf[32];
static uint8_t _i2c_rx_head  = 0;
static uint8_t _i2c_rx_tail  = 0;
static uint8_t _i2c_rx_count = 0;

/* Variables compartidas entre analogWrite y analogWriteClear   */
static uint8_t _pwm_ready      = 0u;
static uint8_t _pwm_ch1_active = 0u;
static uint8_t _pwm_ch2_active = 0u;

/* ============================================================
   [C2] Timer0 init — diferenciado por modo
   ============================================================ */
void picasp_timer0_init(void) {
#if defined(PICASP_BOOTLOADER)
    T0CON = 0;
    T3CON = 0;
    PIE1  = 0;  PIE2  = 0;
    PIR1  = 0;  PIR2  = 0;
    TMR0H = TMR0_H;
    TMR0L = TMR0_L;
    /* TMR0ON=1, 16-bit, Fosc/4, prescaler 1:8 */
    T0CON = 0b10000010;
    INTCONbits.TMR0IF = 0;
#else
    /* TMR0ON=1, 16-bit, Fosc/4, sin prescaler (PSA=1) */
    T0CON = 0b10001000;
    TMR0H = TMR0_H;
    TMR0L = TMR0_L;
    INTCONbits.TMR0IE = 1;
    INTCONbits.TMR0IF = 0;
    RCONbits.IPEN     = 1;
    INTCONbits.GIEH   = 1;
    INTCONbits.GIEL   = 1;
#endif
    _millis_count = 0;
}

/* ============================================================
   [C3] ISR — diferenciada por modo
   BOOTLOADER : vacías — GIE=0, nunca se llaman
   ICSP       : Timer0 (millis) + Timer1 (micros) + CCP1 (tone)
                + INT0 (attachInterrupt) + SSP (I2C/SPI slave)
   ============================================================ */
#if defined(PICASP_BOOTLOADER)

void __interrupt(high_priority) picasp_isr_high(void) {}
void __interrupt(low_priority)  picasp_isr_low(void)  {}

#else

void __interrupt(high_priority) picasp_isr_high(void) {

    /* Timer0 — millis */
    if (INTCONbits.TMR0IF && INTCONbits.TMR0IE) {
        TMR0H = TMR0_H;
        TMR0L = TMR0_L;
        _millis_count++;
        INTCONbits.TMR0IF = 0;
    }

    /* CCP1 — tone(): reiniciar TMR1 en cada match */
    if (_tone_active && PIR1bits.CCP1IF && PIE1bits.CCP1IE) {
        TMR1H = 0;
        TMR1L = 0;
        PIR1bits.CCP1IF = 0;
    }

    /* Timer1 overflow — extiende micros() a 32 bits */
    if (!_tone_active && PIR1bits.TMR1IF && PIE1bits.TMR1IE) {
        _micros_overflow++;
        PIR1bits.TMR1IF = 0;
    }

    /* INT0 — attachInterrupt */
    if (INTCONbits.INT0IF && INTCONbits.INT0IE) {
        if (_int_callback) _int_callback();
        INTCONbits.INT0IF = 0;
    }

    /* SSP — I2C slave / SPI slave */
    if (PIR1bits.SSPIF && PIE1bits.SSPIE) {
        PIR1bits.SSPIF = 0;
        uint8_t sspm = SSPCON1 & 0x0Fu;
        if (sspm == 0x04u || sspm == 0x05u) {
            if (SSPSTATbits.BF) {
                uint8_t data = SSPBUF;
                if (_spi_on_receive) _spi_on_receive(data);
            }
        } else {
            uint8_t stat = SSPSTAT & 0x2Cu;
            if (!(stat & 0x08u)) {
                uint8_t dummy = SSPBUF; (void)dummy;
                SSPCON1bits.CKP = 1;
            } else if ((stat & 0x20u) && (stat & 0x04u)) {
                if (_i2c_on_request) _i2c_on_request();
                SSPCON1bits.CKP = 1;
            } else if (!(stat & 0x20u) && (stat & 0x04u)) {
                uint8_t data = SSPBUF;
                if (_i2c_on_receive) _i2c_on_receive(data);
                SSPCON1bits.CKP = 1;
            }
        }
    }
}

void __interrupt(low_priority) picasp_isr_low(void) {}

#endif /* PICASP_BOOTLOADER */

/* ============================================================
   GPIO
   ============================================================ */
static volatile uint8_t* const _TRIS[] = {
    (volatile uint8_t*)&TRISA,
    (volatile uint8_t*)&TRISB,
    (volatile uint8_t*)&TRISC,
};
static volatile uint8_t* const _LAT[] = {
    (volatile uint8_t*)&LATA,
    (volatile uint8_t*)&LATB,
    (volatile uint8_t*)&LATC,
};
static volatile uint8_t* const _PORT[] = {
    (volatile uint8_t*)&PORTA,
    (volatile uint8_t*)&PORTB,
    (volatile uint8_t*)&PORTC,
};

static uint8_t _pin_bit (pin_t pin) { return (uint8_t)(1u << (pin & 0x0Fu)); }
static uint8_t _pin_port(pin_t pin) { return (uint8_t)(pin >> 4); }

void pinMode(pin_t pin, uint8_t mode) {
    uint8_t port = _pin_port(pin);
    uint8_t bit  = _pin_bit(pin);
    if (port > 2u) return;
    if (mode == OUTPUT) {
        *_TRIS[port] &= ~bit;
    } else {
        *_TRIS[port] |= bit;
        if (mode == INPUT_PULLUP && port == 1u)
            INTCON2bits.RBPU = 0;
    }
}

void digitalWrite(pin_t pin, uint8_t value) {
    uint8_t port = _pin_port(pin);
    uint8_t bit  = _pin_bit(pin);
    if (port > 2u) return;
    if (value) *_LAT[port] |=  bit;
    else       *_LAT[port] &= ~bit;
}

uint8_t digitalRead(pin_t pin) {
    uint8_t port = _pin_port(pin);
    uint8_t bit  = _pin_bit(pin);
    if (port > 2u) return 0;
    return (*_PORT[port] & bit) ? HIGH : LOW;
}

/* ============================================================
   Tiempo
   ============================================================ */
void delayMicroseconds(uint16_t us) {
    while (us--) __delay_us(1);
}

/* ── [C5] delay() diferenciado por modo ─────────────────────── */
void delay(uint16_t ms) {
#if defined(PICASP_BOOTLOADER)
    while (ms > 0) {
        if (INTCONbits.TMR0IF) {
            INTCONbits.TMR0IF = 0;
            TMR0H = TMR0_H;
            TMR0L = TMR0_L;
            _millis_count++;
            ms--;
        }
    }
#else
    if (!INTCONbits.GIEH) {
        while (ms--) __delay_ms(1);
        return;
    }
    uint32_t start = millis();
    while ((millis() - start) < (uint32_t)ms);
#endif
}

/* ── [C4] millis() diferenciado por modo ────────────────────── */
uint32_t millis(void) {
#if defined(PICASP_BOOTLOADER)
    while (INTCONbits.TMR0IF) {
        INTCONbits.TMR0IF = 0;
        TMR0H = TMR0_H;
        TMR0L = TMR0_L;
        _millis_count++;
    }
    return _millis_count;
#else
    uint32_t val;
    uint8_t gieh = INTCONbits.GIEH;
    INTCONbits.GIEH = 0;
    val = _millis_count;
    INTCONbits.GIEH = gieh;
    return val;
#endif
}

/* ── [C6] Timer1 init — ISR overflow en lugar de polling ───── */
static void _timer1_init(void) {
    T1CON            = 0x00;
    TMR1H            = 0;
    TMR1L            = 0;
    _micros_overflow = 0;
    PIR1bits.TMR1IF  = 0;
    PIE1bits.TMR1IE  = 1;      /* [C6] ISR overflow habilitada */
    T1CONbits.TMR1ON = 1;
}

/* ── [C7] micros() con F_CPU dinámico ───────────────────────── */
uint32_t micros(void) {
    if (_tone_active) return 0;
    if (!_timer1_ready) { _timer1_init(); _timer1_ready = 1; }

    uint16_t ovf;
    uint8_t  hi, lo, hi2;
    do {
        uint8_t gieh = INTCONbits.GIEH;
        INTCONbits.GIEH = 0;
        ovf = _micros_overflow;
        INTCONbits.GIEH = gieh;
        hi  = TMR1H;
        lo  = TMR1L;
        hi2 = TMR1H;
    } while (hi != hi2);

    uint32_t total = ((uint32_t)ovf << 16) |
                     ((uint16_t)hi  <<  8) | lo;
    return total / (F_CPU / 4000000UL);  /* [C7] dinámico */
}

uint32_t pulseIn(pin_t pin, uint8_t state, uint32_t timeout) {
    if (_tone_active) return 0;
    if (!_timer1_ready) { _timer1_init(); _timer1_ready = 1; }
    uint32_t start, elapsed;
    start = micros();
    while (digitalRead(pin) == state) {
        elapsed = micros() - start;
        if (elapsed > timeout) return 0;
    }
    start = micros();
    while (digitalRead(pin) != state) {
        elapsed = micros() - start;
        if (elapsed > timeout) return 0;
    }
    uint32_t pulse_start = micros();
    while (digitalRead(pin) == state) {
        elapsed = micros() - pulse_start;
        if (elapsed > timeout) return 0;
    }
    return micros() - pulse_start;
}

/* ── [C8] tone() — habilitar ISR CCP1 ──────────────────────── */
void tone(pin_t pin, uint32_t freq) {
    if (pin != RC2) return;
    if (freq == 0) { noTone(pin); return; }
    uint16_t period = (uint16_t)((F_CPU / (4UL * freq)) - 1UL);
    T1CON = 0x00;
    TMR1H = 0;  TMR1L = 0;
    TRISCbits.TRISC2 = 0;
    CCP1CON         = 0b00000010;
    CCPR1H          = (uint8_t)(period >> 8);
    CCPR1L          = (uint8_t)(period & 0xFF);
    PIR1bits.CCP1IF = 0;
    PIE1bits.CCP1IE = 1;       /* [C8] bug corregido: habilitado */
    INTCONbits.PEIE = 1;
    INTCONbits.GIE  = 1;
    T1CONbits.TMR1ON = 1;
    _tone_active  = 1;
    _timer1_ready = 1;
}

void noTone(pin_t pin) {
    if (pin != RC2) return;
    PIE1bits.CCP1IE  = 0;
    CCP1CON          = 0;
    T1CONbits.TMR1ON = 0;
    TRISCbits.TRISC2 = 1;
    _tone_active     = 0;
    _timer1_ready    = 0;
    _micros_overflow = 0;
    /* [C23] Liberar RC2 del tracking PWM */
    _pwm_ch1_active = 0u;
    if (!_pwm_ch2_active) {
        T2CONbits.TMR2ON = 0u;
        TMR2             = 0u;
        _pwm_ready       = 0u;   /* PIC18F usan _pwm_ready en lugar de _pwm_timer2_running */
    }
}

/* ============================================================
   ADC:
   [C11] _adc_init() ya no fija ADCON1 — analogRead configura
         PCFG dinámicamente según el canal pedido.
         Antes: ADCON1 = 0b10001110 (solo AN0 analógico, fijo).
         Ahora: PCFG se ajusta para habilitar AN0..ANchannel.
         Tabla PCFG (DS39576C, Table 11-3):
           canal 0 → PCFG=0b1110  (AN0)
           canal 1 → PCFG=0b1101  (AN0-AN1)
           canal 2 → PCFG=0b1100  (AN0-AN2)
           canal 3 → PCFG=0b1011  (AN0-AN3)
           canal 4 → PCFG=0b1010  (AN0-AN4)
           canal ≥5→ PCFG=0b0000  (todos analógicos)
         ADFM=1 (right justify) se preserva en bit 7.
   [C12] channel & 0x07u — máscara defensiva en ADCON0.
   ============================================================ */

/* Tabla PCFG indexada por canal (0..4, saturado en 0 para ≥5) */
static const uint8_t _adc_pcfg[6] = {
    0b1110,   /* canal 0: solo AN0          */
    0b1101,   /* canal 1: AN0-AN1           */
    0b1100,   /* canal 2: AN0-AN2           */
    0b1011,   /* canal 3: AN0-AN3           */
    0b1010,   /* canal 4: AN0-AN4           */
    0b0000,   /* canal ≥5: todos analógicos */
};

static void _adc_init(void) {
    /* ADFM=1 (right justify), todos digitales por defecto.
       PCFG se configura en analogRead() según el canal. */
    ADCON1 = 0b10001111;   /* ADFM=1, PCFG=1111 → todos digitales */
    ADCON0 = 0x00;
}

uint16_t analogRead(uint8_t channel) {
    static uint8_t adc_ready = 0;
    if (!adc_ready) { _adc_init(); adc_ready = 1; }

    /* [C11] Configurar PCFG para habilitar AN0..ANchannel     */
    uint8_t idx  = (channel > 4u) ? 5u : channel;
    uint8_t pcfg = _adc_pcfg[idx];
    ADCON1 = (uint8_t)(0b10000000u | pcfg);   /* ADFM=1 + PCFG */

    /* [C12] Seleccionar canal: bits CHS2:CHS0 en ADCON0[5:3]  */
    ADCON0 = (uint8_t)(((channel & 0x07u) << 3) | 0x01u);   /* ADON=1 */

    delayMicroseconds(20);   /* tiempo de adquisición           */
    ADCON0bits.GO = 1;
    while (ADCON0bits.GO);
    return (uint16_t)(((uint16_t)ADRESH << 8) | ADRESL);
}

/* ============================================================
   PWM — CCP1 (RC2) y CCP2 (RC1)
   ============================================================ */
void analogWrite(uint8_t pin, uint8_t duty) {
    if (!_pwm_ready) {
        uint16_t pr2_val = (uint16_t)((F_CPU / (4UL * 490UL * 4UL)) - 1UL);
        if (pr2_val > 255u) pr2_val = 255u;
        PR2        = (uint8_t)pr2_val;
        TMR2       = 0u;
        T2CON      = 0b00000101u;
        _pwm_ready = 1u;
    }

    uint16_t ccpr = (uint16_t)(((uint32_t)duty * ((uint16_t)PR2 + 1u)) / 255u);

    if (pin == RC2) {
        TRISCbits.TRISC2 = 0u;
        CCP1CON          = 0b00001100u;
        CCPR1L           = (uint8_t)(ccpr >> 2);
        CCP1CONbits.DC1B = (uint8_t)(ccpr & 0x03u);
        _pwm_ch1_active  = 1u;
    } else if (pin == RC1) {
        TRISCbits.TRISC1 = 0u;
        CCP2CON          = 0b00001100u;
        CCPR2L           = (uint8_t)(ccpr >> 2);
        CCP2CONbits.DC2B = (uint8_t)(ccpr & 0x03u);
        _pwm_ch2_active  = 1u;
    }
}

void analogWriteClear(uint8_t pin) {
    if (pin == RC2) {
        CCP1CON          = 0u;
        LATCbits.LATC2   = 0u;          /* [C16] pin LOW al detener */
        TRISCbits.TRISC2 = 1u;
        _pwm_ch1_active  = 0u;
    } else if (pin == RC1) {
        CCP2CON          = 0u;
        LATCbits.LATC1   = 0u;          /* [C16] pin LOW al detener */
        TRISCbits.TRISC1 = 1u;
        _pwm_ch2_active  = 0u;
    }

    /* [C17][C18] Timer2 off y reset cuando ambos canales libres */
    if (!_pwm_ch1_active && !_pwm_ch2_active) {
        T2CONbits.TMR2ON = 0u;
        TMR2             = 0u;
        _pwm_ready       = 0u;
    }
}

/* ============================================================
   Serial / UART — PIC18F252 sin BRG16, BRGH=1
   BRG = Fosc/(16×baud) - 1
   ============================================================ */
void Serial_begin(uint32_t baud) {
    RCSTA = 0;
    TXSTA = 0;
    TRISCbits.TRISC6 = 0;
    TRISCbits.TRISC7 = 1;
    SPBRG  = (uint8_t)((F_CPU / (16UL * baud)) - 1UL);
    TXSTA  = 0b00100100;   /* TXEN=1, BRGH=1 */
    RCSTA  = 0b10010000;   /* SPEN=1, CREN=1 */
    /* Sin BAUDCON en PIC18F252 */
}

void Serial_write(uint8_t byte) {
    while (!TXSTAbits.TRMT);
    TXREG = byte;
}

void Serial_print(const char* str) {
    while (*str) Serial_write((uint8_t)*str++);
}

void Serial_println(const char* str) {
    Serial_print(str);
    Serial_write('\r');
    Serial_write('\n');
}

void Serial_printInt(int32_t val) {
    char    buf[12];
    uint8_t i   = 0;
    uint8_t neg = 0;
    if (val == 0) { Serial_write('0'); return; }
    if (val < 0)  { neg = 1; val = -val; }
    while (val > 0) { buf[i++] = '0' + (uint8_t)(val % 10); val /= 10; }
    if (neg) buf[i++] = '-';
    while (i--) Serial_write((uint8_t)buf[i]);
}

uint8_t Serial_available(void) { 
    return PIR1bits.RCIF ? 1u : 0u; 
}

uint8_t Serial_read(void) {
    while (!PIR1bits.RCIF);
    if (RCSTAbits.OERR) {
        RCSTAbits.CREN = 0;
        RCSTAbits.CREN = 1;
    }
    /* [C20] Agregar manejo de FERR — faltaba en todos los PIC18F */
    if (RCSTAbits.FERR) {
        uint8_t dummy = RCREG;
        (void)dummy;
        return 0u;
    }
    return RCREG;
}

/* ============================================================
   EEPROM
   ============================================================ */
uint8_t EEPROM_read(uint16_t addr) {
    EEADR            = (uint8_t)(addr & 0xFF);
    EECON1bits.EEPGD = 0;
    EECON1bits.CFGS  = 0;
    EECON1bits.RD    = 1;
    NOP(); NOP();
    return EEDATA;
}

void EEPROM_write(uint16_t addr, uint8_t val) {
    while (EECON1bits.WR);
    EEADR  = (uint8_t)(addr & 0xFF);
    EEDATA = val;
    EECON1bits.EEPGD = 0;
    EECON1bits.CFGS  = 0;
    EECON1bits.WREN  = 1;
    uint8_t gieh = INTCONbits.GIEH;
    INTCONbits.GIEH = 0;
    EECON2 = 0x55;
    EECON2 = 0xAA;
    EECON1bits.WR   = 1;
    INTCONbits.GIEH = gieh;
    while (EECON1bits.WR);
    EECON1bits.WREN = 0;
}

void EEPROM_update(uint16_t addr, uint8_t val) {
    if (EEPROM_read(addr) != val) EEPROM_write(addr, val);
}

/* ============================================================
   Interrupción externa INT0 (RB0)
   ============================================================ */
void attachInterrupt(uint8_t pin, void (*callback)(void), uint8_t mode) {
    if (pin != RB0) return;
    _int_callback           = callback;
    TRISBbits.TRISB0        = 1;
    INTCON2bits.INTEDG0     = (mode == RISING) ? 1u : 0u;  /* [C22] */
    INTCONbits.INT0IF       = 0;
    INTCONbits.INT0IE       = 1;
    /* [C22] IPEN eliminado — ya configurado por picasp_timer0_init()  */
    /* No se toca IPEN aquí para no romper el sistema de prioridades   */
}

void detachInterrupt(uint8_t pin) {
    if (pin != RB0) return;
    INTCONbits.INT0IE = 0;
    _int_callback     = 0;
}

/* ============================================================
   I2C — Wire
   ============================================================ */
static uint8_t _i2c_idle(void) {
    uint16_t timeout = 10000u;
    while ((SSPCON2 & 0x1Fu) && --timeout);
    if (!timeout) {
        /* Bus colgado — forzar condición de STOP y reset MSSP  */
        SSPCON2bits.PEN = 1;
        SSPCON1bits.SSPEN = 0;
        SSPCON1bits.SSPEN = 1;
        return 0u;
    }
    timeout = 10000u;
    while (SSPSTATbits.R_NOT_W && --timeout);
    return timeout ? 1u : 0u;
}

void Wire_begin(uint32_t speed) {
    TRISC |= (1u << 3);
    TRISC |= (1u << 4);
    SSPADD  = (uint8_t)((F_CPU / (4UL * speed)) - 1UL);
    SSPCON1 = 0b00101000;
    SSPCON2 = 0;
    SSPSTAT = 0b10000000;
    PIR1bits.SSPIF = 0;
    PIE1bits.SSPIE = 0;
}

void Wire_beginSlave(uint8_t addr) {
    TRISC |= (1u << 3);
    TRISC |= (1u << 4);
    SSPADD  = (uint8_t)(addr << 1);
    SSPCON1 = 0b00110110;
    SSPCON2 = 0b00000001;
    SSPSTAT = 0b10000000;
    PIR1bits.SSPIF  = 0;
    PIE1bits.SSPIE  = 1;
    INTCONbits.PEIE = 1;
    INTCONbits.GIE  = 1;
}

void Wire_beginTransmission(uint8_t addr) {
    if (!_i2c_idle()) return;        /* [C21] bus colgado — abortar */
    SSPCON2bits.SEN = 1;
    while (SSPCON2bits.SEN);
    PIR1bits.SSPIF = 0;
    SSPBUF = (uint8_t)(addr << 1);
    while (!PIR1bits.SSPIF);
    PIR1bits.SSPIF = 0;
}

uint8_t Wire_write(uint8_t data) {
    PIR1bits.SSPIF = 0;
    SSPBUF = data;
    while (!PIR1bits.SSPIF);
    PIR1bits.SSPIF = 0;
    return SSPCON2bits.ACKSTAT ? 0u : 1u;
}

uint8_t Wire_endTransmission(void) {
    SSPCON2bits.PEN = 1;
    while (SSPCON2bits.PEN);
    PIR1bits.SSPIF = 0;
    return 0;
}

uint8_t Wire_requestFrom(uint8_t addr, uint8_t count) {
    _i2c_rx_head  = 0;
    _i2c_rx_tail  = 0;
    _i2c_rx_count = 0;
    if (!_i2c_idle()) return 0u;     /* [C21] bus colgado — retornar 0 */
    SSPCON2bits.SEN = 1;
    while (SSPCON2bits.SEN);
    PIR1bits.SSPIF = 0;
    SSPBUF = (uint8_t)((addr << 1) | 0x01u);
    while (!PIR1bits.SSPIF);
    PIR1bits.SSPIF = 0;
    uint8_t i;
    for (i = 0; i < count; i++) {
        SSPCON2bits.RCEN = 1;
        while (SSPCON2bits.RCEN);
        while (!SSPSTATbits.BF);
        _i2c_rx_buf[_i2c_rx_tail] = SSPBUF;
        _i2c_rx_tail  = (_i2c_rx_tail + 1u) & 0x1Fu;
        _i2c_rx_count++;
        PIR1bits.SSPIF    = 0;
        SSPCON2bits.ACKDT = (i == count - 1u) ? 1u : 0u;
        SSPCON2bits.ACKEN = 1;
        while (SSPCON2bits.ACKEN);
    }
    SSPCON2bits.PEN = 1;
    while (SSPCON2bits.PEN);
    return _i2c_rx_count;
}

uint8_t Wire_available(void) { 
    return _i2c_rx_count; 
}

uint8_t Wire_read(void) {
    if (_i2c_rx_count == 0u) return 0;
    uint8_t data  = _i2c_rx_buf[_i2c_rx_head];
    _i2c_rx_head  = (_i2c_rx_head + 1u) & 0x1Fu;
    _i2c_rx_count--;
    return data;
}

void Wire_onReceive(void (*callback)(uint8_t)) { 
    _i2c_on_receive = callback; 
}

void Wire_onRequest(void (*callback)(void)) { 
    _i2c_on_request = callback; 
}

/* ============================================================
   SPI
   ============================================================ */
void SPI_begin(uint8_t mode, uint8_t speed) {
    TRISC &= ~(1u << 3);
    TRISC |=  (1u << 4);
    TRISC &= ~(1u << 5);
    uint8_t cpol = (mode == SPI_MODE2 || mode == SPI_MODE3) ? 1u : 0u;
    uint8_t cpha = (mode == SPI_MODE1 || mode == SPI_MODE3) ? 1u : 0u;
    SSPSTAT = cpha ? 0x00u : 0x40u;
    SSPCON1 = (uint8_t)(0b00100000u | ((uint8_t)(cpol << 4)) | (speed & 0x03u));
    PIR1bits.SSPIF = 0;
    PIE1bits.SSPIE = 0;
}

uint8_t SPI_transfer(uint8_t data) {
    PIR1bits.SSPIF = 0;
    SSPBUF = data;
    while (!PIR1bits.SSPIF);
    return SSPBUF;
}

void SPI_end(void) {
    SSPCON1 = 0;
    TRISC |= (1u << 3);
    TRISC |= (1u << 5);
}

void SPI_beginSlave(uint8_t mode) {
    TRISC |=  (1u << 3);
    TRISC |=  (1u << 4);
    TRISC &= ~(1u << 5);
    uint8_t cpol = (mode == SPI_MODE2 || mode == SPI_MODE3) ? 1u : 0u;
    uint8_t cpha = (mode == SPI_MODE1 || mode == SPI_MODE3) ? 1u : 0u;
    SSPSTAT = cpha ? 0x00u : 0x40u;
    SSPCON1 = (uint8_t)(0b00100100u | ((uint8_t)(cpol << 4)));
    PIR1bits.SSPIF  = 0;
    PIE1bits.SSPIE  = 1;
    INTCONbits.PEIE = 1;
    INTCONbits.GIE  = 1;
}

void SPI_onReceive(void (*callback)(uint8_t)) { 
    _spi_on_receive = callback; 
}

__attribute__((used))
void SPI_write(uint8_t data) {
    PIR1bits.SSPIF = 0;
    SSPBUF = data;
    while (!PIR1bits.SSPIF);
}

/* ============================================================
   [C9] main — diferenciado por modo
   [C10] PIC18F252 no tiene OSCILLATOR_INTOSC — eliminado
   ============================================================ */
void main(void) {
    /* PIC18F252 no tiene CMCON                                  */
    /* [C19] ADCON1 consistente con _adc_init(): ADFM=1,        */
    /*       PCFG=1111 → todos digitales hasta que analogRead    */
    /*       configure el canal pedido.                          */
    ADCON1 = 0b10001111u;   /* ADFM=1, todos digitales          */
    ADCON0 = 0x00u;

#if defined(PICASP_BOOTLOADER)
    INTCONbits.GIE  = 0;
    INTCONbits.PEIE = 0;
#else
    RCONbits.IPEN   = 1;
    INTCONbits.GIEH = 1;
    INTCONbits.GIEL = 1;
#endif

    picasp_timer0_init();
    setup();
    while (1) {
        millis();
        loop();
    }
}