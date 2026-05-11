/* ============================================================
   hal_pic16f628a.c — HAL PIC16F627A/628A/648A v2.0
   Datasheet: DS41196G

   Cambios v2.0:
   [C1] millis(): guardar y restaurar GIE — no forzar GIE=1
   [C2] micros(): fórmula general F_CPU/4000000 en lugar de #if
   [C3] Eliminado softPWM() — movido a responsabilidad del usuario
   ============================================================ */

#include <picasp.h>

#define TMR0_RELOAD  (256 - (F_CPU / 32000UL))

static volatile uint32_t _millis_count    = 0;
static volatile uint16_t _micros_overflow = 0;
static void (*_int_callback)(void)        = 0;
static uint8_t _int_mode                  = FALLING;
static uint8_t _tone_active               = 0;
static uint8_t _timer1_ready              = 0;

/* ============================================================
   Timer0 init + ISR única PIC16F
   ============================================================ */
void picasp_timer0_init(void) {
    OPTION_REGbits.T0CS = 0;     /* reloj interno */
    OPTION_REGbits.PSA  = 0;     /* prescaler a Timer0 */
    OPTION_REGbits.PS   = 0b010; /* prescaler 1:8 */
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
    /* Timer1 overflow — extiende micros() a 32 bits */
    if (PIR1bits.TMR1IF && PIE1bits.TMR1IE) {
        _micros_overflow++;
        PIR1bits.TMR1IF = 0;
    }
}

/* ============================================================
   GPIO — PIC16F sin LAT, escribe directamente en PORT
   ============================================================ */
static uint8_t _pin_bit (pin_t pin) { return (uint8_t)(1u << (pin & 0x0Fu)); }
static uint8_t _pin_port(pin_t pin) { return (uint8_t)(pin >> 4); }

static volatile uint8_t* const _TRIS[] = {
    (volatile uint8_t*)&TRISA,
    (volatile uint8_t*)&TRISB,
};
static volatile uint8_t* const _PORT[] = {
    (volatile uint8_t*)&PORTA,
    (volatile uint8_t*)&PORTB,
};

void pinMode(pin_t pin, uint8_t mode) {
    uint8_t port = _pin_port(pin);
    uint8_t bit  = _pin_bit(pin);
    if (port > 1u) return;
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
    if (port > 1u) return;
    if (value) *_PORT[port] |=  bit;
    else       *_PORT[port] &= ~bit;
}

uint8_t digitalRead(pin_t pin) {
    uint8_t port = _pin_port(pin);
    uint8_t bit  = _pin_bit(pin);
    if (port > 1u) return 0;
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

/* [C1] millis() — guardar y restaurar GIE */
uint32_t millis(void) {
    uint32_t val;
    uint8_t gie = INTCONbits.GIE;   /* [C1] guardar estado */
    INTCONbits.GIE = 0;
    val = _millis_count;
    INTCONbits.GIE = gie;            /* [C1] restaurar — no forzar 1 */
    return val;
}

/* ============================================================
   micros / pulseIn
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
    return total / (F_CPU / 4000000UL);  /* [C2] fórmula general */
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

/* ============================================================
   Serial — USART RB2(TX) RB1(RX)
   Sin BRG16: BRG = F_CPU/(16×baud) - 1
   ============================================================ */
void Serial_begin(uint32_t baud) {
    uint16_t spbrg = (uint16_t)((F_CPU / (16UL * baud)) - 1UL);
    if (spbrg > 255u) spbrg = 255u;
    TRISBbits.TRISB2 = 0;
    TRISBbits.TRISB1 = 1;
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

    /* [C20] Manejo de errores UART — igual que hal_pic16f877a:
       OERR: resetear CREN para descongelar el receptor.
       FERR: descartar byte inválido y retornar 0.              */
    if (RCSTAbits.OERR) {
        RCSTAbits.CREN = 0u;
        RCSTAbits.CREN = 1u;
    }
    if (RCSTAbits.FERR) {
        uint8_t dummy = RCREG;
        (void)dummy;
        return 0u;
    }
    return RCREG;
}

/* ============================================================
   EEPROM — PIC16F sin EEPGD, acceso directo a datos
   ============================================================ */
uint8_t EEPROM_read(uint16_t addr) {
    EEADR         = (uint8_t)(addr & 0xFFu);
    EECON1bits.RD = 1;
    return EEDATA;
}

void EEPROM_write(uint16_t addr, uint8_t val) {
    while (EECON1bits.WR);
    EEADR           = (uint8_t)(addr & 0xFFu);
    EEDATA          = val;
    EECON1bits.WREN = 1;
    uint8_t gie     = INTCONbits.GIE;
    INTCONbits.GIE  = 0;
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
   Interrupción externa — RB0 (único pin INT en PIC16F)
   CHANGE soportado alternando el flanco en la ISR.
   ============================================================ */
void attachInterrupt(uint8_t pin, void (*callback)(void), uint8_t mode) {
    if (pin != RB0) return;
    _int_callback         = callback;
    _int_mode             = mode;
    TRISBbits.TRISB0      = 1;
    OPTION_REGbits.nRBPU  = 0;
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
   main
   ============================================================ */
void main(void) {
    CMCON = 0x07;   /* comparadores OFF — pines digitales */
    picasp_timer0_init();
    setup();
    while (1) { loop(); }
}