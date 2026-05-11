/* ============================================================
   picasp.h — PICasp HAL v1.4.0

   Cambios v1.1.0:
   [P1] Versión actualizada — refactorización hacia picasp_utils.
   [P2] Serial_readLine, Serial_readInt, Wire_writeReg, etc.
        movidas a picasp_utils.c — no se definen en HALs.

   Cambios v1.2.0:
   [P3] HALs individuales actualizados a v2.1 — ADC, PWM,
        Serial, I2C corregidos. Ver changelog de cada HAL.

   Cambios v1.3.0:
   [P4] Objetos Arduino-style via struct + function pointers.
        Serial, Wire, SPI, EEPROM, DAC disponibles como objetos.
        Implementados en hal/common/picasp_objects.c.
        Sin cambios en los HALs individuales.
        Las funciones planas siguen disponibles directamente.

   Cambios v1.4.0:
   [P5] Macros matemáticas: PI, HALF_PI, TWO_PI, DEG_TO_RAD,
        RAD_TO_DEG, EULER, abs, min, max, sq, round,
        radians, degrees.
   [P6] Macros de bytes: lowByte, highByte.
   [P7] Macros de bits: bit, bitRead, bitSet, bitClear,
        bitToggle, bitWrite.
   [P8] Control de interrupciones: interrupts(), noInterrupts().
        Diferenciado entre PIC18 (GIEH/GIEL) y PIC16 (GIE).
   ============================================================ */

#ifndef PICASP_H
#define PICASP_H

#include <xc.h>
#include <stdint.h>
#include <stdbool.h>

#ifndef F_CPU
  #error "F_CPU no definido. Verificá la configuración del toolbar."
#endif

#ifndef _XTAL_FREQ
  #define _XTAL_FREQ F_CPU
#endif

/* ── Constantes generales ────────────────────────────────────  */
#define INPUT        0
#define OUTPUT       1
#define INPUT_PULLUP 2
#define LOW          0
#define HIGH         1

/* ── Modos de interrupción externa ───────────────────────────  */
#define RISING   1
#define FALLING  0
#define CHANGE   2

/* ── Velocidades I2C ─────────────────────────────────────────  */
#define I2C_100K   100000UL
#define I2C_400K   400000UL

/* ── Modos SPI ───────────────────────────────────────────────  */
#define SPI_MODE0  0
#define SPI_MODE1  1
#define SPI_MODE2  2
#define SPI_MODE3  3

/* ── Velocidades SPI ─────────────────────────────────────────  */
#define SPI_FOSC_4    0
#define SPI_FOSC_16   1
#define SPI_FOSC_64   2
#define SPI_FOSC_TMR2 3

/* ── Selección de HAL por chip ───────────────────────────────
   Orden de inclusión:
     1. HAL del chip  → define pin_t, SFRs, prototipos
     2. picasp_utils.h → declara funciones comunes
                         (requiere pin_t ya definido)

   PICASP_NO_SOFTPWM  → chips con PWM por hardware (CCP)
   PICASP_NO_TONE     → chips sin CCP compatible con tone()
   ──────────────────────────────────────────────────────────── */

#if   defined(PICASP_CHIP_18F2550) || defined(PICASP_CHIP_18F4550) || \
      defined(PICASP_CHIP_18F2455) || defined(PICASP_CHIP_18F4455)
  #define PICASP_NO_SOFTPWM
  #define PICASP_NO_DAC
  #include "pic18f2550/hal_pic18f2550.h"

#elif defined(PICASP_CHIP_18F252)  || defined(PICASP_CHIP_18F452)  || \
      defined(PICASP_CHIP_18F242)  || defined(PICASP_CHIP_18F442)
  #define PICASP_NO_SOFTPWM
  #define PICASP_NO_DAC
  #include "pic18f252/hal_pic18f252.h"

#elif defined(PICASP_CHIP_18F25K22)
  #define PICASP_NO_SOFTPWM
  #include "pic18f25k22/hal_pic18f25k22.h"

#elif defined(PICASP_CHIP_16F877A) || defined(PICASP_CHIP_16F876A) || \
      defined(PICASP_CHIP_16F874A) || defined(PICASP_CHIP_16F873A)
  #define PICASP_NO_SOFTPWM
  #define PICASP_NO_DAC
  #include "pic16f877a/hal_pic16f877a.h"

#elif defined(PICASP_CHIP_16F628A) || defined(PICASP_CHIP_16F627A) || \
      defined(PICASP_CHIP_16F648A)
  #define PICASP_NO_TONE
  #define PICASP_NO_DAC
  #define PICASP_NO_I2C      
  #define PICASP_NO_SPI      
  #define PICASP_NO_ADC 
  #define PICASP_NO_TIMER1 
  #include "pic16f628a/hal_pic16f628a.h"

#else
  #error "Chip no soportado. Verificá el selector de chip en el toolbar."
#endif

/* ── Utilidades comunes (todos los chips) ────────────────────  */
#include "common/picasp_utils.h"

/* ============================================================
   Objetos Arduino-style — Serial, Wire, SPI, EEPROM, DAC
   Implementados via struct + function pointers (C99 puro).
   Las instancias globales viven en picasp_objects.c.
   Los HALs no se modifican — las funciones planas siguen
   disponibles directamente (Serial_begin, Wire_begin, etc.)
   ============================================================ */

   /* ── Macros matemáticas ──────────────────────────────────────
   Compatibles con C99 / XC8. Se definen con #ifndef para no
   pisar definiciones del compilador o de <math.h>.
   ──────────────────────────────────────────────────────────── */
#ifndef PI
  #define PI          3.14159265358979323846f
#endif
#ifndef HALF_PI
  #define HALF_PI     1.57079632679489661923f
#endif
#ifndef TWO_PI
  #define TWO_PI      6.28318530717958647692f
#endif
#ifndef DEG_TO_RAD
  #define DEG_TO_RAD  0.01745329251994329577f
#endif
#ifndef RAD_TO_DEG
  #define RAD_TO_DEG  57.2957795130823208768f
#endif
#ifndef EULER
  #define EULER       2.71828182845904523536f
#endif

#ifdef abs
  #undef abs
#endif
#define abs(x)            ((x) > 0  ? (x) : -(x))
#define min(a, b)         ((a) < (b) ? (a) :  (b))
#define max(a, b)         ((a) > (b) ? (a) :  (b))
#define sq(x)             ((x) * (x))
#define round(x)          ((x) >= 0 ? (int32_t)((x) + 0.5f) : (int32_t)((x) - 0.5f))
#define radians(deg)      ((deg) * DEG_TO_RAD)
#define degrees(rad)      ((rad) * RAD_TO_DEG)

/* ── Macros de bytes ─────────────────────────────────────────  */
#define lowByte(w)        ((uint8_t)((w) & 0xFFu))
#define highByte(w)       ((uint8_t)((w) >> 8))

/* ── Macros de bits ──────────────────────────────────────────  */
#define bit(b)            (1UL << (b))
#define bitRead(v, b)     (((v) >> (b)) & 0x01u)
#define bitSet(v, b)      ((v) |=  (1UL << (b)))
#define bitClear(v, b)    ((v) &= ~(1UL << (b)))
#define bitToggle(v, b)   ((v) ^=  (1UL << (b)))
#define bitWrite(v, b, x) ((x) ? bitSet(v, b) : bitClear(v, b))

/* ── Control de interrupciones ───────────────────────────────
   PIC18: usa GIEH (alta prioridad) como GIE global.
   PIC16: usa GIE directamente.
   ──────────────────────────────────────────────────────────── */
#if defined(PICASP_CHIP_18F2550) || defined(PICASP_CHIP_18F4550) || \
    defined(PICASP_CHIP_18F2455) || defined(PICASP_CHIP_18F4455) || \
    defined(PICASP_CHIP_18F252)  || defined(PICASP_CHIP_18F452)  || \
    defined(PICASP_CHIP_18F242)  || defined(PICASP_CHIP_18F442)  || \
    defined(PICASP_CHIP_18F25K22)
  #define interrupts()    do { INTCONbits.GIEH = 1; INTCONbits.GIEL = 1; } while(0)
  #define noInterrupts()  do { INTCONbits.GIEH = 0; } while(0)
#else
  /* PIC16F877A, PIC16F628A y derivados */
  #define interrupts()    do { INTCONbits.GIE = 1; } while(0)
  #define noInterrupts()  do { INTCONbits.GIE = 0; } while(0)
#endif

/* ── Serial ──────────────────────────────────────────────────
   Disponible en todos los chips con UART.
   No disponible en: PIC16F627A (PICASP_NO_UART).
   Funciones del HAL     : begin, print, println, printInt,
                           write, available, read
   Funciones de utils    : printf, printFloat, readLine, readInt
   ──────────────────────────────────────────────────────────── */
#ifndef PICASP_NO_UART

typedef struct {
    void     (*begin)     (uint32_t baud);
    void     (*print)     (const char* s);
    void     (*println)   (const char* s);
    void     (*printInt)  (int32_t val);
    void     (*printFloat)(int32_t val, uint8_t decimals);
    void     (*printf)    (const char* fmt, ...);
    void     (*write)     (uint8_t byte);
    uint8_t  (*available) (void);
    uint8_t  (*read)      (void);
    uint8_t  (*readLine)  (char* buf, uint8_t maxLen);
    int32_t  (*readInt)   (void);
} Serial_t;

extern Serial_t Serial;

#endif /* PICASP_NO_UART */

/* ── Wire (I2C) ──────────────────────────────────────────────
   Disponible en chips con módulo MSSP/I2C.
   No disponible en: PIC16F627A/628A/648A (PICASP_NO_I2C).
   Funciones del HAL     : begin, beginSlave, beginTransmission,
                           write, endTransmission, requestFrom,
                           available, read, onReceive, onRequest
   Funciones de utils    : writeReg, readReg, readRegWord, scan
   ──────────────────────────────────────────────────────────── */
#ifndef PICASP_NO_I2C

typedef struct {
    void     (*begin)            (uint32_t speed);
    void     (*beginSlave)       (uint8_t addr);
    void     (*beginTransmission)(uint8_t addr);
    uint8_t  (*write)            (uint8_t data);
    uint8_t  (*endTransmission)  (void);
    uint8_t  (*requestFrom)      (uint8_t addr, uint8_t count);
    uint8_t  (*available)        (void);
    uint8_t  (*read)             (void);
    void     (*onReceive)        (void (*cb)(uint8_t));
    void     (*onRequest)        (void (*cb)(void));
    uint8_t  (*writeReg)         (uint8_t addr, uint8_t reg, uint8_t val);
    uint8_t  (*readReg)          (uint8_t addr, uint8_t reg);
    uint16_t (*readRegWord)      (uint8_t addr, uint8_t reg);
    void     (*scan)             (void (*cb)(uint8_t));
} Wire_t;

extern Wire_t Wire;

#endif /* PICASP_NO_I2C */

/* ── SPI ─────────────────────────────────────────────────────
   Disponible en chips con módulo MSSP/SPI.
   No disponible en: PIC16F627A/628A/648A (PICASP_NO_SPI).
   Funciones del HAL     : begin, transfer, end, write,
                           beginSlave, onReceive
   ──────────────────────────────────────────────────────────── */
#ifndef PICASP_NO_SPI

typedef struct {
    void     (*begin)      (uint8_t mode, uint8_t speed);
    uint8_t  (*transfer)   (uint8_t data);
    void     (*end)        (void);
    void     (*write)      (uint8_t data);
    void     (*beginSlave) (uint8_t mode);
    void     (*onReceive)  (void (*cb)(uint8_t));
} SPI_t;

extern SPI_t SPI;

#endif /* PICASP_NO_SPI */

/* ── EEPROM ──────────────────────────────────────────────────
   Disponible en todos los chips soportados.
   Funciones del HAL     : read, write, update
   ──────────────────────────────────────────────────────────── */
typedef struct {
    uint8_t  (*read)  (uint16_t addr);
    void     (*write) (uint16_t addr, uint8_t val);
    void     (*update)(uint16_t addr, uint8_t val);
} EEPROM_t;

extern EEPROM_t EEPROM;

/* ── DAC ─────────────────────────────────────────────────────
   Solo disponible en PIC18F25K22.
   No disponible en todos los demás chips (PICASP_NO_DAC).
   Salida física en RA2 — 5 bits (0–31).
   Funciones del HAL     : begin, write, stop
   ──────────────────────────────────────────────────────────── */
#ifndef PICASP_NO_DAC

typedef struct {
    void (*begin)(void);
    void (*write)(uint8_t value);
    void (*stop) (void);
} DAC_t;

extern DAC_t DAC;

#endif /* PICASP_NO_DAC */

/* ── Entrypoints del usuario ─────────────────────────────────  */
extern void setup(void);
extern void loop(void);

#endif /* PICASP_H */