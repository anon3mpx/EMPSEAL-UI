// Tests for cross-format detection — the "this looks like X, you selected Y"
// safety feature.  Runs after a primary validation fails and scans every
// other registered validator to find one that accepts the input, returning
// the matching kind via the looksLikeKind field.

import { describe, it, expect } from "vitest";
import { validateForKind, detectAddressFormat } from "./index";

// Real addresses re-used from per-kind test suites (all known-good).
const BTC_LEGACY = "1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa";
const BTC_BECH32 = "bc1qw508d6qejxtdg4y5r3zarvary0c5xw7kv8f3t4";
const DOGE = "DH5yaieqoZN36fDVciNyRueRGvGLR3mr7L";
const SOL = "11111111111111111111111111111111";
const TRON = "TLa2f6VPqDgRE67v1736s7bJ8Ray5wYjU7";
const EVM = "0x742d35cc6634c0532925a3b844bc9e7595f0beb4";
const XRP = "rHb9CJAWyB4rj91VRWn96DkukG4bwdtyTh";
const TON = "EQCD39VS5jcptHL8vMjEXrzGaRcCVYto7HUn4bpAOg8xqB2N";
const BCH = "bitcoincash:qpm2qsznhks23z7629mms6s4cwef74vcwvy22gdx6a";

describe("detectAddressFormat", () => {
  it("identifies BTC legacy as bitcoin", () => {
    expect(detectAddressFormat(BTC_LEGACY)).toBe("bitcoin");
  });
  it("identifies BTC bech32 as bitcoin", () => {
    expect(detectAddressFormat(BTC_BECH32)).toBe("bitcoin");
  });
  it("identifies DOGE address as doge", () => {
    expect(detectAddressFormat(DOGE)).toBe("doge");
  });
  it("identifies SOL as solana", () => {
    expect(detectAddressFormat(SOL)).toBe("solana");
  });
  it("identifies Tron as tron", () => {
    expect(detectAddressFormat(TRON)).toBe("tron");
  });
  it("identifies EVM hex as evm", () => {
    expect(detectAddressFormat(EVM)).toBe("evm");
  });
  it("identifies XRP as xrp", () => {
    expect(detectAddressFormat(XRP)).toBe("xrp");
  });
  it("identifies TON as ton", () => {
    expect(detectAddressFormat(TON)).toBe("ton");
  });
  it("identifies BCH CashAddr as bch", () => {
    expect(detectAddressFormat(BCH)).toBe("bch");
  });

  it("returns null for garbage", () => {
    expect(detectAddressFormat("this is not an address")).toBeNull();
  });
  it("respects excludeKind", () => {
    // BTC address, but BTC is excluded — no other kind should match
    // (legacy 1... shape is bitcoin-only after BCH was excluded by the
    // bch validator's own legacy-rejection logic)
    expect(detectAddressFormat(BTC_LEGACY, "bitcoin")).toBeNull();
  });
});

describe("validateForKind cross-format hints", () => {
  it("surfaces looksLikeKind='bitcoin' when BTC legacy pasted into Solana field", () => {
    const r = validateForKind("solana", BTC_LEGACY);
    expect(r.valid).toBe(false);
    expect(r.looksLikeKind).toBe("bitcoin");
  });

  it("surfaces looksLikeKind='solana' when SOL address pasted into Bitcoin field", () => {
    const r = validateForKind("bitcoin", SOL);
    expect(r.valid).toBe(false);
    expect(r.looksLikeKind).toBe("solana");
  });

  it("surfaces looksLikeKind='evm' when 0x address pasted into XRP field", () => {
    const r = validateForKind("xrp", EVM);
    expect(r.valid).toBe(false);
    expect(r.looksLikeKind).toBe("evm");
  });

  it("surfaces looksLikeKind='bitcoin' when BTC pasted into BCH field (validator's own hint)", () => {
    // BCH's validator pins looksLikeKind='bitcoin' itself on legacy input.
    const r = validateForKind("bch", BTC_LEGACY);
    expect(r.valid).toBe(false);
    expect(r.looksLikeKind).toBe("bitcoin");
  });

  it("surfaces looksLikeKind='doge' when DOGE pasted into BTC field", () => {
    const r = validateForKind("bitcoin", DOGE);
    expect(r.valid).toBe(false);
    expect(r.looksLikeKind).toBe("doge");
  });

  it("does NOT pollute valid results with looksLikeKind", () => {
    // BTC genesis address validated against bitcoin kind → no looksLikeKind set.
    const r = validateForKind("bitcoin", BTC_LEGACY);
    expect(r.valid).toBe(true);
    expect(r.looksLikeKind).toBeUndefined();
  });

  it("does NOT run cross-format scan for trivially short inputs", () => {
    // 3-char input — scan is skipped to avoid noise.
    const r = validateForKind("solana", "abc");
    expect(r.valid).toBe(false);
    expect(r.looksLikeKind).toBeUndefined();
  });

  it("preserves the validator's own reason text + adds hint", () => {
    const r = validateForKind("solana", BTC_LEGACY);
    expect(r.valid).toBe(false);
    expect(r.reason).toBeDefined();
    expect(r.reason!.length).toBeGreaterThan(0);
    expect(r.looksLikeKind).toBe("bitcoin");
  });
});
