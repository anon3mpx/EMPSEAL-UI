// ─── TON address validator ───────────────────────────────────────────────────
//
// TON has two main address representations:
//
//   User-friendly (recommended for sharing / pasting):
//     Base64URL-encoded, 48 chars, contains a CRC-16/XMODEM checksum
//     Examples:
//       EQA-mainnet-bouncable      (production smart contracts)
//       UQA-mainnet-non-bouncable  (regular wallets)
//       kQ -testnet-bouncable
//       0Q -testnet-non-bouncable
//
//   Raw:  workchain ":" + 64 hex chars   (e.g. "0:abcdef...0123")
//
// Structure of the user-friendly form (decoded base64url is 36 bytes):
//   byte 0:      flags (bounceable / testnet bits + 0x11)
//   byte 1:      workchain ID (signed int8; 0=main, -1=masterchain)
//   bytes 2-33:  32-byte account hash
//   bytes 34-35: CRC-16/XMODEM checksum over the first 34 bytes
//
// Spec: https://docs.ton.org/learn/overviews/addresses

import type { AddressValidator, ValidationResult } from "../types";
import { crc16Xmodem } from "../codec/crc16";

const RAW_RE = /^-?\d+:[0-9a-fA-F]{64}$/;

function base64UrlDecode(input: string): Uint8Array | null {
  // base64url uses '-' '_' where standard base64 uses '+' '/'.
  // Convert + add padding for atob compatibility.
  let s = input.replace(/-/g, "+").replace(/_/g, "/");
  const padLen = (4 - (s.length % 4)) % 4;
  s += "=".repeat(padLen);
  try {
    const bin = atob(s);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return bytes;
  } catch {
    return null;
  }
}

export const tonValidator: AddressValidator = {
  kind: "ton",
  validate(input: string): ValidationResult {
    const trimmed = input.trim();
    if (!trimmed) return { valid: false, reason: "Address is empty" };

    // ── Raw form: workchain:hex
    if (RAW_RE.test(trimmed)) {
      const [wc] = trimmed.split(":");
      // Workchain must be 0 (mainnet shard) or -1 (masterchain) in practice.
      // Accept any integer for forward-compat; format check is the main value here.
      const wcNum = Number.parseInt(wc, 10);
      if (Number.isNaN(wcNum)) {
        return { valid: false, reason: "Invalid TON workchain ID" };
      }
      return { valid: true, format: "legacy" };
    }

    // ── User-friendly form: 48 chars base64url, decodes to 36 bytes
    if (trimmed.length !== 48) {
      return {
        valid: false,
        reason: `TON user-friendly address must be 48 chars or use raw format "workchain:hex" (got ${trimmed.length} chars)`,
      };
    }

    // base64url charset check: alphanumerics + - _
    if (!/^[A-Za-z0-9_-]{48}$/.test(trimmed)) {
      return {
        valid: false,
        reason: "TON address contains characters outside base64url alphabet",
      };
    }

    const decoded = base64UrlDecode(trimmed);
    if (!decoded || decoded.length !== 36) {
      return {
        valid: false,
        reason: `TON address must decode to 36 bytes (got ${decoded?.length ?? 0})`,
      };
    }

    // CRC-16 over the first 34 bytes; last 2 bytes are big-endian checksum.
    const data = decoded.slice(0, 34);
    const expected = (decoded[34] << 8) | decoded[35];
    const computed = crc16Xmodem(data);

    if (computed !== expected) {
      return {
        valid: false,
        reason: "TON address has invalid CRC-16 checksum",
      };
    }

    return { valid: true, format: "base58" /* re-use enum slot */ };
  },
  placeholder: () => "EQ... / UQ... / kQ... / 0Q...  (or 0:hex64)",
  formatHint: () => "Base64URL 48 chars with CRC-16, or raw 'workchain:hex64'",
  isAdapterAvailable: () => false,
};
