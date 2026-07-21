// ─── EVM address validator ──────────────────────────────────────────────────
//
// 0x-prefixed hex, exactly 20 bytes (40 hex chars).  Standard Ethereum
// address shape; same format on all 14 EVM chains the swap SDK supports.
//
// Checksum: EIP-55 mixed-case checksum is OPTIONAL — addresses can be
// all-lowercase, all-uppercase, or mixed-case EIP-55.  We accept all
// three; we don't reject incorrect EIP-55 (some wallets / older tools
// produce uppercase or lowercase intentionally).  When format would
// match EIP-55 but the case doesn't validate, we currently still accept
// (this is the lenient behaviour wagmi/viem also exhibit).

import type { AddressValidator, ValidationResult } from "../types";

const EVM_RE = /^0x[0-9a-fA-F]{40}$/;

export const evmValidator: AddressValidator = {
  kind: "evm",
  validate(input: string): ValidationResult {
    const trimmed = input.trim();
    if (!trimmed) return { valid: false, reason: "Address is empty" };
    if (!trimmed.startsWith("0x"))
      return { valid: false, reason: "EVM address must start with 0x" };
    if (trimmed.length !== 42)
      return {
        valid: false,
        reason: `EVM address must be 42 characters (got ${trimmed.length})`,
      };
    if (!EVM_RE.test(trimmed))
      return {
        valid: false,
        reason: "EVM address contains non-hex characters",
      };
    return { valid: true, format: "evm-hex" };
  },
  placeholder: () => "0x...",
  formatHint: () => "0x + 40 hex chars",
  isAdapterAvailable: () => false, // EVM source is via wagmi at the page level, not per-destination
};
