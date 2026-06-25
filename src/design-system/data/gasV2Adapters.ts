import { formatEther } from "viem";
import { getExplorerTxUrl } from "./explorers";
import { getV2Chain } from "./v2ChainView";

const GAS_CHAIN_ESTIMATES: Record<number, { nativeUsd: number; gasUsdPerSwap: number }> = {
  1: { nativeUsd: 3184, gasUsdPerSwap: 8.2 },
  42161: { nativeUsd: 3184, gasUsdPerSwap: 0.28 },
  8453: { nativeUsd: 3184, gasUsdPerSwap: 0.18 },
  10: { nativeUsd: 3184, gasUsdPerSwap: 0.22 },
  137: { nativeUsd: 0.72, gasUsdPerSwap: 0.04 },
  56: { nativeUsd: 612, gasUsdPerSwap: 0.3 },
  43114: { nativeUsd: 38, gasUsdPerSwap: 0.16 },
  369: { nativeUsd: 0.00007, gasUsdPerSwap: 0.001 },
  146: { nativeUsd: 0.42, gasUsdPerSwap: 0.02 },
};

export type GasV2Chain = {
  id: number;
  name: string;
  ticker: string;
  color?: string;
  nativeUsd: number;
  gasUsdPerSwap: number;
  raw?: any;
};

export type GasV2Destination = {
  id: string;
  chainId: number;
  amount: string;
};

export type GasV2QuoteSummary = {
  sourceAmount: string;
  expectedAmount: string;
  bridgeFeeUSD: number;
  estimatedTimeSeconds: number | null;
  ready: boolean;
};

export type GasV2TxRequest = {
  to: `0x${string}`;
  data: `0x${string}`;
  value: bigint;
};

export type GasHistoryRow = {
  sourceHash: string;
  sourceHashShort: string;
  sourceExplorer?: string;
  seenLabel: string;
  status: "delivered" | "pending" | "failed";
  value: string;
  sourceChainName: string;
  destinationsLabel: string;
};

export type GasLookupDelivery = {
  chain: { name: string; color: string; ticker: string };
  usdValue: number;
  native: string;
  status: "delivered" | "in_flight" | "stuck" | "failed";
  txShort?: string;
  txFull?: string;
  explorer?: string;
  etaSecondsToDelivery: number | null;
};

export type GasLookupResult = {
  sourceChain: { name: string; color: string; ticker: string };
  sourceTxShort: string;
  sourceTxFull: string;
  sourceExplorer?: string;
  sentAt: string;
  sentUsd: number;
  bridgeFeeUsd: number;
  deliveries: GasLookupDelivery[];
};

function toNumber(value: unknown, fallback = 0): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function formatNativeWei(value: unknown): string {
  if (value == null || value === "") return "0";

  try {
    return trimAmount(formatEther(BigInt(value as any)));
  } catch {
    return String(value);
  }
}

function trimAmount(value: string): string {
  return value.replace(/(\.\d*?[1-9])0+$/, "$1").replace(/\.0+$/, "");
}

function readChainId(value: any): number | null {
  const parsed = Number(value?.chain ?? value?.chainId ?? value?.id);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function chainMeta(chainId: number, raw?: any): GasV2Chain {
  const configured = getV2Chain(chainId);
  const estimates = GAS_CHAIN_ESTIMATES[chainId] ?? { nativeUsd: 1, gasUsdPerSwap: 0.25 };

  return {
    id: chainId,
    name: raw?.name ?? configured?.name ?? `Chain ${chainId}`,
    ticker: raw?.symbol ?? raw?.ticker ?? configured?.ticker ?? "GAS",
    color: configured?.color,
    nativeUsd: estimates.nativeUsd,
    gasUsdPerSwap: estimates.gasUsdPerSwap,
    raw,
  };
}

export function normalizeGasChains(chains: any[] = []): GasV2Chain[] {
  // Gas.zip returns chain IDs under `chain`; V2 pickers expect `id`.
  // We enrich live chain rows with local display metadata, but never use the
  // local list as the source of supported-chain truth.
  return chains.flatMap((chain) => {
    const chainId = readChainId(chain);
    return chainId ? [chainMeta(chainId, chain)] : [];
  });
}

function readQuote(quote: any): any {
  return Array.isArray(quote?.quotes) ? quote.quotes[0] : quote?.quote ?? quote;
}

function readFeeUSD(quote: any): number {
  const q = readQuote(quote);
  return toNumber(
    q?.feeUsd ??
      q?.bridgeFeeUsd ??
      q?.bridgeFeeUSD ??
      q?.fee_usd ??
      q?.bridge_fee_usd ??
      quote?.feeUsd,
  );
}

function readEtaSeconds(quote: any): number | null {
  const q = readQuote(quote);
  const eta = q?.etaSeconds ?? q?.eta ?? q?.estimatedTimeSeconds ?? quote?.etaSeconds;
  const parsed = Number(eta);
  return Number.isFinite(parsed) ? parsed : null;
}

export function buildGasQuoteSummary(quote: any, _sourceTicker = "GAS"): GasV2QuoteSummary {
  const tx = quote?.contractDepositTxn ?? quote?.transaction ?? quote?.tx ?? {};
  const q = readQuote(quote);
  const sourceAmount = formatNativeWei(tx.value ?? quote?.value);
  const expectedAmount = formatNativeWei(q?.expected ?? q?.amountOut ?? q?.output);

  return {
    sourceAmount,
    expectedAmount,
    bridgeFeeUSD: readFeeUSD(quote),
    estimatedTimeSeconds: readEtaSeconds(quote),
    ready: Boolean(tx?.to && tx?.data && tx?.value),
  };
}

export function buildGasTxRequest(quote: any): GasV2TxRequest | null {
  const tx = quote?.contractDepositTxn ?? quote?.transaction ?? quote?.tx;
  if (!tx?.to || !tx?.data || tx?.value == null) return null;

  return {
    to: tx.to as `0x${string}`,
    data: tx.data as `0x${string}`,
    value: BigInt(tx.value),
  };
}

export function buildGasDestinationDisplays({
  destinations,
  chains,
  expectedAmount,
  expectedAmounts,
}: {
  destinations: GasV2Destination[];
  chains: GasV2Chain[];
  expectedAmount: string;
  expectedAmounts?: string[];
}) {
  const expected = Number(expectedAmount || 0);

  return destinations.map((destination, index) => {
    const chain = chains.find((item) => item.id === destination.chainId) ?? chainMeta(destination.chainId);
    const requestedNative = Number(destination.amount || 0);
    const quotedNative = Number(expectedAmounts?.[index] ?? 0);
    const nativeOut =
      quotedNative > 0
        ? quotedNative
        : expected > 0 && destinations.length === 1
          ? expected
          : requestedNative;
    const usd = Number((nativeOut * chain.nativeUsd).toFixed(6));

    return {
      id: destination.id,
      chain: { id: chain.id, name: chain.name, ticker: chain.ticker, color: chain.color },
      usd,
      nativeOut,
      swapsBuyable: Math.floor(usd / Math.max(chain.gasUsdPerSwap, 0.000001)),
    };
  });
}

function normalizeStatus(status: unknown): "delivered" | "pending" | "failed" {
  const normalized = String(status ?? "").toLowerCase();
  if (["confirmed", "complete", "completed", "delivered", "success", "settled"].includes(normalized)) {
    return "delivered";
  }
  if (["error", "failed", "reverted"].includes(normalized)) return "failed";
  return "pending";
}

function lookupStatus(status: unknown): GasLookupDelivery["status"] {
  const normalized = String(status ?? "").toLowerCase();
  if (["confirmed", "complete", "completed", "delivered", "success", "settled"].includes(normalized)) {
    return "delivered";
  }
  if (["stuck", "timeout"].includes(normalized)) return "stuck";
  if (["error", "failed", "reverted"].includes(normalized)) return "failed";
  return "in_flight";
}

function readHash(value: any): string {
  return value?.hash ?? value?.txHash ?? value?.transactionHash ?? "";
}

function chainNameFromId(chainId: number | null, chains: GasV2Chain[]): string {
  if (!chainId) return "Unknown";
  return chains.find((chain) => chain.id === chainId)?.name ?? chainMeta(chainId).name;
}

export function formatGasHistoryRows(history: any[] = [], chains: GasV2Chain[] = []): GasHistoryRow[] {
  return history.map((entry) => {
    const deposit = entry?.deposit ?? entry;
    const sourceHash = readHash(deposit);
    const sourceChainId = readChainId(deposit);
    const destinations = Array.isArray(entry?.txs) ? entry.txs : [];

    return {
      sourceHash,
      sourceHashShort: shortHash(sourceHash),
      sourceExplorer: sourceChainId ? getExplorerTxUrl(sourceChainId, sourceHash) ?? undefined : undefined,
      seenLabel: deposit?.seen ? new Date(Number(deposit.seen) * 1000).toLocaleString() : "Unknown",
      status: normalizeStatus(deposit?.status),
      value: String(deposit?.value ?? deposit?.amount ?? ""),
      sourceChainName: chainNameFromId(sourceChainId, chains),
      destinationsLabel: destinations.length
        ? destinations
            .map((tx: any) => {
              const destinationChainId = readChainId(tx);
              return destinationChainId ? chainNameFromId(destinationChainId, chains) : tx?.chain ?? "Unknown";
            })
            .join(", ")
        : "Pending",
    };
  });
}

export function formatGasLookupResult(result: any, chains: GasV2Chain[] = []): GasLookupResult | null {
  const deposit = result?.deposit ?? result;
  const sourceHash = readHash(deposit);
  if (!sourceHash) return null;

  const sourceChainId = readChainId(deposit);
  const sourceChain = sourceChainId ? chainMeta(sourceChainId) : chainMeta(chains[0]?.id ?? 42161);
  const txs = Array.isArray(result?.txs) ? result.txs : [];

  return {
    sourceChain: {
      name: sourceChain.name,
      color: sourceChain.color ?? "#FF8A00",
      ticker: sourceChain.ticker,
    },
    sourceTxShort: shortHash(sourceHash),
    sourceTxFull: sourceHash,
    sourceExplorer: sourceChainId ? getExplorerTxUrl(sourceChainId, sourceHash) ?? undefined : undefined,
    sentAt: deposit?.seen ? new Date(Number(deposit.seen) * 1000).toLocaleString() : "Unknown",
    sentUsd: toNumber(deposit?.usdValue ?? deposit?.sentUsd ?? deposit?.usd),
    bridgeFeeUsd: toNumber(deposit?.feeUsd ?? deposit?.bridgeFeeUsd),
    deliveries: txs.map((tx: any) => {
      const destinationChainId = readChainId(tx);
      const destinationChain = destinationChainId ? chainMeta(destinationChainId) : chainMeta(8453);
      const txHash = readHash(tx);

      return {
        chain: {
          name: destinationChain.name,
          color: destinationChain.color ?? "#FF8A00",
          ticker: destinationChain.ticker,
        },
        usdValue: toNumber(tx?.usdValue ?? tx?.usd),
        native: String(tx?.native ?? tx?.value ?? tx?.amount ?? ""),
        status: lookupStatus(tx?.status ?? deposit?.status),
        txShort: txHash ? shortHash(txHash) : undefined,
        txFull: txHash || undefined,
        explorer: destinationChainId && txHash ? getExplorerTxUrl(destinationChainId, txHash) ?? undefined : undefined,
        etaSecondsToDelivery: tx?.etaSecondsToDelivery ?? tx?.etaSeconds ?? null,
      };
    }),
  };
}

export function shortHash(hash?: string | null): string {
  if (!hash) return "";
  return hash.length > 14 ? `${hash.slice(0, 6)}...${hash.slice(-4)}` : hash;
}
