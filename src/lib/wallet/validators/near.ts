// ─── NEAR Protocol address validator ─────────────────────────────────────────
//
// NEAR has TWO address formats:
//
//   Named accounts:
//     Lowercase ASCII letters, digits, hyphens, underscores.  Dotted
//     hierarchical naming: "alice.near", "subaccount.alice.near".
//     Each label is 2-64 chars, full account ID is 2-64 chars total.
//     Implicit suffix patterns: .near (mainnet) / .testnet — but bare
//     accounts ("alice") are also valid (top-level system accounts).
//
//   Implicit accounts:
//     64 lowercase hex characters with NO 0x prefix.  Derived directly
//     from an ed25519 public key.  No suffix.
//
// Spec reference: https://docs.near.org/concepts/protocol/account-id
//
// We accept either format.  Loose-but-correct validation (no full
// account-id spec compliance — that would require validating each
// label's chars + length individually).

import type { AddressValidator, ValidationResult } from "../types";

// Named account: chars per NEAR spec, total length 2-64.
// Allowed chars per label: a-z, 0-9, '-', '_'.  Labels joined by '.'.
const NAMED_ACCOUNT_RE = /^(?:[a-z0-9](?:[a-z0-9_-]*[a-z0-9])?)(?:\.(?:[a-z0-9](?:[a-z0-9_-]*[a-z0-9])?))*$/;

// Implicit account: 64 lowercase hex chars.
const IMPLICIT_RE = /^[0-9a-f]{64}$/;

export const nearValidator: AddressValidator = {
  kind: "near",
  validate(input: string): ValidationResult {
    const trimmed = input.trim();
    if (!trimmed) return { valid: false, reason: "Account ID is empty" };
    if (trimmed.length < 2 || trimmed.length > 64)
      return {
        valid: false,
        reason: `NEAR account ID must be 2-64 chars (got ${trimmed.length})`,
      };

    // Implicit account — 64 lowercase hex chars
    if (IMPLICIT_RE.test(trimmed)) {
      return { valid: true, format: "legacy" };
    }

    // Named account — labels separated by dots
    if (NAMED_ACCOUNT_RE.test(trimmed)) {
      return { valid: true, format: "bech32" }; // re-using format tag (NEAR has no closer match in our enum)
    }

    return {
      valid: false,
      reason:
        "NEAR account ID must be lowercase alphanumeric (with '.', '-', '_') OR 64 lowercase hex chars",
    };
  },
  placeholder: () => "alice.near or 64-hex implicit account",
  formatHint: () => "Named account (alice.near) or 64-char hex implicit account",
  isAdapterAvailable: () => false,
};
