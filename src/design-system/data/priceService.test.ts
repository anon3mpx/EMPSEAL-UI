import { afterEach, describe, expect, it, vi } from "vitest";

const STORAGE_KEY = "empx:priceCache:v1";
const WETH_ADDRESS = "0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2";
const CACHE_KEY = `1:${WETH_ADDRESS}`;

afterEach(() => {
  window.localStorage.clear();
  vi.unstubAllGlobals();
  vi.useRealTimers();
  vi.resetModules();
});

describe("priceService cache expiry", () => {
  it("fetches a current price after an in-memory cache entry exceeds its TTL", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-07-29T14:30:00.000Z"));
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({
      [CACHE_KEY]: {
        price: 3184,
        fetchedAt: Date.now(),
      },
    }));

    const priceService = await import("./priceService");
    expect(priceService.getCachedPrice(1, "ETH", WETH_ADDRESS)).toBe(3184);

    vi.advanceTimersByTime(5 * 60 * 1000 + 1);
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({
      coins: {
        [`ethereum:${WETH_ADDRESS}`]: {
          decimals: 18,
          symbol: "WETH",
          price: 1895.32,
          timestamp: 1785336777,
          confidence: 0.99,
        },
      },
    }), { status: 200 })));

    const price = await priceService.getTokenPrice(1, "ETH", WETH_ADDRESS);

    expect(price).toBe(1895.32);
  });
});
