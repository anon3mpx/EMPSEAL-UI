import { describe, expect, it } from "vitest";
import {
  getThorchainTokensForChain,
  mergeCrossTokens,
  requiresThorchainNativeDestinationAddress,
} from "./thorchainCatalog";

describe("thorchainCatalog", () => {
  it("maps available THORChain EVM pool assets to destination tokens", () => {
    const tokens = getThorchainTokensForChain(8453, [
      { asset: "BASE.VVV-0XACFE6019ED1A7DC6F7B508C02D1B04EC88CC21BF", status: "Available" },
      { asset: "BASE.USDC-0X833589FCD6EDB6E08F4C7C32D4F71B54BDA02913", status: "Available", nativeDecimal: "6" },
      { asset: "BASE.OLD-0X0000000000000000000000000000000000000001", status: "Staged" },
    ]);

    expect(tokens).toEqual([
      expect.objectContaining({
        chainId: 8453,
        address: "0xacfe6019ed1a7dc6f7b508c02d1b04ec88cc21bf",
        symbol: "VVV",
        name: "BASE.VVV-0XACFE6019ED1A7DC6F7B508C02D1B04EC88CC21BF",
        decimals: 18,
      }),
      expect.objectContaining({
        address: "0x833589fcd6edb6e08f4c7c32d4f71b54bda02913",
        symbol: "USDC",
        decimals: 6,
        stable: true,
      }),
    ]);
  });

  it("maps native THORChain assets to non-EVM destination tokens", () => {
    const tokens = getThorchainTokensForChain(0, [
      { asset: "BTC.BTC", status: "Available" },
      { asset: "SOL.SOL", status: "Available" },
    ]);

    expect(tokens).toEqual([
      expect.objectContaining({
        chainId: 0,
        address: "BTC.BTC",
        symbol: "BTC",
        decimals: 8,
        isNative: true,
      }),
    ]);
  });

  it("requires native destination addresses only for non-EVM THORChain chains", () => {
    expect(requiresThorchainNativeDestinationAddress(0)).toBe(true);
    expect(requiresThorchainNativeDestinationAddress(99)).toBe(true);
    expect(requiresThorchainNativeDestinationAddress(8453)).toBe(false);
  });

  it("keeps existing token-list entries ahead of THORChain pool duplicates", () => {
    const merged = mergeCrossTokens(
      [
        {
          chainId: 8453,
          address: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
          symbol: "USDC",
          name: "USD Coin",
          decimals: 6,
          isNative: false,
          featured: true,
          stable: true,
        },
      ],
      getThorchainTokensForChain(8453, [
        { asset: "BASE.USDC-0X833589FCD6EDB6E08F4C7C32D4F71B54BDA02913", status: "Available", nativeDecimal: "6" },
        { asset: "BASE.VVV-0XACFE6019ED1A7DC6F7B508C02D1B04EC88CC21BF", status: "Available" },
      ]),
    );

    expect(merged.map((token) => token.symbol)).toEqual(["USDC", "VVV"]);
  });
});
