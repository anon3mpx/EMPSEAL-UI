import type { BasketCapabilities, BasketMode } from "../api/contracts";

export const BASKET_MODES: BasketMode[] = [
  "multi-to-one",
  "one-to-many",
  "wallet-liquidator",
  "many-to-many",
];

export const BASKET_LIMITS = {
  maxInputs: 5,
  maxOutputs: 10,
  maxLegs: 25,
} as const;

export const MODE_LABEL: Record<BasketMode, string> = {
  "multi-to-one": "Multiswap",
  "one-to-many": "Split routes",
  "wallet-liquidator": "Liquidator",
  "many-to-many": "Rebalancer",
};

export function expectedLegCount(mode: BasketMode, inputCount: number, outputCount: number): number {
  if (mode === "multi-to-one") return inputCount;
  if (mode === "one-to-many") return outputCount;
  if (mode === "wallet-liquidator") return inputCount;
  return inputCount * outputCount;
}

export function basketLimits(limits?: BasketCapabilities["limits"] | null) {
  return {
    maxInputs: limits?.maxInputs ?? BASKET_LIMITS.maxInputs,
    maxOutputs: limits?.maxOutputs ?? BASKET_LIMITS.maxOutputs,
    maxLegs: limits?.maxLegs ?? BASKET_LIMITS.maxLegs,
  };
}

export function paddedBasketLegId(legIndex: number): string {
  return `leg_${String(legIndex).padStart(3, "0")}`;
}

export function skippedLegIds(skipped: Array<{ legId?: string; opaqueLegRef?: string; legIndex: number }>): string[] {
  return skipped
    .map((leg) => leg.legId ?? leg.opaqueLegRef ?? paddedBasketLegId(leg.legIndex))
    .filter((id) => id.length > 0);
}
