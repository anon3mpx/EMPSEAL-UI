import { describe, it, expect } from "vitest";
import {
  evaluateTokenTrust,
  needsTokenWarning,
  trustLabel,
  trustExplainer,
} from "./tokenTrust";

const FEATURED = [
  { address: "0xAAAAaaaAAAAAaaaAAAaAAAaAAAaaAAaAaaaaaaaa" },
  { address: "0xBbBbBBBbBBBbBbBbbBBBbBBBBbBBbBbBbBBBbbBb" },
];

const TOKEN_LIST = [
  ...FEATURED,
  { address: "0xCcCCccCccCCcCcCCCCcccccccccCCCccCCCCcccC" },
  { address: "0xDdDdDdDdDdDdDdDdDdDdDdDdDdDdDdDdDdDdDdDd" },
];

const NATIVE = "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee";
const RANDOM_CUSTOM = "0x1234567890123456789012345678901234567890";

describe("evaluateTokenTrust", () => {
  it("treats native sentinel as verified", () => {
    expect(
      evaluateTokenTrust({ tokenAddress: NATIVE, featuredTokens: FEATURED, tokenList: TOKEN_LIST }),
    ).toBe("verified");
  });

  it("treats zero address as verified (native fallback)", () => {
    expect(
      evaluateTokenTrust({
        tokenAddress: "0x0000000000000000000000000000000000000000",
        featuredTokens: FEATURED,
        tokenList: TOKEN_LIST,
      }),
    ).toBe("verified");
  });

  it("classifies featured tokens as verified (case-insensitive)", () => {
    expect(
      evaluateTokenTrust({
        tokenAddress: FEATURED[0].address.toUpperCase(),
        featuredTokens: FEATURED,
        tokenList: TOKEN_LIST,
      }),
    ).toBe("verified");
  });

  it("classifies tokens in tokenList but not featured as listed", () => {
    expect(
      evaluateTokenTrust({
        tokenAddress: TOKEN_LIST[2].address,
        featuredTokens: FEATURED,
        tokenList: TOKEN_LIST,
      }),
    ).toBe("listed");
  });

  it("classifies random addresses as custom (highest risk)", () => {
    expect(
      evaluateTokenTrust({
        tokenAddress: RANDOM_CUSTOM,
        featuredTokens: FEATURED,
        tokenList: TOKEN_LIST,
      }),
    ).toBe("custom");
  });

  it("returns unknown when address is missing", () => {
    expect(
      evaluateTokenTrust({ tokenAddress: "" as unknown as string, featuredTokens: FEATURED, tokenList: TOKEN_LIST }),
    ).toBe("unknown");
  });

  it("handles missing lists gracefully", () => {
    expect(
      evaluateTokenTrust({ tokenAddress: RANDOM_CUSTOM }),
    ).toBe("custom");
  });
});

describe("needsTokenWarning", () => {
  it("never warns for verified", () => {
    expect(needsTokenWarning("verified")).toBe(false);
  });
  it("warns for listed, custom, unknown", () => {
    expect(needsTokenWarning("listed")).toBe(true);
    expect(needsTokenWarning("custom")).toBe(true);
    expect(needsTokenWarning("unknown")).toBe(true);
  });
});

describe("trustLabel + trustExplainer", () => {
  it("returns non-empty strings for every trust level", () => {
    for (const lvl of ["verified", "listed", "custom", "unknown"] as const) {
      expect(trustLabel(lvl).length).toBeGreaterThan(0);
      expect(trustExplainer(lvl).length).toBeGreaterThan(20);
    }
  });
});
