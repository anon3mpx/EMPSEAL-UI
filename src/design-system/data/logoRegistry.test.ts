import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  chainLogoCandidates,
  getCachedLogoStatus,
  normalizeLogoUrl,
  resetLogoRegistryCache,
  setCachedLogoStatus,
  tokenLogoCandidates,
} from "./logoRegistry";

describe("chainLogoCandidates", () => {
  it("keeps ETH-native chains visually distinct", () => {
    expect(chainLogoCandidates(1, "ETH")[0]).toBe("/icons/eth.svg");
    expect(chainLogoCandidates(42161, "ETH")[0]).toBe("/icons/arbitrum.svg");
    expect(chainLogoCandidates(8453, "ETH")[0]).toBe("/icons/base.svg");
    expect(chainLogoCandidates(10, "ETH")[0]).toBe("/icons/op.svg");
  });

  it("uses the PulseChain local asset", () => {
    expect(chainLogoCandidates(369, "PLS")[0]).toBe("/icons/pls.svg");
  });

  it("preserves symbol-based artwork for callers without a chain ID", () => {
    expect(chainLogoCandidates(undefined, "ARB")).toEqual([
      "https://icons.llamao.fi/icons/chains/rsz_arbitrum.jpg",
    ]);
  });
});

describe("normalizeLogoUrl", () => {
  it.each([
    ["/icons/usdc.svg", "/icons/usdc.svg"],
    ["https://cdn.example/logo.png", "https://cdn.example/logo.png"],
    [
      "http://api-assets.rubic.exchange/assets/example/logo.png",
      "https://api-assets.rubic.exchange/assets/example/logo.png",
    ],
    ["http://untrusted.example/logo.png", null],
    ["javascript:alert(1)", null],
    ["", null],
  ])("normalizes %s", (input, expected) => {
    expect(normalizeLogoUrl(input)).toBe(expected);
  });
});

describe("tokenLogoCandidates", () => {
  it("prefers local common-token artwork", () => {
    expect(tokenLogoCandidates({ chainId: 369, ticker: "PLS" })[0]).toBe("/icons/pls.svg");
    expect(tokenLogoCandidates({ chainId: 369, ticker: "PLSX" })[0]).toBe("/icons/plsx.svg");
    expect(tokenLogoCandidates({ chainId: 42161, ticker: "USDC" })[0]).toBe("/icons/usdc.svg");
  });

  it("uses a safe configured image before the address CDN", () => {
    const candidates = tokenLogoCandidates({
      chainId: 42161,
      ticker: "RBC",
      address: "0x10aaed289a7b1b0155bf4b86c862f297e84465e0",
      configuredUrl: "https://assets.example/rbc.png",
    });
    expect(candidates[0]).toBe("https://assets.example/rbc.png");
    expect(candidates[1]).toContain("trustwallet/assets");
  });

  it("prefers contract-specific artwork over a ticker-wide local image", () => {
    const candidates = tokenLogoCandidates({
      chainId: 42161,
      ticker: "PLS",
      address: "0x51318b7d00db7acc4026c88c3952b66278b6a67f",
      configuredUrl:
        "http://api-assets.rubic.exchange/assets/coingecko/arbitrum/0x51318b7d00db7acc4026c88c3952b66278b6a67f/logo.png",
      isNative: false,
    });

    expect(candidates[0]).toBe(
      "https://api-assets.rubic.exchange/assets/coingecko/arbitrum/0x51318b7d00db7acc4026c88c3952b66278b6a67f/logo.png",
    );
    expect(candidates).toContain("/icons/pls.svg");
  });

  it("deduplicates candidates and omits unusable addresses", () => {
    const candidates = tokenLogoCandidates({
      chainId: 42161,
      ticker: "UNKNOWN",
      address: "not-an-address",
    });
    expect(candidates).toEqual([]);
  });
});

describe("logo cache TTL", () => {
  beforeEach(() => {
    resetLogoRegistryCache();
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-09-20T00:00:00.000Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
    resetLogoRegistryCache();
  });

  it("keeps successful URLs for 30 days and failed URLs for 1 hour", () => {
    const okUrl = "https://cdn.example/ok.png";
    const failUrl = "https://cdn.example/fail.png";
    setCachedLogoStatus(okUrl, "ok");
    setCachedLogoStatus(failUrl, "fail");

    expect(getCachedLogoStatus(okUrl)).toBe("ok");
    expect(getCachedLogoStatus(failUrl)).toBe("fail");

    vi.setSystemTime(new Date("2026-09-20T01:00:00.001Z"));
    expect(getCachedLogoStatus(okUrl)).toBe("ok");
    expect(getCachedLogoStatus(failUrl)).toBeNull();

    vi.setSystemTime(new Date("2026-10-20T00:00:00.001Z"));
    expect(getCachedLogoStatus(okUrl)).toBeNull();
  });

  it("keys cache entries by normalized URL, not ticker", () => {
    setCachedLogoStatus("https://cdn.example/usdc.png", "fail");
    expect(getCachedLogoStatus("https://cdn.example/usdc.png")).toBe("fail");
    expect(getCachedLogoStatus("USDC")).toBeNull();
  });
});
