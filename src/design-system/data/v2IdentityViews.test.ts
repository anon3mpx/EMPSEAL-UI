import { describe, expect, it } from "vitest";
import { getV2Chain } from "./v2ChainView";
import { getTokensForChain } from "./v2TokenView";

describe("V2 identity views", () => {
  it("resolves chain logos by chain ID, not native ticker", () => {
    const arbitrum = getV2Chain(42161);
    const base = getV2Chain(8453);

    expect(arbitrum?.logoUrl).toBe("/icons/arbitrum.svg");
    expect(base?.logoUrl).toBe("/icons/base.svg");
    expect(arbitrum?.ticker).toBe("ETH");
    expect(base?.ticker).toBe("ETH");
    expect(arbitrum?.logoUrl).not.toBe(base?.logoUrl);
  });

  it("preserves the raw token image field as logoUrl without normalizing it", () => {
    const usdc = getTokensForChain(42161).find((item) => item.ticker === "USDC");
    expect(usdc?.logoUrl).toBe(
      "http://api-assets.rubic.exchange/assets/coingecko/arbitrum/0xaf88d065e77c8cc2239327c5edb3a432268e5831/logo.png",
    );
    expect(usdc?.logoUrl?.startsWith("http://")).toBe(true);
  });

  it("preserves logoURI artwork from the PulseChain token config", () => {
    const tokens = getTokensForChain(369);
    const prvx = tokens.find((item) => item.ticker === "PRVX");
    const husdc = tokens.find((item) => item.ticker === "hUSDC");

    expect(prvx?.logoUrl).toBe(
      "https://raw.githubusercontent.com/piteasio/app-tokens/main/token-logo/0xF6f8Db0aBa00007681F8fAF16A0FDa1c9B030b11.png",
    );
    expect(husdc?.logoUrl).toBe(
      "https://raw.githubusercontent.com/piteasio/app-tokens/main/token-logo/0xa5B0D537CeBE97f087Dc5FE5732d70719caaEc1D.png",
    );
  });

  it("leaves fallback tokens without configured images valid", () => {
    const usdc = getTokensForChain(130).find((item) => item.ticker === "USDC");
    expect(usdc?.chainId).toBe(130);
    expect(usdc?.ticker).toBe("USDC");
    expect(usdc?.logoUrl).toBeUndefined();
  });
});
