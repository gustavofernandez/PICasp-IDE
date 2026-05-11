/* ============================================================
   picasp_objects.c — Instancias globales Arduino-style
   PICasp HAL v1.3.0

   Conecta los objetos Serial, Wire, SPI, EEPROM, DAC con las
   funciones planas ya implementadas en cada HAL de chip y en
   picasp_utils.c. Este archivo se compila para todos los chips
   — los guards PICASP_NO_* excluyen lo que no aplica al chip
   seleccionado en el build.

   No modificar los HALs individuales — este archivo es el
   único punto de conexión entre objetos y funciones planas.
   ============================================================ */

#include <picasp.h>

/* ── Serial ──────────────────────────────────────────────────
   HAL  : Serial_begin, Serial_print, Serial_println,
          Serial_printInt, Serial_write, Serial_available,
          Serial_read
   Utils: Serial_printf, Serial_printFloat, Serial_readLine,
          Serial_readInt
   ──────────────────────────────────────────────────────────── */
#ifndef PICASP_NO_UART

Serial_t Serial = {
    .begin      = Serial_begin,
    .print      = Serial_print,
    .println    = Serial_println,
    .printInt   = Serial_printInt,
    .printFloat = Serial_printFloat,
    .printf     = Serial_printf,
    .write      = Serial_write,
    .available  = Serial_available,
    .read       = Serial_read,
    .readLine   = Serial_readLine,
    .readInt    = Serial_readInt,
};

#endif /* PICASP_NO_UART */

/* ── Wire (I2C) ──────────────────────────────────────────────
   HAL  : Wire_begin, Wire_beginSlave, Wire_beginTransmission,
          Wire_write, Wire_endTransmission, Wire_requestFrom,
          Wire_available, Wire_read, Wire_onReceive,
          Wire_onRequest
   Utils: Wire_writeReg, Wire_readReg, Wire_readRegWord,
          Wire_scan
   ──────────────────────────────────────────────────────────── */
#ifndef PICASP_NO_I2C

Wire_t Wire = {
    .begin             = Wire_begin,
    .beginSlave        = Wire_beginSlave,
    .beginTransmission = Wire_beginTransmission,
    .write             = Wire_write,
    .endTransmission   = Wire_endTransmission,
    .requestFrom       = Wire_requestFrom,
    .available         = Wire_available,
    .read              = Wire_read,
    .onReceive         = Wire_onReceive,
    .onRequest         = Wire_onRequest,
    .writeReg          = Wire_writeReg,
    .readReg           = Wire_readReg,
    .readRegWord       = Wire_readRegWord,
    .scan              = Wire_scan,
};

#endif /* PICASP_NO_I2C */

/* ── SPI ─────────────────────────────────────────────────────
   HAL  : SPI_begin, SPI_transfer, SPI_end, SPI_write,
          SPI_beginSlave, SPI_onReceive
   ──────────────────────────────────────────────────────────── */
#ifndef PICASP_NO_SPI

SPI_t SPI = {
    .begin      = SPI_begin,
    .transfer   = SPI_transfer,
    .end        = SPI_end,
    .write      = SPI_write,
    .beginSlave = SPI_beginSlave,
    .onReceive  = SPI_onReceive,
};

#endif /* PICASP_NO_SPI */

/* ── EEPROM ──────────────────────────────────────────────────
   HAL  : EEPROM_read, EEPROM_write, EEPROM_update
   ──────────────────────────────────────────────────────────── */
EEPROM_t EEPROM = {
    .read   = EEPROM_read,
    .write  = EEPROM_write,
    .update = EEPROM_update,
};

/* ── DAC ─────────────────────────────────────────────────────
   Solo PIC18F25K22. Guard PICASP_NO_DAC excluye en todos
   los demás chips automáticamente.
   HAL  : DAC_begin, DAC_write, DAC_stop
   ──────────────────────────────────────────────────────────── */
#ifndef PICASP_NO_DAC

DAC_t DAC = {
    .begin = DAC_begin,
    .write = DAC_write,
    .stop  = DAC_stop,
};

#endif /* PICASP_NO_DAC */