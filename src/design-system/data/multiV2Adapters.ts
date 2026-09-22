import type { PickerToken } from "../components/TokenPicker";
import type { V2ChainConfig } from "./v2ChainView";
import type { V2TokenConfig } from "./v2TokenView";

export function formatScannedUsdTotal(total: number, unpricedCount: number): string {
  const knownTotal = total > 0 && total < 0.01
    ? "<$0.01"
    : `$${total.toLocaleString("en-US", { maximumFractionDigits: 2 })}`;
  return unpricedCount > 0 ? `${knownTotal} + ${unpricedCount} unpriced` : knownTotal;
}

export function toMultiPickerToken(
  token: V2TokenConfig,
  chain: Pick<V2ChainConfig, "name" | "color">,
): PickerToken {
  return {
    ticker: token.ticker,
    name: token.name,
    address: token.address,
    chainId: token.chainId,
    chainName: chain.name,
    chainColor: chain.color,
    badge: token.badge,
    logoUrl: token.logoUrl,
    isNative: token.isNative,
  };
}
