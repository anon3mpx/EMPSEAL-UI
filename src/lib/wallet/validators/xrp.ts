// ─── XRP / XRPL classic address validator ────────────────────────────────────
//
// XRPL classic addresses are base58check-style with XRPL's own alphabet
// (different from Bitcoin's; see codec/xrplBase58.ts).
//
// Structure:
//   - Version byte: 0x00 (mainnet)
//   - Payload: 20 bytes (account ID)
//   - Checksum: 4 bytes (first 4 of SHA256(SHA256(version || payload)))
//   - Total decoded: 25 bytes
//   - Total encoded: 25-35 chars (variable due to base58 leading-zero handling)
//   - Starts with 'r' (because version byte 0x00 encodes to leading 'r' in
//     XRPL's alphabet)
//
// X-addresses (newer XRPL format, prefixed 'X' or 'T') are not yet
// supported here — they encode tag information that the bridge VPS
// would need to handle specially.  Add when X-address support is rail-side.
//
// Spec: https://xrpl.org/accounts.html

import type { AddressValidator, ValidationResult } from "../types";
import { xrplBase58CheckDecode } from "../codec/xrplBase58";

const XRP_VERSION_BYTE = 0x00;

export const xrpValidator: AddressValidator = {
  kind: "xrp",
  validate(input: string): ValidationResult {
    const trimmed = input.trim();
    if (!trimmed) return { valid: false, reason: "Address is empty" };

    // Classic address starts with 'r'.  X-address starts with 'X' (mainnet)
    // or 'T' (testnet) — not yet supported.
    if (trimmed.startsWith("X") || trimmed.startsWith("T")) {
      return {
        valid: false,
        reason: "XRPL X-addresses (X.../T...) are not yet supported.  Use a classic address (r...) instead.",
      };
    }

    if (!trimmed.startsWith("r")) {
      return {
        valid: false,
        reason: "XRP classic address must start with 'r'",
      };
    }

    if (trimmed.length < 25 || trimmed.length > 35) {
      return {
        valid: false,
        reason: `XRP address must be 25-35 chars (got ${trimmed.length})`,
      };
    }

    const decoded = xrplBase58CheckDecode(trimmed);
    if (!decoded) {
      return {
        valid: false,
        reason: "XRP address has invalid base58check encoding (bad checksum or wrong alphabet)",
      };
    }

    if (decoded.version !== XRP_VERSION_BYTE) {
      return {
        valid: false,
        reason: `XRP version byte must be 0x00 (got 0x${decoded.version
          .toString(16)
          .padStart(2, "0")})`,
      };
    }

    if (decoded.payload.length !== 20) {
      return {
        valid: false,
        reason: `XRP payload must be 20 bytes (got ${decoded.payload.length})`,
      };
    }

    return { valid: true, format: "base58check" };
  },
  placeholder: () => "r...",
  formatHint: () => "Classic XRPL address (r...), 25-35 chars, base58check with XRPL alphabet",
  isAdapterAvailable: () => false,
};
