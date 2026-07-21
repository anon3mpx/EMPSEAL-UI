// ─── Cardano (ADA) address validator ─────────────────────────────────────────
//
// Cardano has two address eras:
//
//   Shelley (current, post-2020): bech32 with HRPs:
//     addr1...        mainnet payment addresses
//     addr_test1...   testnet payment addresses
//     stake1...       mainnet stake (reward) addresses
//     stake_test1...  testnet stake addresses
//
//   Byron (legacy, pre-2020): base58-encoded CBOR.  Starts with "Ddz..."
//     or "Ae2...".  Rarely used in 2026 — most wallets converted users
//     to Shelley.
//
// For V1 we accept Shelley ONLY.  Users on Byron need to migrate to a
// Shelley wallet first — every modern Cardano wallet handles this
// automatically on first use.  Reject Byron addresses with a hint.
//
// Spec reference:
//   https://github.com/cardano-foundation/CIPs/tree/master/CIP-0019

import type { AddressValidator, ValidationResult } from "../types";
import { bech32Decode } from "../codec/bech32";

const SHELLEY_HRPS = new Set<string>([
  "addr",
  "addr_test",
  "stake",
  "stake_test",
]);

const BYRON_PREFIXES = ["Ddz", "Ae2"];

export const adaValidator: AddressValidator = {
  kind: "ada",
  validate(input: string): ValidationResult {
    const trimmed = input.trim();
    if (!trimmed) return { valid: false, reason: "Address is empty" };

    // ── Byron-era detection (reject with helpful hint)
    if (BYRON_PREFIXES.some((p) => trimmed.startsWith(p))) {
      return {
        valid: false,
        reason:
          "Byron-era Cardano address detected.  Please migrate to a Shelley address (addr1...) using any modern Cardano wallet.",
      };
    }

    // ── Shelley path
    const decoded = bech32Decode(trimmed);
    if (!decoded) {
      return {
        valid: false,
        reason: "Cardano Shelley address must be valid bech32 (addr1... or stake1...)",
      };
    }

    if (decoded.encoding !== 1) {
      return {
        valid: false,
        reason: "Cardano uses bech32, not bech32m",
      };
    }

    if (!SHELLEY_HRPS.has(decoded.hrp)) {
      return {
        valid: false,
        reason: `Unrecognised Cardano HRP "${decoded.hrp}" — expected addr1, addr_test1, stake1, or stake_test1`,
        looksLikeKind: "cosmos", // Some unknown bech32 HRPs could be Cosmos
      };
    }

    return { valid: true, format: "bech32" };
  },
  placeholder: () => "addr1...",
  formatHint: () => "Shelley bech32 (addr1... or stake1...)",
  isAdapterAvailable: () => false, // Lazy adapter (Nami / Eternl / Lace) Tier 5+
};
