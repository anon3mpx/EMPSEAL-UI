// ─── CashAddr codec (Bitcoin Cash address format) ───────────────────────────
//
// CashAddr is a bech32-variant with different polynomial + 40-bit checksum.
// Same character set as bech32 ("qpzry9x8gf2tvdw0s3jn54khce6mua7l") but:
//   • HRP separated by ':' (not '1')
//   • Generator constants are 40-bit (vs 30-bit for bech32)
//   • Polymod target is XOR with 1 (vs XOR with bech32's 1 or bech32m's
//     0x2bc830a3 — different math, different output range)
//
// Spec: github.com/bitcoincashorg/bitcoincash.org/blob/master/spec/cashaddr.md
//
// Mainnet HRP: "bitcoincash"
// Testnet HRP: "bchtest"
// Regtest HRP: "bchreg"
//
// Address data layout (after HRP and ':'):
//   1 version byte (encoded as first 8 bits of 5-bit-grouped data):
//     bit 7    must be 0
//     bits 6-3 hash size (0=20 / 1=24 / 2=28 / 3=32 / 4=40 / 5=48 / 6=56 / 7=64 bytes)
//     bits 2-0 type (0=P2PKH, 1=P2SH)
//   hash bytes (per the size encoded above)
//   8 chars (40 bits) checksum
//
// For standard 20-byte hashes:
//   Total data part = 1 version byte + 20 hash bytes = 21 bytes = 168 bits
//                   = 34 5-bit chars (exactly, no padding)
//   Plus 8-char checksum  → 42 data chars total
//
// Use BigInt for polymod because the constants exceed JS's 32-bit safe range.

const CHARSET = "qpzry9x8gf2tvdw0s3jn54khce6mua7l";
const CHARSET_INDEX: Record<string, number> = {};
for (let i = 0; i < CHARSET.length; i++) CHARSET_INDEX[CHARSET[i]] = i;

// Generator polynomial constants for the CashAddr checksum (40-bit each).
const GEN = [
  0x98f2bc8e61n,
  0x79b76d99e2n,
  0xf33e5fb3c4n,
  0xae2eabe2a8n,
  0x1e4f43e470n,
];

function polymod(values: number[]): bigint {
  let c = 1n;
  for (const d of values) {
    const c0 = c >> 35n;
    c = ((c & 0x07ffffffffn) << 5n) ^ BigInt(d);
    if (c0 & 0x01n) c ^= GEN[0];
    if (c0 & 0x02n) c ^= GEN[1];
    if (c0 & 0x04n) c ^= GEN[2];
    if (c0 & 0x08n) c ^= GEN[3];
    if (c0 & 0x10n) c ^= GEN[4];
  }
  return c ^ 1n;
}

function hrpExpand(hrp: string): number[] {
  const out: number[] = [];
  for (let i = 0; i < hrp.length; i++) out.push(hrp.charCodeAt(i) & 31);
  return out;
}

export interface CashAddrDecodeResult {
  hrp: string;
  /** Address type: 0=P2PKH, 1=P2SH (per spec). */
  type: number;
  /** Hash payload (20 bytes for standard addresses). */
  hash: Uint8Array;
}

/**
 * Decode a CashAddr string.  Accepts either:
 *   - "bitcoincash:qpm2qsznhks23z7629mms6s4cwef74vcwvy22gdx6a"  (explicit HRP)
 *   - "qpm2qsznhks23z7629mms6s4cwef74vcwvy22gdx6a"               (HRP omitted; assumed mainnet)
 *
 * Returns null on:
 *   - mixed case
 *   - non-charset chars
 *   - bad checksum
 *   - reserved bits set on version byte
 *   - hash size mismatch between version byte and actual data length
 */
export function cashAddrDecode(input: string): CashAddrDecodeResult | null {
  if (!input) return null;

  // Mixed-case rejection.
  if (/[a-z]/.test(input) && /[A-Z]/.test(input)) return null;
  const s = input.toLowerCase();

  let hrp = "";
  let data = s;
  const sepIdx = s.indexOf(":");
  if (sepIdx > 0) {
    hrp = s.slice(0, sepIdx);
    data = s.slice(sepIdx + 1);
  } else {
    // Default mainnet when prefix is omitted.
    hrp = "bitcoincash";
  }

  // Reject unknown HRPs.
  if (hrp !== "bitcoincash" && hrp !== "bchtest" && hrp !== "bchreg") {
    return null;
  }

  // Data must be at least 8 chars (the checksum minimum).
  if (data.length < 8) return null;

  // Convert data chars to 5-bit values, rejecting non-charset chars.
  const values: number[] = [];
  for (const ch of data) {
    const v = CHARSET_INDEX[ch];
    if (v === undefined) return null;
    values.push(v);
  }

  // Verify checksum.  hrpExpand + 0 separator + data must polymod to 0.
  const checkInput = hrpExpand(hrp).concat([0]).concat(values);
  if (polymod(checkInput) !== 0n) return null;

  // Strip checksum (last 8 chars / 8 5-bit values).
  const dataNoChecksum = values.slice(0, values.length - 8);

  // Convert 5-bit values → 8-bit bytes (no padding for valid CashAddr).
  const decoded = convert5to8(dataNoChecksum);
  if (!decoded || decoded.length < 1) return null;

  const versionByte = decoded[0];
  if ((versionByte & 0x80) !== 0) return null; // top bit must be 0

  const type = versionByte & 0x07;
  const sizeCode = (versionByte >> 3) & 0x0f;
  const HASH_SIZES = [20, 24, 28, 32, 40, 48, 56, 64];
  if (sizeCode >= HASH_SIZES.length) return null;
  const expectedHashLen = HASH_SIZES[sizeCode];

  const hash = decoded.slice(1);
  if (hash.length !== expectedHashLen) return null;

  return { hrp, type, hash };
}

/**
 * Convert an array of 5-bit values to bytes (8-bit).  Used after stripping
 * checksum from CashAddr data.  Returns null if leftover bits indicate
 * malformed input.  No padding (cashaddr never has dangling bits).
 */
function convert5to8(data: number[]): Uint8Array | null {
  let acc = 0;
  let bits = 0;
  const out: number[] = [];
  for (const v of data) {
    if (v < 0 || v > 31) return null;
    acc = ((acc << 5) | v) & 0xffffff;
    bits += 5;
    while (bits >= 8) {
      bits -= 8;
      out.push((acc >> bits) & 0xff);
    }
  }
  // For valid input, leftover bits should be 0 and < 5.
  if (bits >= 5) return null;
  if (((acc << (8 - bits)) & 0xff) !== 0 && bits !== 0) return null;
  return new Uint8Array(out);
}
