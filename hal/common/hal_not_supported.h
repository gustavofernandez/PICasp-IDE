/* ============================================================
   hal_not_supported.h — Errores en tiempo de compilación
   para funcionalidades no disponibles en el chip seleccionado.
   ============================================================ */

#ifndef HAL_NOT_SUPPORTED_H
#define HAL_NOT_SUPPORTED_H

/* ── analogRead ──────────────────────────────────────────────  */
#ifdef PICASP_NO_ADC
  static inline uint16_t analogRead(uint8_t channel) {
    (void)channel;
    #warning "analogRead() no disponible — este chip no tiene ADC."
    return 0;
  }
#endif

/* ── Serial ──────────────────────────────────────────────────  */
#ifdef PICASP_NO_UART
  static inline void    Serial_begin    (uint32_t b)      { (void)b; }
  static inline void    Serial_write    (uint8_t  b)      { (void)b; }
  static inline void    Serial_print    (const char* s)   { (void)s; }
  static inline void    Serial_println  (const char* s)   { (void)s; }
  static inline void    Serial_printInt (int32_t  v)      { (void)v; }
  static inline uint8_t Serial_available(void)            { return 0; }
  static inline uint8_t Serial_read     (void)            { return 0; }
  #pragma message "Serial no disponible — este chip no tiene USART."
#endif

/* ── PWM ─────────────────────────────────────────────────────  */
#ifdef PICASP_NO_PWM
  static inline void analogWrite(uint8_t pin, uint8_t duty) {
    (void)pin; (void)duty;
    #warning "analogWrite() no disponible — este chip no tiene PWM."
  }
  /* [N1] Agregar stub de analogWriteClear */
  static inline void analogWriteClear(uint8_t pin) {
    (void)pin;
  }
#endif

/* ── DAC ─────────────────────────────────────────────────────  */
#ifdef PICASP_NO_DAC
  static inline void    DAC_begin (void)           {}
  static inline void    DAC_write (uint8_t value)  { (void)value; }
  static inline void    DAC_stop  (void)           {}
  #pragma message "DAC no disponible — este chip no tiene módulo DAC."
#endif

/* ── I2C ─────────────────────────────────────────────────────  */
#ifdef PICASP_NO_I2C
  static inline void    Wire_begin             (uint32_t speed) { (void)speed; }
  static inline void    Wire_beginSlave        (uint8_t addr)   { (void)addr; }
  static inline void    Wire_beginTransmission (uint8_t addr)   { (void)addr; }
  static inline uint8_t Wire_write             (uint8_t data)   { (void)data; return 0; }
  static inline uint8_t Wire_endTransmission   (void)           { return 1; }
  static inline uint8_t Wire_requestFrom       (uint8_t a, uint8_t n) { (void)a; (void)n; return 0; }
  static inline uint8_t Wire_available         (void)           { return 0; }
  static inline uint8_t Wire_read              (void)           { return 0; }
  static inline void    Wire_onReceive         (void (*cb)(uint8_t)) { (void)cb; }
  static inline void    Wire_onRequest         (void (*cb)(void))    { (void)cb; }
  #pragma message "I2C no disponible — este chip no tiene módulo MSSP."
#endif

/* ── SPI ─────────────────────────────────────────────────────  */
#ifdef PICASP_NO_SPI
  static inline void    SPI_begin     (uint8_t mode, uint8_t speed) { (void)mode; (void)speed; }
  static inline uint8_t SPI_transfer  (uint8_t data)                { (void)data; return 0; }
  static inline void    SPI_end       (void)                        {}
  static inline void    SPI_beginSlave(uint8_t mode)                { (void)mode; }
  static inline void    SPI_onReceive (void (*cb)(uint8_t))         { (void)cb; }
  static inline void    SPI_write     (uint8_t data)                { (void)data; }
  #pragma message "SPI no disponible — este chip no tiene módulo MSSP."
#endif

/* ── EEPROM ──────────────────────────────────────────────────  */
#ifdef PICASP_NO_EEPROM
  static inline void    EEPROM_write  (uint16_t addr, uint8_t val)  { (void)addr; (void)val; }
  static inline uint8_t EEPROM_read   (uint16_t addr)               { (void)addr; return 0xFF; }
  static inline void    EEPROM_update (uint16_t addr, uint8_t val)  { (void)addr; (void)val; }
  #pragma message "EEPROM no disponible — este chip no tiene EEPROM de datos."
#endif

/* ── micros / pulseIn ────────────────────────────────────────  */
#ifdef PICASP_NO_TIMER1
  static inline uint32_t micros(void) {
    #warning "micros() no disponible — Timer1 no está libre en este chip."
    return 0;
  }
  static inline uint32_t pulseIn(pin_t pin, uint8_t state, uint32_t timeout) {
    (void)pin; (void)state; (void)timeout;
    #warning "pulseIn() no disponible — Timer1 no está libre en este chip."
    return 0;
  }
#endif

/* ── tone / noTone ───────────────────────────────────────────  */
#ifdef PICASP_NO_TONE
  static inline void tone(pin_t pin, uint32_t freq) {
    (void)pin; (void)freq;
    #warning "tone() no disponible — este chip no tiene CCP compatible."
  }
  static inline void noTone(pin_t pin) {
    (void)pin;
  }
#endif

/* ── softPWM ─────────────────────────────────────────────────  */
#ifdef PICASP_NO_SOFTPWM
  static inline void softPWM(pin_t pin, uint16_t freq_hz, uint8_t duty, uint16_t cycles) {
    (void)pin; (void)freq_hz; (void)duty; (void)cycles;
    #warning "softPWM() no necesario — este chip tiene PWM por hardware."
  }
#endif

#endif /* HAL_NOT_SUPPORTED_H */