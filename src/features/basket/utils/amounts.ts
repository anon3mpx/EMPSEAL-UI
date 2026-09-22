import { formatUnits, parseUnits } from "viem";
import { getTokensForChain } from "../../../design-system/data/v2TokenView";

const POSITIVE_DECIMAL = /^(0|[1-9]\d*)(\.\d+)?$/;
const POSITIVE_INTEGER = /^(0|[1-9]\d*)$/;
export const NATIVE_TOKEN_ADDRESS = "0x0000000000000000000000000000000000000000";
export const NATIVE_PLACEHOLDER_ADDRESS = "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee";

export function toBaseUnitAmount(humanAmount: string, decimals: number): string {
  const trimmed = humanAmount.trim();
  if (!POSITIVE_DECIMAL.test(trimmed)) {
    throw new Error("amount must be a positive decimal string");
  }
  const base = parseUnits(trimmed, decimals);
  if (base <= 0n) {
    throw new Error("amount must be a positive integer amount");
  }
  return base.toString();
}

export function fromBaseUnitAmount(amount: string, decimals: number): string {
  if (!POSITIVE_INTEGER.test(amount.trim()) || BigInt(amount.trim()) <= 0n) {
    throw new Error("amount must be a positive integer amount");
  }
  return formatUnits(BigInt(amount.trim()), decimals);
}

export function isNativeTokenAddress(token: string): boolean {
  const normalized = token.trim().toLowerCase();
  return normalized === NATIVE_TOKEN_ADDRESS || normalized === NATIVE_PLACEHOLDER_ADDRESS;
}

export function canonicalNativeTokenAddress(token: string): string {
  return isNativeTokenAddress(token) ? NATIVE_TOKEN_ADDRESS : token;
}

export function resolveBasketToken(chainId: number, ticker: string): {
  address: string;
  decimals: number;
  ticker: string;
} {
  const tokens = getTokensForChain(chainId);
  const token = tokens.find((entry) => entry.ticker.toUpperCase() === ticker.toUpperCase());
  if (!token) {
    throw new Error(`No token address is configured for ${ticker} on chain ${chainId}.`);
  }
  const address = token.address
    ?? (token.isNative ? NATIVE_TOKEN_ADDRESS : undefined);
  if (!address) {
    throw new Error(`No token address is configured for ${ticker} on chain ${chainId}.`);
  }
  return { address, decimals: token.decimals, ticker: token.ticker };
}

export function resolveBasketTokenByAddress(chainId: number, token: string): {
  address: string;
  decimals: number;
  ticker: string;
} | null {
  const canonical = canonicalNativeTokenAddress(token);
  const tokens = getTokensForChain(chainId);
  const match = tokens.find((entry) => {
    if (isNativeTokenAddress(token) && entry.isNative) return true;
    return entry.address?.toLowerCase() === canonical.toLowerCase();
  });
  if (!match) return null;
  const address = match.address
    ?? (match.isNative ? NATIVE_TOKEN_ADDRESS : undefined);
  if (!address) return null;
  return { address, decimals: match.decimals, ticker: match.ticker };
}

export function allocationBpsTotal(allocations: number[]): number {
  return allocations.reduce((sum, value) => sum + value, 0);
}
