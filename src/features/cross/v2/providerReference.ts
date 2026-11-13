// The tracking reference a provider-direct intent needs (POST /v2/intents/:id/reference): the server's provider monitor only polls a transfer
// once one is attached, and each provider's `track()` takes a different id (empx-core/server packages/adapters/<rail>/src: track()).
// deBridge (order id) and LayerZero VT (quote id) need ids only the server holds; the server records those itself at commit (plan step 0.6),
// so the page sends nothing for them.
import { keccak256, toBytes } from "viem";

export interface ReceiptLog {
  address: string;
  topics: readonly string[];
}

/** Rails whose `track()` takes the source transaction hash. */
const TX_HASH_RAILS: Record<string, true> = { gaszip: true, thorchain: true, maya: true, chainflip: true, teleswap: true };
/** Hyperlane Mailbox `DispatchId(bytes32 indexed messageId)`. */
export const DISPATCH_ID_TOPIC = keccak256(toBytes("DispatchId(bytes32)"));

/** Rails whose reference the server records itself at commit. */
const SERVER_REF_RAILS: Record<string, true> = { debridge: true, "layerzero-vt": true, garden: true, heleket: true };

/** Whether the page produces this rail's reference (and whether it needs the receipt for it), or the server does. */
export function referenceKind(rail: string): "tx-hash" | "chain-tx-hash" | "hyperlane-message" | "server" | null {
  if (SERVER_REF_RAILS[rail] === true) return "server";
  if (TX_HASH_RAILS[rail] === true) return "tx-hash";
  if (rail === "hyperlane") return "hyperlane-message";
  if (rail === "cctp-solana") return "chain-tx-hash";
  return null;
}

/** The reference for this rail from the source transaction, or null when it cannot be derived here. */
export function providerReference(rail: string, txHash: string, destChainId: number | null, logs?: readonly ReceiptLog[], sourceChainId?: number): string | null {
  const kind = referenceKind(rail);
  if (kind === "tx-hash") return /^0x[0-9a-fA-F]{64}$/.test(txHash) ? txHash : null;
  if (kind === "chain-tx-hash") return Number.isSafeInteger(sourceChainId) && sourceChainId! > 0 && /^0x[0-9a-fA-F]{64}$/.test(txHash) ? `${sourceChainId}:${txHash}` : null;
  if (kind === "hyperlane-message") {
    const id = logs?.find((l) => l.topics[0]?.toLowerCase() === DISPATCH_ID_TOPIC)?.topics[1];
    return id && destChainId && /^0x[0-9a-fA-F]{64}$/.test(id) ? `${destChainId}:${id.toLowerCase()}` : null;
  }
  return null;
}

export function depositReferenceNeeded(rail: string): boolean {
  return rail === "thorchain" || rail === "maya";
}

export function btcTxidValid(s: string): boolean {
  return /^(0x)?[0-9a-fA-F]{64}$/.test(s);
}
