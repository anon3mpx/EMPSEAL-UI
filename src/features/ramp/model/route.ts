import type { RampFiatRail, RampTransferCommand } from "../api/contracts";

export const RAMP_CHAIN_IDS = [1, 137, 8453] as const;
export const RAMP_TOKEN_TICKER = "USDC";
export const ON_RAMP_RAILS: RampFiatRail[] = ["ACH_PUSH", "WIRE"];
export const OFF_RAMP_RAILS: RampFiatRail[] = ["ACH", "WIRE"];

export type RampUiDirection = "BUY" | "SELL";

export function railsForDirection(direction: RampUiDirection): RampFiatRail[] {
  return direction === "BUY" ? ON_RAMP_RAILS : OFF_RAMP_RAILS;
}

export function coerceFiatRail(direction: RampUiDirection, rail: RampFiatRail): RampFiatRail {
  const rails = railsForDirection(direction);
  return rails.includes(rail) ? rail : rails[0]!;
}

export function isRampTokenAllowed(chainId: number, ticker: string): boolean {
  return (RAMP_CHAIN_IDS as readonly number[]).includes(chainId)
    && ticker.trim().toUpperCase() === RAMP_TOKEN_TICKER;
}

export function rampRouteSnapshot(input: {
  direction: RampUiDirection;
  chainId: number;
  ticker: string;
  fiatRail: RampFiatRail;
  amount: string;
  externalAccountId?: string;
}): string {
  return JSON.stringify({
    direction: input.direction,
    chainId: input.chainId,
    ticker: input.ticker.trim().toUpperCase(),
    fiatRail: coerceFiatRail(input.direction, input.fiatRail),
    amount: input.amount.trim(),
    externalAccountId: input.externalAccountId ?? "",
  });
}

export function canPreviewRampRoute(input: {
  direction: RampUiDirection;
  externalAccountId?: string;
}): boolean {
  if (input.direction === "SELL") return Boolean(input.externalAccountId);
  return true;
}

export function buildRampTransferFields(input: {
  wallet: string;
  chainId: number;
  direction: RampUiDirection;
  tokenAddress: string;
  fiatRail: RampFiatRail;
  amount: string;
  externalAccountId?: string;
}): Omit<RampTransferCommand, "signedAction"> {
  const direction = input.direction === "BUY" ? "ON_RAMP" : "OFF_RAMP";
  const fields: Omit<RampTransferCommand, "signedAction"> = {
    wallet: input.wallet,
    chainId: input.chainId,
    direction,
    tokenAddress: input.tokenAddress,
    fiatCurrency: "USD",
    fiatRail: coerceFiatRail(input.direction, input.fiatRail),
    amount: input.amount,
  };
  if (direction === "OFF_RAMP" && input.externalAccountId) {
    fields.externalAccountId = input.externalAccountId;
  }
  return fields;
}
