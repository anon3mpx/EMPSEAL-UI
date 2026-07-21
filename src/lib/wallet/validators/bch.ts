// ─── Bitcoin Cash (BCH) validator ────────────────────────────────────────────
//
// Modern BCH addresses use CashAddr (post-2017 fork).  Pre-fork BTC-style
// legacy addresses (1... / 3...) historically validate on BCH too (same
// hash160-based encoding, same base58check checksums), but in 2026 the
// ambiguity with BTC means accepting them is more dangerous than helpful.
//
// V1 policy: CashAddr ONLY.  Legacy 1.../3... addresses rejected with a
// hint to use CashAddr.  Modern wallets all produce CashAddr; users with
// legacy-only software should convert via their wallet's address tool.

import type { AddressValidator, ValidationResult } from "../types";
import { cashAddrDecode } from "../codec/cashaddr";

export const bchValidator: AddressValidator = {
  kind: "bch",
  validate(input: string): ValidationResult {
    const trimmed = input.trim();
    if (!trimmed) return { valid: false, reason: "Address is empty" };

    // Detect legacy 1.../3... shape and reject with a helpful hint.
    if (/^[13][1-9A-HJ-NP-Za-km-z]{25,34}$/.test(trimmed)) {
      return {
        valid: false,
        reason: "Legacy BTC-style addresses (1.../3...) are ambiguous with Bitcoin.  Convert to CashAddr (bitcoincash:q...) in your wallet first.",
        looksLikeKind: "bitcoin",
      };
    }

    const decoded = cashAddrDecode(trimmed);
    if (!decoded) {
      return {
        valid: false,
        reason: "Address is not valid CashAddr (checksum or format error)",
      };
    }

    // Type 0 = P2PKH, type 1 = P2SH.  Anything else is non-standard.
    if (decoded.type !== 0 && decoded.type !== 1) {
      return {
        valid: false,
        reason: `Unrecognised CashAddr type ${decoded.type} (expected 0=P2PKH or 1=P2SH)`,
      };
    }

    return {
      valid: true,
      format: "cashaddr",
    };
  },
  placeholder: () => "bitcoincash:q...",
  formatHint: () => "CashAddr (bitcoincash:q... or just q...)",
  isAdapterAvailable: () => false,
};
