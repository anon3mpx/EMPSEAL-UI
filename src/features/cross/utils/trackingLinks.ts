import type {
  CrossExecutionSession,
  ProviderDirectAction,
  SelectionResponse,
} from "../api/contracts";

export interface CrossTrackingTxLink {
  hash: string;
  url?: string;
}

export interface CrossTrackingRailLink {
  label: string;
  url: string;
}

export interface CrossTrackingLinks {
  sourceTx?: CrossTrackingTxLink;
  destinationTx?: CrossTrackingTxLink;
  railLinks: CrossTrackingRailLink[];
}

interface BuildCrossTrackingLinksInput {
  session: CrossExecutionSession | null;
  tracking: any;
  sourceChainId: number;
  destinationChainId: number;
  getExplorerTxUrl: (chainId: number, txHash: string) => string | null;
}

const CCTP_RANGE_CHAIN_KEYS: Record<number, string> = {
  1: "eth",
  10: "op",
  137: "polygon",
  8453: "base",
  42161: "arb",
  43114: "avax",
};

function readString(...values: unknown[]): string | undefined {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return undefined;
}

function asRecord(value: unknown): Record<string, unknown> | undefined {
  return value && typeof value === "object"
    ? value as Record<string, unknown>
    : undefined;
}

function encodeBase64Ascii(value: string): string {
  if (typeof globalThis.btoa === "function") return globalThis.btoa(value);

  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
  let output = "";
  for (let index = 0; index < value.length; index += 3) {
    const first = value.charCodeAt(index);
    const second = value.charCodeAt(index + 1);
    const third = value.charCodeAt(index + 2);
    output += alphabet[first >> 2];
    output += alphabet[((first & 3) << 4) | ((second || 0) >> 4)];
    output += Number.isNaN(second)
      ? "="
      : alphabet[((second & 15) << 2) | ((third || 0) >> 6)];
    output += Number.isNaN(third) ? "=" : alphabet[third & 63];
  }
  return output;
}

function railKeyForSession(session: CrossExecutionSession | null): string {
  const quote = primarySelectionForSession(session)?.quote;
  return String(quote?.rail ?? "").toUpperCase();
}

function primarySelectionForSession(
  session: CrossExecutionSession | null,
): SelectionResponse | null {
  if (!session) return null;
  if (session.mode === "single") {
    return {
      intentId: session.intentId,
      quote: session.quote,
      integration: session.integration,
    };
  }
  return session.primaryTransfer;
}

function providerActionForSession(
  session: CrossExecutionSession | null,
): ProviderDirectAction | undefined {
  const selection = primarySelectionForSession(session);
  return selection?.integration.mode === "provider_direct"
    ? selection.integration.action
    : undefined;
}

function sourceTxHashForSession(session: CrossExecutionSession | null, tracking: any) {
  return readString(
    tracking?.srcTxHash,
    tracking?.sourceTxHash,
    tracking?.primaryTransfer?.srcTxHash,
    tracking?.primaryTransfer?.sourceTxHash,
    tracking?.primary?.srcTxHash,
    tracking?.primary?.sourceTxHash,
    session?.lastTxHash,
    session?.mode === "composed" ? session.primaryTransfer.lastTxHash : undefined,
  );
}

function destinationTxHashForTracking(tracking: any) {
  return readString(
    tracking?.dstTxHash,
    tracking?.destinationTxHash,
    tracking?.primaryTransfer?.dstTxHash,
    tracking?.primaryTransfer?.destinationTxHash,
    tracking?.primary?.dstTxHash,
    tracking?.primary?.destinationTxHash,
  );
}

function debridgeOrderIdFor(action: ProviderDirectAction | undefined, tracking: any) {
  const actionOrder = asRecord(action?.order);
  return readString(
    tracking?.orderId,
    tracking?.debridgeOrderId,
    tracking?.order?.orderId,
    tracking?.order?.id,
    tracking?.execution?.orderId,
    tracking?.primaryTransfer?.orderId,
    tracking?.primaryTransfer?.debridgeOrderId,
    action?.orderId,
    action?.debridgeOrderId,
    actionOrder?.orderId,
    actionOrder?.id,
  );
}

function hyperlaneMessageIdFor(action: ProviderDirectAction | undefined, tracking: any) {
  return readString(
    tracking?.messageId,
    tracking?.messageHash,
    tracking?.hyperlaneMessageId,
    tracking?.hyperlaneMessageHash,
    tracking?.primaryTransfer?.messageId,
    tracking?.primaryTransfer?.messageHash,
    tracking?.primaryTransfer?.hyperlaneMessageId,
    tracking?.primaryTransfer?.hyperlaneMessageHash,
    action?.messageId,
    action?.messageHash,
    action?.hyperlaneMessageId,
    action?.hyperlaneMessageHash,
  );
}

function cctpRangeIdFor(tracking: any, sourceChainId: number, sourceTxHash?: string) {
  const directId = readString(
    tracking?.rangeId,
    tracking?.cctpRangeId,
    tracking?.rangeStatusId,
    tracking?.primaryTransfer?.rangeId,
    tracking?.primaryTransfer?.cctpRangeId,
    tracking?.primaryTransfer?.rangeStatusId,
  );
  if (directId) return directId;
  if (!sourceTxHash) return undefined;

  const rangeChainKey = CCTP_RANGE_CHAIN_KEYS[sourceChainId];
  return rangeChainKey
    ? encodeBase64Ascii(`${rangeChainKey}/${sourceTxHash}`)
    : undefined;
}

function appendUniqueLink(
  links: CrossTrackingRailLink[],
  next: CrossTrackingRailLink | undefined,
) {
  if (!next || links.some((link) => link.url === next.url)) return;
  links.push(next);
}

export function buildCrossTrackingLinks({
  session,
  tracking,
  sourceChainId,
  destinationChainId,
  getExplorerTxUrl,
}: BuildCrossTrackingLinksInput): CrossTrackingLinks {
  const sourceTxHash = sourceTxHashForSession(session, tracking);
  const destinationTxHash = destinationTxHashForTracking(tracking);
  const action = providerActionForSession(session);
  const railKey = railKeyForSession(session);
  const actionKind = String(action?.kind ?? "").toLowerCase();
  const railLinks: CrossTrackingRailLink[] = [];

  if (sourceTxHash) {
    if (railKey.includes("LAYERZERO") || actionKind.includes("layerzero")) {
      appendUniqueLink(railLinks, {
        label: "LayerZero",
        url: `https://layerzeroscan.com/tx/${sourceTxHash}`,
      });
    }
    if (railKey.includes("THORCHAIN") || actionKind.includes("thorchain")) {
      appendUniqueLink(railLinks, {
        label: "THORChain",
        url: `https://runescan.io/tx/${sourceTxHash}`,
      });
    }
  }

  if (railKey.includes("HYPERLANE") || actionKind.includes("hyperlane")) {
    const messageId = hyperlaneMessageIdFor(action, tracking);
    appendUniqueLink(
      railLinks,
      messageId
        ? {
            label: "Hyperlane",
            url: `https://explorer.hyperlane.xyz/message/${messageId}`,
          }
        : undefined,
    );
  }

  if (railKey.includes("DEBRIDGE") || actionKind.includes("debridge")) {
    const orderId = debridgeOrderIdFor(action, tracking);
    appendUniqueLink(
      railLinks,
      orderId
        ? {
            label: "deBridge",
            url: `https://app.debridge.com/order?orderId=${orderId}`,
          }
        : undefined,
    );
  }

  if (railKey.includes("CCTP")) {
    const rangeId = cctpRangeIdFor(tracking, sourceChainId, sourceTxHash);
    appendUniqueLink(
      railLinks,
      rangeId
        ? {
            label: "CCTP",
            url: `https://usdc.range.org/status?id=${rangeId}`,
          }
        : undefined,
    );
  }

  return {
    sourceTx: sourceTxHash
      ? {
          hash: sourceTxHash,
          url: getExplorerTxUrl(sourceChainId, sourceTxHash) ?? undefined,
        }
      : undefined,
    destinationTx: destinationTxHash
      ? {
          hash: destinationTxHash,
          url: getExplorerTxUrl(destinationChainId, destinationTxHash) ?? undefined,
        }
      : undefined,
    railLinks,
  };
}
