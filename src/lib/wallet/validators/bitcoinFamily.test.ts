// Tests for Bitcoin family + Tron validators.
//
// Uses real well-known addresses where possible — testing decoder correctness
// is much better than testing decoder behaviour against synthetic data that
// could be wrong.

import { describe, it, expect } from "vitest";
import { bitcoinValidator, dogeValidator, ltcValidator } from "./bitcoinFamily";
import { tronValidator } from "./tron";
import {
  base58CheckDecode,
  base58CheckEncode,
} from "../codec/base58check";
import {
  bech32Decode,
  bech32Encode,
  convertBits,
  Bech32Encoding,
} from "../codec/bech32";

// ─── Test fixture generation ─────────────────────────────────────────────────
//
// Rather than hard-coding LTC test addresses (which I got wrong on the first
// pass — they were made up), we generate them by:
//   1. Decoding a KNOWN-GOOD address (the BTC genesis coinbase) to get a
//      verifiable 20-byte hash160 payload.
//   2. Re-encoding that payload with the LTC version byte / HRP.
// This pattern guarantees the test fixtures match what real LTC software
// would produce for the same underlying key, given the codecs are correct
// (which we verify with the BTC + DOGE tests using real addresses).

const BTC_GENESIS_DECODED = base58CheckDecode(
  "1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa",
);
if (!BTC_GENESIS_DECODED) throw new Error("BTC genesis decode must succeed");
const KNOWN_HASH160 = BTC_GENESIS_DECODED.payload;

// Pre-built LTC fixtures (computed at import time).
const LTC_LEGACY_FIXTURE = base58CheckEncode(0x30, KNOWN_HASH160);
const LTC_P2SH_FIXTURE = base58CheckEncode(0x32, KNOWN_HASH160);

// LTC bech32 fixture: 20-byte witness program (P2WPKH) → 5-bit data + version 0 prefix.
function buildBech32Fixture(hrp: string, witnessVer: number, witnessProgram: Uint8Array): string {
  const converted = convertBits(Array.from(witnessProgram), 8, 5, true);
  if (!converted) throw new Error("convertBits failed");
  return bech32Encode(hrp, [witnessVer, ...converted], Bech32Encoding.Bech32);
}
const LTC_BECH32_FIXTURE = buildBech32Fixture("ltc", 0, KNOWN_HASH160);

// ─── Bitcoin ────────────────────────────────────────────────────────────────
describe("bitcoinValidator", () => {
  describe("legacy P2PKH (1...)", () => {
    it("accepts genesis block coinbase address", () => {
      // Satoshi's original address — the most-tested BTC address in history.
      const r = bitcoinValidator.validate("1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa");
      expect(r.valid).toBe(true);
      expect(r.format).toBe("legacy");
    });
    it("rejects tampered legacy address (checksum fail)", () => {
      const r = bitcoinValidator.validate("1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNb"); // last char flipped
      expect(r.valid).toBe(false);
    });
  });

  describe("legacy P2SH (3...)", () => {
    it("accepts a real P2SH address", () => {
      // Multisig escrow address example
      const r = bitcoinValidator.validate("3J98t1WpEZ73CNmQviecrnyiWrnqRhWNLy");
      expect(r.valid).toBe(true);
      expect(r.format).toBe("p2sh");
    });
  });

  describe("bech32 (bc1q... P2WPKH)", () => {
    it("accepts a real P2WPKH address", () => {
      const r = bitcoinValidator.validate("bc1qw508d6qejxtdg4y5r3zarvary0c5xw7kv8f3t4");
      expect(r.valid).toBe(true);
      expect(r.format).toBe("bech32");
    });
    it("rejects mixed case (BIP173)", () => {
      const r = bitcoinValidator.validate("bc1QW508d6qejxtdg4y5r3zarvary0c5xw7kv8f3t4");
      expect(r.valid).toBe(false);
    });
  });

  describe("bech32m (bc1p... taproot)", () => {
    it("accepts a real taproot address", () => {
      // BIP350 reference taproot address
      const r = bitcoinValidator.validate("bc1p0xlxvlhemja6c4dqv22uapctqupfhlxm9h8z3k2e72q4k9hcz7vqzk5jj0");
      expect(r.valid).toBe(true);
      expect(r.format).toBe("bech32m");
    });
  });

  describe("rejects nonsense + wrong-chain", () => {
    it("rejects empty", () => {
      expect(bitcoinValidator.validate("").valid).toBe(false);
    });
    it("rejects EVM-shaped input", () => {
      expect(bitcoinValidator.validate("0x" + "a".repeat(40)).valid).toBe(false);
    });
    it("rejects DOGE address (wrong HRP / version)", () => {
      expect(bitcoinValidator.validate("DH5yaieqoZN36fDVciNyRueRGvGLR3mr7L").valid).toBe(false);
    });
  });
});

// ─── DOGE ────────────────────────────────────────────────────────────────────
describe("dogeValidator", () => {
  it("accepts a real DOGE legacy P2PKH (D...)", () => {
    // Well-known DOGE address example
    const r = dogeValidator.validate("DH5yaieqoZN36fDVciNyRueRGvGLR3mr7L");
    expect(r.valid).toBe(true);
    expect(r.format).toBe("legacy");
  });
  it("rejects BTC addresses (wrong chain)", () => {
    expect(dogeValidator.validate("1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa").valid).toBe(false);
  });
  it("rejects bad checksum", () => {
    expect(dogeValidator.validate("DH5yaieqoZN36fDVciNyRueRGvGLR3mr7X").valid).toBe(false);
  });
});

// ─── LTC ─────────────────────────────────────────────────────────────────────
//
// LTC fixtures are generated from the BTC genesis payload at module-load
// time.  This guarantees the test passes iff the codec is correct, without
// relying on me typing real LTC addresses from memory (which I got wrong
// first try).
describe("ltcValidator", () => {
  it("accepts LTC legacy P2PKH (computed from BTC genesis payload, version 0x30)", () => {
    const r = ltcValidator.validate(LTC_LEGACY_FIXTURE);
    expect(r.valid).toBe(true);
    expect(r.format).toBe("legacy");
  });
  it("accepts LTC legacy P2SH (version 0x32)", () => {
    const r = ltcValidator.validate(LTC_P2SH_FIXTURE);
    expect(r.valid).toBe(true);
    expect(r.format).toBe("p2sh");
  });
  it("accepts LTC bech32 (computed witness program with HRP 'ltc')", () => {
    const r = ltcValidator.validate(LTC_BECH32_FIXTURE);
    expect(r.valid).toBe(true);
    expect(r.format).toBe("bech32");
  });
  it("rejects BTC bech32 (wrong HRP)", () => {
    expect(ltcValidator.validate("bc1qw508d6qejxtdg4y5r3zarvary0c5xw7kv8f3t4").valid).toBe(false);
  });
  it("rejects bech32 with corrupted checksum", () => {
    // Flip the last char of the LTC bech32 fixture — should fail checksum.
    const corrupted = LTC_BECH32_FIXTURE.slice(0, -1) + (LTC_BECH32_FIXTURE.slice(-1) === "l" ? "q" : "l");
    expect(ltcValidator.validate(corrupted).valid).toBe(false);
  });
});

// ─── Bech32 codec round-trip (verifies the test helper itself) ─────────────
describe("bech32 codec roundtrip", () => {
  it("encodes + decodes the LTC fixture cleanly", () => {
    const decoded = bech32Decode(LTC_BECH32_FIXTURE);
    expect(decoded).not.toBeNull();
    expect(decoded!.hrp).toBe("ltc");
    expect(decoded!.encoding).toBe(Bech32Encoding.Bech32);
  });
});

// ─── Tron ────────────────────────────────────────────────────────────────────
describe("tronValidator", () => {
  it("accepts a real Tron address (T...)", () => {
    // Binance hot wallet on Tron — known good
    const r = tronValidator.validate("TLa2f6VPqDgRE67v1736s7bJ8Ray5wYjU7");
    expect(r.valid).toBe(true);
    expect(r.format).toBe("base58check");
  });
  it("rejects missing 'T' prefix", () => {
    expect(tronValidator.validate("La2f6VPqDgRE67v1736s7bJ8Ray5wYjU7").valid).toBe(false);
  });
  it("rejects wrong length", () => {
    expect(tronValidator.validate("T".padEnd(33, "a")).valid).toBe(false); // 33 chars
    expect(tronValidator.validate("T".padEnd(35, "a")).valid).toBe(false); // 35 chars
  });
  it("rejects bad checksum", () => {
    expect(tronValidator.validate("TLa2f6VPqDgRE67v1736s7bJ8Ray5wYjU8").valid).toBe(false);
  });
  it("rejects empty", () => {
    expect(tronValidator.validate("").valid).toBe(false);
  });
});
