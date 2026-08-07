import { isEvmChain } from "@/lib/wallet/chainKind";
import type { RailOffer, RailIdentifier } from "../api/contracts";

export interface CrossChainCapability {
  fullSwapSupported: boolean;
  sourceExecution: "evm";
}

const FULL_SWAP_CHAIN_IDS = new Set([8453, 42161, 10]);

export function getChainCapability(chainId: number): CrossChainCapability {
  return {
    fullSwapSupported: FULL_SWAP_CHAIN_IDS.has(chainId),
    sourceExecution: "evm",
  };
}

export type RailCapabilityStatus =
  | "executable"
  | "restricted"
  | "quote_only"
  | "disabled";

export type SourceWalletType = "evm" | "bitcoin" | "solana" | "non_evm";

export interface RailCapability {
  rail: RailIdentifier | string;
  label: string;
  status: RailCapabilityStatus;
  allowedSourceChainIds?: readonly number[];
  allowedDestinationChainIds?: readonly number[];
  allowedAssets?: readonly string[];
  allowedDirections?: readonly ("deposit" | "withdraw")[];
  requiredSourceWallet: SourceWalletType;
  providerApprovalMayBeRequired: boolean;
  nativeDestinationAddressRequired?: boolean;
  selectable: boolean;
  reason?: string;
}

const HYPERLANE_CHAINS = [
  1, 10, 56, 137, 146, 369, 480, 999, 1329, 8453, 42161, 43114,
  57073, 59144, 98866, 130,
] as const;

const RAIL_CAPABILITIES: Record<string, RailCapability> = {
  CCTP: {
    rail: "CCTP",
    label: "CCTP",
    status: "executable",
    requiredSourceWallet: "evm",
    providerApprovalMayBeRequired: false,
    selectable: true,
  },
  CCTP_FAST: {
    rail: "CCTP_FAST",
    label: "CCTP Fast",
    status: "executable",
    requiredSourceWallet: "evm",
    providerApprovalMayBeRequired: false,
    selectable: true,
  },
  LAYERZERO: {
    rail: "LAYERZERO",
    label: "LayerZero",
    status: "executable",
    requiredSourceWallet: "evm",
    providerApprovalMayBeRequired: true,
    selectable: true,
  },
  GASZIP: {
    rail: "GASZIP",
    label: "Gas.zip",
    status: "executable",
    requiredSourceWallet: "evm",
    providerApprovalMayBeRequired: false,
    selectable: true,
  },
  THORCHAIN: {
    rail: "THORCHAIN",
    label: "THORChain",
    status: "executable",
    requiredSourceWallet: "evm",
    providerApprovalMayBeRequired: true,
    selectable: true,
  },
  HYPERLANE_NEXUS: {
    rail: "HYPERLANE_NEXUS",
    label: "Hyperlane Nexus",
    status: "executable",
    allowedSourceChainIds: HYPERLANE_CHAINS,
    allowedDestinationChainIds: HYPERLANE_CHAINS,
    allowedAssets: ["USDC", "USDT"],
    requiredSourceWallet: "evm",
    providerApprovalMayBeRequired: true,
    selectable: true,
  },
  OPTIMISM_NATIVE_BRIDGE: {
    rail: "OPTIMISM_NATIVE_BRIDGE",
    label: "Optimism Native Bridge",
    status: "executable",
    allowedSourceChainIds: [1],
    allowedDestinationChainIds: [10],
    allowedDirections: ["deposit"],
    requiredSourceWallet: "evm",
    providerApprovalMayBeRequired: true,
    selectable: true,
  },
  WORMHOLE: {
    rail: "WORMHOLE",
    label: "Wormhole",
    status: "executable",
    requiredSourceWallet: "evm",
    providerApprovalMayBeRequired: false,
    selectable: true,
  },
  DEBRIDGE: {
    rail: "DEBRIDGE",
    label: "deBridge DLN",
    status: "executable",
    requiredSourceWallet: "evm",
    providerApprovalMayBeRequired: true,
    selectable: true,
  },
  GARDEN: {
    rail: "GARDEN",
    label: "Garden",
    status: "executable",
    requiredSourceWallet: "evm",
    providerApprovalMayBeRequired: true,
    selectable: true,
  },
  MAYA: {
    rail: "MAYA",
    label: "Maya",
    status: "restricted",
    requiredSourceWallet: "bitcoin",
    providerApprovalMayBeRequired: false,
    selectable: false,
    reason: "A Bitcoin source wallet or reviewed deposit flow is required.",
  },
  CHAINFLIP: {
    rail: "CHAINFLIP",
    label: "Chainflip",
    status: "quote_only",
    requiredSourceWallet: "evm",
    providerApprovalMayBeRequired: false,
    selectable: false,
    reason: "Private broker-backed deposit-channel creation is not enabled.",
  },
  TELESWAP: {
    rail: "TELESWAP",
    label: "TeleSwap",
    status: "disabled",
    requiredSourceWallet: "bitcoin",
    providerApprovalMayBeRequired: false,
    selectable: false,
    reason: "This rail is disabled for the current rollout.",
  },
  VIA_LABS: disabledCapability("VIA_LABS", "Via Labs"),
  AXELAR: disabledCapability("AXELAR", "Axelar"),
};

function disabledCapability(rail: string, label: string): RailCapability {
  return {
    rail,
    label,
    status: "disabled",
    requiredSourceWallet: "evm",
    providerApprovalMayBeRequired: false,
    selectable: false,
    reason: "This rail is not approved for the current rollout.",
  };
}

export function getRailCapability(rail: string | null | undefined): RailCapability {
  const normalized = String(rail ?? "").trim().toUpperCase();
  return (
    RAIL_CAPABILITIES[normalized] ??
    disabledCapability(normalized || "UNKNOWN", normalized || "Unknown rail")
  );
}

export function getOfferCapability(
  offer: Pick<RailOffer, "rail" | "srcChainId" | "dstChainId"> &
    Partial<
      Pick<
        RailOffer,
        "routeAsset" | "sourceSettlementAsset" | "destinationSettlementAsset" | "offerType"
      >
    > & {
    actionKind?: string;
    direction?: "deposit" | "withdraw";
  },
): RailCapability {
  const base = getRailCapability(offer.rail);
  const contextualBase: RailCapability = {
    ...base,
    nativeDestinationAddressRequired: !isEvmChain(offer.dstChainId),
  };
  if (offer.offerType === "lz_stargate_native") {
    return {
      ...contextualBase,
      status: "disabled",
      selectable: false,
      reason: "LayerZero native Stargate is not enabled for this rollout.",
    };
  }
  const nonEvmSourceWallet: SourceWalletType =
    offer.srcChainId === 0
      ? "bitcoin"
      : offer.srcChainId === 99
        ? "solana"
        : "non_evm";

  if (
    base.status === "disabled" ||
    base.status === "quote_only" ||
    base.status === "restricted"
  ) {
    return !isEvmChain(offer.srcChainId) && base.status !== "disabled"
      ? { ...contextualBase, requiredSourceWallet: nonEvmSourceWallet }
      : contextualBase;
  }

  const canonicalAssetId =
    offer.routeAsset?.canonicalAssetId ??
    offer.sourceSettlementAsset?.canonicalAssetId ??
    offer.destinationSettlementAsset?.canonicalAssetId;
  if (
    canonicalAssetId &&
    base.allowedAssets &&
    !base.allowedAssets.includes(canonicalAssetId.toUpperCase())
  ) {
    return {
      ...contextualBase,
      status: "disabled",
      selectable: false,
      reason: "This asset is outside the enabled route catalog.",
    };
  }

  const executableNativeSource = getExecutableNativeSourceWallet(offer);
  if (executableNativeSource) {
    return {
      ...contextualBase,
      status: "executable",
      selectable: true,
      requiredSourceWallet: executableNativeSource,
      providerApprovalMayBeRequired: false,
    };
  }

  if (!isEvmChain(offer.srcChainId)) {
    return {
      ...contextualBase,
      status: "restricted",
      selectable: false,
      requiredSourceWallet: nonEvmSourceWallet,
      reason: "The connected wallet cannot execute this non-EVM source action.",
    };
  }

  if (
    base.allowedSourceChainIds &&
    !base.allowedSourceChainIds.includes(offer.srcChainId)
  ) {
    return {
      ...contextualBase,
      status: "disabled",
      selectable: false,
      reason: "This source chain is outside the enabled route catalog.",
    };
  }

  if (
    base.allowedDestinationChainIds &&
    !base.allowedDestinationChainIds.includes(offer.dstChainId)
  ) {
    return {
      ...contextualBase,
      status: "disabled",
      selectable: false,
      reason: "This destination chain is outside the enabled route catalog.",
    };
  }

  if (
    base.rail === "OPTIMISM_NATIVE_BRIDGE" &&
    (offer.direction === "withdraw" ||
      offer.srcChainId !== 1 ||
      offer.dstChainId !== 10)
  ) {
    return {
      ...contextualBase,
      status: "disabled",
      selectable: false,
      reason: "Only Ethereum-to-Optimism deposits are enabled.",
    };
  }

  return contextualBase;
}

function getExecutableNativeSourceWallet(offer: {
  rail?: string | null;
  srcChainId: number;
  offerType?: string;
  actionKind?: string;
}): SourceWalletType | null {
  const rail = String(offer.rail ?? "").toUpperCase();
  const offerType = String(offer.offerType ?? "").toLowerCase();
  const actionKind = String(offer.actionKind ?? "").toLowerCase();

  if (
    offer.srcChainId === 0 &&
    rail === "THORCHAIN" &&
    (!offerType || offerType === "thor_api_direct" || actionKind === "thorchain_swap")
  ) {
    return "bitcoin";
  }

  if (
    offer.srcChainId === 99 &&
    rail === "LAYERZERO" &&
    (offerType === "layerzero_value_transfer_api" || actionKind === "layerzero_value_transfer_api")
  ) {
    return "solana";
  }

  return null;
}
