import type {
  ProviderAssetRef,
  QuoteResponse,
  RailOffer,
  SelectionResponse,
} from "../api/contracts";

const USDC: ProviderAssetRef = {
  canonicalAssetId: "USDC",
  providerAssetId: "USDC",
  tokenAddress: "0x1111111111111111111111111111111111111111",
  decimals: 6,
  assetKind: "erc20",
};

const ETH: ProviderAssetRef = {
  canonicalAssetId: "ETH",
  providerAssetId: "ETH",
  decimals: 18,
  assetKind: "native",
};

const BTC: ProviderAssetRef = {
  canonicalAssetId: "BTC",
  providerAssetId: "BTC.BTC",
  decimals: 8,
  assetKind: "btc",
};

function offer(
  overrides: Partial<RailOffer> &
    Pick<
      RailOffer,
      "offerId" | "rail" | "srcChainId" | "dstChainId" | "tokenIn" | "tokenOut"
    >,
): RailOffer {
  const sourceAsset =
    overrides.srcChainId === 0
      ? BTC
      : overrides.tokenIn === "native"
        ? ETH
        : USDC;
  const destinationAsset =
    overrides.dstChainId === 0
      ? BTC
      : overrides.tokenOut === "native"
        ? ETH
        : USDC;

  return {
    railType: "liquidity",
    amountIn: "1000000",
    estimatedOut: "990000",
    minAmountOut: "985000",
    expiresAt: 1_900_000_000_000,
    executionMode: "provider_direct",
    sourceSettlementAsset: sourceAsset,
    destinationSettlementAsset: destinationAsset,
    routeAsset: sourceAsset,
    economics: {
      providerFeeUSD: "0.25",
      protocolFeeUSD: "0",
      sourceGasUSD: "0.12",
      settlementTimeSeconds: 120,
    },
    execution: {},
    ...overrides,
  };
}

export const hyperlaneBaseToArbitrumUsdcOffer = offer({
  offerId: "offer-hyperlane-base-arbitrum-usdc",
  rail: "HYPERLANE_NEXUS",
  offerType: "hyperlane_nexus_direct",
  srcChainId: 8453,
  dstChainId: 42161,
  tokenIn: USDC.tokenAddress!,
  tokenOut: "0x2222222222222222222222222222222222222222",
});

export const optimismErc20DepositOffer = offer({
  offerId: "offer-optimism-erc20-deposit",
  rail: "OPTIMISM_NATIVE_BRIDGE",
  offerType: "optimism_native_bridge_direct",
  srcChainId: 1,
  dstChainId: 10,
  tokenIn: USDC.tokenAddress!,
  tokenOut: "0x3333333333333333333333333333333333333333",
});

export const optimismNativeDepositOffer = offer({
  offerId: "offer-optimism-native-deposit",
  rail: "OPTIMISM_NATIVE_BRIDGE",
  offerType: "optimism_native_bridge_direct",
  srcChainId: 1,
  dstChainId: 10,
  tokenIn: "native",
  tokenOut: "native",
  amountIn: "100000000000000000",
  estimatedOut: "100000000000000000",
  minAmountOut: "100000000000000000",
});

export const mayaBitcoinToEthereumOffer = offer({
  offerId: "offer-maya-btc-ethereum",
  rail: "MAYA",
  offerType: "maya_direct",
  srcChainId: 0,
  dstChainId: 1,
  tokenIn: "BTC.BTC",
  tokenOut: "native",
  amountIn: "1000000",
  estimatedOut: "250000000000000000",
  minAmountOut: "245000000000000000",
});

export const chainflipQuoteOnlyOffer = offer({
  offerId: "offer-chainflip-quote-only",
  rail: "CHAINFLIP",
  offerType: "chainflip_broker_direct",
  srcChainId: 1,
  dstChainId: 42161,
  tokenIn: USDC.tokenAddress!,
  tokenOut: "0x2222222222222222222222222222222222222222",
});

export const disabledTeleSwapOffer = offer({
  offerId: "offer-teleswap-disabled",
  rail: "TELESWAP",
  offerType: "teleswap_direct",
  srcChainId: 0,
  dstChainId: 1,
  tokenIn: "BTC.BTC",
  tokenOut: "native",
});

export const disabledOptimismWithdrawalOffer = offer({
  offerId: "offer-optimism-withdrawal-disabled",
  rail: "OPTIMISM_NATIVE_BRIDGE",
  offerType: "optimism_native_bridge_direct",
  srcChainId: 10,
  dstChainId: 1,
  tokenIn: "native",
  tokenOut: "native",
});

export const railEnablementQuoteFixture: QuoteResponse = {
  offerSet: {
    offerSetId: "offer-set-rail-enablement",
    expiresAt: 1_900_000_000_000,
    bestOfferId: hyperlaneBaseToArbitrumUsdcOffer.offerId,
    offers: [
      hyperlaneBaseToArbitrumUsdcOffer,
      optimismErc20DepositOffer,
      optimismNativeDepositOffer,
      mayaBitcoinToEthereumOffer,
      chainflipQuoteOnlyOffer,
      disabledTeleSwapOffer,
      disabledOptimismWithdrawalOffer,
    ],
  },
};

export const hyperlaneApprovalSelectionFixture: SelectionResponse = {
  intentId: "intent-hyperlane-approval",
  quote: {
    intentId: "intent-hyperlane-approval",
    srcChainId: 8453,
    dstChainId: 42161,
    tokenIn: USDC.tokenAddress!,
    tokenOut: "0x2222222222222222222222222222222222222222",
    amountIn: "1000000",
    estimatedOut: "990000",
    minAmountOut: "985000",
    rail: "HYPERLANE_NEXUS",
    expiresAt: 1_900_000_000_000,
    executionMode: "provider_direct",
  },
  integration: {
    mode: "provider_direct",
    action: {
      kind: "hyperlane_transfer_remote",
      destinationDomain: 42161,
      interchainGasValue: "120000000000000",
    },
    approvals: [
      {
        token: USDC.tokenAddress!,
        spender: "0x4444444444444444444444444444444444444444",
        amount: "1200000",
      },
    ],
    tx: {
      to: "0x5555555555555555555555555555555555555555",
      data: "0x1234",
      value: "120000000000000",
      chainId: 8453,
    },
  },
};

export const optimismErc20SelectionFixture: SelectionResponse = {
  intentId: "intent-optimism-erc20",
  quote: {
    intentId: "intent-optimism-erc20",
    srcChainId: 1,
    dstChainId: 10,
    tokenIn: USDC.tokenAddress!,
    tokenOut: "0x3333333333333333333333333333333333333333",
    amountIn: "1000000",
    estimatedOut: "990000",
    minAmountOut: "985000",
    rail: "OPTIMISM_NATIVE_BRIDGE",
    expiresAt: 1_900_000_000_000,
    executionMode: "provider_direct",
  },
  integration: {
    mode: "provider_direct",
    action: {
      kind: "optimism_standard_bridge",
      direction: "deposit",
    },
    approvals: [
      {
        token: USDC.tokenAddress!,
        spender: "0x6666666666666666666666666666666666666666",
        amount: "1000000",
      },
    ],
    tx: {
      to: "0x7777777777777777777777777777777777777777",
      data: "0x5678",
      value: "0",
      chainId: 1,
    },
  },
};

export const optimismNativeSelectionFixture: SelectionResponse = {
  ...optimismErc20SelectionFixture,
  intentId: "intent-optimism-native",
  quote: {
    ...optimismErc20SelectionFixture.quote,
    intentId: "intent-optimism-native",
    tokenIn: "native",
    tokenOut: "native",
    amountIn: "100000000000000000",
    estimatedOut: "100000000000000000",
    minAmountOut: "100000000000000000",
  },
  integration: {
    mode: "provider_direct",
    action: {
      kind: "optimism_standard_bridge",
      direction: "deposit",
    },
    tx: {
      to: "0x7777777777777777777777777777777777777777",
      data: "0x9abc",
      value: "100000000000000000",
      chainId: 1,
    },
  },
};

export const chainflipSelectionUnavailableFixture = {
  status: 503,
  body: {
    code: "CHAINFLIP_BROKER_UNAVAILABLE",
    message: "Private broker-backed selection is not enabled.",
  },
} as const;
