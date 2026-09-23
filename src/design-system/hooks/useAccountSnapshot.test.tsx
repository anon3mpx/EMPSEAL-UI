import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { PortfolioV2Data } from "../data/portfolioV2Adapters";
import { useAccountSnapshot } from "./useAccountSnapshot";

const fetchPortfolio = vi.hoisted(() => vi.fn());
vi.mock("../data/portfolioApiRuntime", () => ({ fetchPortfolio }));

const addressA = "0x1111111111111111111111111111111111111111";
const addressB = "0x2222222222222222222222222222222222222222";
const portfolio: PortfolioV2Data = {
  totalValue: 55.41, change24h: 0, change7d: 0, nfts: [], sparklines: {}, chartData: [],
  tokens: [{ symbol: "USDC", name: "USD Coin", chain: "base", chainName: "Base", chainColor: "#0052FF", chainId: 8453, address: "0x3333333333333333333333333333333333333333", amount: 55.41, value: 55.41, price: 1, change24h: 0, allocation: 100 }],
  chains: [{ chain: "base", chainName: "Base", color: "#0052FF", logo: "B", value: 55.41, tokens: 1 }],
};

let queryClient: QueryClient;
function wrapper({ children }: { children: ReactNode }) {
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}

describe("useAccountSnapshot", () => {
  beforeEach(() => {
    fetchPortfolio.mockReset();
    queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  });

  it("exposes the same portfolio total, tokens and networks for an address", async () => {
    fetchPortfolio.mockResolvedValue(portfolio);
    const { result } = renderHook(() => useAccountSnapshot(addressA), { wrapper });
    await waitFor(() => expect(result.current.status).toBe("ready"));
    expect(result.current.balanceUSD).toBe(55.41);
    expect(result.current.tokens).toMatchObject([{ ticker: "USDC", chainName: "Base" }]);
    expect(result.current.networks).toMatchObject([{ chainName: "Base", balanceUSD: 55.41 }]);
  });

  it("does not show the previous address's holdings while another address loads", async () => {
    fetchPortfolio.mockResolvedValueOnce(portfolio).mockImplementationOnce(() => new Promise(() => {}));
    const { result, rerender } = renderHook(({ address }) => useAccountSnapshot(address), { initialProps: { address: addressA }, wrapper });
    await waitFor(() => expect(result.current.status).toBe("ready"));
    rerender({ address: addressB });
    expect(result.current.status).toBe("loading");
    expect(result.current.balanceUSD).toBeUndefined();
    expect(result.current.tokens).toEqual([]);
  });

  it("preserves a genuine zero total", async () => {
    fetchPortfolio.mockResolvedValue({ ...portfolio, totalValue: 0, tokens: [], chains: [] });
    const { result } = renderHook(() => useAccountSnapshot(addressA), { wrapper });
    await waitFor(() => expect(result.current.status).toBe("ready"));
    expect(result.current.balanceUSD).toBe(0);
  });

  it("reports a failed scan instead of an empty wallet", async () => {
    fetchPortfolio.mockRejectedValue(new Error("RPC unavailable"));
    const { result } = renderHook(() => useAccountSnapshot(addressA), { wrapper });
    await waitFor(() => expect(result.current.status).toBe("error"));
    expect(result.current.balanceUSD).toBeUndefined();
    expect(result.current.tokens).toEqual([]);
  });
});
