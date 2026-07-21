// Tests for XRP + TON + XMR validators (the last three kinds, each with
// its own quirky codec).

import { describe, it, expect } from "vitest";
import { xrpValidator } from "./xrp";
import { tonValidator } from "./ton";
import { xmrValidator } from "./xmr";
import { crc16Xmodem } from "../codec/crc16";

// ─── XRP ─────────────────────────────────────────────────────────────────────
describe("xrpValidator", () => {
  it("accepts a real XRP address (well-known)", () => {
    // Ripple's namespace genesis account — one of the most-cited XRP addresses.
    const r = xrpValidator.validate("rHb9CJAWyB4rj91VRWn96DkukG4bwdtyTh");
    expect(r.valid).toBe(true);
    expect(r.format).toBe("base58check");
  });

  it("rejects missing 'r' prefix", () => {
    expect(xrpValidator.validate("Hb9CJAWyB4rj91VRWn96DkukG4bwdtyTh").valid).toBe(false);
  });

  it("rejects X-addresses (not yet supported)", () => {
    const r = xrpValidator.validate("XVLhHMPHU98es4dbozjVtdWzVrDjtV5fdx1mHp98tDMoQXa");
    expect(r.valid).toBe(false);
    expect(r.reason).toMatch(/X-address/i);
  });

  it("rejects bad checksum", () => {
    expect(xrpValidator.validate("rHb9CJAWyB4rj91VRWn96DkukG4bwdtyTX").valid).toBe(false);
  });

  it("rejects too short / too long", () => {
    expect(xrpValidator.validate("r").valid).toBe(false);
    expect(xrpValidator.validate("r" + "p".repeat(40)).valid).toBe(false);
  });

  it("rejects empty", () => {
    expect(xrpValidator.validate("").valid).toBe(false);
  });

  it("rejects BTC-shaped input (wrong alphabet)", () => {
    expect(xrpValidator.validate("1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa").valid).toBe(false);
  });
});

// ─── TON ─────────────────────────────────────────────────────────────────────
describe("crc16Xmodem", () => {
  it("matches well-known CRC-16/XMODEM test vector for '123456789'", () => {
    const data = new TextEncoder().encode("123456789");
    // Known CRC-16/XMODEM of "123456789" = 0x31C3
    expect(crc16Xmodem(data)).toBe(0x31c3);
  });
});

describe("tonValidator", () => {
  // NOTE on TON fixtures: my first-pass UQ... example was a made-up address
  // that didn't validate.  Like the LTC fixtures, I should generate TON
  // addresses programmatically when needed — but since TON construction
  // requires a real hash + valid flag/workchain bytes that pass CRC, and
  // I do have ONE confirmed-working real address (EQCD... below), this
  // suite uses real-address + corruption tests rather than synthetic fixtures.

  it("accepts a real bounceable contract address (EQ... = production main workchain)", () => {
    // Sourced from real TON mainnet; verified to round-trip through this codec.
    const r = tonValidator.validate("EQCD39VS5jcptHL8vMjEXrzGaRcCVYto7HUn4bpAOg8xqB2N");
    expect(r.valid).toBe(true);
  });

  it("accepts raw form 'workchain:hex64'", () => {
    const r = tonValidator.validate(
      "0:" + "a".repeat(64),
    );
    expect(r.valid).toBe(true);
    expect(r.format).toBe("legacy");
  });

  it("accepts negative workchain (-1 = masterchain)", () => {
    expect(tonValidator.validate("-1:" + "f".repeat(64)).valid).toBe(true);
  });

  it("rejects wrong length user-friendly form", () => {
    expect(tonValidator.validate("EQ" + "A".repeat(30)).valid).toBe(false); // too short
    expect(tonValidator.validate("EQ" + "A".repeat(60)).valid).toBe(false); // too long
  });

  it("rejects characters outside base64url alphabet", () => {
    // 48 chars but contains '!'
    const r = tonValidator.validate("EQCD39VS5jcptHL8vMjEXrzGaRcCVYto7HUn4bpAOg8xqB2!");
    expect(r.valid).toBe(false);
  });

  it("rejects bad CRC-16 checksum", () => {
    // Corrupt the last char of a valid address.
    const corrupted = "EQCD39VS5jcptHL8vMjEXrzGaRcCVYto7HUn4bpAOg8xqB2X";
    expect(tonValidator.validate(corrupted).valid).toBe(false);
  });

  it("rejects empty", () => {
    expect(tonValidator.validate("").valid).toBe(false);
  });

  it("rejects EVM-style", () => {
    expect(tonValidator.validate("0x" + "a".repeat(40)).valid).toBe(false);
  });
});

// ─── XMR ─────────────────────────────────────────────────────────────────────
describe("xmrValidator (format-only)", () => {
  it("accepts a 95-char standard address starting with '4'", () => {
    // Construct a 95-char address with valid alphabet, starts with '4'.
    // No checksum verification at this layer.
    const addr = "4" + "z".repeat(94);
    const r = xmrValidator.validate(addr);
    expect(r.valid).toBe(true);
    expect(r.format).toBe("base58");
  });

  it("accepts a 95-char subaddress starting with '8'", () => {
    const addr = "8" + "z".repeat(94);
    expect(xmrValidator.validate(addr).valid).toBe(true);
  });

  it("accepts a 106-char integrated address starting with '4'", () => {
    const addr = "4" + "z".repeat(105);
    expect(xmrValidator.validate(addr).valid).toBe(true);
  });

  it("rejects 106-char NOT starting with '4' (integrated must be '4')", () => {
    const addr = "8" + "z".repeat(105);
    expect(xmrValidator.validate(addr).valid).toBe(false);
  });

  it("rejects wrong length (94 / 96)", () => {
    expect(xmrValidator.validate("4" + "z".repeat(93)).valid).toBe(false);
    expect(xmrValidator.validate("4" + "z".repeat(95)).valid).toBe(false);
  });

  it("rejects wrong leading char", () => {
    expect(xmrValidator.validate("1" + "z".repeat(94)).valid).toBe(false);
    expect(xmrValidator.validate("9" + "z".repeat(94)).valid).toBe(false);
  });

  it("rejects characters outside base58 alphabet (0/O/I/l)", () => {
    expect(xmrValidator.validate("4" + "0" + "z".repeat(93)).valid).toBe(false);
    expect(xmrValidator.validate("4" + "l" + "z".repeat(93)).valid).toBe(false);
  });

  it("rejects empty", () => {
    expect(xmrValidator.validate("").valid).toBe(false);
  });
});
