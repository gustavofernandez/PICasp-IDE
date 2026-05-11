/* ============================================================
   picasp_utils.h — Utilidades comunes PICasp v1.2.0
   Compatibles con todos los chips soportados.
   No acceden a ningún registro SFR directamente.

   Requiere que picasp.h ya haya incluido el HAL del chip
   antes de incluir este archivo.

   Cambios v1.1.0:
   [U1] Serial_readLine, Serial_readInt, Serial_printFloat
        movidas desde los HALs individuales a este archivo.
   [U2] Wire_writeReg, Wire_readReg, Wire_readRegWord,
        Wire_scan movidas desde los HALs individuales.
   [U3] analogReadAvg, analogReadVoltage movidas desde los HALs.

   Cambios v1.2.0:
   [U4] random(), randomSeed() — generador LCG de 32 bits.
        Alias random(max) y random(min, max) via macro variádica.
   [U5] pulseInLong() — medición de pulsos largos basada en
        millis(). Resolución ~1 ms. No disponible en chips
        sin Timer1 (PICASP_NO_TIMER1).
   ============================================================ */

#ifndef PICASP_UTILS_H
#define PICASP_UTILS_H

#include <stdint.h>

/* ── map_value ───────────────────────────────────────────────
   Reescala x del rango [in_min, in_max] al [out_min, out_max].
   Usa aritmética de 32 bits para evitar overflow.
   Ejemplo: map_value(512, 0, 1023, 0, 100) → 50
   ──────────────────────────────────────────────────────────── */
__attribute__((used))
int32_t map_value(int32_t x,
                  int32_t in_min,  int32_t in_max,
                  int32_t out_min, int32_t out_max);

/* ── constrain_value ─────────────────────────────────────────
   Limita x al rango [lo, hi].
   Ejemplo: constrain_value(300, 0, 255) → 255
   ──────────────────────────────────────────────────────────── */
__attribute__((used))
int32_t constrain_value(int32_t x, int32_t lo, int32_t hi);

/* ── digitalToggle ───────────────────────────────────────────
   Invierte el estado lógico del pin.
   Equivalente a digitalWrite(pin, !digitalRead(pin)).
   ──────────────────────────────────────────────────────────── */
__attribute__((used))
void digitalToggle(pin_t pin);

/* ── shiftOut / shiftIn ──────────────────────────────────────
   Transferencia SPI por bitbang — no usa el módulo MSSP.
   Útil en chips sin MSSP (PIC16F628A) o cuando el MSSP
   está ocupado con I2C.
   bitOrder: MSBFIRST (1) o LSBFIRST (0).
   ──────────────────────────────────────────────────────────── */
#ifndef MSBFIRST
  #define MSBFIRST  1
#endif
#ifndef LSBFIRST
  #define LSBFIRST  0
#endif

__attribute__((used))
void shiftOut(pin_t dataPin, pin_t clockPin,
              uint8_t bitOrder, uint8_t value);

__attribute__((used))
uint8_t shiftIn(pin_t dataPin, pin_t clockPin,
                uint8_t bitOrder);

/* ── toBCD / fromBCD ─────────────────────────────────────────
   Conversión entre decimal y BCD empaquetado.
   Rango válido para toBCD: 0–99.
   Útil con RTCs: DS1307, DS3231, PCF8563.
   Ejemplo: toBCD(45) → 0x45
            fromBCD(0x45) → 45
   ──────────────────────────────────────────────────────────── */
__attribute__((used)) uint8_t toBCD  (uint8_t val);
__attribute__((used)) uint8_t fromBCD(uint8_t bcd);

/* ── Serial helpers ──────────────────────────────────────────
   Funciones de alto nivel para UART.
   Solo disponibles en chips con UART.
   No disponibles en PIC16F627A/628A/648A (PICASP_NO_UART).
   ──────────────────────────────────────────────────────────── */
#ifndef PICASP_NO_UART

/* Serial_printf — formatea e imprime con salto de línea.
   Usa un buffer interno estático de PICASP_PRINTF_BUF bytes.
   Compatible con XC8 — usa snprintf internamente.
   No soporta %f — usá Serial_printFloat para decimales.

   Ejemplo:
     Serial_printf("Temp: %d Hum: %d", temp, hum);
     Serial_printf("Valor: 0x%02X", reg);             */
#ifndef PICASP_PRINTF_BUF
  #define PICASP_PRINTF_BUF 32
#endif

__attribute__((used))
void Serial_printf(const char* fmt, ...);

/* Serial_readLine — lee hasta '\n' o maxLen-1 caracteres.
   Descarta '\r'. Agrega '\0' al final.
   Retorna el número de caracteres leídos (sin contar '\0').
   Bloqueante — espera hasta recibir '\n'.                    */
__attribute__((used))
uint8_t Serial_readLine(char* buf, uint8_t maxLen);

/* Serial_readInt — parsea un int32_t desde la UART.
   Espera una línea terminada en '\n'.
   Soporta signo negativo.                                    */
__attribute__((used))
int32_t Serial_readInt(void);

/* Serial_printFloat — imprime un valor escalado como decimal.
   Sin usar float ni librería matemática.
   val:      valor entero escalado al número de decimales.
   decimals: dígitos decimales (0–4).
   Ejemplo: Serial_printFloat(1823, 2)  → imprime "18.23"
            Serial_printFloat(4096, 3)  → imprime "4.096"   */
__attribute__((used))
void Serial_printFloat(int32_t val, uint8_t decimals);

#endif /* PICASP_NO_UART */

/* ── I2C helpers ─────────────────────────────────────────────
   Wrappers de alto nivel para el patrón más común en I2C.
   Solo disponibles en chips con MSSP.
   No disponibles en PIC16F628A/627A/648A (PICASP_NO_I2C).
   ──────────────────────────────────────────────────────────── */
#ifndef PICASP_NO_I2C

/* Wire_writeReg — escribe un byte en un registro.
   Equivalente a: beginTransmission + write(reg) +
                  write(val) + endTransmission.
   Retorna 0 si OK, distinto de 0 si NACK.                   */
__attribute__((used))
uint8_t Wire_writeReg(uint8_t addr, uint8_t reg, uint8_t val);

/* Wire_readReg — lee un byte de un registro.
   Retorna el byte leído, o 0xFF si el dispositivo no responde.*/
__attribute__((used))
uint8_t Wire_readReg(uint8_t addr, uint8_t reg);

/* Wire_readRegWord — lee 2 bytes consecutivos (big endian).
   Retorna (byte_alto << 8 | byte_bajo).
   Útil para sensores: MPU-6050, BMP280, ADS1115, etc.
   Retorna 0xFFFF si el dispositivo no responde.             */
__attribute__((used))
uint16_t Wire_readRegWord(uint8_t addr, uint8_t reg);

/* Wire_scan — escanea el bus I2C de 0x08 a 0x77.
   Llama a callback(addr) por cada dispositivo que responde.
   Duración aprox: ~33 ms a 100 kHz, ~20 ms a 400 kHz.      */
__attribute__((used))
void Wire_scan(void (*callback)(uint8_t addr));

#endif /* PICASP_NO_I2C */

/* ── ADC helpers ─────────────────────────────────────────────
   Solo disponibles en chips con ADC.
   No disponibles en PIC16F627A/628A/648A (PICASP_NO_ADC).
   ──────────────────────────────────────────────────────────── */
#ifndef PICASP_NO_ADC

/* analogReadAvg — promedio de n lecturas ADC (máx. 64).
   Reduce el ruido en sensores analógicos.                    */
__attribute__((used))
uint16_t analogReadAvg(uint8_t channel, uint8_t n);

/* analogReadVoltage — convierte la lectura ADC a mV.
   Asume VDD = 5000 mV por defecto.
   Para cambiar la referencia, definir PICASP_VDD_MV antes
   de incluir picasp.h:
     #define PICASP_VDD_MV 3300UL   // para sistemas a 3.3V
   Retorna 0..PICASP_VDD_MV.                                  */
#ifndef PICASP_VDD_MV
  #define PICASP_VDD_MV  5000UL
#endif

__attribute__((used))
uint16_t analogReadVoltage(uint8_t channel);

#endif /* PICASP_NO_ADC */

/* ── random / randomSeed ─────────────────────────────────────
   Generador lineal congruencial (LCG) de 32 bits.
   Sin float, sin librerías externas — compatible con XC8.

   randomSeed(seed) — inicializa el generador.
     Llamar con un valor variable (ej: analogRead) para
     obtener secuencias distintas en cada arranque.

   random(max)        — retorna un valor en [0, max-1].
   random(min, max)   — retorna un valor en [min, max-1].
   ──────────────────────────────────────────────────────────── */
__attribute__((used)) void    randomSeed  (uint32_t seed);
__attribute__((used)) int32_t random_max  (int32_t max);
__attribute__((used)) int32_t random_range(int32_t min, int32_t max);

/* Alias Arduino-style — permiten usar random() con 1 o 2 args  */
#define random(...)  _RANDOM_SELECT(__VA_ARGS__, random_range, random_max)(__VA_ARGS__)
#define _RANDOM_SELECT(_1, _2, NAME, ...) NAME

/* ── pulseInLong ─────────────────────────────────────────────
   Versión de pulseIn basada en millis() en lugar de micros().
   Adecuada para pulsos > 65 ms donde micros() podría desbordarse.
   Resolución: ~1 ms. No apta para pulsos cortos (< 1 ms).
   No disponible en chips sin Timer1 (PICASP_NO_TIMER1).

   Retorna la duración del pulso en milisegundos, o 0 si
   no se detecta el pulso antes de que venza el timeout.
   timeout: en milisegundos.
   ──────────────────────────────────────────────────────────── */
#ifndef PICASP_NO_TIMER1
__attribute__((used))
uint32_t pulseInLong(pin_t pin, uint8_t state, uint32_t timeout);
#endif

#endif /* PICASP_UTILS_H */