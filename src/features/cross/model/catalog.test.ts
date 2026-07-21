import { describe, expect, it } from "vitest";
import {
  getCrossUiChains,
  getCrossTokensForChain,
  pickDefaultToken,
} from "./catalog";

describe("cross catalog", () => {
  it("returns Base in the UI chain list", () => {
    expect(getCrossUiChains().some((chain) => chain.chainId === 8453)).toBe(
      true,
    );
  });

  it("normalizes native ETH for Base", () => {
    const token = getCrossTokensForChain(8453).find(
      (entry) => entry.address === "0x0000000000000000000000000000000000000000",
    );

    expect(token).toMatchObject({
      chainId: 8453,
      symbol: "ETH",
      isNative: true,
    });
  });

  it("prefers a featured stable token when choosing defaults", () => {
    const token = pickDefaultToken(getCrossTokensForChain(42161));
    expect(token?.symbol).toBe("USDC");
  });

  it("deduplicates repeated token addresses within a chain catalog", () => {
    const tokens = getCrossTokensForChain(8453).filter(
      (entry) =>
        entry.address.toLowerCase() ===
        "0xc5102fe9359fd9a28f877a67e36b0f050d81a3cc",
    );

    expect(tokens).toHaveLength(1);
    expect(tokens[0]?.symbol).toBe("HOP");
  });
});
