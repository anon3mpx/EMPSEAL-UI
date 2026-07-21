// Tests for the Cosmos + ADA validators (both bech32-based).

import { describe, it, expect } from "vitest";
import { cosmosValidator } from "./cosmos";
import { adaValidator } from "./ada";
import {
  bech32Encode,
  convertBits,
  Bech32Encoding,
} from "../codec/bech32";

// Helper: build a 20-byte payload bech32 address with arbitrary HRP.
// Used to generate test fixtures so we don't depend on real network state.
function makeBech32(hrp: string): string {
  const payload = new Uint8Array(20);
  for (let i = 0; i < 20; i++) payload[i] = i; // deterministic payload
  const data = convertBits(Array.from(payload), 8, 5, true);
  if (!data) throw new Error("convertBits failed");
  return bech32Encode(hrp, data, Bech32Encoding.Bech32);
}

// ─── Cosmos ──────────────────────────────────────────────────────────────────
describe("cosmosValidator", () => {
  it("accepts cosmos1... (Cosmos Hub)", () => {
    const r = cosmosValidator.validate(makeBech32("cosmos"));
    expect(r.valid).toBe(true);
    expect(r.format).toBe("bech32");
  });
  it("accepts osmo1... (Osmosis)", () => {
    expect(cosmosValidator.validate(makeBech32("osmo")).valid).toBe(true);
  });
  it("accepts celestia1...", () => {
    expect(cosmosValidator.validate(makeBech32("celestia")).valid).toBe(true);
  });
  it("accepts inj1... (Injective)", () => {
    expect(cosmosValidator.validate(makeBech32("inj")).valid).toBe(true);
  });
  it("accepts noble1...", () => {
    expect(cosmosValidator.validate(makeBech32("noble")).valid).toBe(true);
  });

  it("accepts unrecognised HRP with a soft warning (not in our registry)", () => {
    const r = cosmosValidator.validate(makeBech32("xyz"));
    expect(r.valid).toBe(true);
    expect(r.reason).toMatch(/not in our known Cosmos registry/i);
  });

  it("rejects bech32m (taproot-style) addresses", () => {
    const payload = new Uint8Array(20).fill(1);
    const data = convertBits(Array.from(payload), 8, 5, true)!;
    const bech32mAddr = bech32Encode("cosmos", data, Bech32Encoding.Bech32m);
    const r = cosmosValidator.validate(bech32mAddr);
    expect(r.valid).toBe(false);
    expect(r.reason).toMatch(/bech32m/i);
  });

  it("rejects bad bech32 checksum", () => {
    const valid = makeBech32("cosmos");
    const corrupted = valid.slice(0, -1) + (valid.slice(-1) === "q" ? "p" : "q");
    expect(cosmosValidator.validate(corrupted).valid).toBe(false);
  });

  it("rejects non-bech32 input", () => {
    expect(cosmosValidator.validate("0x" + "a".repeat(40)).valid).toBe(false);
    expect(cosmosValidator.validate("just garbage").valid).toBe(false);
  });

  it("rejects empty", () => {
    expect(cosmosValidator.validate("").valid).toBe(false);
  });
});

// ─── ADA ─────────────────────────────────────────────────────────────────────
describe("adaValidator", () => {
  it("accepts addr1... (Shelley mainnet)", () => {
    expect(adaValidator.validate(makeBech32("addr")).valid).toBe(true);
  });
  it("accepts addr_test1... (Shelley testnet)", () => {
    expect(adaValidator.validate(makeBech32("addr_test")).valid).toBe(true);
  });
  it("accepts stake1...", () => {
    expect(adaValidator.validate(makeBech32("stake")).valid).toBe(true);
  });
  it("accepts stake_test1...", () => {
    expect(adaValidator.validate(makeBech32("stake_test")).valid).toBe(true);
  });

  it("rejects Byron-era addresses (Ddz...) with a migration hint", () => {
    const r = adaValidator.validate("DdzFFzCqrhsoTuJUExmKpFb5fxJG3mzpkB67YNuwbXXNQpDPdrcMBHFp8Y9eL5LAQ1f5Pz9oXLcfXcJZJiBcAYP4MAxKsKHfPpsdHcfk");
    expect(r.valid).toBe(false);
    expect(r.reason).toMatch(/byron/i);
    expect(r.reason).toMatch(/migrate/i);
  });

  it("rejects Byron-era addresses (Ae2...) with a migration hint", () => {
    const r = adaValidator.validate("Ae2tdPwUPEZHu3NZa6kCwet2msq4xrBXKHBDvogFKwMsF4LBaPCUQXSMpBP");
    expect(r.valid).toBe(false);
    expect(r.reason).toMatch(/byron/i);
  });

  it("rejects bech32 with unrecognised HRP (NOT addr/stake)", () => {
    const r = adaValidator.validate(makeBech32("cosmos"));
    expect(r.valid).toBe(false);
    expect(r.reason).toMatch(/unrecognised cardano hrp/i);
    expect(r.looksLikeKind).toBe("cosmos");
  });

  it("rejects bech32m (taproot)", () => {
    const payload = new Uint8Array(20).fill(2);
    const data = convertBits(Array.from(payload), 8, 5, true)!;
    const bech32mAddr = bech32Encode("addr", data, Bech32Encoding.Bech32m);
    expect(adaValidator.validate(bech32mAddr).valid).toBe(false);
  });

  it("rejects empty", () => {
    expect(adaValidator.validate("").valid).toBe(false);
  });

  it("rejects EVM-style input", () => {
    expect(adaValidator.validate("0x" + "a".repeat(40)).valid).toBe(false);
  });
});
