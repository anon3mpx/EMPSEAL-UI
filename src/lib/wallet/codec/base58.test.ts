// Tests for the base58 codec (Bitcoin alphabet).

import { describe, it, expect } from "vitest";
import { base58Decode, base58Encode, isBase58String } from "./base58";

describe("base58Decode", () => {
  it("decodes empty string to empty bytes", () => {
    const r = base58Decode("");
    expect(r).toBeInstanceOf(Uint8Array);
    expect(r!.length).toBe(0);
  });

  it("decodes '1' to [0x00]", () => {
    expect(Array.from(base58Decode("1")!)).toEqual([0]);
  });

  it("decodes '111' to [0x00, 0x00, 0x00]", () => {
    expect(Array.from(base58Decode("111")!)).toEqual([0, 0, 0]);
  });

  it("decodes '2' to [0x01]", () => {
    expect(Array.from(base58Decode("2")!)).toEqual([1]);
  });

  it("rejects characters outside the alphabet", () => {
    expect(base58Decode("0")).toBeNull(); // 0 not in alphabet
    expect(base58Decode("O")).toBeNull(); // O not in alphabet
    expect(base58Decode("I")).toBeNull();
    expect(base58Decode("l")).toBeNull();
    expect(base58Decode("hello!")).toBeNull();
  });

  it("decodes a real Solana pubkey (32 bytes) — roundtrips", () => {
    // Known Solana base58 → 32-byte decode (system program ID, all zeros)
    const sysprog = base58Decode("11111111111111111111111111111111");
    expect(sysprog).not.toBeNull();
    expect(sysprog!.length).toBe(32);
    expect(Array.from(sysprog!).every((b) => b === 0)).toBe(true);
  });
});

describe("base58Encode", () => {
  it("encodes empty bytes to empty string", () => {
    expect(base58Encode(new Uint8Array(0))).toBe("");
  });

  it("encodes [0x00] to '1'", () => {
    expect(base58Encode(new Uint8Array([0]))).toBe("1");
  });

  it("encodes [0x01] to '2'", () => {
    expect(base58Encode(new Uint8Array([1]))).toBe("2");
  });

  it("encodes 32-zero-bytes back to the Solana system program ID", () => {
    expect(base58Encode(new Uint8Array(32))).toBe("11111111111111111111111111111111");
  });
});

describe("base58 roundtrip", () => {
  it("roundtrips arbitrary bytes", () => {
    const original = new Uint8Array([0x00, 0x12, 0x34, 0x56, 0x78, 0x9a, 0xbc, 0xde, 0xf0]);
    const encoded = base58Encode(original);
    const decoded = base58Decode(encoded);
    expect(Array.from(decoded!)).toEqual(Array.from(original));
  });
});

describe("isBase58String", () => {
  it("true for valid alphabet", () => {
    expect(isBase58String("abcDEF123XYZ")).toBe(true);
  });
  it("false for disambiguated chars", () => {
    expect(isBase58String("0OIl")).toBe(false);
    expect(isBase58String("hello0")).toBe(false);
  });
  it("false for empty", () => {
    expect(isBase58String("")).toBe(false);
  });
});
