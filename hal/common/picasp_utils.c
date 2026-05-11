/* ============================================================
   picasp_utils.c — Implementación utilidades comunes PICasp
   v1.2.0

   Cambios v1.1.0:
   [U1] Serial_readLine, Serial_readInt, Serial_printFloat
        movidas desde los HALs individuales a este archivo.
   [U2] Wire_writeReg, Wire_readReg, Wire_readRegWord,
        Wire_scan movidas desde los HALs individuales.
   [U3] analogReadAvg, analogReadVoltage movidas desde los HALs.

   Cambios v1.2.0:
   [U4] random() / randomSeed() — LCG de 32 bits (Knuth).
        Parámetros: a=1664525, c=1013904223.
        random_max(max)        → [0, max-1]
        random_range(min, max) → [min, max-1]
        Alias Arduino-style via macro variádica en picasp_utils.h.
   [U5] pulseInLong() — mide pulsos largos con millis().
        Resolución ~1 ms. Guardada bajo #ifndef PICASP_NO_TIMER1.
   ============================================================ */

#include <stdarg.h>
#include <stdio.h>
#include "picasp.h"

/* ── map_value ───────────────────────────────────────────────  */
int32_t map_value(int32_t x,
                  int32_t in_min,  int32_t in_max,
                  int32_t out_min, int32_t out_max) {
    if (in_max == in_min) return out_min;
    return (x - in_min) * (out_max - out_min)
           / (in_max - in_min) + out_min;
}

/* ── constrain_value ─────────────────────────────────────────  */
int32_t constrain_value(int32_t x, int32_t lo, int32_t hi) {
    if (x < lo) return lo;
    if (x > hi) return hi;
    return x;
}

/* ── digitalToggle ───────────────────────────────────────────  */
void digitalToggle(pin_t pin) {
    digitalWrite(pin, digitalRead(pin) ? LOW : HIGH);
}

/* ── shiftOut ────────────────────────────────────────────────  */
void shiftOut(pin_t dataPin, pin_t clockPin,
              uint8_t bitOrder, uint8_t value) {
    uint8_t i;
    for (i = 0; i < 8u; i++) {
        if (bitOrder == MSBFIRST)
            digitalWrite(dataPin, (value & (0x80u >> i)) ? HIGH : LOW);
        else
            digitalWrite(dataPin, (value & (1u << i)) ? HIGH : LOW);
        digitalWrite(clockPin, HIGH);
        digitalWrite(clockPin, LOW);
    }
}

/* ── shiftIn ─────────────────────────────────────────────────  */
uint8_t shiftIn(pin_t dataPin, pin_t clockPin, uint8_t bitOrder) {
    uint8_t value = 0u;
    uint8_t i;
    for (i = 0; i < 8u; i++) {
        digitalWrite(clockPin, HIGH);
        if (bitOrder == MSBFIRST)
            value |= (uint8_t)(digitalRead(dataPin) << (7u - i));
        else
            value |= (uint8_t)(digitalRead(dataPin) << i);
        digitalWrite(clockPin, LOW);
    }
    return value;
}

/* ── toBCD ───────────────────────────────────────────────────  */
uint8_t toBCD(uint8_t val) {
    if (val > 99u) val = 99u;
    return (uint8_t)(((val / 10u) << 4) | (val % 10u));
}

/* ── fromBCD ─────────────────────────────────────────────────  */
uint8_t fromBCD(uint8_t bcd) {
    return (uint8_t)(((bcd >> 4) * 10u) + (bcd & 0x0Fu));
}

/* ============================================================
   Serial helpers
   ============================================================ */
#ifndef PICASP_NO_UART

/* ── Serial_printf ───────────────────────────────────────────  */
void Serial_printf(const char* fmt, ...) {
    char    buf[PICASP_PRINTF_BUF];
    va_list args;
    va_start(args, fmt);
    vsnprintf(buf, sizeof(buf), fmt, args);
    va_end(args);
    Serial_println(buf);
}

/* ── Serial_readLine ─────────────────────────────────────────  */
uint8_t Serial_readLine(char* buf, uint8_t maxLen) {
    uint8_t limit;
    uint8_t i = 0u;
    char    c;

    if (!buf || maxLen == 0u) return 0u;
    limit = (uint8_t)(maxLen - 1u);

    while (i < limit) {
        c = (char)Serial_read();
        if (c == '\n') break;
        if (c == '\r') continue;
        if (c == '\0') continue;   /* [U4] ignorar bytes inválidos (FERR) */
        buf[i++] = c;
    }
    buf[i] = '\0';
    return i;
}

/* ── Serial_readInt ──────────────────────────────────────────  */
int32_t Serial_readInt(void) {
    char    buf[12];
    uint8_t len    = Serial_readLine(buf, (uint8_t)sizeof(buf));
    int32_t result = 0;
    uint8_t i      = 0u;
    uint8_t neg    = 0u;

    if (len == 0u) return 0;
    if (buf[0] == '-') { neg = 1u; i = 1u; }

    for (; i < len; i++) {
        if (buf[i] < '0' || buf[i] > '9') break;
        result = result * 10 + (int32_t)(buf[i] - '0');
    }
    return neg ? -result : result;
}

/* ── Serial_printFloat ───────────────────────────────────────  */
void Serial_printFloat(int32_t val, uint8_t decimals) {
    uint32_t divisor = 1u;
    uint8_t  i;
    uint32_t frac;
    uint32_t pad;

    /* Calcular 10^decimals, máximo 4 dígitos */
    if (decimals > 4u) decimals = 4u;
    for (i = 0u; i < decimals; i++) divisor *= 10u;

    if (val < 0) {
        Serial_write('-');
        val = -val;
    }

    /* Parte entera */
    Serial_printInt((int32_t)((uint32_t)val / divisor));

    if (decimals == 0u) return;

    /* Separador decimal */
    Serial_write('.');

    frac = (uint32_t)val % divisor;

    /* Caso especial: frac == 0 — imprimir exactamente
     * 'decimals' ceros. */
    if (frac == 0u) {
        uint8_t z;
        for (z = 0u; z < decimals; z++) Serial_write('0');
        return;
    }

    /* Ceros a la izquierda — cuando frac tiene menos dígitos
     * que decimals (ej: frac=5, decimals=2 → "05"). */
    pad = divisor / 10u;
    while (pad > frac) {
        Serial_write('0');
        pad /= 10u;
    }

    /* Dígitos significativos de la parte fraccionaria */
    Serial_printInt((int32_t)frac);
}

#endif /* PICASP_NO_UART */

/* ============================================================
   I2C helpers
   ============================================================ */
#ifndef PICASP_NO_I2C

/* ── Wire_writeReg ───────────────────────────────────────────  */
uint8_t Wire_writeReg(uint8_t addr, uint8_t reg, uint8_t val) {
    Wire_beginTransmission(addr);
    Wire_write(reg);
    Wire_write(val);
    return Wire_endTransmission();
}

/* ── Wire_readReg ────────────────────────────────────────────  */
uint8_t Wire_readReg(uint8_t addr, uint8_t reg) {
    Wire_beginTransmission(addr);
    Wire_write(reg);
    Wire_endTransmission();
    if (Wire_requestFrom(addr, (uint8_t)1u) == 0u) return 0xFFu;
    return Wire_read();
}

/* ── Wire_readRegWord ────────────────────────────────────────  */
uint16_t Wire_readRegWord(uint8_t addr, uint8_t reg) {
    uint8_t hi, lo;
    Wire_beginTransmission(addr);
    Wire_write(reg);
    Wire_endTransmission();
    if (Wire_requestFrom(addr, (uint8_t)2u) < 2u) return 0xFFFFu;
    hi = Wire_read();
    lo = Wire_read();
    return (uint16_t)((uint16_t)hi << 8 | lo);
}

/* ── Wire_scan ───────────────────────────────────────────────  */
void Wire_scan(void (*callback)(uint8_t addr)) {
    uint8_t addr;
    if (!callback) return;
    for (addr = 0x08u; addr <= 0x77u; addr++) {
        Wire_beginTransmission(addr);
        if (Wire_endTransmission() == 0u) {   // ← si el bus está colgado, deadlock
            callback(addr);
        }
        delayMicroseconds(200u);
    }
}

#endif /* PICASP_NO_I2C */

/* ============================================================
   ADC helpers
   ============================================================ */
#ifndef PICASP_NO_ADC

/* ── analogReadAvg ───────────────────────────────────────────  */
uint16_t analogReadAvg(uint8_t channel, uint8_t n) {
    uint32_t sum = 0u;
    uint8_t  i;
    if (n == 0u) n = 1u;
    if (n > 64u) n = 64u;
    for (i = 0u; i < n; i++) sum += analogRead(channel);
    return (uint16_t)(sum / (uint32_t)n);
}

/* ── analogReadVoltage ───────────────────────────────────────  */
uint16_t analogReadVoltage(uint8_t channel) {
    uint32_t raw = (uint32_t)analogRead(channel);
    return (uint16_t)((raw * PICASP_VDD_MV) / 1023UL);
}

#endif /* PICASP_NO_ADC */

/* ============================================================
   random / randomSeed — LCG de 32 bits
   Parámetros clásicos de Numerical Recipes:
     a = 1664525, c = 1013904223 (Knuth)
   ============================================================ */
static uint32_t _rand_seed = 1UL;

void randomSeed(uint32_t seed) {
    if (seed == 0u) seed = 1u;   /* LCG no puede arrancar en 0 */
    _rand_seed = seed;
}

static uint32_t _rand_next(void) {
    _rand_seed = _rand_seed * 1664525UL + 1013904223UL;
    return _rand_seed;
}

int32_t random_max(int32_t max) {
    if (max <= 1) return 0;
    return (int32_t)(_rand_next() % (uint32_t)max);
}

int32_t random_range(int32_t min, int32_t max) {
    if (max <= min) return min;
    return min + random_max(max - min);
}

/* ============================================================
   pulseInLong — basada en millis(), resolución ~1 ms
   ============================================================ */
#ifndef PICASP_NO_TIMER1

uint32_t pulseInLong(pin_t pin, uint8_t state, uint32_t timeout) {
    uint32_t start;
    uint32_t elapsed;
    uint32_t pulse_start;           /* ← declarada acá, sin inicializar */

    /* Esperar a que el pin salga del estado buscado (si ya está en él) */
    start = millis();
    while (digitalRead(pin) == state) {
        elapsed = millis() - start;
        if (elapsed > timeout) return 0u;
    }

    /* Esperar el flanco de entrada */
    start = millis();
    while (digitalRead(pin) != state) {
        elapsed = millis() - start;
        if (elapsed > timeout) return 0u;
    }

    /* Medir la duración del pulso */
    pulse_start = millis();         /* ← asignación acá, no declaración */
    while (digitalRead(pin) == state) {
        elapsed = millis() - pulse_start;
        if (elapsed > timeout) return 0u;
    }

    return millis() - pulse_start;
}

#endif