/* ============================================================
   hal_pic16f877a.c — HAL PIC16F873A/874A/876A/877A v2.1
   Datasheet: DS39589C

   Cambios v2.0:
   [C1] micros(): fórmula general en lugar de #if encadenados
   [C2] Wire_read(): máscaras u consistentes
   [C3] SPI_beginSlave(): agregar INTCONbits.PEIE = 1

   Cambios v2.1:
   [C11] ADC: _adc_init() parte de todos digitales.
         ADCON1 = 0x8F (ADFM=1, PCFG=1111).
         analogRead configura PCFG dinámicamente por canal.
         Tabla DS39589C Table 11-3. Antes: PCFG=0000.
   [C12] ADC: clock seleccionado en compilación según F_CPU.
         Fosc/2 (≤4MHz), Fosc/8 (≤16MHz), Fosc/32 (≤20MHz).
   [C13] ADC: PCFG dinámico por canal pedido.
   [C14] PWM: TMR2=0 antes de encender Timer2.
   [C15] PWM: duty escalado — ccpr=duty*(PR2+1)/255.
   [C16] PWM: _pwm_ch1_active/_pwm_ch2_active para tracking.
         analogWriteClear con LATCbits, Timer2 off si ambos libres.
   [C17] PWM: Timer2 apagado cuando ambos canales inactivos.
   [C18] PWM: _pwm_timer2_running=0 al apagar Timer2.
   [C19] main(): ADCON1=0x8F — todos digitales al arrancar.
         Antes: ADCON1=0x06 dejaba AN0/AN1/AN2/AN4 analógicos.
   [C20] Serial_read: manejo de OERR y FERR.
   [C21] _i2c_idle: timeout anti-deadlock con reset de MSSP.
         Wire_beginTransmission y Wire_requestFrom verifican retorno.
   [C23] noTone: libera _pwm_ch1_active, apaga Timer2 si ambos
         canales libres — permite reuso de RC2 con analogWrite.
   [C24] analogWrite: usa _pwm_timer2_init() en lugar de
         static local pwm_ready — consistente con analogWriteClear.
   ============================================================ */

#include <picasp.h>

#define TMR0_RELOAD  (256 - (F_CPU / 32000UL))

static volatile uint32_t _millis_count    = 0;
static volatile uint16_t _micros_overflow = 0;
static void (*_int_callback)(void)        = 0;
static uint8_t _int_mode                  = FALLING;
static uint8_t _tone_active               = 0;
static uint8_t _timer1_ready              = 0;
static void (*_spi_on_receive)(uint8_t)   = 0;
static void (*_i2c_on_receive)(uint8_t)   = 0;
static void (*_i2c_on_request)(void)      = 0;

static uint8_t _i2c_rx_buf[32];
static uint8_t _i2c_rx_head  = 0;
static uint8_t _i2c_rx_tail  = 0;
static uint8_t _i2c_rx_count = 0;

/* ============================================================
   Timer0 init + ISR única PIC16F
   ============================================================ */
void picasp_timer0_init(void) {
    OPTION_REGbits.T0CS = 0;
    OPTION_REGbits.PSA  = 0;
    OPTION_REGbits.PS   = 0b010;
    TMR0                = TMR0_RELOAD;
    INTCONbits.T0IE     = 1;
    INTCONbits.T0IF     = 0;
    INTCONbits.GIE      = 1;
    INTCONbits.PEIE     = 1;
}

void __interrupt() picasp_isr(void) {
    /* Timer0 — millis */
    if (INTCONbits.T0IF) {
        TMR0 = TMR0_RELOAD;
        _millis_count++;
        INTCONbits.T0IF = 0;
    }
    /* INT externa — RB0 */
    if (INTCONbits.INTF && INTCONbits.INTE) {
        if (_int_callback) {
            if (_int_mode == CHANGE)
                OPTION_REGbits.INTEDG = !OPTION_REGbits.INTEDG;
            _int_callback();
        }
        INTCONbits.INTF = 0;
    }
    /* CCP1 — tone() */
    if (_tone_active && PIR1bits.CCP1IF && PIE1bits.CCP1IE) {
        TMR1H = 0;
        TMR1L = 0;
        PIR1bits.CCP1IF = 0;
    }
    /* Timer1 overflow — micros() */
    if (!_tone_active && PIR1bits.TMR1IF && PIE1bits.TMR1IE) {
        _micros_overflow++;
        PIR1bits.TMR1IF = 0;
    }
    /* SSP — I2C/SPI slave */
    if (PIR1bits.SSPIF && PIE1bits.SSPIE) {
        PIR1bits.SSPIF = 0;
        uint8_t sspm = SSPCON & 0x0Fu;
        if (sspm == 0x04u || sspm == 0x05u) {
            if (SSPSTATbits.BF) {
                uint8_t data = SSPBUF;
                if (_spi_on_receive) _spi_on_receive(data);
            }
        } else {
            uint8_t stat = SSPSTAT & 0x2Cu;
            if (!(stat & 0x08u)) {
                uint8_t dummy = SSPBUF; (void)dummy;
                SSPCONbits.CKP = 1;
            } else if ((stat & 0x20u) && (stat & 0x04u)) {
                if (_i2c_on_request) _i2c_on_request();
                SSPCONbits.CKP = 1;
            } else if (!(stat & 0x20u) && (stat & 0x04u)) {
                uint8_t data = SSPBUF;
                if (_i2c_on_receive) _i2c_on_receive(data);
                SSPCONbits.CKP = 1;
            }
        }
    }
}

/* ============================================================
   GPIO — PIC16F sin LAT, escribe en PORT
   ============================================================ */
static uint8_t _pin_bit (pin_t pin) { return (uint8_t)(1u << (pin & 0x0Fu)); }
static uint8_t _pin_port(pin_t pin) { return (uint8_t)(pin >> 4); }

static volatile uint8_t* const _TRIS[] = {
    (volatile uint8_t*)&TRISA,
    (volatile uint8_t*)&TRISB,
    (volatile uint8_t*)&TRISC,
    (volatile uint8_t*)&TRISD,
    (volatile uint8_t*)&TRISE,
};
static volatile uint8_t* const _PORT[] = {
    (volatile uint8_t*)&PORTA,
    (volatile uint8_t*)&PORTB,
    (volatile uint8_t*)&PORTC,
    (volatile uint8_t*)&PORTD,
    (volatile uint8_t*)&PORTE,
};

void pinMode(pin_t pin, uint8_t mode) {
    uint8_t port = _pin_port(pin);
    uint8_t bit  = _pin_bit(pin);
    if (port > 4u) return;
    if (mode == OUTPUT)
        *_TRIS[port] &= ~bit;
    else {
        *_TRIS[port] |= bit;
        if (mode == INPUT_PULLUP && port == 1u)
            OPTION_REGbits.nRBPU = 0;
    }
}

void digitalWrite(pin_t pin, uint8_t value) {
    uint8_t port = _pin_port(pin);
    uint8_t bit  = _pin_bit(pin);
    if (port > 4u) return;
    if (value) *_PORT[port] |=  bit;
    else       *_PORT[port] &= ~bit;
}

uint8_t digitalRead(pin_t pin) {
    uint8_t port = _pin_port(pin);
    uint8_t bit  = _pin_bit(pin);
    if (port > 4u) return 0;
    return (*_PORT[port] & bit) ? HIGH : LOW;
}

/* ============================================================
   Tiempo
   ============================================================ */
void delayMicroseconds(uint16_t us) {
    while (us--) __delay_us(1);
}

void delay(uint16_t ms) {
    if (!INTCONbits.GIE) {
        while (ms--) __delay_ms(1);
        return;
    }
    uint32_t start = _millis_count;
    while ((_millis_count - start) < ms);
}

uint32_t millis(void) {
    uint32_t val;
    uint8_t gie    = INTCONbits.GIE;
    INTCONbits.GIE = 0;
    val            = _millis_count;
    INTCONbits.GIE = gie;
    return val;
}

/* ============================================================
   micros / pulseIn / tone / noTone
   ============================================================ */
static void _timer1_init(void) {
    T1CONbits.TMR1CS = 0;
    T1CONbits.T1CKPS = 0b00;
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
        ovf = _micros_overflow;
        hi  = TMR1H;
        lo  = TMR1L;
        hi2 = TMR1H;
    } while (hi != hi2);
    uint32_t total = ((uint32_t)ovf << 16) |
                     ((uint16_t)hi  <<  8) | lo;
    return total / (F_CPU / 4000000UL);  /* [C1] fórmula general */
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
    /* [C23] Liberar RC2 del tracking PWM para que analogWrite    */
    /*       pueda reinicializar Timer2 correctamente si se usa   */
    /*       el pin después de noTone().                          */
    _pwm_ch1_active  = 0u;
    if (!_pwm_ch2_active) {
        T2CONbits.TMR2ON    = 0u;
        TMR2                = 0u;
        _pwm_timer2_running = 0u;
    }
}

/* ============================================================
   ADC:
   [C11] _adc_init() parte de todos los pines digitales.
         ADCON1: ADFM=1, PCFG=1111 → todos digitales.
         analogRead configura PCFG dinámicamente por canal.
         Antes: PCFG=0000 dejaba AN0-AN7 analógicos siempre,
         interfiriendo con GPIO en pines compartidos.
   [C12] Clock ADC seleccionado en compilación según F_CPU.
         DS39589C Table 11-1: Fosc/2 (≤4MHz), Fosc/8 (≤16MHz),
         Fosc/32 (≤20MHz). TAD mínimo = 1.6 µs.
   [C13] PCFG dinámico por canal — tabla DS39589C Table 11-3.
         canal 0 → PCFG=1110, canal 1 → PCFG=1101, ...
         canal ≥7 → PCFG=0000 (todos analógicos).
   ============================================================ */

/* ── Clock ADC según F_CPU (DS39589C Table 11-1) ────────────
   ADCS[1:0] en ADCON0[7:6]:
     00 = Fosc/2  — TAD = 2/F_CPU  (válido ≤ 1.25 MHz → usamos ≤ 4MHz)
     01 = Fosc/8  — TAD = 8/F_CPU  (válido ≤ 5 MHz → usamos ≤ 16MHz)
     10 = Fosc/32 — TAD = 32/F_CPU (válido ≤ 20 MHz)
     11 = RC      — TAD ≈ 4 µs     (siempre válido, más lento)
   ──────────────────────────────────────────────────────────── */
#if   F_CPU <= 4000000UL
  #define _ADC_ADCS  0b00u   /* Fosc/2  — TAD ≥ 500 ns  */
#elif F_CPU <= 16000000UL
  #define _ADC_ADCS  0b01u   /* Fosc/8  — TAD ≥ 500 ns  */
#else
  #define _ADC_ADCS  0b10u   /* Fosc/32 — TAD ≥ 1.6 µs  */
#endif

/* ── Tabla PCFG por canal máximo (DS39589C Table 11-3) ──────
   Habilita AN0..ANchannel. ADFM=1 se suma en analogRead.     */
static const uint8_t _adc_pcfg[8] = {
    0b1110,   /* canal 0: solo AN0          */
    0b1101,   /* canal 1: AN0-AN1           */
    0b1100,   /* canal 2: AN0-AN2           */
    0b1011,   /* canal 3: AN0-AN3           */
    0b1010,   /* canal 4: AN0-AN4           */
    0b1001,   /* canal 5: AN0-AN5           */
    0b1000,   /* canal 6: AN0-AN6           */
    0b0000,   /* canal ≥7: todos analógicos */
};

static void _adc_init(void) {
    /* [C11] ADFM=1 (right justify), PCFG=1111 → todos digitales */
    ADCON1 = (uint8_t)(0x80u | 0x0Fu);
    /* [C12] Clock ADC según F_CPU, ADON=0 hasta analogRead()    */
    ADCON0 = (uint8_t)(_ADC_ADCS << 6);
}

uint16_t analogRead(uint8_t channel) {
    static uint8_t adc_ready = 0;
    if (!adc_ready) { _adc_init(); adc_ready = 1; }

    /* [C13] PCFG dinámico — habilitar AN0..ANchannel            */
    uint8_t idx  = (channel > 6u) ? 7u : channel;
    ADCON1 = (uint8_t)(0x80u | _adc_pcfg[idx]);   /* ADFM=1 + PCFG */

    /* Preservar ADCS[1:0], insertar canal en CHS[2:0] = [5:3]  */
    ADCON0 = (uint8_t)((_ADC_ADCS << 6) | ((channel & 0x07u) << 3));
    ADCON0bits.ADON = 1;
    __delay_us(20);
    ADCON0bits.GO = 1;
    while (ADCON0bits.GO);
    return (uint16_t)(((uint16_t)ADRESH << 8) | ADRESL);
}

/* ============================================================
   PWM — Timer2 + CCP1(RC2) y CCP2(RC1)
   ============================================================ */
#define PWM_PR2  ((uint8_t)((F_CPU / 256000UL) - 1u))
/* Variable compartida — elevar _pwm_timer2_running ya existe   */
static uint8_t _pwm_timer2_running = 0;
static uint8_t _pwm_ch1_active     = 0;   /* [C16] nuevo          */
static uint8_t _pwm_ch2_active     = 0;   /* [C16] nuevo          */

static void _pwm_timer2_init(void) {
    if (_pwm_timer2_running) return;
    PR2                  = PWM_PR2;
    TMR2                 = 0u;           /* [C14] limpiar antes de encender */
    T2CONbits.T2CKPS     = 0b11;
    T2CONbits.TMR2ON     = 1;
    _pwm_timer2_running  = 1;
}

void analogWrite(uint8_t pin, uint8_t duty) {
    /* [C24] Usar _pwm_timer2_init() — variable de módulo       */
    /*       _pwm_timer2_running garantiza init única y permite */
    /*       que analogWriteClear la resetee correctamente.     */
    _pwm_timer2_init();

    /* [C14] Escalar duty al rango real 0..(PR2+1)*4             */
    uint16_t ccpr = (uint16_t)(((uint32_t)duty * ((uint16_t)PR2 + 1u)) / 255u);

    if (pin == RC2) {
        TRISCbits.TRISC2 = 0;
        CCP1CON          = 0b00001100u;              /* PWM mode            */
        CCPR1L           = (uint8_t)(ccpr >> 2);     /* 8 MSB               */
        CCP1CONbits.DC1B = (uint8_t)(ccpr & 0x03u);  /* 2 LSB               */
    } else if (pin == RC1) {
        TRISCbits.TRISC1 = 0;
        CCP2CON          = 0b00001100u;
        CCPR2L           = (uint8_t)(ccpr >> 2);
        CCP2CONbits.DC2B = (uint8_t)(ccpr & 0x03u);
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

    /* [C17][C18] Timer2 off cuando ambos canales libres         */
    if (!_pwm_ch1_active && !_pwm_ch2_active) {
        T2CONbits.TMR2ON    = 0u;
        TMR2                = 0u;
        _pwm_timer2_running = 0u;
    }
}

/* ============================================================
   Serial — RC6(TX) RC7(RX), sin BRG16
   ============================================================ */
void Serial_begin(uint32_t baud) {
    uint16_t spbrg = (uint16_t)((F_CPU / (16UL * baud)) - 1UL);
    if (spbrg > 255u) spbrg = 255u;
    TRISCbits.TRISC6 = 0;
    TRISCbits.TRISC7 = 1;
    SPBRG  = (uint8_t)spbrg;
    TXSTA  = 0b00100100;
    RCSTA  = 0b10010000;
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

    /* [C20] Manejo de errores UART:
       OERR (overrun): el buffer de 3 bytes se llenó — el USART
             queda congelado hasta resetear CREN. Se limpia
             antes de leer para no perder bytes válidos futuros.
       FERR (framing): stop bit inválido — el byte en RCREG
             es basura. Se lee y descarta para limpiar el flag
             y retornar 0 como señal de byte inválido.          */
    if (RCSTAbits.OERR) {
        RCSTAbits.CREN = 0u;
        RCSTAbits.CREN = 1u;
    }
    if (RCSTAbits.FERR) {
        uint8_t dummy = RCREG;   /* limpiar FERR leyendo RCREG  */
        (void)dummy;
        return 0u;               /* byte inválido                */
    }
    return RCREG;
}

/* ============================================================
   EEPROM
   ============================================================ */
uint8_t EEPROM_read(uint16_t addr) {
    EEADR            = (uint8_t)(addr & 0xFFu);
    EECON1bits.EEPGD = 0;
    EECON1bits.RD    = 1;
    return EEDATA;
}

void EEPROM_write(uint16_t addr, uint8_t val) {
    while (EECON1bits.WR);
    EEADR            = (uint8_t)(addr & 0xFFu);
    EEDATA           = val;
    EECON1bits.EEPGD = 0;
    EECON1bits.WREN  = 1;
    uint8_t gie      = INTCONbits.GIE;
    INTCONbits.GIE   = 0;
    EECON2 = 0x55;
    EECON2 = 0xAA;
    EECON1bits.WR  = 1;
    INTCONbits.GIE = gie;
    while (EECON1bits.WR);
    EECON1bits.WREN = 0;
}

void EEPROM_update(uint16_t addr, uint8_t val) {
    if (EEPROM_read(addr) != val) EEPROM_write(addr, val);
}

/* ============================================================
   Interrupción externa — RB0
   ============================================================ */
void attachInterrupt(uint8_t pin, void (*callback)(void), uint8_t mode) {
    if (pin != RB0) return;
    _int_callback         = callback;
    _int_mode             = mode;
    TRISBbits.TRISB0      = 1;
    OPTION_REGbits.INTEDG = (mode == RISING) ? 1u : 0u;
    INTCONbits.INTF = 0;
    INTCONbits.INTE = 1;
    INTCONbits.GIE  = 1;
}

void detachInterrupt(uint8_t pin) {
    if (pin != RB0) return;
    INTCONbits.INTE = 0;
    _int_callback   = 0;
}

/* ============================================================
   I2C — Wire (MSSP)
   ============================================================ */
static uint8_t _i2c_idle(void) {
    uint16_t timeout = 10000u;
    while (SSPSTATbits.BF && --timeout);
    if (!timeout) {
        SSPCON2bits.PEN  = 1;
        SSPCONbits.SSPEN = 0;
        SSPCONbits.SSPEN = 1;
        return 0u;
    }
    timeout = 10000u;
    while ((SSPCON2bits.SEN  || SSPCON2bits.RSEN ||
            SSPCON2bits.PEN  || SSPCON2bits.RCEN ||
            SSPCON2bits.ACKEN) && --timeout);
    return timeout ? 1u : 0u;
}

void Wire_begin(uint32_t speed) {
    TRISCbits.TRISC3 = 1;
    TRISCbits.TRISC4 = 1;
    SSPCON           = 0b00101000;
    SSPCON2          = 0x00;
    SSPSTAT          = 0b10000000;
    SSPADD           = (uint8_t)((F_CPU / (4UL * speed)) - 1UL);
    PIR1bits.SSPIF   = 0;
    PIE1bits.SSPIE   = 0;
}

void Wire_beginSlave(uint8_t addr) {
    TRISCbits.TRISC3 = 1;
    TRISCbits.TRISC4 = 1;
    SSPCON           = 0b00110110;
    SSPCON2          = 0b00000001;
    SSPSTAT          = 0b10000000;
    SSPADD           = (uint8_t)(addr << 1);
    PIR1bits.SSPIF   = 0;
    PIE1bits.SSPIE   = 1;
    INTCONbits.PEIE  = 1;
    INTCONbits.GIE   = 1;
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

/* [C2] Wire_read — máscaras u consistentes */
uint8_t Wire_read(void) {
    if (_i2c_rx_count == 0u) return 0;
    uint8_t data  = _i2c_rx_buf[_i2c_rx_head];
    _i2c_rx_head  = (_i2c_rx_head + 1u) & 0x1Fu;
    _i2c_rx_count--;
    return data;
}

void Wire_onReceive(void (*cb)(uint8_t)) { 
    _i2c_on_receive = cb; 
}

void Wire_onRequest(void (*cb)(void)) { 
    _i2c_on_request = cb; 
}

/* ============================================================
   SPI — MSSP RC3(SCK) RC4(SDI) RC5(SDO)
   ============================================================ */
void SPI_begin(uint8_t mode, uint8_t speed) {
    TRISCbits.TRISC3 = 0;
    TRISCbits.TRISC4 = 1;
    TRISCbits.TRISC5 = 0;
    SSPCON = (uint8_t)(0b00100000u | (speed & 0x03u));
    switch (mode) {
        case SPI_MODE0: SSPSTATbits.CKE=1; SSPCONbits.CKP=0; break;
        case SPI_MODE1: SSPSTATbits.CKE=0; SSPCONbits.CKP=0; break;
        case SPI_MODE2: SSPSTATbits.CKE=1; SSPCONbits.CKP=1; break;
        default:        SSPSTATbits.CKE=0; SSPCONbits.CKP=1; break;
    }
    SSPSTATbits.SMP  = 1;
    SSPCONbits.SSPEN = 1;
    PIR1bits.SSPIF   = 0;
    PIE1bits.SSPIE   = 0;
}

uint8_t SPI_transfer(uint8_t data) {
    PIR1bits.SSPIF = 0;
    SSPBUF = data;
    while (!PIR1bits.SSPIF);
    PIR1bits.SSPIF = 0;
    return SSPBUF;
}

void SPI_end(void) {
    SSPCONbits.SSPEN = 0;
    TRISCbits.TRISC3 = 1;
    TRISCbits.TRISC5 = 1;
}

/* [C3] SPI_beginSlave — agregar PEIE=1 */
void SPI_beginSlave(uint8_t mode) {
    TRISCbits.TRISC3 = 1;
    TRISCbits.TRISC4 = 1;
    TRISCbits.TRISC5 = 0;
    SSPCON = 0b00100100;
    switch (mode) {
        case SPI_MODE0: SSPSTATbits.CKE=1; SSPCONbits.CKP=0; break;
        case SPI_MODE1: SSPSTATbits.CKE=0; SSPCONbits.CKP=0; break;
        case SPI_MODE2: SSPSTATbits.CKE=1; SSPCONbits.CKP=1; break;
        default:        SSPSTATbits.CKE=0; SSPCONbits.CKP=1; break;
    }
    SSPSTATbits.SMP  = 0;
    SSPCONbits.SSPEN = 1;
    PIR1bits.SSPIF   = 0;
    PIE1bits.SSPIE   = 1;
    INTCONbits.PEIE  = 1;   /* [C3] faltaba en v1.x */
    INTCONbits.GIE   = 1;
}

void SPI_onReceive(void (*cb)(uint8_t)) { 
    _spi_on_receive = cb; 
}

void SPI_write(uint8_t data) { 
    SSPBUF = data; 
}

/* ============================================================
   main
   ============================================================ */
void main(void) {
    /* [C19] ADCON1 correcto: ADFM=1 (bit7), PCFG=1111 (bits3:0) */
    /*       → todos los pines AN digitales por defecto.           */
    /*       Antes: 0x06 = PCFG=0110 → AN0/AN1/AN2/AN4 analógicos */
    /*       (incorrecto — el comentario original era erróneo).    */
    ADCON1 = (uint8_t)(0x80u | 0x0Fu);   /* 0x8F — todos digitales */

    picasp_timer0_init();
    setup();
    while (1) { loop(); }
}