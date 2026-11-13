import { sendBitcoinDeposit, type UniSatBtcProvider, type PhantomBtcProvider } from "./bitcoinDeposit";
import type { SelectedOfferIntegration } from "../api/contracts";

export type { UniSatBtcProvider, PhantomBtcProvider } from "./bitcoinDeposit";
const DEFAULT_FEE_RATE_SATS_PER_VBYTE = 8;
export type ExecuteBitcoinThorchainInput = {
  integration: SelectedOfferIntegration;
  sourceAddress: string;
  providerName?: string;
  provider?: UniSatBtcProvider | PhantomBtcProvider;
  loadUtxos?: (address: string) => Promise<unknown[]>;
  finalizeSignedPsbt?: (signedPsbt: Uint8Array) => string;
  broadcastRawTransaction?: (rawTxHex: string) => Promise<string>;
};


export async function executeBitcoinThorchainIntent({
  integration,
  sourceAddress,
  providerName,
  provider,
  loadUtxos,
  finalizeSignedPsbt,
  broadcastRawTransaction,
}: ExecuteBitcoinThorchainInput): Promise<string> {
  const action = readThorchainBtcAction(integration);
  const walletKind = normalizeBtcProviderName(providerName);
  if (walletKind === "unknown") throw new Error(`Unsupported BTC wallet for THORChain source execution: ${providerName ?? "unknown"}.`);
  return sendBitcoinDeposit({
    depositAddress: action.depositAddress, amountSats: action.amountIn, memo: action.memo,
    feeRateSatsPerVb: readFeeRate(action.recommendedGasRate, action.gasRateUnits),
    dustThresholdSats: readPositiveBigInt(action.dustThreshold),
    sourceAddress, providerName: walletKind, provider, loadUtxos, finalizeSignedPsbt, broadcastRawTransaction,
  });
}

function readThorchainBtcAction(integration: SelectedOfferIntegration) {
  if (integration.mode !== "provider_direct" || integration.action.kind !== "thorchain_swap") {
    throw new Error("Selected route is not a THORChain BTC provider-direct action.");
  }

  const action = integration.action;
  const depositAddress = readString(action.depositAddress, "THORChain deposit address");
  const memo = readString(action.memo, "THORChain memo");
  const amountIn = readRequiredBigInt(action.amountIn, "THORChain BTC amount");
  if (amountIn <= 0n) {
    throw new Error("THORChain BTC amount must be greater than zero.");
  }

  return {
    depositAddress,
    memo,
    amountIn,
    recommendedGasRate: optionalString(action.recommendedGasRate),
    gasRateUnits: optionalString(action.gasRateUnits),
    dustThreshold: optionalString(action.dustThreshold),
  };
}

function normalizeBtcProviderName(providerName?: string): "unisat" | "phantom" | "unknown" {
  const normalized = providerName?.trim().toLowerCase();
  if (!normalized || normalized === "unisat") return "unisat";
  if (normalized === "phantom") return "phantom";
  return "unknown";
}

function readFeeRate(value: string | undefined, units: string | undefined): number {
  const normalizedUnits = (units ?? "").toLowerCase();
  const supportedUnits =
    !normalizedUnits ||
    normalizedUnits.includes("sats") ||
    normalizedUnits.includes("sat/") ||
    normalizedUnits.includes("byte");
  const numeric = supportedUnits && value ? Number(value) : NaN;
  if (!Number.isFinite(numeric) || numeric <= 0) {
    return DEFAULT_FEE_RATE_SATS_PER_VBYTE;
  }
  return Math.min(Math.ceil(numeric), 500);
}

function readString(value: unknown, label: string): string {
  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`${label} is required.`);
  }
  return value.trim();
}

function optionalString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function readPositiveBigInt(value: unknown): bigint | undefined {
  if (typeof value === "bigint") return value > 0n ? value : undefined;
  if (typeof value === "number" && Number.isSafeInteger(value) && value > 0) return BigInt(value);
  if (typeof value === "string" && /^[0-9]+$/.test(value.trim())) {
    const parsed = BigInt(value.trim());
    return parsed > 0n ? parsed : undefined;
  }
  return undefined;
}

function readRequiredBigInt(value: unknown, label: string): bigint {
  const parsed = readPositiveBigInt(value);
  if (!parsed) {
    throw new Error(`${label} must be a positive integer string.`);
  }
  return parsed;
}
