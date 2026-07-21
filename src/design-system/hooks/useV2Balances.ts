// ─── useV2Balances — wagmi-powered wallet balances for V2 pages ─────────────
//
// Replaces hardcoded `balanceUSD={51570.49}` and `nativeBalance="12.45"` with
// live wagmi balance reads.  Falls back gracefully to "—" when disconnected
// or loading.

import { useAccount, useBalance, useChainId } from "wagmi";
import { formatUnits } from "viem";
import { getV2Chain } from "../data/v2ChainView";
import { useTokenPrice } from "../data/priceService";

export interface V2WalletBalances {
  nativeBalance: string;
  nativeTicker: string;
  nativeBalanceUSD: number | null;
  tokenBalances: Record<string, {
    balance: string;
    balanceUSD: number | null;
    loading: boolean;
  }>;
}

export function useV2Balances(): V2WalletBalances {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const chain = getV2Chain(chainId);

  // Native balance via wagmi
  const { data: nativeBalanceData } = useBalance({ address });
  const nativeTicker = chain?.ticker ?? "ETH";

  const nativeBalance = isConnected && nativeBalanceData
    ? Number(formatUnits(nativeBalanceData.value, nativeBalanceData.decimals)).toFixed(4)
    : "—";

  // Native USD price via design-system price service
  const nativePriceUSD = useTokenPrice(chainId, nativeTicker);

  const nativeBalanceNum = nativeBalance !== "—" ? Number(nativeBalance) : 0;
  const nativeBalanceUSD = isConnected && nativePriceUSD != null
    ? nativeBalanceNum * nativePriceUSD
    : null;

  return {
    nativeBalance,
    nativeTicker,
    nativeBalanceUSD,
    tokenBalances: {},
  };
}

/**
 * Convenience hook: returns the total USD balance displayed in the AccountModal.
 * Falls back to showing the native balance only if no token balances are available.
 */
export function useV2TotalUSD(): number | null {
  const { nativeBalanceUSD } = useV2Balances();
  return nativeBalanceUSD;
}

/**
 * Format a token balance for display in the AccountModal / WalletButton.
 * Handles the common "12.45 ETH" pattern.
 */
export function formatNativeDisplay(balances: V2WalletBalances): string {
  if (balances.nativeBalance === "—") return "—";
  return `${balances.nativeBalance} ${balances.nativeTicker}`;
}
