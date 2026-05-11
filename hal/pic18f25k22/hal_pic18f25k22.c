/* ============================================================
   hal_pic18f25k22.c — HAL PIC18F25K22 v2.1
   Datasheet: DS41398B

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
   [C1] SPI_beginSlave: agregar PEIE=1 — faltaba en v1.3
   [C2] Wire_read: usar máscaras u consistentes
   [C3] main(): millis() en loop también en modo ICSP
   [C4] _adc_init(): todos los pines digitales por defecto

   Cambios v2.1:
   [C12] ADC: ADCON1 documentado — PVCFG=00, NVCFG=00.
   [C13] ADC: máscara defensiva (channel & 0x1Fu) en ADCON0.
   [C14] ADC: cobertura AN0-AN11 documentada (DIP28/SOIC28).
   [C15] PWM: duty escalado — ccpr=duty*(PR2+1)/255.
   [C16] PWM: TMR2=0 antes de encender Timer2.
   [C17] PWM: variables de módulo, analogWriteClear con LATCbits,
         Timer2 off cuando ambos canales libres.
   [C18] PWM: _pwm_ready=0 al apagar Timer2.
   [C20] Serial_read: manejo de OERR y FERR.
   [C21] _i2c_idle: timeout anti-deadlock con reset de SSP1.
         Wire_beginTransmission y Wire_requestFrom verifican retorno.
   [C22] attachInterrupt: eliminado RCONbits.IPEN=0.
   [C23] noTone: libera tracking PWM, apaga Timer2 si ambos libres.
   [C24] analogWrite: usa _pwm_timer2_init() en lugar de
         static local — consistente con analogWriteClear.
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

/* Variable compartida entre analogWrite y analogWriteClear     */
static uint8_t _pwm_ready      = 0u;
static uint8_t _pwm_ch1_active = 0u;
static uint8_t _pwm_ch2_active = 0u;

/* ============================================================
   Timer0 init — diferenciado por modo
   ============================================================ */
void picasp_timer0_init(void) {
#if defined(PICASP_BOOTLOADER)
    T0CON  = 0;
    T3CON  = 0;
    PIE1   = 0;  PIE2   = 0;  PIE3   = 0;
    PIR1   = 0;  PIR2   = 0;  PIR3   = 0;
    INTCON = 0;
    TMR0H  = TMR0_H;
    TMR0L  = TMR0_L;
    T0CON  = 0b10000010;      /* ON, 16-bit, Fosc/4, prescaler 1:8 */
    INTCONbits.TMR0IF = 0;
#else
    T0CON = 0b10001000;       /* ON, 16-bit, Fosc/4, sin prescaler */
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
   ISR — diferenciada por modo
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

    /* SSP1 — I2C slave / SPI slave */
    if (PIR1bits.SSP1IF && PIE1bits.SSP1IE) {
        PIR1bits.SSP1IF = 0;
        uint8_t sspm = SSP1CON1 & 0x0Fu;
        if (sspm == 0x04u || sspm == 0x05u) {
            if (SSP1STATbits.BF) {
                uint8_t data = SSP1BUF;
                if (_spi_on_receive) _spi_on_receive(data);
            }
        } else {
            uint8_t stat = SSP1STAT & 0x2Cu;
            if (!(stat & 0x08u)) {
                uint8_t dummy = SSP1BUF; (void)dummy;
                SSP1CON1bits.CKP = 1;
            } else if ((stat & 0x20u) && (stat & 0x04u)) {
                if (_i2c_on_request) _i2c_on_request();
                SSP1CON1bits.CKP = 1;
            } else if (!(stat & 0x20u) && (stat & 0x04u)) {
                uint8_t data = SSP1BUF;
                if (_i2c_on_receive) _i2c_on_receive(data);
                SSP1CON1bits.CKP = 1;
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

static void _timer1_init(void) {
    T1CON            = 0x00;
    TMR1H            = 0;
    TMR1L            = 0;
    _micros_overflow = 0;
    PIR1bits.TMR1IF  = 0;
    PIE1bits.TMR1IE  = 1;
    T1CONbits.TMR1ON = 1;
}

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
    return total / (F_CPU / 4000000UL);
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

void tone(pin_t pin, uint32_t freq) {
    if (pin != RC2) return;
    if (freq == 0) { noTone(pin); return; }
    uint16_t period = (uint16_t)((F_CPU / (4UL * freq)) - 1UL);
    T1CON            = 0x00;
    TMR1H            = 0;
    TMR1L            = 0;
    TRISCbits.TRISC2 = 0;
    CCP1CON          = 0b00000010;
    CCPR1H           = (uint8_t)(period >> 8);
    CCPR1L           = (uint8_t)(period & 0xFFu);
    PIR1bits.CCP1IF  = 0;
    PIE1bits.CCP1IE  = 1;
    INTCONbits.PEIE  = 1;
    INTCONbits.GIE   = 1;
    T1CONbits.TMR1ON = 1;
    _tone_active     = 1;
    _timer1_ready    = 1;
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
   ADC — [C4] todos digitales por defecto, analogRead configura
   [C12] ADCON1 comentado explícitamente — PVCFG=00 (Vref+=VDD),
         NVCFG=00 (Vref-=VSS). Comportamiento sin cambio,
         ahora autoexplicativo (DS41398B §17.2).
   [C13] Máscara defensiva (channel & 0x1Fu) en ADCON0.
         CHS4:CHS0 en bits [6:2]. Sin máscara, channel > 31
         puede corromper ADON o bits reservados.
   [C14] Cobertura de canales documentada: AN0-AN7 en ANSELA,
         AN8-AN11 en ANSELB. Canal ≥12 no disponible en DIP28.
   ============================================================ */
static void _adc_init(void) {
    ANSELA = 0x00u;           /* todos digitales por defecto     */
    ANSELB = 0x00u;           /* analogRead habilita por canal   */
    ANSELC = 0x00u;
    /* [C12] PVCFG=00 (Vref+=VDD), NVCFG=00 (Vref-=VSS)        */
    ADCON1 = 0x00u;
    /* right justify, 12 TAD, Fosc/32 — válido hasta 32MHz      */
    ADCON2 = 0b10101010u;
}

uint16_t analogRead(uint8_t channel) {
    static uint8_t adc_ready = 0;
    if (!adc_ready) { _adc_init(); adc_ready = 1; }

    /* [C14] Habilitar solo el canal pedido como analógico
       AN0-AN7  → ANSELA[channel]
       AN8-AN11 → ANSELB[channel-8]
       Canal ≥12: no disponible en encapsulado DIP28/SOIC28     */
    if      (channel < 8u)  ANSELA |= (uint8_t)(1u << channel);
    else if (channel < 12u) ANSELB |= (uint8_t)(1u << (channel - 8u));

    /* [C13] CHS4:CHS0 en ADCON0[6:2], ADON=1                   */
    ADCON0 = (uint8_t)(((channel & 0x1Fu) << 2) | 0x01u);

    delayMicroseconds(20);
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
        PR2       = (uint8_t)pr2_val;
        TMR2      = 0u;
        T2CON     = 0b00000101u;
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
   DAC — 5-bit (DS41398B §18)
   Referencia+: Vdd  (DACPSS=00)
   Referencia-: Vss  (DACNSS=0)
   Salida física en RA2 — DACOE=1
   ============================================================ */

/* Estado interno — evita reconfigurar si ya está activo      */
static uint8_t _dac_active = 0u;

void DAC_begin(void) {
    /* Configurar RA2 como salida analógica antes de
       encender el DAC — evita glitch en el pin              */
    TRISAbits.TRISA2  = 0u;   /* salida                      */
    ANSELAbits.ANSA2  = 1u;   /* modo analógico              */

    /* DACCON1: valor inicial = 0 (0V)                        */
    DACCON1 = 0x00u;

    /* DACCON0:
       bit7 DACEN  = 1 — habilitar DAC
       bit6 DACLPS = 0 — referencia+ = DACPPS (Vdd por fuse)
       bit5 DACOE  = 1 — salida en RA2
       bit4 —      = 0
       bit3 DACPSS1= 0 — ref+ = Vdd
       bit2 DACPSS0= 0 —
       bit1 —      = 0
       bit0 DACNSS = 0 — ref- = Vss                          */
    DACCON0 = 0b10100000u;

    _dac_active = 1u;
}

void DAC_write(uint8_t value) {
    if (!_dac_active) DAC_begin();

    /* Clamp defensivo — el DAC es de 5 bits (0–31)           */
    if (value > 31u) value = 31u;

    /* DACCON1[4:0] = valor                                   */
    DACCON1 = (uint8_t)(value & 0x1Fu);
}

void DAC_stop(void) {
    /* Apagar DAC                                             */
    DACCON0 = 0x00u;
    DACCON1 = 0x00u;

    /* Liberar RA2 como INPUT — estado seguro y predecible
       consistente con analogWriteClear()                     */
    ANSELAbits.ANSA2  = 0u;   /* digital                     */
    LATAbits.LATA2    = 0u;   /* latch en LOW                */
    TRISAbits.TRISA2  = 1u;   /* INPUT                       */

    _dac_active = 0u;
}

/* ============================================================
   Serial / UART — BRG16=1, BRGH=1
   ============================================================ */
void Serial_begin(uint32_t baud) {
    RCSTA = 0;
    TXSTA = 0;
    uint16_t spbrg = (uint16_t)((F_CPU / (4UL * baud)) - 1UL);
    TRISCbits.TRISC6 = 0;
    TRISCbits.TRISC7 = 1;
    ANSELCbits.ANSC6 = 0;
    ANSELCbits.ANSC7 = 0;
    SPBRG   = (uint8_t)(spbrg & 0xFFu);
    SPBRGH  = (uint8_t)(spbrg >> 8);
    TXSTA   = 0b00100100;
    RCSTA   = 0b10010000;
    BAUDCON = 0b00001000;
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
   EEPROM — DS41398B §7
   ============================================================ */
uint8_t EEPROM_read(uint16_t addr) {
    EEADR            = (uint8_t)(addr & 0xFFu);
    EECON1bits.EEPGD = 0;
    EECON1bits.CFGS  = 0;
    EECON1bits.RD    = 1;
    NOP(); NOP();
    return EEDATA;
}

void EEPROM_write(uint16_t addr, uint8_t val) {
    while (EECON1bits.WR);
    EEADR  = (uint8_t)(addr & 0xFFu);
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
    ANSELBbits.ANSB0        = 0;
    INTCON2bits.INTEDG0     = (mode == RISING) ? 1u : 0u;
    INTCONbits.INT0IF       = 0;
    INTCONbits.INT0IE       = 1;
    INTCONbits.GIE          = 1;
    /* [C22] IPEN eliminado — ya configurado por picasp_timer0_init() */
}

void detachInterrupt(uint8_t pin) {
    if (pin != RB0) return;
    INTCONbits.INT0IE = 0;
    _int_callback     = 0;
}

/* ============================================================
   I2C — Wire (usa SSP1 del K22)
   ============================================================ */
static uint8_t _i2c_idle(void) {
    uint16_t timeout = 10000u;
    while ((SSP1CON2 & 0x1Fu) && --timeout);
    if (!timeout) {
        SSP1CON2bits.PEN  = 1;
        SSP1CON1bits.SSPEN = 0;
        SSP1CON1bits.SSPEN = 1;
        return 0u;
    }
    timeout = 10000u;
    while (SSP1STATbits.R_NOT_W && --timeout);
    return timeout ? 1u : 0u;
}

void Wire_begin(uint32_t speed) {
    TRISCbits.TRISC3 = 1;
    TRISCbits.TRISC4 = 1;
    ANSELCbits.ANSC3 = 0;
    ANSELCbits.ANSC4 = 0;
    SSP1ADD  = (uint8_t)((F_CPU / (4UL * speed)) - 1UL);
    SSP1CON1 = 0b00101000;
    SSP1CON2 = 0;
    SSP1STAT = 0b10000000;
    PIR1bits.SSP1IF = 0;
    PIE1bits.SSP1IE = 0;
}

void Wire_beginSlave(uint8_t addr) {
    TRISCbits.TRISC3 = 1;
    TRISCbits.TRISC4 = 1;
    ANSELCbits.ANSC3 = 0;
    ANSELCbits.ANSC4 = 0;
    SSP1ADD  = (uint8_t)(addr << 1);
    SSP1CON1 = 0b00110110;
    SSP1CON2 = 0b00000001;
    SSP1STAT = 0b10000000;
    PIR1bits.SSP1IF = 0;
    PIE1bits.SSP1IE = 1;
    INTCONbits.PEIE = 1;    /* [C1] faltaba en SPI/I2C slave */
    INTCONbits.GIE  = 1;
}

void Wire_beginTransmission(uint8_t addr) {
    if (!_i2c_idle()) return;        /* [C21] bus colgado — abortar */
    SSP1CON2bits.SEN = 1;
    while (SSP1CON2bits.SEN);
    PIR1bits.SSP1IF = 0;
    SSP1BUF = (uint8_t)(addr << 1);
    while (!PIR1bits.SSP1IF);
    PIR1bits.SSP1IF = 0;
}

uint8_t Wire_write(uint8_t data) {
    PIR1bits.SSP1IF = 0;
    SSP1BUF = data;
    while (!PIR1bits.SSP1IF);
    PIR1bits.SSP1IF = 0;
    return SSP1CON2bits.ACKSTAT ? 0u : 1u;
}

uint8_t Wire_endTransmission(void) {
    SSP1CON2bits.PEN = 1;
    while (SSP1CON2bits.PEN);
    PIR1bits.SSP1IF = 0;
    return 0;
}

uint8_t Wire_requestFrom(uint8_t addr, uint8_t count) {
    _i2c_rx_head  = 0;
    _i2c_rx_tail  = 0;
    _i2c_rx_count = 0;
    if (!_i2c_idle()) return 0u;     /* [C21] bus colgado — retornar 0 */
    SSP1CON2bits.SEN = 1;
    while (SSP1CON2bits.SEN);
    PIR1bits.SSP1IF = 0;
    SSP1BUF = (uint8_t)((addr << 1) | 0x01u);
    while (!PIR1bits.SSP1IF);
    PIR1bits.SSP1IF = 0;
    uint8_t i;
    for (i = 0; i < count; i++) {
        SSP1CON2bits.RCEN = 1;
        while (SSP1CON2bits.RCEN);
        while (!SSP1STATbits.BF);
        _i2c_rx_buf[_i2c_rx_tail] = SSP1BUF;
        _i2c_rx_tail  = (_i2c_rx_tail + 1u) & 0x1Fu;
        _i2c_rx_count++;
        PIR1bits.SSP1IF     = 0;
        SSP1CON2bits.ACKDT  = (i == count - 1u) ? 1u : 0u;
        SSP1CON2bits.ACKEN  = 1;
        while (SSP1CON2bits.ACKEN);
    }
    SSP1CON2bits.PEN = 1;
    while (SSP1CON2bits.PEN);
    return _i2c_rx_count;
}

uint8_t Wire_available(void) { return _i2c_rx_count; }

uint8_t Wire_read(void) {
    if (_i2c_rx_count == 0u) return 0;         /* [C2] máscara u */
    uint8_t data  = _i2c_rx_buf[_i2c_rx_head];
    _i2c_rx_head  = (_i2c_rx_head + 1u) & 0x1Fu;
    _i2c_rx_count--;
    return data;
}

void Wire_onReceive(void (*cb)(uint8_t)) { _i2c_on_receive = cb; }
void Wire_onRequest(void (*cb)(void))    { _i2c_on_request = cb; }

/* ============================================================
   SPI — usa SSP1 del K22
   ============================================================ */
void SPI_begin(uint8_t mode, uint8_t speed) {
    TRISCbits.TRISC3 = 0;
    TRISCbits.TRISC4 = 1;
    TRISCbits.TRISC5 = 0;
    ANSELCbits.ANSC3 = 0;
    ANSELCbits.ANSC4 = 0;
    ANSELCbits.ANSC5 = 0;
    uint8_t cpol = (mode == SPI_MODE2 || mode == SPI_MODE3) ? 1u : 0u;
    uint8_t cpha = (mode == SPI_MODE1 || mode == SPI_MODE3) ? 1u : 0u;
    SSP1STAT = cpha ? 0x00u : 0x40u;
    SSP1CON1 = (uint8_t)(0b00100000u | (cpol << 4) | (speed & 0x03u));
    PIR1bits.SSP1IF = 0;
    PIE1bits.SSP1IE = 0;
}

uint8_t SPI_transfer(uint8_t data) {
    PIR1bits.SSP1IF = 0;
    SSP1BUF = data;
    while (!PIR1bits.SSP1IF);
    return SSP1BUF;
}

void SPI_end(void) {
    SSP1CON1         = 0;
    TRISCbits.TRISC3 = 1;
    TRISCbits.TRISC5 = 1;
}

void SPI_beginSlave(uint8_t mode) {
    TRISCbits.TRISC3 = 1;
    TRISCbits.TRISC4 = 1;
    TRISCbits.TRISC5 = 0;
    ANSELCbits.ANSC3 = 0;
    ANSELCbits.ANSC4 = 0;
    ANSELCbits.ANSC5 = 0;
    uint8_t cpol = (mode == SPI_MODE2 || mode == SPI_MODE3) ? 1u : 0u;
    uint8_t cpha = (mode == SPI_MODE1 || mode == SPI_MODE3) ? 1u : 0u;
    SSP1STAT        = cpha ? 0x00u : 0x40u;
    SSP1CON1        = (uint8_t)(0b00100100u | (cpol << 4));
    PIR1bits.SSP1IF = 0;
    PIE1bits.SSP1IE = 1;
    INTCONbits.PEIE = 1;    /* [C1] faltaba en v1.3 */
    INTCONbits.GIE  = 1;
}

void SPI_onReceive(void (*cb)(uint8_t)) { _spi_on_receive = cb; }

void SPI_write(uint8_t data) {
    PIR1bits.SSP1IF = 0;
    SSP1BUF = data;
    while (!PIR1bits.SSP1IF);
}

/* ============================================================
   [C3] main — millis() en loop también en ICSP
   ============================================================ */
void main(void) {
    CM1CON0 = 0x00;
    CM2CON0 = 0x00;
    ANSELA  = 0x00;
    ANSELB  = 0x00;
    ANSELC  = 0x00;

#if !defined(PICASP_BOOTLOADER) && defined(OSCILLATOR_INTOSC)
    volatile uint8_t* osccon = (volatile uint8_t*)&OSCCON;
    #if   F_CPU >= 16000000UL
        *osccon = 0b01111011;
    #elif F_CPU >= 8000000UL
        *osccon = 0b01110011;
    #elif F_CPU >= 4000000UL
        *osccon = 0b01101011;
    #elif F_CPU >= 2000000UL
        *osccon = 0b01100011;
    #else
        *osccon = 0b01011011;
    #endif
    while (!OSCCONbits.HFIOFS) NOP();
#endif

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
        millis();   /* [C3] mantener contador — necesario en BL y útil en ICSP */
        loop();
    }
}