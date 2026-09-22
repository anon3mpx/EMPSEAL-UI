import { describe, expect, it } from "vitest";

import { getV2Chain } from "./v2ChainView";
import { getTokensForChain } from "./v2TokenView";
import { formatScannedUsdTotal, toMultiPickerToken } from "./multiV2Adapters";

describe("toMultiPickerToken", () => {
  it("preserves configured artwork for the Multi V2 token picker", () => {
    const chain = getV2Chain(42161)!;
    const token = getTokensForChain(42161).find((item) => item.ticker === "USDe")!;

    expect(toMultiPickerToken(token, chain)).toMatchObject({
      ticker: "USDe",
      chainId: 42161,
      address: token.address,
      logoUrl: token.logoUrl,
      isNative: false,
      chainName: "Arbitrum",
    });
  });
});

describe("formatScannedUsdTotal", () => {
  it("keeps unpriced assets out of the known dollar total", () => {
    expect(formatScannedUsdTotal(12.345, 2)).toBe("$12.35 + 2 unpriced");
    expect(formatScannedUsdTotal(12.345, 0)).toBe("$12.35");
    expect(formatScannedUsdTotal(0.0005, 0)).toBe("<$0.01");
  });
});
