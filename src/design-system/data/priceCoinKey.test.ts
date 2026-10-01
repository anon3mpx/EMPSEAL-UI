import { describe, expect, it } from "vitest";
import { llamaCoinKey } from "./priceService";

describe("llamaCoinKey", () => {
  it("prices tokens on covered chains by chain slug and address", () => {
    expect(llamaCoinKey(1, "USDC", "0xA0b86991c6218b36c1d19d4A2e9Eb0cE3606eB48"))
      .toBe("ethereum:0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48");
    // Native ETH resolves through the wrapped-token address.
    expect(llamaCoinKey(1, "ETH")).toBe("ethereum:0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2");
  });

  it("prices non-EVM native coins by CoinGecko id", () => {
    expect(llamaCoinKey(0, "BTC")).toBe("coingecko:bitcoin");
    expect(llamaCoinKey(99, "SOL")).toBe("coingecko:solana");
    expect(llamaCoinKey(98, "DOGE")).toBe("coingecko:dogecoin");
  });

  it("does not guess for addressed or unknown tokens on uncovered chains", () => {
    expect(llamaCoinKey(99, "USDC", "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v")).toBeNull();
    expect(llamaCoinKey(146, "S")).toBeNull();
  });
});
