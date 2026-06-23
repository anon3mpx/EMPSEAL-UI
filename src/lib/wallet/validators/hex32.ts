// ─── Aptos + Sui validators (32-byte hex address family) ─────────────────────
//
// Both chains use 32-byte (256-bit) addresses with 0x-prefix.  Difference:
//
//   Aptos:  Leading zeros may be omitted in display.  So "0x1" and
//           "0x0...01" (with 63 leading zeros) are both valid representations
//           of the same address.  We accept 1-64 hex chars after 0x.
//
//   Sui:    Strictly 64 hex chars (32 bytes).  No truncation.
//
// Neither uses a checksum.  Length + hex-only is the full validity check.

import type { AddressValidator, ValidationResult } from "../types";

const HEX64_RE = /^0x[0-9a-fA-F]{64}$/;
const HEX_VAR_RE = /^0x[0-9a-fA-F]{1,64}$/;

export const aptosValidator: AddressValidator = {
  kind: "aptos",
  validate(input: string): ValidationResult {
    const trimmed = input.trim();
    if (!trimmed) return { valid: false, reason: "Address is empty" };
    if (!trimmed.startsWith("0x"))
      return { valid: false, reason: "Aptos address must start with 0x" };
    if (!HEX_VAR_RE.test(trimmed))
      return {
        valid: false,
        reason: "Aptos address must be 0x + 1-64 hex characters",
      };
    return { valid: true, format: "evm-hex" };
  },
  placeholder: () => "0x...",
  formatHint: () => "0x + up to 64 hex chars (leading zeros optional)",
  isAdapterAvailable: () => false,
};

export const suiValidator: AddressValidator = {
  kind: "sui",
  validate(input: string): ValidationResult {
    const trimmed = input.trim();
    if (!trimmed) return { valid: false, reason: "Address is empty" };
    if (!trimmed.startsWith("0x"))
      return { valid: false, reason: "Sui address must start with 0x" };
    if (trimmed.length !== 66)
      return {
        valid: false,
        reason: `Sui address must be 66 characters (got ${trimmed.length})`,
      };
    if (!HEX64_RE.test(trimmed))
      return {
        valid: false,
        reason: "Sui address must be 0x + 64 hex characters",
      };
    return { valid: true, format: "evm-hex" };
  },
  placeholder: () => "0x...",
  formatHint: () => "0x + exactly 64 hex chars (32 bytes)",
  isAdapterAvailable: () => false,
};
