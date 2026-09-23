import { useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { AccountNetworkBalance, AccountTokenBalance } from "../components/AccountModal";
import { fetchPortfolio } from "../data/portfolioApiRuntime";
import { buildPortfolioV2ViewModel } from "../data/portfolioV2Adapters";

const PORTFOLIO_STALE_MS = 15 * 60 * 1000;

/** The supported EVM portfolio for one wallet address, shared by all V2 pages. */
export function useAccountSnapshot(address: string | null | undefined) {
  const normalizedAddress = address?.toLowerCase() ?? null;
  const queryClient = useQueryClient();
  const queryKey = ["v2-account-portfolio", normalizedAddress] as const;
  const query = useQuery({
    queryKey,
    queryFn: () => fetchPortfolio(normalizedAddress!),
    enabled: Boolean(normalizedAddress),
    staleTime: PORTFOLIO_STALE_MS,
    retry: false,
  });
  const portfolio = normalizedAddress ? query.data ?? null : null;
  const view = useMemo(() => buildPortfolioV2ViewModel(portfolio), [portfolio]);
  const tokens: AccountTokenBalance[] = useMemo(() => view.assets.map((asset) => ({
    ticker: asset.ticker,
    chainName: asset.chainName,
    chainColor: asset.chainColor,
    balance: asset.balance,
    balanceUSD: asset.balanceUSD,
    chainId: asset.chainId,
    address: asset.address,
    logoUrl: asset.logoUrl,
    isNative: asset.isNative,
  })), [view.assets]);
  const networks: AccountNetworkBalance[] = useMemo(() => portfolio?.chains.map((chain) => ({
    chainName: chain.chainName,
    chainColor: chain.color,
    balanceUSD: chain.value,
  })) ?? [], [portfolio]);

  const status: "idle" | "loading" | "ready" | "error" = !normalizedAddress ? "idle" : query.isError ? "error" : portfolio ? "ready" : "loading";
  const refresh = async () => {
    if (!normalizedAddress) return;
    const data = await fetchPortfolio(normalizedAddress, { forceRefresh: true });
    queryClient.setQueryData(queryKey, data);
  };

  return {
    portfolio,
    view,
    balanceUSD: status === "ready" ? view.totalUSD : undefined,
    tokens,
    networks,
    status,
    isRefreshing: query.isFetching && Boolean(portfolio),
    error: query.error,
    refresh,
  };
}
