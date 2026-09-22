import * as bitcoin from "bitcoinjs-lib";
import type { GardenBitcoinNativeSourceFunding, GardenNativeUtxo } from "../api/contracts";
import { GARDEN_BTC_NATIVE_SEGWIT_REASON } from "../model/capabilities";

const DEFAULT_FEE_RATE_SAT_VBYTE = 8;
const MEMPOOL_ADDRESS_UTXO_URL = "https://mempool.space/api/address";
const MEMPOOL_RECOMMENDED_FEES_URL = "https://mempool.space/api/v1/fees/recommended";

type UniSatUtxoProvider = {
  getBitcoinUtxos?: () => Promise<unknown[]>;
  getUnspentOutputs?: () => Promise<unknown[]>;
};

export interface CollectGardenBitcoinFundingInput {
  ownerAddress: string;
  providerName?: string;
  provider?: UniSatUtxoProvider;
  loadUtxos?: (address: string) => Promise<unknown[]>;
  loadFeeRate?: () => Promise<number>;
}

export async function collectGardenBitcoinSourceFunding({
  ownerAddress,
  providerName,
  provider,
  loadUtxos,
  loadFeeRate = fetchRecommendedFeeRate,
}: CollectGardenBitcoinFundingInput): Promise<GardenBitcoinNativeSourceFunding> {
  const ownerScript = p2wpkhScriptHex(ownerAddress);
  const rawUtxos = await loadRawUtxos({
    ownerAddress,
    providerName,
    provider,
    loadUtxos,
  });
  const utxos = normalizeConfirmedUtxos(rawUtxos, ownerScript);
  if (!utxos.length) {
    throw new Error("No confirmed Native SegWit UTXOs are available for Garden BTC funding.");
  }

  return {
    runtime: "bitcoin",
    utxos,
    feeRateSatVbyte: clampFeeRate(await loadFeeRate().catch(() => DEFAULT_FEE_RATE_SAT_VBYTE)),
    replaceByFee: true,
    changeAddress: ownerAddress,
  };
}

function p2wpkhScriptHex(address: string): string {
  const script = bitcoin.address.toOutputScript(address, bitcoin.networks.bitcoin);
  if (script.length !== 22 || script[0] !== 0x00 || script[1] !== 0x14) {
    throw new Error(GARDEN_BTC_NATIVE_SEGWIT_REASON);
  }
  return Buffer.from(script).toString("hex");
}

async function loadRawUtxos(input: {
  ownerAddress: string;
  providerName?: string;
  provider?: UniSatUtxoProvider;
  loadUtxos?: (address: string) => Promise<unknown[]>;
}): Promise<unknown[]> {
  if (input.loadUtxos) return input.loadUtxos(input.ownerAddress);

  const walletKind = input.providerName?.trim().toLowerCase();
  const uniSatProvider =
    input.provider ??
    (typeof window !== "undefined" && walletKind !== "phantom"
      ? (window as Window & { unisat?: UniSatUtxoProvider }).unisat
      : undefined);
  if (uniSatProvider?.getBitcoinUtxos || uniSatProvider?.getUnspentOutputs) {
    const walletUtxos = uniSatProvider.getBitcoinUtxos
      ? await uniSatProvider.getBitcoinUtxos()
      : await uniSatProvider.getUnspentOutputs!();
    if (Array.isArray(walletUtxos) && walletUtxos.length) {
      if (walletUtxos.some(hasConfirmationHint)) return walletUtxos;
      const mempoolUtxos = await fetchMempoolUtxos(input.ownerAddress).catch(() => []);
      return mergeConfirmationHints(walletUtxos, mempoolUtxos);
    }
  }

  return fetchMempoolUtxos(input.ownerAddress);
}

function hasConfirmationHint(entry: unknown): boolean {
  const item = asRecord(entry);
  return (
    Number(item?.confirmations) > 0 ||
    Number(item?.confirmations) === 0 ||
    typeof item?.status === "object" ||
    Number(item?.height) > 0
  );
}

function mergeConfirmationHints(walletUtxos: unknown[], mempoolUtxos: unknown[]): unknown[] {
  const mempoolByOutpoint = new Map<string, Record<string, unknown>>();
  for (const entry of mempoolUtxos) {
    const item = asRecord(entry);
    const txid = readOptionalString(item?.txid ?? item?.txId ?? item?.tx_hash ?? item?.txHash);
    const vout = Number(item?.vout ?? item?.outputIndex ?? item?.index);
    if (!txid || !Number.isSafeInteger(vout) || vout < 0) continue;
    mempoolByOutpoint.set(`${txid.toLowerCase()}:${vout}`, item);
  }

  return walletUtxos.map((entry) => {
    const item = asRecord(entry) ?? {};
    const txid = readOptionalString(item.txid ?? item.txId ?? item.tx_hash ?? item.txHash);
    const vout = Number(item.vout ?? item.outputIndex ?? item.index);
    if (!txid || !Number.isSafeInteger(vout) || vout < 0) return entry;
    const mempool = mempoolByOutpoint.get(`${txid.toLowerCase()}:${vout}`);
    return mempool ? { ...item, ...mempool } : entry;
  });
}

function normalizeConfirmedUtxos(raw: unknown[], ownerScriptHex: string): GardenNativeUtxo[] {
  const seen = new Set<string>();
  const utxos: GardenNativeUtxo[] = [];

  for (const entry of raw) {
    const item = asRecord(entry);
    if (!item) continue;
    const txid = readOptionalString(item.txid ?? item.txId ?? item.tx_hash ?? item.txHash);
    const vout = Number(item.vout ?? item.outputIndex ?? item.index);
    const value = readPositiveIntegerString(
      item.valueSats ?? item.satoshis ?? item.value ?? item.amount,
    );
    if (!txid || !/^[0-9a-fA-F]{64}$/.test(txid) || !Number.isSafeInteger(vout) || vout < 0 || !value) {
      continue;
    }
    const confirmations = readConfirmations(item);
    if (confirmations < 1) continue;
    const outpoint = `${txid.toLowerCase()}:${vout}`;
    if (seen.has(outpoint)) continue;
    seen.add(outpoint);
    utxos.push({
      txid,
      vout,
      valueSats: value,
      scriptPubKey: ownerScriptHex,
      confirmations,
    });
  }

  return utxos;
}

function readConfirmations(item: Record<string, unknown>): number {
  const explicit = Number(item.confirmations);
  if (Number.isSafeInteger(explicit) && explicit >= 0) return explicit;

  const status = asRecord(item.status);
  if (status) {
    if (status.confirmed === false) return 0;
    if (status.confirmed === true) {
      const blockHeight = Number(status.block_height);
      return Number.isSafeInteger(blockHeight) && blockHeight > 0 ? 1 : 1;
    }
  }

  const height = Number(item.height ?? item.blockHeight ?? item.block_height);
  if (Number.isSafeInteger(height) && height > 0) return 1;
  return 0;
}

async function fetchMempoolUtxos(address: string): Promise<unknown[]> {
  const response = await fetch(
    `${MEMPOOL_ADDRESS_UTXO_URL}/${encodeURIComponent(address)}/utxo`,
    { headers: { Accept: "application/json" } },
  );
  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(
      `Unable to fetch BTC UTXOs (${response.status}): ${body || response.statusText}`,
    );
  }
  const payload = await response.json();
  if (!Array.isArray(payload)) {
    throw new Error("BTC UTXO endpoint returned an invalid response.");
  }
  return payload;
}

async function fetchRecommendedFeeRate(): Promise<number> {
  const response = await fetch(MEMPOOL_RECOMMENDED_FEES_URL, {
    headers: { Accept: "application/json" },
  });
  if (!response.ok) return DEFAULT_FEE_RATE_SAT_VBYTE;
  const payload = asRecord(await response.json().catch(() => null));
  const halfHour = Number(payload?.halfHourFee);
  const fastest = Number(payload?.fastestFee);
  if (Number.isFinite(halfHour) && halfHour > 0) return halfHour;
  if (Number.isFinite(fastest) && fastest > 0) return fastest;
  return DEFAULT_FEE_RATE_SAT_VBYTE;
}

function clampFeeRate(value: number): number {
  if (!Number.isFinite(value) || value <= 0) return DEFAULT_FEE_RATE_SAT_VBYTE;
  return Math.min(500, Math.max(1, Math.round(value)));
}

function readPositiveIntegerString(value: unknown): string | null {
  if (typeof value === "bigint" && value > 0n) return value.toString();
  if (typeof value === "number" && Number.isSafeInteger(value) && value > 0) {
    return String(value);
  }
  if (typeof value === "string" && /^[1-9]\d*$/.test(value.trim())) return value.trim();
  return null;
}

function readOptionalString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}
