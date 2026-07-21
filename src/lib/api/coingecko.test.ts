import { describe, expect, it } from "vitest";

import { appendCoinGeckoAuthHeaders } from "./coingecko";

describe("appendCoinGeckoAuthHeaders", () => {
  it("does not attach browser keys unless explicitly enabled", () => {
    const headers = appendCoinGeckoAuthHeaders(new Headers(), {
      VITE_ENABLE_BROWSER_API_KEYS: "false",
      VITE_COINGECKO_PRO_API_KEY: "pro-key",
      VITE_COINGECKO_API_KEY: "demo-key",
    });

    expect(headers.get("x-cg-pro-api-key")).toBeNull();
    expect(headers.get("x-cg-demo-api-key")).toBeNull();
  });

  it("attaches the configured CoinGecko key when browser keys are explicitly enabled", () => {
    const headers = appendCoinGeckoAuthHeaders(new Headers(), {
      VITE_ENABLE_BROWSER_API_KEYS: "true",
      VITE_COINGECKO_PRO_API_KEY: "pro-key",
    });

    expect(headers.get("x-cg-pro-api-key")).toBe("pro-key");
  });
});
