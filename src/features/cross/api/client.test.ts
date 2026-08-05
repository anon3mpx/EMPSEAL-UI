import { afterEach, describe, expect, it, vi } from "vitest";
import { resolveCrossApiBaseUrl } from "./client";
import { crossApi } from "./crossApi";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("resolveCrossApiBaseUrl", () => {
  it("uses the same-origin Vite proxy during local development", () => {
    expect(resolveCrossApiBaseUrl(undefined, true)).toBe("");
  });

  it("uses the public API origin outside local development", () => {
    expect(resolveCrossApiBaseUrl(undefined, false)).toBe(
      "https://crosschain.empx.io",
    );
  });

  it("preserves an explicit API origin override without a trailing slash", () => {
    expect(
      resolveCrossApiBaseUrl("https://crosschain-staging.empx.io/", true),
    ).toBe("https://crosschain-staging.empx.io");
  });
});

describe("LayerZero discovery client", () => {
  it("fetches public LayerZero discovery directly without preflight-only headers", async () => {
    const abortController = new AbortController();
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ chains: [], pagination: { nextToken: "b" } })))
      .mockResolvedValueOnce(new Response(JSON.stringify({ tokens: [], pagination: {} })));
    vi.stubGlobal("fetch", fetchMock);

    await crossApi.listLayerZeroChains("a", abortController.signal);
    await crossApi.listLayerZeroTokens({
      transferrableFromChainKey: "ethereum",
      transferrableFromTokenAddress: "0xabc",
      nextToken: "b",
    }, abortController.signal);

    expect(fetchMock.mock.calls[0][0]).toBe(
      "https://transfer.layerzero-api.com/v1/chains?pagination%5BnextToken%5D=a",
    );
    expect(fetchMock.mock.calls[1][0]).toBe(
      "https://transfer.layerzero-api.com/v1/tokens?transferrableFromChainKey=ethereum&transferrableFromTokenAddress=0xabc&pagination%5BnextToken%5D=b",
    );
    expect(fetchMock.mock.calls[0][1]).toMatchObject({
      headers: { Accept: "application/json" },
      signal: abortController.signal,
    });
    expect(fetchMock.mock.calls[0][1]?.headers).not.toHaveProperty("Content-Type");
  });

  it("keeps discovery warm without refreshing on every modal interaction", () => {
    expect(crossApi.layerZeroDiscoveryQueryPolicy).toEqual({
      staleTime: 10 * 60 * 1000,
      gcTime: 60 * 60 * 1000,
      refetchInterval: 15 * 60 * 1000,
      refetchIntervalInBackground: false,
      refetchOnWindowFocus: false,
    });
  });

  it("continues paging LayerZero discovery until the provider cursor is exhausted", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({
        chains: [{ chainKey: "ethereum" }],
        pagination: { nextToken: "chains-2" },
      })))
      .mockResolvedValueOnce(new Response(JSON.stringify({
        chains: [{ chainKey: "solana" }],
        pagination: {},
      })))
      .mockResolvedValueOnce(new Response(JSON.stringify({
        tokens: [{ chainKey: "ethereum", address: "0x1" }],
        pagination: { nextToken: "tokens-2" },
      })))
      .mockResolvedValueOnce(new Response(JSON.stringify({
        tokens: [{ chainKey: "solana", address: "So1" }],
        pagination: {},
      })));
    vi.stubGlobal("fetch", fetchMock);

    const chains = await crossApi.listAllLayerZeroChains();
    const tokens = await crossApi.listAllLayerZeroTokens();

    expect(chains.map((chain: any) => chain.chainKey)).toEqual(["ethereum", "solana"]);
    expect(tokens.map((token: any) => token.address)).toEqual(["0x1", "So1"]);
    expect(fetchMock.mock.calls.map((call) => call[0])).toEqual([
      "https://transfer.layerzero-api.com/v1/chains",
      "https://transfer.layerzero-api.com/v1/chains?pagination%5BnextToken%5D=chains-2",
      "https://transfer.layerzero-api.com/v1/tokens",
      "https://transfer.layerzero-api.com/v1/tokens?pagination%5BnextToken%5D=tokens-2",
    ]);
  });
});
