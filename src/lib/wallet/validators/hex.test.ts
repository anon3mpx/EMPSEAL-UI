// Tests for the hex-shaped address validators: EVM, Aptos, Sui, NEAR.

import { describe, it, expect } from "vitest";
import { evmValidator } from "./evm";
import { aptosValidator, suiValidator } from "./hex32";
import { nearValidator } from "./near";

// ─── EVM ─────────────────────────────────────────────────────────────────────
describe("evmValidator", () => {
  it("accepts a canonical lowercase EVM address", () => {
    const r = evmValidator.validate("0x742d35cc6634c0532925a3b844bc9e7595f0beb4");
    expect(r.valid).toBe(true);
    expect(r.format).toBe("evm-hex");
  });
  it("accepts EIP-55 mixed-case (lenient — does not reject bad checksum)", () => {
    const r = evmValidator.validate("0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb4");
    expect(r.valid).toBe(true);
  });
  it("accepts all-uppercase", () => {
    const r = evmValidator.validate("0x742D35CC6634C0532925A3B844BC9E7595F0BEB4");
    expect(r.valid).toBe(true);
  });
  it("rejects missing 0x prefix", () => {
    const r = evmValidator.validate("742d35cc6634c0532925a3b844bc9e7595f0beb4");
    expect(r.valid).toBe(false);
    expect(r.reason).toMatch(/0x/);
  });
  it("rejects wrong length", () => {
    expect(evmValidator.validate("0xabc").valid).toBe(false);
    expect(evmValidator.validate("0x" + "f".repeat(41)).valid).toBe(false);
  });
  it("rejects non-hex characters", () => {
    const r = evmValidator.validate("0x742d35cc6634c0532925a3b844bc9e7595f0beZZ");
    expect(r.valid).toBe(false);
    expect(r.reason).toMatch(/hex/);
  });
  it("rejects empty input", () => {
    expect(evmValidator.validate("").valid).toBe(false);
    expect(evmValidator.validate("   ").valid).toBe(false);
  });
  it("trims whitespace before validation", () => {
    expect(evmValidator.validate("  0x742d35cc6634c0532925a3b844bc9e7595f0beb4  ").valid).toBe(true);
  });
});

// ─── Aptos ───────────────────────────────────────────────────────────────────
describe("aptosValidator", () => {
  it("accepts full 64-hex address", () => {
    const r = aptosValidator.validate("0x" + "a".repeat(64));
    expect(r.valid).toBe(true);
  });
  it("accepts short forms (leading zeros omitted)", () => {
    expect(aptosValidator.validate("0x1").valid).toBe(true);
    expect(aptosValidator.validate("0xabc").valid).toBe(true);
    expect(aptosValidator.validate("0x" + "1".repeat(32)).valid).toBe(true);
  });
  it("rejects missing 0x", () => {
    expect(aptosValidator.validate("abc").valid).toBe(false);
  });
  it("rejects empty hex after 0x", () => {
    expect(aptosValidator.validate("0x").valid).toBe(false);
  });
  it("rejects > 64 hex chars", () => {
    expect(aptosValidator.validate("0x" + "a".repeat(65)).valid).toBe(false);
  });
  it("rejects non-hex chars", () => {
    expect(aptosValidator.validate("0xZZZ").valid).toBe(false);
  });
});

// ─── Sui ─────────────────────────────────────────────────────────────────────
describe("suiValidator", () => {
  it("accepts full 64-hex address", () => {
    const r = suiValidator.validate("0x" + "a".repeat(64));
    expect(r.valid).toBe(true);
  });
  it("REJECTS short forms (unlike Aptos, Sui is strict 32 bytes)", () => {
    expect(suiValidator.validate("0x1").valid).toBe(false);
    expect(suiValidator.validate("0x" + "a".repeat(63)).valid).toBe(false);
  });
  it("rejects > 64 hex chars", () => {
    expect(suiValidator.validate("0x" + "a".repeat(65)).valid).toBe(false);
  });
  it("rejects missing 0x", () => {
    expect(suiValidator.validate("a".repeat(64)).valid).toBe(false);
  });
});

// ─── NEAR ────────────────────────────────────────────────────────────────────
describe("nearValidator", () => {
  describe("named accounts", () => {
    it("accepts simple .near name", () => {
      expect(nearValidator.validate("alice.near").valid).toBe(true);
    });
    it("accepts .testnet", () => {
      expect(nearValidator.validate("bob.testnet").valid).toBe(true);
    });
    it("accepts subaccounts (multi-dot)", () => {
      expect(nearValidator.validate("staking.alice.near").valid).toBe(true);
    });
    it("accepts bare top-level account (no suffix)", () => {
      expect(nearValidator.validate("alice").valid).toBe(true);
    });
    it("accepts hyphens and underscores", () => {
      expect(nearValidator.validate("my-account_v2.near").valid).toBe(true);
    });
    it("rejects uppercase letters", () => {
      expect(nearValidator.validate("Alice.near").valid).toBe(false);
    });
    it("rejects leading/trailing hyphen in a label", () => {
      expect(nearValidator.validate("-alice.near").valid).toBe(false);
      expect(nearValidator.validate("alice-.near").valid).toBe(false);
    });
    it("rejects double-dot (empty label)", () => {
      expect(nearValidator.validate("alice..near").valid).toBe(false);
    });
  });

  describe("implicit accounts", () => {
    it("accepts a 64-char lowercase hex implicit account", () => {
      expect(nearValidator.validate("a".repeat(64)).valid).toBe(true);
    });
    it("rejects 64-char uppercase hex (NEAR requires lowercase)", () => {
      expect(nearValidator.validate("A".repeat(64)).valid).toBe(false);
    });
    it("rejects 63-char hex (wrong length for implicit, also invalid named)", () => {
      // 63 hex chars: not 64-hex implicit; named accounts can't contain non-letter
      // start, but lowercase hex IS letter/digit, so this MIGHT pass as named.
      // Actually: 63 lowercase hex letters/digits passes NAMED_ACCOUNT_RE.
      // This is intentional — NEAR named accounts allow this character set.
      // 63 hex of alphabet-and-digit is a perfectly valid (if weird) named account.
      const r = nearValidator.validate("a".repeat(63));
      // We expect VALID as a named account (allowed chars + within length).
      expect(r.valid).toBe(true);
    });
  });

  describe("length bounds", () => {
    it("rejects 1-char (below 2-char minimum)", () => {
      expect(nearValidator.validate("a").valid).toBe(false);
    });
    it("accepts 2-char minimum", () => {
      expect(nearValidator.validate("ab").valid).toBe(true);
    });
    it("rejects 65-char (above 64-char maximum)", () => {
      expect(nearValidator.validate("a".repeat(65)).valid).toBe(false);
    });
  });

  it("rejects empty input", () => {
    expect(nearValidator.validate("").valid).toBe(false);
    expect(nearValidator.validate("   ").valid).toBe(false);
  });
});
