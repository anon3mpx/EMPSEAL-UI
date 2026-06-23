// ─── Solana address validator ───────────────────────────────────────────────
//
// Solana addresses are base58-encoded 32-byte ed25519 public keys.
// String length varies 32-44 characters because base58 of a 32-byte
// value isn't fixed-width (depends on leading-zero handling).
//
// No checksum — validation is:
//   1. Length in plausible range (32-44 chars)
//   2. All chars in base58 alphabet
//   3. Decode → exactly 32 bytes
//
// Spec: https://docs.solana.com/terminology#public-key-pubkey

import type { AddressValidator, ValidationResult } from "../types";
import { base58Decode, isBase58String } from "../codec/base58";

export const solanaValidator: AddressValidator = {
  kind: "solana",
  validate(input: string): ValidationResult {
    const trimmed = input.trim();
    if (!trimmed) return { valid: false, reason: "Address is empty" };

    // Quick reject by length envelope — saves the decode for inputs
    // that obviously can't be valid.
    if (trimmed.length < 32 || trimmed.length > 44) {
      return {
        valid: false,
        reason: `Solana address is 32-44 chars (got ${trimmed.length})`,
      };
    }

    if (!isBase58String(trimmed)) {
      return {
        valid: false,
        reason: "Solana address must use base58 alphabet (no 0, O, I, l)",
      };
    }

    const decoded = base58Decode(trimmed);
    if (!decoded) {
      // Already verified base58 above, but guard against decoder edge cases.
      return { valid: false, reason: "Failed to decode base58" };
    }

    if (decoded.length !== 32) {
      return {
        valid: false,
        reason: `Solana address must decode to exactly 32 bytes (got ${decoded.length})`,
      };
    }

    return { valid: true, format: "base58" };
  },
  placeholder: () => "Phantom-style address (32-44 chars)",
  formatHint: () => "Base58, 32-44 chars (no 0, O, I, l)",
  isAdapterAvailable: () => false, // Phantom lazy-adapter lands in T5
};
