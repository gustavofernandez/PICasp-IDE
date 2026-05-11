/* ============================================================
   hal_pic18f252.h — HAL para PIC18F242/252/442/452
   Datasheet: DS39576C
   ============================================================ */

#ifndef HAL_PIC18F252_H
#define HAL_PIC18F252_H

#include <xc.h>
#include <stdint.h>

/* ── Fuses ────────────────────────────────────────────────────
   Dos modos de operación:

   A) ICSP (pic18f252 directo, grabado desde cero):
      El HAL emite todos los #pragma config completos.

   B) BOOTLOADER (picasp_board_252):
      -DPICASP_BOOTLOADER=1 pasado por pic_build.py.
      El HAL NO emite ningún #pragma config.
      Cristal 16MHz HS — CPU=16MHz fijo.
      El selector de oscilador del IDE es ignorado.

   El PIC18F252 no tiene oscilador interno ni PLL.
   OSC válidos: XT, HS. HSPLL no aplica.
   ──────────────────────────────────────────────────────────── */
#if !defined(PICASP_BOOTLOADER)

  #if defined(OSCILLATOR_HS)
    #pragma config OSC  = HS
  #else
    #pragma config OSC  = XT
  #endif

  #pragma config OSCS   = OFF
  #pragma config PWRT   = ON
  #pragma config BOR    = ON
  #pragma config BORV   = 20
  #pragma config WDT    = OFF
  #pragma config WDTPS  = 128
  #pragma config CCP2MUX = ON
  #pragma config STVR   = ON
  #pragma config LVP    = ON
  #pragma config DEBUG  = OFF
  #pragma config CP0    = OFF
  #pragma config CP1    = OFF
  #pragma config CP2    = OFF
  #pragma config CP3    = OFF
  #pragma config CPB    = OFF
  #pragma config CPD    = OFF
  #pragma config WRT0   = OFF
  #pragma config WRT1   = OFF
  #pragma config WRT2   = OFF
  #pragma config WRT3   = OFF
  #pragma config WRTB   = OFF
  #pragma config WRTC   = OFF
  #pragma config WRTD   = OFF
  #pragma config EBTR0  = OFF
  #pragma config EBTR1  = OFF
  #pragma config EBTR2  = OFF
  #pragma config EBTR3  = OFF
  #pragma config EBTRB  = OFF

#endif /* !PICASP_BOOTLOADER */

/* ── F_CPU ────────────────────────────────────────────────────
   Modo BOOTLOADER: siempre 16MHz — ignora selector del IDE.
   Modo ICSP: F_CPU viene del IDE tal cual.
   El PIC18F252 no tiene HSPLL, no hay caso especial de PLL.
   ──────────────────────────────────────────────────────────── */
#if defined(PICASP_BOOTLOADER)
  #undef  F_CPU
  #define F_CPU         16000000UL
  #undef  _XTAL_FREQ
  #define _XTAL_FREQ    16000000UL
#endif

/* ── Codificación de pines ───────────────────────────────────
   bits [7:4] = puerto (0=A, 1=B, 2=C)
   bits [3:0] = número de bit
   ──────────────────────────────────────────────────────────── */
#define _PORT_A  0x00
#define _PORT_B  0x10
#define _PORT_C  0x20

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
#define RC1  (_PORT_C | 1)   /* CCP2 */
#define RC2  (_PORT_C | 2)   /* CCP1 */
#define RC3  (_PORT_C | 3)   /* SCK/SCL */
#define RC4  (_PORT_C | 4)   /* SDI/SDA */
#define RC5  (_PORT_C | 5)   /* SDO     */
#define RC6  (_PORT_C | 6)   /* TX */
#define RC7  (_PORT_C | 7)   /* RX */

/* ── Prototipos — GPIO ───────────────────────────────────────  */
__attribute__((used)) void     pinMode          (pin_t pin, uint8_t mode);
__attribute__((used)) void     digitalWrite     (pin_t pin, uint8_t value);
__attribute__((used)) uint8_t  digitalRead      (pin_t pin);
__attribute__((used)) void     delay            (uint16_t ms);
__attribute__((used)) void     delayMicroseconds(uint16_t us);
__attribute__((used)) uint32_t millis           (void);
__attribute__((used)) uint32_t micros           (void);
__attribute__((used)) uint32_t pulseIn          (pin_t pin, uint8_t state, uint32_t timeout);
__attribute__((used)) void     picasp_timer0_init(void);

/* ── Prototipos — ADC ────────────────────────────────────────  */
__attribute__((used)) uint16_t analogRead       (uint8_t channel);

/* ── Prototipos — PWM ────────────────────────────────────────  */
__attribute__((used)) void analogWrite          (uint8_t pin, uint8_t duty);
__attribute__((used)) void analogWriteClear     (uint8_t pin);

/* ── Prototipos — tone / noTone ──────────────────────────────
   Usa CCP1 (RC2) + Timer1. Conflicto con analogWrite en RC2:
   llamar a noTone() antes de usar analogWrite() en ese pin.  */
__attribute__((used)) void tone  (pin_t pin, uint32_t freq);
__attribute__((used)) void noTone(pin_t pin);

/* ── Prototipos — UART ───────────────────────────────────────
   PIC18F252 usa 57600 bps máximo (sin BRG16).               */
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

#endif /* HAL_PIC18F252_H */