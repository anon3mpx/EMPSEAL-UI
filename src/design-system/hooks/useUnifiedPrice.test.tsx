import { renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useUnifiedPrice } from "./useUnifiedPrice";

const mocks = vi.hoisted(() => ({
  getCachedPrice: vi.fn(),
  getTokenPrice: vi.fn(),
  getGeckoTerminalTokenPrices: vi.fn(),
  getDexScreenerTokenPrices: vi.fn(),
}));

vi.mock("../data/priceService", () => ({
  getCachedPrice: mocks.getCachedPrice,
  getTokenPrice: mocks.getTokenPrice,
}));

vi.mock("../../lib/api/geckoTerminal", () => ({
  getGeckoTerminalTokenPrices: mocks.getGeckoTerminalTokenPrices,
}));

vi.mock("../../lib/api/dexScreener", () => ({
  getDexScreenerTokenPrices: mocks.getDexScreenerTokenPrices,
}));

describe("useUnifiedPrice", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getCachedPrice.mockReturnValue(null);
    mocks.getTokenPrice.mockResolvedValue(null);
    mocks.getGeckoTerminalTokenPrices.mockImplementation(async ([token]) => ({
      [token.id]: { price: 241.75, change24h: 0 },
    }));
    mocks.getDexScreenerTokenPrices.mockResolvedValue({});
  });

  it("returns a GeckoTerminal price when DefiLlama has no price", async () => {
    const { result } = renderHook(() =>
      useUnifiedPrice(8453, "TOKEN", "0x1111111111111111111111111111111111111111"),
    );

    await waitFor(() => {
      expect(result.current).toBe(241.75);
    });
  });

  it("keeps GeckoTerminal and DexScreener as fallbacks when DefiLlama returns a price", async () => {
    mocks.getTokenPrice.mockResolvedValue(312.5);

    const { result } = renderHook(() =>
      useUnifiedPrice(8453, "TOKEN", "0x3333333333333333333333333333333333333333"),
    );

    await waitFor(() => {
      expect(result.current).toBe(312.5);
    });
  });

  it("resolves native ETH through the registered WETH address", async () => {
    mocks.getTokenPrice.mockResolvedValue(1895.32);

    const { result } = renderHook(() => useUnifiedPrice(1, "ETH"));

    await waitFor(() => {
      expect(result.current).toBe(1895.32);
    });
  });

  it("returns a DexScreener price when DefiLlama and GeckoTerminal have no price", async () => {
    mocks.getGeckoTerminalTokenPrices.mockResolvedValue({});
    mocks.getDexScreenerTokenPrices.mockImplementation(async ([token]) => ({
      [token.id]: { price: 198.25, change24h: 0 },
    }));

    const { result } = renderHook(() =>
      useUnifiedPrice(8453, "TOKEN", "0x2222222222222222222222222222222222222222"),
    );

    await waitFor(() => {
      expect(result.current).toBe(198.25);
    });
  });
});
