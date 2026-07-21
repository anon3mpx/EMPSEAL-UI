// Tests for the Solana address validator.

import { describe, it, expect } from "vitest";
import { solanaValidator } from "./solana";

describe("solanaValidator", () => {
  it("accepts a real well-known Solana address", () => {
    // Wrapped SOL mint (32-byte address) on Solana mainnet.
    const r = solanaValidator.validate("So11111111111111111111111111111111111111112");
    expect(r.valid).toBe(true);
    expect(r.format).toBe("base58");
  });

  it("accepts the system program ID (all-zero 32 bytes)", () => {
    const r = solanaValidator.validate("11111111111111111111111111111111");
    expect(r.valid).toBe(true);
  });

  it("rejects too-short input", () => {
    expect(solanaValidator.validate("1").valid).toBe(false);
    expect(solanaValidator.validate("1".repeat(31)).valid).toBe(false);
  });

  it("rejects too-long input", () => {
    expect(solanaValidator.validate("1".repeat(45)).valid).toBe(false);
  });

  it("rejects characters outside base58 alphabet (0, O, I, l)", () => {
    // Length is in plausible range (44 chars), but contains '0'.
    const withZero = "0" + "1".repeat(43);
    const r = solanaValidator.validate(withZero);
    expect(r.valid).toBe(false);
    expect(r.reason).toMatch(/base58/i);
  });

  it("rejects empty / whitespace-only input", () => {
    expect(solanaValidator.validate("").valid).toBe(false);
    expect(solanaValidator.validate("   ").valid).toBe(false);
  });

  it("trims whitespace before validation", () => {
    expect(
      solanaValidator.validate("  11111111111111111111111111111111  ").valid,
    ).toBe(true);
  });

  it("rejects a 32-44 char base58 string that doesn't decode to 32 bytes", () => {
    // Pick a valid-charset string short enough to decode to fewer than 32 bytes.
    // '1' alone = 1 byte; we need length in 32-44 range BUT decode < 32 bytes.
    // The string '1' * 32 decodes to 32 zero bytes (passes); '1' * 31 fails length check.
    // For a length-32 string that decodes to fewer than 32 bytes, we use one
    // non-1 char + 31 '1's such that the BigInt value is small.
    // Actually any 32-char base58 string SHOULD decode to ~23.5 bytes max
    // (since log_256(58^32) ≈ 23.5).  So 32-char strings of mixed chars
    // decode to fewer than 32 bytes.  Wait — that means length 32 + non-1-leading
    // base58 = potentially invalid.  Let me construct one carefully.
    //
    // Test pattern: 32 chars, NOT all-1.  A 32-char base58 with a leading non-1
    // decodes to ≤24 bytes.
    const r = solanaValidator.validate("z" + "1".repeat(31));
    expect(r.valid).toBe(false);
    expect(r.reason).toMatch(/32 bytes/);
  });
});
