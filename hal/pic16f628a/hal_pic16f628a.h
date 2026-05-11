/* ============================================================
  hal_pic16f628a.h — HAL para PIC16F627A/628A/648A v2.1
  Datasheet: DS41196G
============================================================ */

#ifndef HAL_PIC16F628A_H
#define HAL_PIC16F628A_H

#include <xc.h>
#include <stdint.h>

/* ── Fuses ────────────────────────────────────────────────────
   Emitidos solo en modo ICSP (sin PICASP_BOOTLOADER).
   PIC16F627A/628A/648A no soportan bootloader.
   ──────────────────────────────────────────────────────────── */
#if !defined(PICASP_BOOTLOADER)

  #if defined(OSCILLATOR_INTOSC)
    #pragma config FOSC = INTOSCIO
  #elif defined(OSCILLATOR_HS)
    #pragma config FOSC = HS
  #else
    #pragma config FOSC = XT
  #endif

  #pragma config WDTE  = OFF
  #pragma config PWRTE = ON
  #pragma config MCLRE = ON
  #pragma config BOREN = ON
  #pragma config LVP   = OFF
  #pragma config CPD   = OFF
  #pragma config CP    = OFF

#endif /* !PICASP_BOOTLOADER */

/* ── F_CPU ────────────────────────────────────────────────────
   F_CPU viene del IDE tal cual.
   PIC16F628A oscilador interno fijo a 4MHz.
   ──────────────────────────────────────────────────────────── */
#ifndef _XTAL_FREQ
  #define _XTAL_FREQ F_CPU
#endif

/* ── Codificación de pines ───────────────────────────────────
   bits [7:4] = puerto (0=A, 1=B)
   bits [3:0] = número de bit
   ──────────────────────────────────────────────────────────── */
#define _PORT_A  0x00
#define _PORT_B  0x10

typedef uint8_t pin_t;

#define RA0  (_PORT_A | 0)
#define RA1  (_PORT_A | 1)
#define RA2  (_PORT_A | 2)
#define RA3  (_PORT_A | 3)
#define RA4  (_PORT_A | 4)
#define RA5  (_PORT_A | 5)
#define RA6  (_PORT_A | 6)
#define RA7  (_PORT_A | 7)

#define RB0  (_PORT_B | 0)
#define RB1  (_PORT_B | 1)
#define RB2  (_PORT_B | 2)
#define RB3  (_PORT_B | 3)
#define RB4  (_PORT_B | 4)
#define RB5  (_PORT_B | 5)
#define RB6  (_PORT_B | 6)
#define RB7  (_PORT_B | 7)

/* ── Prototipos — GPIO ───────────────────────────────────────  */
__attribute__((used)) void     pinMode          (pin_t pin, uint8_t mode);
__attribute__((used)) void     digitalWrite     (pin_t pin, uint8_t value);
__attribute__((used)) uint8_t  digitalRead      (pin_t pin);
__attribute__((used)) void     delay            (uint16_t ms);
__attribute__((used)) void     delayMicroseconds(uint16_t us);
__attribute__((used)) uint32_t millis           (void);
__attribute__((used)) void     picasp_timer0_init(void);

/* ── Prototipos — UART ───────────────────────────────────────
   RB2 = TX, RB1 = RX. Solo PIC16F628A y 648A tienen USART.
   PIC16F627A no tiene UART → PICASP_NO_UART definido abajo.
   ──────────────────────────────────────────────────────────── */
__attribute__((used)) void    Serial_begin    (uint32_t baud);
__attribute__((used)) void    Serial_print    (const char* str);
__attribute__((used)) void    Serial_println  (const char* str);
__attribute__((used)) void    Serial_printInt (int32_t val);
__attribute__((used)) void    Serial_write    (uint8_t byte);
__attribute__((used)) uint8_t Serial_available(void);
__attribute__((used)) uint8_t Serial_read     (void);

/* ── Prototipos — EEPROM ─────────────────────────────────────  */
__attribute__((used)) void    EEPROM_write (uint16_t addr, uint8_t val);
__attribute__((used)) uint8_t EEPROM_read  (uint16_t addr);
__attribute__((used)) void    EEPROM_update(uint16_t addr, uint8_t val);

/* ── Prototipos — Interrupciones externas ────────────────────  */
__attribute__((used)) void attachInterrupt(uint8_t pin, void (*callback)(void), uint8_t mode);
__attribute__((used)) void detachInterrupt(uint8_t pin);

/* ── Prototipos — Timing avanzado ────────────────────────────  */
__attribute__((used)) uint32_t micros (void);
__attribute__((used)) uint32_t pulseIn(pin_t pin, uint8_t state, uint32_t timeout);

/* ── Capacidades del chip ────────────────────────────────────  */
#define PICASP_NO_ADC   /* sin módulo ADC */
#define PICASP_NO_PWM   /* sin CCP/PWM    */
#define PICASP_NO_I2C   /* sin MSSP       */
#define PICASP_NO_SPI   /* sin MSSP       */
#define PICASP_NO_TONE  /* sin CCP        */

/* PIC16F627A tampoco tiene UART */
#if defined(PICASP_CHIP_16F627A)
  #define PICASP_NO_UART
#endif

/* ── Stubs inline para periféricos no disponibles ───────────  */
#ifdef PICASP_NO_SPI
  static inline void    SPI_begin     (uint8_t m, uint8_t s) { (void)m; (void)s; }
  static inline uint8_t SPI_transfer  (uint8_t d)            { (void)d; return 0; }
  static inline void    SPI_end       (void)                  {}
  static inline void    SPI_beginSlave(uint8_t m)             { (void)m; }
  static inline void    SPI_onReceive (void (*cb)(uint8_t))   { (void)cb; }
  static inline void    SPI_write     (uint8_t d)             { (void)d; }
#endif

#include "hal_not_supported.h"

#endif /* HAL_PIC16F628A_H */