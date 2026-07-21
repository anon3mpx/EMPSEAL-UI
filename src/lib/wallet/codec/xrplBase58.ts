// ─── XRPL Base58 codec ────────────────────────────────────────────────────────
//
// XRPL uses base58 with a different alphabet than Bitcoin:
//
//   Bitcoin: 123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz
//   XRPL:    rpshnaf39wBUDNEGHJKLM4PQRST7VWXYZ2bcdeCg65jkm8oFqi1tuvAxyz
//
// Otherwise identical math: BigInt accumulation + leading-r-character
// handling (XRPL's leading-'r' encodes the 0x00 version byte).
//
// Used by the XRP validator + its base58check checksum verification
// (same SHA-256 double-hash as Bitcoin base58check, different alphabet).

import { sha256 as viemSha256 } from "viem";

const ALPHABET = "rpshnaf39wBUDNEGHJKLM4PQRST7VWXYZ2bcdeCg65jkm8oFqi1tuvAxyz";
const ALPHABET_INDEX: Record<string, number> = {};
for (let i = 0; i < ALPHABET.length; i++) ALPHABET_INDEX[ALPHABET[i]] = i;

function bytesToHex(bytes: Uint8Array): `0x${string}` {
  let s = "0x";
  for (const b of bytes) s += b.toString(16).padStart(2, "0");
  return s as `0x${string}`;
}

function hexToBytes(hex: string): Uint8Array {
  const stripped = hex.startsWith("0x") ? hex.slice(2) : hex;
  const out = new Uint8Array(stripped.length / 2);
  for (let i = 0; i < out.length; i++) {
    out[i] = parseInt(stripped.slice(i * 2, i * 2 + 2), 16);
  }
  return out;
}

function xrplBase58Decode(input: string): Uint8Array | null {
  if (!input) return null;

  // Count leading 'r' chars — each represents a leading 0x00 byte.
  // (XRPL's leading-zero char is 'r', not '1'.)
  let leadingR = 0;
  for (const ch of input) {
    if (ch === "r") leadingR++;
    else break;
  }

  let acc = 0n;
  for (const ch of input) {
    const idx = ALPHABET_INDEX[ch];
    if (idx === undefined) return null;
    acc = acc * 58n + BigInt(idx);
  }

  const bytes: number[] = [];
  while (acc > 0n) {
    bytes.unshift(Number(acc & 0xffn));
    acc >>= 8n;
  }
  for (let i = 0; i < leadingR; i++) bytes.unshift(0);
  return new Uint8Array(bytes);
}

/**
 * Decode + verify an XRPL base58check address.
 *
 * Returns the version byte and 20-byte payload, or null on any failure
 * (bad alphabet, too short, checksum mismatch).
 */
export interface XrplBase58CheckResult {
  version: number;
  payload: Uint8Array;
}

export function xrplBase58CheckDecode(input: string): XrplBase58CheckResult | null {
  if (!input) return null;

  const decoded = xrplBase58Decode(input);
  if (!decoded || decoded.length < 5) return null;

  const payloadWithVersion = decoded.slice(0, decoded.length - 4);
  const expectedChecksum = decoded.slice(decoded.length - 4);

  // Compute SHA256(SHA256(payloadWithVersion)) and take first 4 bytes.
  const firstHex = viemSha256(bytesToHex(payloadWithVersion));
  const first = hexToBytes(firstHex);
  const secondHex = viemSha256(bytesToHex(first));
  const second = hexToBytes(secondHex);
  const computedChecksum = second.slice(0, 4);

  for (let i = 0; i < 4; i++) {
    if (computedChecksum[i] !== expectedChecksum[i]) return null;
  }

  return {
    version: payloadWithVersion[0],
    payload: payloadWithVersion.slice(1),
  };
}
