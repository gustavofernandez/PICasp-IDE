/* ============================================================
   hal_pic16f877a.h — HAL para PIC16F873A/876A/877A v2.1
   Datasheet: DS39589C
   ============================================================ */

#ifndef HAL_PIC16F877A_H
#define HAL_PIC16F877A_H

#include <xc.h>
#include <stdint.h>

/* ── Fuses ────────────────────────────────────────────────────  */
#if !defined(PICASP_BOOTLOADER)
  #if defined(OSCILLATOR_HS)
    #pragma config OSC = HS
  #else
    #pragma config OSC = XT
  #endif
  #pragma config WDTE  = OFF
  #pragma config PWRTE = ON
  #pragma config BOREN = ON
  #pragma config LVP   = OFF
  #pragma config CPD   = OFF
  #pragma config WRT   = OFF
  #pragma config CP    = OFF
#endif

#ifndef _XTAL_FREQ
  #define _XTAL_FREQ F_CPU
#endif

/* ── Codificación de pines ───────────────────────────────────  */
#define _PORT_A  0x00
#define _PORT_B  0x10
#define _PORT_C  0x20
#define _PORT_D  0x30
#define _PORT_E  0x40

typedef uint8_t pin_t;

#define RA0  (_PORT_A | 0)
#define RA1  (_PORT_A | 1)
#define RA2  (_PORT_A | 2)
#define RA3  (_PORT_A | 3)
#define RA4  (_PORT_A | 4)
#define RA5  (_PORT_A | 5)

#define RB0  (_PORT_B | 0)
#define RB1  (_PORT_B | 1)
#define RB2  (_PORT_B | 2)
#define RB3  (_PORT_B | 3)
#define RB4  (_PORT_B | 4)
#define RB5  (_PORT_B | 5)
#define RB6  (_PORT_B | 6)
#define RB7  (_PORT_B | 7)

#define RC0  (_PORT_C | 0)
#define RC1  (_PORT_C | 1)
#define RC2  (_PORT_C | 2)
#define RC3  (_PORT_C | 3)
#define RC4  (_PORT_C | 4)
#define RC5  (_PORT_C | 5)
#define RC6  (_PORT_C | 6)
#define RC7  (_PORT_C | 7)

#define RD0  (_PORT_D | 0)
#define RD1  (_PORT_D | 1)
#define RD2  (_PORT_D | 2)
#define RD3  (_PORT_D | 3)
#define RD4  (_PORT_D | 4)
#define RD5  (_PORT_D | 5)
#define RD6  (_PORT_D | 6)
#define RD7  (_PORT_D | 7)

#define RE0  (_PORT_E | 0)
#define RE1  (_PORT_E | 1)
#define RE2  (_PORT_E | 2)

/* ── Prototipos — GPIO ───────────────────────────────────────  */
__attribute__((used)) void     pinMode          (pin_t pin, uint8_t mode);
__attribute__((used)) void     digitalWrite     (pin_t pin, uint8_t value);
__attribute__((used)) uint8_t  digitalRead      (pin_t pin);
__attribute__((used)) void     delay            (uint16_t ms);
__attribute__((used)) void     delayMicroseconds(uint16_t us);
__attribute__((used)) uint32_t millis           (void);
__attribute__((used)) void     picasp_timer0_init(void);

/* ── Prototipos — ADC ────────────────────────────────────────  */
__attribute__((used)) uint16_t analogRead       (uint8_t channel);

/* ── Prototipos — PWM ────────────────────────────────────────  */
__attribute__((used)) void analogWrite          (uint8_t pin, uint8_t duty);
__attribute__((used)) void analogWriteClear     (uint8_t pin);

/* ── Prototipos — tone / noTone ──────────────────────────────  */
__attribute__((used)) void tone  (pin_t pin, uint32_t freq);
__attribute__((used)) void noTone(pin_t pin);

/* ── Prototipos — UART ───────────────────────────────────────  */
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

/* ── Prototipos — I2C ────────────────────────────────────────  */
__attribute__((used)) void    Wire_begin            (uint32_t speed);
__attribute__((used)) void    Wire_beginSlave       (uint8_t addr);
__attribute__((used)) void    Wire_beginTransmission(uint8_t addr);
__attribute__((used)) uint8_t Wire_write            (uint8_t data);
__attribute__((used)) uint8_t Wire_endTransmission  (void);
__attribute__((used)) uint8_t Wire_requestFrom      (uint8_t addr, uint8_t count);
__attribute__((used)) uint8_t Wire_available        (void);
__attribute__((used)) uint8_t Wire_read             (void);
__attribute__((used)) void    Wire_onReceive        (void (*callback)(uint8_t));
__attribute__((used)) void    Wire_onRequest        (void (*callback)(void));

/* ── Prototipos — SPI ────────────────────────────────────────  */
__attribute__((used)) void    SPI_begin     (uint8_t mode, uint8_t speed);
__attribute__((used)) uint8_t SPI_transfer  (uint8_t data);
__attribute__((used)) void    SPI_end       (void);
__attribute__((used)) void    SPI_beginSlave(uint8_t mode);
__attribute__((used)) void    SPI_onReceive (void (*callback)(uint8_t));
__attribute__((used)) void    SPI_write     (uint8_t data);

#endif /* HAL_PIC16F877A_H */