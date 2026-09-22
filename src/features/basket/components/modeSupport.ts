import type { BasketCapabilities, BasketMode } from "../api/contracts";
import { basketLimits, expectedLegCount } from "../model/modes";

export interface BasketModeConfig {
  mode: BasketMode;
  maxInputs: number;
  maxOutputs: number;
  maxLegs: number;
  requireEvenAllocations: boolean;
  usesWalletScan: boolean;
}

export function basketModeConfig(
  mode: BasketMode,
  limits?: BasketCapabilities["limits"] | null,
): BasketModeConfig {
  const caps = basketLimits(limits);
  if (mode === "multi-to-one") {
    return { mode, maxInputs: caps.maxInputs, maxOutputs: 1, maxLegs: caps.maxLegs, requireEvenAllocations: false, usesWalletScan: false };
  }
  if (mode === "one-to-many") {
    return { mode, maxInputs: 1, maxOutputs: caps.maxOutputs, maxLegs: caps.maxLegs, requireEvenAllocations: true, usesWalletScan: false };
  }
  if (mode === "wallet-liquidator") {
    return { mode, maxInputs: caps.maxInputs, maxOutputs: 1, maxLegs: caps.maxLegs, requireEvenAllocations: false, usesWalletScan: true };
  }
  return { mode, maxInputs: caps.maxInputs, maxOutputs: caps.maxOutputs, maxLegs: caps.maxLegs, requireEvenAllocations: true, usesWalletScan: false };
}

export function basketOverCap(
  mode: BasketMode,
  inputCount: number,
  outputCount: number,
  limits?: BasketCapabilities["limits"] | null,
): boolean {
  const config = basketModeConfig(mode, limits);
  return inputCount > config.maxInputs
    || outputCount > config.maxOutputs
    || expectedLegCount(mode, inputCount, outputCount) > config.maxLegs;
}
