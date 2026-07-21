// ─── Base58Check codec ───────────────────────────────────────────────────────
//
// base58check = base58( payload || sha256(sha256(payload))[0..4] )
//
// Used by:
//   • Bitcoin legacy + P2SH addresses (1.../3...)
//   • DOGE legacy addresses (D...)
//   • LTC legacy addresses (L.../M.../3...)
//   • Tron addresses (T... — uses version byte 0x41)
//   • Cardano Byron-era addresses
//
// SHA-256 implementation: uses viem's sync `sha256` helper (viem is
// already in deps via wagmi).  Returns a hex string; we convert back to
// bytes for the checksum compare.

import { sha256 as viemSha256 } from "viem";
import { base58Decode, base58Encode } from "./base58";

/**
 * Decode + verify a base58check string.  Returns { version, payload }
 * on valid input or null on:
 *   - non-base58 character
 *   - too short (<5 bytes total — at minimum 1 byte version + 4 byte checksum)
 *   - checksum mismatch
 *
 * The leading byte is interpreted as the version (e.g. 0x00 = BTC P2PKH,
 * 0x05 = BTC P2SH, 0x41 = Tron mainnet).  Caller verifies version.
 */
export interface Base58CheckResult {
  version: number;
  payload: Uint8Array; // bytes between version byte and 4-byte checksum
}

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

/** Compute double-SHA256 of input bytes; return first 4 bytes (the checksum). */
function checksumOf(bytes: Uint8Array): Uint8Array {
  const firstHex = viemSha256(bytesToHex(bytes));
  const first = hexToBytes(firstHex);
  const secondHex = viemSha256(bytesToHex(first));
  const second = hexToBytes(secondHex);
  return second.slice(0, 4);
}

/**
 * Decode and validate a base58check string.  Returns null on any failure.
 */
export function base58CheckDecode(input: string): Base58CheckResult | null {
  if (!input) return null;
  const decoded = base58Decode(input);
  if (!decoded || decoded.length < 5) return null;

  const payloadWithVersion = decoded.slice(0, decoded.length - 4);
  const expectedChecksum = decoded.slice(decoded.length - 4);

  const computedChecksum = checksumOf(payloadWithVersion);

  // Compare 4-byte checksums (constant-time isn't needed here — this is
  // input validation, not secret-dependent).
  for (let i = 0; i < 4; i++) {
    if (computedChecksum[i] !== expectedChecksum[i]) return null;
  }

  return {
    version: payloadWithVersion[0],
    payload: payloadWithVersion.slice(1),
  };
}

/**
 * Encode a (version, payload) pair as a base58check string.  Useful for
 * generating test fixtures across chains — given a known 20-byte hash160
 * payload, you can produce the BTC mainnet form (version 0x00), DOGE form
 * (0x1e), LTC form (0x30), Tron form (0x41), etc. all from the same
 * underlying bytes.
 */
export function base58CheckEncode(version: number, payload: Uint8Array): string {
  const versioned = new Uint8Array(payload.length + 1);
  versioned[0] = version & 0xff;
  versioned.set(payload, 1);

  const checksum = checksumOf(versioned);
  const full = new Uint8Array(versioned.length + 4);
  full.set(versioned, 0);
  full.set(checksum, versioned.length);

  return base58Encode(full);
}
