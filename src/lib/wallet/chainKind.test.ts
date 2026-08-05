import { describe, it, expect } from "vitest";
import {
  chainKindFor,
  isEvmChain,
  isNonEvmChain,
  NON_EVM_CHAIN_IDS,
} from "./chainKind";

describe("chainKindFor", () => {
  describe("EVM chains", () => {
    it.each([
      [1, "Ethereum"],
      [10, "Optimism"],
      [56, "BSC"],
      [137, "Polygon"],
      [369, "PulseChain"],
      [8453, "Base"],
      [42161, "Arbitrum"],
      [43114, "Avalanche"],
      [80094, "Berachain"],
      [30, "Rootstock (EVM-compat despite Bitcoin-derived L1)"],
      [10001, "EthereumPOW"],
      [999, "HyperEVM"],
      [1329, "Sei (EVM-compat)"],
      [146, "Sonic"],
      [143, "Monad"],
    ])("classifies chainId %i (%s) as evm", (chainId) => {
      expect(chainKindFor(chainId)).toBe("evm");
    });

    it("recognizes the expanded Hyperlane EVM chain family", () => {
      for (const chainId of [130, 480, 57073, 59144, 98866]) {
        expect(chainKindFor(chainId)).toBe("evm");
      }
    });
  });

  describe("non-EVM chains (published in VPS registry)", () => {
    it.each([
      [NON_EVM_CHAIN_IDS.BTC, "bitcoin"],
      [NON_EVM_CHAIN_IDS.DOGE, "doge"],
      [NON_EVM_CHAIN_IDS.SOL, "solana"],
      [NON_EVM_CHAIN_IDS.LTC, "ltc"],
      [NON_EVM_CHAIN_IDS.BCH, "bch"],
      [NON_EVM_CHAIN_IDS.COSMOS, "cosmos"],
    ])("pseudo-id %i → %s", (id, expectedKind) => {
      expect(chainKindFor(id)).toBe(expectedKind);
    });
  });

  describe("non-EVM chains (UI placeholders, pending VPS coordination)", () => {
    it.each([
      [NON_EVM_CHAIN_IDS.TRON, "tron"],
      [NON_EVM_CHAIN_IDS.XMR, "xmr"],
      [NON_EVM_CHAIN_IDS.NEAR, "near"],
      [NON_EVM_CHAIN_IDS.APTOS, "aptos"],
      [NON_EVM_CHAIN_IDS.SUI, "sui"],
      [NON_EVM_CHAIN_IDS.XRP, "xrp"],
      [NON_EVM_CHAIN_IDS.TON, "ton"],
      [NON_EVM_CHAIN_IDS.ADA, "ada"],
    ])("pseudo-id %i → %s", (id, expectedKind) => {
      expect(chainKindFor(id)).toBe(expectedKind);
    });
  });

  describe("unknown / unsupported", () => {
    it("returns null for undefined", () => {
      expect(chainKindFor(undefined)).toBeNull();
    });
    it("returns null for null", () => {
      expect(chainKindFor(null)).toBeNull();
    });
    it("returns null for random unsupported chainId", () => {
      expect(chainKindFor(99999)).toBeNull();
    });
    it("returns null for DOT pseudo-id (not yet supported)", () => {
      expect(chainKindFor(NON_EVM_CHAIN_IDS.DOT)).toBeNull();
    });
  });
});

describe("isEvmChain / isNonEvmChain", () => {
  it("isEvmChain true for EVM chainIds", () => {
    expect(isEvmChain(1)).toBe(true);
    expect(isEvmChain(8453)).toBe(true);
  });
  it("isEvmChain false for non-EVM and unknown", () => {
    expect(isEvmChain(NON_EVM_CHAIN_IDS.BTC)).toBe(false);
    expect(isEvmChain(NON_EVM_CHAIN_IDS.SOL)).toBe(false);
    expect(isEvmChain(99999)).toBe(false);
    expect(isEvmChain(undefined)).toBe(false);
  });
  it("isNonEvmChain true for known non-EVM kinds", () => {
    expect(isNonEvmChain(NON_EVM_CHAIN_IDS.BTC)).toBe(true);
    expect(isNonEvmChain(NON_EVM_CHAIN_IDS.SOL)).toBe(true);
    expect(isNonEvmChain(NON_EVM_CHAIN_IDS.COSMOS)).toBe(true);
  });
  it("isNonEvmChain false for EVM AND unknown (unknown ≠ non-EVM)", () => {
    expect(isNonEvmChain(1)).toBe(false);
    expect(isNonEvmChain(99999)).toBe(false);
    expect(isNonEvmChain(undefined)).toBe(false);
  });
});
