// ─── useSwapBalances ─────────────────────────────────────────────────────────
//
// Owns the three balance queries the swap page cares about:
//
//   1. The wallet's native chain balance (for the "Wallet: 0.123 PLS" header
//      AND as the fallback when the user selects the native sentinel as
//      sellToken — wagmi's useBalance with `token: 0x000…000` doesn't return
//      the native balance, so we run a separate keyless query).
//   2. The wallet's balance of the currently-selected sellToken (tokenA).
//   3. The wallet's balance of the currently-selected buyToken (tokenB) —
//      shown in the buy-side row so the user can see how much they already
//      have of the destination asset before swapping.
//
// Returned shape preserves the original variable names used by Emp.jsx so
// the migration is mechanical:
//
//   formattedBalance               — string, native balance, 6 dp, "0.00" when no wallet
//   tokenBalance                   — raw wagmi data for tokenA (or undefined)
//   formattedChainBalance          — tokenA balance as 6-dp string, "0.000" fallback
//   tokenBBalance                  — raw wagmi data for tokenB
//   formattedChainBalanceTokenB    — tokenB balance as 6-dp string
//   isTokenBalanceLoading          — tokenA balance still loading?
//
// Notes for the SDK seam:
//   When wallet/chain access moves behind the SwapSDK, replace the three
//   `useBalance` calls with `sdk.getBalance(...)`.  The orchestration in
//   Emp.jsx (calculateAmount, percentage handlers, header display) keeps
//   working unchanged because the return shape doesn't change.

import { useEffect, useState } from "react";
import { useBalance } from "wagmi";
import { formatEther } from "viem";

export function useSwapBalances({ address, selectedTokenA, selectedTokenB }) {
  // ─── Native chain balance (account-level) ──────────────────────────────────
  // We keep this separate from the tokenA balance because wagmi's useBalance
  // returns 0 when called with token=0x000...000 — the sentinel native
  // address doesn't have an ERC-20 contract to query.
  const { data: nativeBalanceData } = useBalance({ address });
  const [nativeBalance, setNativeBalance] = useState(null);

  useEffect(() => {
    if (address && nativeBalanceData) {
      setNativeBalance(formatEther(nativeBalanceData.value));
    } else if (!address) {
      setNativeBalance("0.00");
    }
  }, [address, nativeBalanceData]);

  const formattedBalance = nativeBalance
    ? `${parseFloat(nativeBalance).toFixed(6)}`
    : "0.00";

  // ─── Token A balance (the sell side) ───────────────────────────────────────
  const { data: tokenBalance, isLoading: isTokenBalanceLoading } = useBalance({
    address,
    token: selectedTokenA?.address,
    watch: true,
  });
  const formattedChainBalance = tokenBalance
    ? parseFloat(tokenBalance.formatted).toFixed(6)
    : "0.000";

  // ─── Token B balance (the buy side) ────────────────────────────────────────
  const { data: tokenBBalance } = useBalance({
    address,
    token: selectedTokenB?.address,
    watch: true,
  });
  const formattedChainBalanceTokenB = tokenBBalance
    ? parseFloat(tokenBBalance.formatted).toFixed(6)
    : "0.000";

  return {
    formattedBalance,
    tokenBalance,
    formattedChainBalance,
    tokenBBalance,
    formattedChainBalanceTokenB,
    isTokenBalanceLoading,
  };
}
