// ─── Bech32 + Bech32m codec (BIP173 / BIP350) ────────────────────────────────
//
// Pure-JS implementation of the Bech32 (BIP173) and Bech32m (BIP350)
// encodings.  Used by:
//   • Bitcoin native segwit (bc1...) — Bech32 for v0, Bech32m for v1+ (taproot)
//   • DOGE bech32 variant (HRP "doge")
//   • LTC bech32 variant (HRP "ltc")
//   • Cosmos SDK chain addresses (HRP "cosmos", "osmo", "celestia", ...)
//   • Cardano Shelley addresses (HRP "addr", "stake")
//   • Bitcoin Cash CashAddr (bech32-variant with HRP "bitcoincash"; different
//     polynomial — see codec/cashaddr.ts in T2d)
//
// Spec reference:
//   BIP173 https://github.com/bitcoin/bips/blob/master/bip-0173.mediawiki
//   BIP350 https://github.com/bitcoin/bips/blob/master/bip-0350.mediawiki
//
// Charset (5-bit values 0-31):
//   q p z r y 9 x 8 g f 2 t v d w 0 s 3 j n 5 4 k h c e 6 m u a 7 l
//
// Total max length 90 (HRP + sep + data + checksum).  Cosmos chains sometimes
// produce longer encodings; we relax that limit in the decoder per real-world
// usage but still enforce on encode.
//
// This module is decode-focused; encoder included for test fixtures + future use.

const CHARSET = "qpzry9x8gf2tvdw0s3jn54khce6mua7l";
const CHARSET_INDEX: Record<string, number> = {};
for (let i = 0; i < CHARSET.length; i++) CHARSET_INDEX[CHARSET[i]] = i;

/** Polynomial generators for the checksum (BIP173 spec). */
const GENERATORS = [0x3b6a57b2, 0x26508e6d, 0x1ea119fa, 0x3d4233dd, 0x2a1462b3];

/** Encoding variants per BIP173 / BIP350. */
export const enum Bech32Encoding {
  Bech32 = 1,
  Bech32m = 0x2bc830a3,
}

export interface Bech32DecodeResult {
  hrp: string;
  data: number[]; // 5-bit values (the data part, NOT including checksum)
  encoding: Bech32Encoding;
}

function polymod(values: number[]): number {
  let chk = 1;
  for (const v of values) {
    const top = chk >>> 25;
    chk = ((chk & 0x1ffffff) << 5) ^ v;
    for (let i = 0; i < 5; i++) {
      if ((top >> i) & 1) chk ^= GENERATORS[i];
    }
  }
  return chk;
}

function hrpExpand(hrp: string): number[] {
  const ret: number[] = [];
  for (let i = 0; i < hrp.length; i++) ret.push(hrp.charCodeAt(i) >> 5);
  ret.push(0);
  for (let i = 0; i < hrp.length; i++) ret.push(hrp.charCodeAt(i) & 31);
  return ret;
}

function verifyChecksum(hrp: string, data: number[]): Bech32Encoding | null {
  const pm = polymod(hrpExpand(hrp).concat(data));
  if (pm === Bech32Encoding.Bech32) return Bech32Encoding.Bech32;
  if (pm === Bech32Encoding.Bech32m) return Bech32Encoding.Bech32m;
  return null;
}

function createChecksum(hrp: string, data: number[], encoding: Bech32Encoding): number[] {
  const values = hrpExpand(hrp).concat(data).concat([0, 0, 0, 0, 0, 0]);
  const mod = polymod(values) ^ encoding;
  const ret: number[] = [];
  for (let i = 0; i < 6; i++) ret.push((mod >> (5 * (5 - i))) & 31);
  return ret;
}

/**
 * Decode a Bech32 / Bech32m string.  Returns null on any validation failure:
 *   - mixed case (BIP requires all-lower or all-upper)
 *   - missing separator '1'
 *   - HRP shorter than 1 char
 *   - data part shorter than 6 chars (no room for checksum)
 *   - non-charset character in data
 *   - bad checksum
 *
 * Per BIP173, returns the HRP, 5-bit data (excluding 6-char checksum),
 * and which encoding (bech32 vs bech32m) verified.
 */
export function bech32Decode(input: string): Bech32DecodeResult | null {
  if (!input) return null;

  // Reject mixed case
  const hasLower = /[a-z]/.test(input);
  const hasUpper = /[A-Z]/.test(input);
  if (hasLower && hasUpper) return null;
  const s = input.toLowerCase();

  // Find separator — last '1' character (HRP may NOT contain '1')
  const sepIdx = s.lastIndexOf("1");
  if (sepIdx < 1) return null; // HRP must be at least 1 char
  if (sepIdx + 7 > s.length) return null; // Need at least 6 data chars after separator

  const hrp = s.slice(0, sepIdx);

  // HRP must be ASCII printable, 33-126, and lowercase letters / digits
  for (let i = 0; i < hrp.length; i++) {
    const c = hrp.charCodeAt(i);
    if (c < 33 || c > 126) return null;
  }

  const dataStr = s.slice(sepIdx + 1);
  const data: number[] = [];
  for (const ch of dataStr) {
    const v = CHARSET_INDEX[ch];
    if (v === undefined) return null;
    data.push(v);
  }

  const encoding = verifyChecksum(hrp, data);
  if (encoding === null) return null;

  // Strip the 6-char checksum suffix from data before returning.
  return { hrp, data: data.slice(0, data.length - 6), encoding };
}

/**
 * Encode an HRP + 5-bit data array into a Bech32(m) string.  Adds the
 * 6-char checksum.  Mostly used for test fixtures; the UI's validation
 * path only needs decode.
 */
export function bech32Encode(
  hrp: string,
  data: number[],
  encoding: Bech32Encoding = Bech32Encoding.Bech32,
): string {
  const checksum = createChecksum(hrp, data, encoding);
  const combined = data.concat(checksum);
  let s = `${hrp}1`;
  for (const v of combined) s += CHARSET[v];
  return s;
}

/**
 * Convert 5-bit values to 8-bit bytes (for decoding bech32 data → bytes).
 * Standard `convertbits` from BIP173 reference implementation.
 */
export function convertBits(
  data: number[],
  fromBits: number,
  toBits: number,
  pad: boolean,
): number[] | null {
  let acc = 0;
  let bits = 0;
  const ret: number[] = [];
  const maxv = (1 << toBits) - 1;
  const maxAcc = (1 << (fromBits + toBits - 1)) - 1;

  for (const v of data) {
    if (v < 0 || v >> fromBits !== 0) return null;
    acc = ((acc << fromBits) | v) & maxAcc;
    bits += fromBits;
    while (bits >= toBits) {
      bits -= toBits;
      ret.push((acc >> bits) & maxv);
    }
  }
  if (pad) {
    if (bits > 0) ret.push((acc << (toBits - bits)) & maxv);
  } else if (bits >= fromBits || ((acc << (toBits - bits)) & maxv) !== 0) {
    return null;
  }
  return ret;
}
