// ─── Monero (XMR) address validator ──────────────────────────────────────────
//
// Monero addresses come in three lengths:
//
//   Standard public:  95 chars, starts with '4' (mainnet network byte 18)
//   Subaddress:       95 chars, starts with '8' (mainnet network byte 42)
//   Integrated:       106 chars, starts with '4', carries an 8-byte payment ID
//
// Monero uses base58 with the BITCOIN alphabet but with a non-standard
// block-based encoding (8 bytes → 11 chars per block).  Decoding the full
// address + verifying the checksum requires Keccak-256, which is bigger
// than we want to drop into the UI for a single validator.
//
// V1 policy: FORMAT-ONLY validation.
//   - Length matches one of 95 / 106
//   - Starts with '4' (95 std, 106 integrated) or '8' (95 subaddress)
//   - All chars in Bitcoin base58 alphabet
//
// This catches typos and wrong-chain pastes, but does NOT verify the
// embedded Keccak-256 checksum.  When the bridge VPS gains XMR settlement
// support (future Phase B), it'll do full checksum verification server-side.
//
// Spec: https://www.getmonero.org/resources/moneropedia/address.html

import type { AddressValidator, ValidationResult } from "../types";
import { isBase58String } from "../codec/base58";

export const xmrValidator: AddressValidator = {
  kind: "xmr",
  validate(input: string): ValidationResult {
    const trimmed = input.trim();
    if (!trimmed) return { valid: false, reason: "Address is empty" };

    const len = trimmed.length;
    if (len !== 95 && len !== 106) {
      return {
        valid: false,
        reason: `Monero address must be 95 or 106 chars (got ${len})`,
      };
    }

    const firstChar = trimmed[0];
    if (firstChar !== "4" && firstChar !== "8") {
      return {
        valid: false,
        reason: "Monero address must start with '4' (standard / integrated) or '8' (subaddress)",
      };
    }

    if (len === 106 && firstChar !== "4") {
      return {
        valid: false,
        reason: "Monero integrated addresses (106 chars) must start with '4'",
      };
    }

    if (!isBase58String(trimmed)) {
      return {
        valid: false,
        reason: "Monero address must use base58 alphabet (no 0, O, I, l)",
      };
    }

    return {
      valid: true,
      format: "base58",
      // No checksum verification at this layer — note the limitation.
      reason: "Format check only; full checksum verification happens at settlement.",
    };
  },
  placeholder: () => "4... or 8... (95 chars; integrated 106)",
  formatHint: () => "Monero base58, 95 chars (4.../8...) or 106 chars (4... integrated). Format-only check.",
  isAdapterAvailable: () => false,
};
