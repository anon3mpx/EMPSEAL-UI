import { afterEach, describe, expect, it, vi } from "vitest";
import { getDexScreenerTokenPrices } from "./dexScreener";
import { getGeckoTerminalTokenPrices } from "./geckoTerminal";

const WETH_ADDRESS = "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2";
const NORMALIZED_WETH_ADDRESS = WETH_ADDRESS.toLowerCase();

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("external price sources", () => {
  it("uses GeckoTerminal's Ethereum network for Ethereum tokens", async () => {
    const fetchMock = vi.fn().mockImplementation(async (input: string | URL | Request) => {
      if (!String(input).includes("/simple/networks/eth/token_price/")) {
        return new Response(null, { status: 404 });
      }

      return new Response(JSON.stringify({
        data: {
          attributes: {
            token_prices: {
              [NORMALIZED_WETH_ADDRESS]: "3184.25",
            },
          },
        },
      }), { status: 200 });
    });
    vi.stubGlobal("fetch", fetchMock);

    const prices = await getGeckoTerminalTokenPrices([{
      id: "ethereum-weth",
      address: WETH_ADDRESS,
      chainId: 1,
    }]);

    expect(prices["ethereum-weth"]?.price).toBe(3184.25);
  });

  it("ignores same-address DexScreener pairs from other chains", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      pairs: [
        {
          chainId: "base",
          baseToken: { address: WETH_ADDRESS },
          quoteToken: { address: "0x1111111111111111111111111111111111111111" },
          priceUsd: "9999",
          liquidity: { usd: 10_000_000 },
        },
        {
          chainId: "ethereum",
          baseToken: { address: WETH_ADDRESS },
          quoteToken: { address: "0x2222222222222222222222222222222222222222" },
          priceUsd: "3184.25",
          liquidity: { usd: 1_000_000 },
        },
      ],
    }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    const prices = await getDexScreenerTokenPrices([{
      id: "ethereum-weth",
      address: WETH_ADDRESS,
      chainId: 1,
    }]);

    expect(prices["ethereum-weth"]?.price).toBe(3184.25);
  });
});
