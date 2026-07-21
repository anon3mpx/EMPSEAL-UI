// ─── Tron address validator ─────────────────────────────────────────────────
//
// Tron addresses are base58check with version byte 0x41 ("T" prefix in
// base58check output).  Payload is 20 bytes (an Ethereum-style hash160
// of the public key — Tron explicitly chose this format for EVM interop).
//
// Spec: https://developers.tron.network/docs/account#address-format

import type { AddressValidator, ValidationResult } from "../types";
import { base58CheckDecode } from "../codec/base58check";

const TRON_VERSION_BYTE = 0x41;

export const tronValidator: AddressValidator = {
  kind: "tron",
  validate(input: string): ValidationResult {
    const trimmed = input.trim();
    if (!trimmed) return { valid: false, reason: "Address is empty" };

    if (!trimmed.startsWith("T")) {
      return {
        valid: false,
        reason: "Tron address must start with 'T'",
      };
    }

    if (trimmed.length !== 34) {
      return {
        valid: false,
        reason: `Tron address must be 34 characters (got ${trimmed.length})`,
      };
    }

    const decoded = base58CheckDecode(trimmed);
    if (!decoded) {
      return {
        valid: false,
        reason: "Tron address has invalid base58check encoding (bad checksum)",
      };
    }

    if (decoded.version !== TRON_VERSION_BYTE) {
      return {
        valid: false,
        reason: `Tron version byte must be 0x41 (got 0x${decoded.version
          .toString(16)
          .padStart(2, "0")})`,
      };
    }

    if (decoded.payload.length !== 20) {
      return {
        valid: false,
        reason: `Tron payload must be 20 bytes (got ${decoded.payload.length})`,
      };
    }

    return { valid: true, format: "base58check" };
  },
  placeholder: () => "T...",
  formatHint: () => "Base58check, starts with 'T', 34 chars",
  isAdapterAvailable: () => false, // TronLink lazy-adapter lands in T5
};
