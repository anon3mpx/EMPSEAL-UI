// ─── CRC-16/XMODEM (used by TON address checksum) ────────────────────────────
//
// Polynomial: x^16 + x^12 + x^5 + 1  (0x1021)
// Initial:    0x0000
// No final XOR, MSB-first.
//
// Used only by the TON address validator.  Pure-JS, ~15 LOC, no deps.

export function crc16Xmodem(data: Uint8Array): number {
  let crc = 0;
  for (const byte of data) {
    crc ^= byte << 8;
    for (let i = 0; i < 8; i++) {
      if (crc & 0x8000) crc = ((crc << 1) ^ 0x1021) & 0xffff;
      else crc = (crc << 1) & 0xffff;
    }
  }
  return crc & 0xffff;
}
