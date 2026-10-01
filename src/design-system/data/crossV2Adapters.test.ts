import { describe, expect, it } from "vitest";
import {
  CROSS_V2_DEFAULT_SELECTION,
  buildCrossQuoteRequest,
  buildCrossRouteHops,
  buildCrossTimeline,
  formatCrossOffer,
  isImplausibleOfferOutput,
  sizeDestinationGasAmount,
  getCrossQuoteUiState,
} from "./crossV2Adapters";
import * as crossV2Adapters from "./crossV2Adapters";
import { getTokensForChain } from "./v2TokenView";

const arbitrum = { id: 42161, name: "Arbitrum", ticker: "ETH", color: "#28A0F0" };
const base = { id: 8453, name: "Base", ticker: "ETH", color: "#0052FF" };

const fromToken = {
  chainId: 42161,
  ticker: "ETH",
  name: "Ether",
  address: "0x0000000000000000000000000000000000000000",
  decimal: 18,
  isNative: true,
};

const toToken = {
  chainId: 8453,
  ticker: "USDC",
  name: "USD Coin",
  address: "0x833589fcd6edb6e08f4c7c32d4f71b54bdA02913",
  decimal: 6,
  isNative: false,
};

describe("crossV2Adapters", () => {
  it("defaults to a stablecoin pair that can surface live rail offers", () => {
    expect(CROSS_V2_DEFAULT_SELECTION).toEqual({
      fromChainId: 8453,
      toChainId: 42161,
      fromTicker: "USDC",
      toTicker: "USDC",
      fromAmount: "10",
    });
  });

  it("distinguishes live quote status from the reference rail catalog", () => {
    expect(
      getCrossQuoteUiState({
        walletConnected: false,
        quoteReady: false,
        isFetching: false,
        offerCount: 0,
      }),
    ).toEqual({
      summary: "Connect to quote",
      emptyMessage: "Connect a wallet to fetch live cross-chain offers.",
    });

    expect(
      getCrossQuoteUiState({
        walletConnected: true,
        quoteReady: false,
        isFetching: false,
        offerCount: 0,
      }),
    ).toEqual({
      summary: "Quote not ready",
      emptyMessage: "Enter an amount and choose different source and destination chains.",
    });

    expect(
      getCrossQuoteUiState({
        walletConnected: true,
        quoteReady: true,
        isFetching: true,
        offerCount: 0,
      }),
    ).toEqual({
      summary: "Fetching live offers",
      emptyMessage: "Fetching executable routes from the cross-chain quote API...",
    });

    expect(
      getCrossQuoteUiState({
        walletConnected: true,
        quoteReady: true,
        isFetching: false,
        offerCount: 3,
      }),
    ).toEqual({
      summary: "3 live offers",
      emptyMessage: "",
    });

    expect(
      getCrossQuoteUiState({
        walletConnected: true,
        quoteReady: true,
        isFetching: false,
        offerCount: 0,
      }),
    ).toEqual({
      summary: "0 live offers",
      emptyMessage: "No live offers were returned for this pair. Try another token or route.",
    });
  });

  it("builds backend quote requests from V2 token config", () => {
    expect(
      buildCrossQuoteRequest({
        fromToken,
        toToken,
        fromAmount: "0.5",
        fromChainId: 42161,
        toChainId: 8453,
        userAddress: "0xabc",
        includeDestinationGas: true,
        destinationGasAmount: "0.001",
      }),
    ).toEqual({
      tokenIn: "0x0000000000000000000000000000000000000000",
      tokenOut: "0x833589fcd6edb6e08f4c7c32d4f71b54bdA02913",
      amountIn: "500000000000000000",
      srcChainId: 42161,
      dstChainId: 8453,
      userAddress: "0xabc",
      nativeDstAddress: undefined,
      urgency: "fast",
      destinationGas: [
        {
          provider: "gaszip",
          chainId: 8453,
          amountWei: "1000000000000000",
        },
      ],
    });
  });

  it("serializes Ethereum USDC to Solana USDC using the CCTP asset identifiers", () => {
    const ethereumUsdc = getTokensForChain(1).find((token) => token.ticker === "USDC") ?? null;
    const solanaUsdc = getTokensForChain(99).find((token) => token.ticker === "USDC") ?? null;

    expect(
      buildCrossQuoteRequest({
        fromToken: ethereumUsdc,
        toToken: solanaUsdc,
        fromAmount: "1",
        fromChainId: 1,
        toChainId: 99,
        userAddress: "0xabc",
        nativeDstAddress: "BaqEWofzK9Y4XP2rWuwNwJjptZ2xeTUDCZ3jGX3Qrbkt",
      }),
    ).toEqual({
      tokenIn: "0xA0b86991c6218b36c1d19d4A2e9Eb0cE3606eB48",
      tokenOut: "SOL.USDC",
      amountIn: "1000000",
      srcChainId: 1,
      dstChainId: 99,
      userAddress: "0xabc",
      nativeDstAddress: "BaqEWofzK9Y4XP2rWuwNwJjptZ2xeTUDCZ3jGX3Qrbkt",
      urgency: "fast",
      destinationGas: undefined,
    });
  });

  it("preserves LayerZero provider-native chain, token, and wallet identifiers", () => {
    expect(
      buildCrossQuoteRequest({
        fromToken: {
          ...fromToken,
          address: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
          providerAssetId: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
        },
        toToken: {
          chainId: 99,
          ticker: "USDC",
          name: "USD Coin",
          providerAssetId: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
          decimal: 6,
        },
        fromAmount: "1",
        fromChainId: 1,
        toChainId: 1,
        userAddress: "0xabc",
        nativeDstAddress: "Dz93pUVjXuaMnSsPSn7V99V4cUzhKoQdx9ECwZJZiafG",
        layerZeroValueTransferApi: {
          srcChainKey: "ethereum",
          dstChainKey: "solana",
          srcChainType: "EVM",
          dstChainType: "SOLANA",
          srcWalletAddress: "0xabc",
          dstWalletAddress: "Dz93pUVjXuaMnSsPSn7V99V4cUzhKoQdx9ECwZJZiafG",
        },
      }),
    ).toMatchObject({
      tokenIn: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
      tokenOut: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
      srcChainId: 1,
      dstChainId: 1,
      layerZeroValueTransferApi: {
        srcChainKey: "ethereum",
        dstChainKey: "solana",
        srcChainType: "EVM",
        dstChainType: "SOLANA",
        srcWalletAddress: "0xabc",
        dstWalletAddress: "Dz93pUVjXuaMnSsPSn7V99V4cUzhKoQdx9ECwZJZiafG",
      },
    });
  });

  it("forwards non-EVM source quote metadata without dropping destination or refund fields", () => {
    const nativeSource = {
      runtime: "solana" as const,
      network: "mainnet-beta" as const,
      ownerAddress: "Dz93pUVjXuaMnSsPSn7V99V4cUzhKoQdx9ECwZJZiafG",
      refundAddress: "Dz93pUVjXuaMnSsPSn7V99V4cUzhKoQdx9ECwZJZiafG",
      signingAccount: {
        address: "Dz93pUVjXuaMnSsPSn7V99V4cUzhKoQdx9ECwZJZiafG",
        feePayer: "Dz93pUVjXuaMnSsPSn7V99V4cUzhKoQdx9ECwZJZiafG",
      },
    };

    expect(
      buildCrossQuoteRequest({
        fromToken: {
          chainId: 99,
          ticker: "USDC",
          name: "USD Coin",
          providerAssetId: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
          decimal: 6,
        },
        toToken,
        fromAmount: "1",
        fromChainId: 99,
        toChainId: 8453,
        userAddress: "Dz93pUVjXuaMnSsPSn7V99V4cUzhKoQdx9ECwZJZiafG",
        destinationAddress: "0x1111111111111111111111111111111111111111",
        nativeDstAddress: "0x1111111111111111111111111111111111111111",
        refundAddress: "Dz93pUVjXuaMnSsPSn7V99V4cUzhKoQdx9ECwZJZiafG",
        nativeSource,
      } as any),
    ).toMatchObject({
      tokenIn: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
      tokenOut: "0x833589fcd6edb6e08f4c7c32d4f71b54bdA02913",
      amountIn: "1000000",
      srcChainId: 99,
      dstChainId: 8453,
      userAddress: "Dz93pUVjXuaMnSsPSn7V99V4cUzhKoQdx9ECwZJZiafG",
      destinationAddress: "0x1111111111111111111111111111111111111111",
      nativeDstAddress: "0x1111111111111111111111111111111111111111",
      refundAddress: "Dz93pUVjXuaMnSsPSn7V99V4cUzhKoQdx9ECwZJZiafG",
      nativeSource,
    });
  });

  it("maps provider chains to collision-safe UI ids while preserving quote ids", () => {
    const buildCatalog = (crossV2Adapters as any).buildLayerZeroChainCatalog;
    expect(typeof buildCatalog).toBe("function");

    const catalog = buildCatalog([
      { name: "Ethereum", shortName: "ETH", chainKey: "ethereum", chainType: "EVM", chainId: 1 },
      { name: "Solana", shortName: "SOL", chainKey: "solana", chainType: "SOLANA", chainId: 1 },
      { name: "Aptos", shortName: "APT", chainKey: "aptos", chainType: "APTOS", chainId: 1 },
    ]);

    expect(catalog.map((chain: any) => chain.id)).toEqual([1, 99, 230]);
    expect(catalog.map((chain: any) => chain.quoteChainId)).toEqual([1, 1, 1]);
    expect(catalog[1].providerChainKey).toBe("solana");
  });

  it("enriches local chains with provider refs and keeps newly discovered chains", () => {
    const mergeChains = (crossV2Adapters as any).mergeLayerZeroChainOptions;
    expect(typeof mergeChains).toBe("function");

    const merged = mergeChains(
      [
        { id: 1, name: "Ethereum", ticker: "ETH", color: "#627EEA", kind: "EVM" },
        { id: 99, name: "Solana", ticker: "SOL", color: "#9945FF", kind: "SOL" },
        { id: 0, name: "Bitcoin", ticker: "BTC", color: "#F7931A", kind: "BTC" },
      ],
      (crossV2Adapters as any).buildLayerZeroChainCatalog([
        { name: "Ethereum", shortName: "ETH", chainKey: "ethereum", chainType: "EVM", chainId: 1 },
        { name: "Solana", shortName: "SOL", chainKey: "solana", chainType: "SOLANA", chainId: 1 },
        { name: "Aptos", shortName: "APT", chainKey: "aptos", chainType: "APTOS", chainId: 1 },
      ]),
    );

    expect(merged.map((chain: any) => chain.id)).toEqual([1, 99, 0, 230]);
    expect(merged.find((chain: any) => chain.id === 1)).toMatchObject({
      providerChainKey: "ethereum",
      quoteChainId: 1,
    });
    expect(merged.find((chain: any) => chain.id === 99)).toMatchObject({
      providerChainKey: "solana",
      quoteChainId: 1,
    });
  });

  it("merges provider-discovered tokens by exact identifier without collapsing same-symbol assets", () => {
    const mergeTokens = (crossV2Adapters as any).mergeLayerZeroTokens;
    expect(typeof mergeTokens).toBe("function");

    const merged = mergeTokens(
      [{ chainId: 8453, ticker: "USDC", name: "USD Coin", address: "0x1", decimals: 6 }],
      [
        { chainKey: "base", symbol: "USDC", name: "USD Coin", address: "0x1", decimals: 6 },
        { chainKey: "base", symbol: "USDC", name: "USD Coin v2", address: "0x2", decimals: 6 },
        { chainKey: "arbitrum", symbol: "USDC", name: "USD Coin", address: "0x3", decimals: 6 },
      ],
      { uiChainId: 8453, chainKey: "base", chainType: "EVM" },
    );

    expect(merged.map((token: any) => token.providerAssetId)).toEqual(["0x1", "0x2"]);
  });

  it("preserves configured ticker aliases when provider discovery matches an existing token address", () => {
    const mergeTokens = (crossV2Adapters as any).mergeLayerZeroTokens;
    expect(typeof mergeTokens).toBe("function");

    const merged = mergeTokens(
      [{
        chainId: 10,
        ticker: "USDC.e",
        name: "USD Coin",
        address: "0x7f5c764cbc14f9669b88837ca1490cca17c31607",
        decimals: 6,
      }],
      [{
        chainKey: "optimism",
        symbol: "USDC",
        name: "USD Coin",
        address: "0x7f5c764cbc14f9669b88837ca1490cca17c31607",
        decimals: 6,
      }],
      { uiChainId: 10, chainKey: "optimism", chainType: "EVM" },
    );

    expect(merged[0]).toMatchObject({
      ticker: "USDC.e",
      providerAssetId: "0x7f5c764cbc14f9669b88837ca1490cca17c31607",
    });
  });

  it("requires and forwards native destination addresses for non-EVM destinations", () => {
    expect(
      buildCrossQuoteRequest({
        fromToken,
        toToken: { ...toToken, ticker: "BTC" },
        fromAmount: "0.5",
        fromChainId: 42161,
        toChainId: 0,
        userAddress: "0xabc",
      }),
    ).toBeNull();

    expect(
      buildCrossQuoteRequest({
        fromToken,
        toToken: { ...toToken, ticker: "BTC" },
        fromAmount: "0.5",
        fromChainId: 42161,
        toChainId: 0,
        userAddress: "0xabc",
        nativeDstAddress: "bc1qexample",
      })?.nativeDstAddress,
    ).toBe("bc1qexample");
  });

  it("formats backend offers for the V2 rail list", () => {
    const offer = {
      offerId: "offer-1",
      offerSetId: "set-1",
      rail: "CCTP",
      executionMode: "router_intent",
      isBest: true,
      amounts: {
        output: { amount: "1196038" },
        minimumOutput: { amount: "1194841" },
      },
      economics: {
        providerFeeUSD: "0.12",
        protocolFeeUSD: "0.03",
        settlementTimeSeconds: 75,
      },
    };

    expect(formatCrossOffer(offer, 6)).toMatchObject({
      offerId: "offer-1",
      railName: "CCTP",
      outputAmount: "1.196038",
      minimumReceived: "1.194841",
      bridgeFeeUSD: 0.12,
      protocolFeeUSD: 0.03,
      estimatedTimeSeconds: 75,
      isBest: true,
    });
  });

  it("separates rail identity, carrier execution, and composed wallet steps", () => {
    expect(formatCrossOffer({
      offerId: "offer-cctp-fast",
      rail: "CCTP",
      offerType: "cctp_fast",
      executionMode: "sequential_wallet",
      composition: { carrierExecutionMode: "router_intent" },
      planPreview: { stepKinds: ["source_swap", "rail_transfer"] },
      estimatedOut: "1853187019",
      minAmountOut: "1851333831",
      economics: { providerFeeUSD: "2.78", protocolFeeUSD: "0", settlementTimeSeconds: 45 },
    }, 6)).toMatchObject({
      railName: "CCTP Fast",
      executionLabel: "Router Intent",
      stepSummary: "2 steps · Source swap + Bridge",
    });

    expect(formatCrossOffer({
      offerId: "offer-lz-api",
      rail: "LAYERZERO",
      offerType: "lz_api_direct",
      executionMode: "sequential_wallet",
      composition: { carrierExecutionMode: "provider_direct" },
      planPreview: { stepKinds: ["source_swap", "rail_transfer"] },
      estimatedOut: "1",
      minAmountOut: "1",
      economics: { providerFeeUSD: "0", protocolFeeUSD: "0", settlementTimeSeconds: 45 },
    }, 6)).toMatchObject({
      railName: "LayerZero Transfer API",
      executionLabel: "Provider Direct",
    });
  });

  it("formats THORChain provider quote output when top-level output is zero", () => {
    const offer = {
      offerId: "offer-thor-btc-eth",
      rail: "THORCHAIN",
      executionMode: "provider_direct",
      estimatedOut: "0",
      minAmountOut: "0",
      destinationSettlementAsset: {
        canonicalAssetId: "ETH.ETH",
      },
      execution: {
        quote: {
          expected_amount_out: "281234567",
          slippage_bps: 100,
        },
      },
      economics: {
        providerFeeUSD: "0",
        protocolFeeUSD: "0",
        settlementTimeSeconds: 720,
      },
    };

    expect(formatCrossOffer(offer, 18)).toMatchObject({
      outputAmount: "2.812346",
      minimumReceived: "2.784222",
    });
  });

  it("formats THORChain BTC→ETH output in the destination token's decimals", () => {
    // Live backend shape: estimatedOut is already wei (3.0998 ETH), even though
    // THOR asset metadata ("ETH.ETH", thor_native) is present on the offer.
    const offer = {
      offerId: "offer-thor-btc-eth",
      rail: "THORCHAIN",
      offerType: "thor_api_direct",
      executionMode: "provider_direct",
      srcChainId: 0,
      dstChainId: 1,
      estimatedOut: "3099800220000000000",
      minAmountOut: "3068802217800000000",
      amounts: {
        output: { token: "0x0000000000000000000000000000000000000000", amount: "3099800220000000000", decimals: 18, symbol: "ETH.ETH" },
        minimumOutput: { token: "0x0000000000000000000000000000000000000000", amount: "3068802217800000000", decimals: 18, symbol: "ETH.ETH" },
      },
      routeAsset: { canonicalAssetId: "ETH.ETH", assetStandard: "thor_native", decimals: 18 },
      execution: { thorQuote: { expected_amount_out: "309980022", fees: { asset: "ETH.ETH" } } },
      economics: { providerFeeUSD: "0", protocolFeeUSD: "0", settlementTimeSeconds: 684 },
    };

    expect(formatCrossOffer(offer, 18)).toMatchObject({
      outputAmount: "3.0998",
      minimumReceived: "3.068802",
    });
  });

  it("formats THORChain ETH→BTC output in satoshis", () => {
    const offer = {
      offerId: "offer-thor-eth-btc",
      rail: "THORCHAIN",
      offerType: "thor_api_direct",
      executionMode: "provider_direct",
      srcChainId: 1,
      dstChainId: 0,
      estimatedOut: "3201450",
      minAmountOut: "3169435",
      routeAsset: { canonicalAssetId: "BTC.BTC", assetStandard: "thor_native", decimals: 8 },
      execution: { thorQuote: { expected_amount_out: "3201450", fees: { asset: "BTC.BTC" } } },
      economics: { providerFeeUSD: "0", protocolFeeUSD: "0", settlementTimeSeconds: 900 },
    };

    expect(formatCrossOffer(offer, 8)).toMatchObject({
      outputAmount: "0.032015",
      minimumReceived: "0.031694",
    });
  });

  it("formats THORChain ETH→USDC output with 6 decimals", () => {
    const offer = {
      offerId: "offer-thor-eth-usdc",
      rail: "THORCHAIN",
      executionMode: "provider_direct",
      estimatedOut: "3045120000",
      minAmountOut: "3014668800",
      routeAsset: { canonicalAssetId: "ETH.USDC-0XA0B86991C6218B36C1D19D4A2E9EB0CE3606EB48", assetStandard: "thor_native" },
      economics: { providerFeeUSD: "0", protocolFeeUSD: "0", settlementTimeSeconds: 900 },
    };

    expect(formatCrossOffer(offer, 6).outputAmount).toBe("3045.12");
  });

  it("labels zero provider fees on provider-direct rails as included in the quote", () => {
    const base = {
      offerId: "offer-fee",
      rail: "DEBRIDGE",
      estimatedOut: "1000000",
      minAmountOut: "990000",
      economics: { providerFeeUSD: "0", protocolFeeUSD: "0.15", settlementTimeSeconds: 30 },
    };

    expect(formatCrossOffer({ ...base, executionMode: "provider_direct" }, 6).feeIncludedInQuote).toBe(true);
    expect(formatCrossOffer({ ...base, executionMode: "router_intent" }, 6).feeIncludedInQuote).toBe(false);
    expect(formatCrossOffer({
      ...base,
      executionMode: "provider_direct",
      economics: { ...base.economics, providerFeeUSD: "1.20" },
    }, 6).feeIncludedInQuote).toBe(false);
  });

  it("exposes Hyperlane interchain gas as a native network fee", () => {
    const offer = {
      offerId: "offer-hyperlane",
      rail: "HYPERLANE",
      executionMode: "provider_direct",
      estimatedOut: "1000000",
      minAmountOut: "1000000",
      execution: { interchainGasFee: "420000000000000" },
      economics: { providerFeeUSD: "0", protocolFeeUSD: "0", settlementTimeSeconds: 60 },
    };

    expect(formatCrossOffer(offer, 6).networkFeeNative).toBe("0.00042");
    expect(formatCrossOffer({ ...offer, execution: { interchainGasFee: "0" } }, 6).networkFeeNative).toBeUndefined();
  });

  it("sizes the Gas Drop amount to about $2 of destination native gas", () => {
    expect(sizeDestinationGasAmount(2683)).toBe("0.00075"); // ETH
    expect(sizeDestinationGasAmount(600)).toBe("0.0033"); // BNB
    expect(sizeDestinationGasAmount(0.00005)).toBe("40000"); // PLS, no exponent
    // Most small price moves keep the same request, so they do not trigger a
    // requote (a move across a rounding boundary still does).
    expect(sizeDestinationGasAmount(2670)).toBe(sizeDestinationGasAmount(2683));
    // Unknown price falls back to the fixed amount.
    expect(sizeDestinationGasAmount(null)).toBe("0.001");
    expect(sizeDestinationGasAmount(0)).toBe("0.001");
  });

  it("flags offers priced well above their input as implausible", () => {
    // 0.1 BTC (~$6,000) → the 10^10× THOR display bug.
    expect(isImplausibleOfferOutput("31003285400", 2683, 6000)).toBe(true);
    // 100 USDT → 248 USDC looping-swap quote.
    expect(isImplausibleOfferOutput("248", 1, 100)).toBe(true);
    // Normal quotes, including a small positive edge, pass.
    expect(isImplausibleOfferOutput("3.0998", 2683, 8400)).toBe(false);
    expect(isImplausibleOfferOutput("101", 1, 100)).toBe(false);
    // Unpriced sides never hide offers.
    expect(isImplausibleOfferOutput("248", null, 100)).toBe(false);
    expect(isImplausibleOfferOutput("248", 1, undefined)).toBe(false);
  });

  it("formats THORChain output when provider fields are nested under the execution action", () => {
    const offer = {
      offerId: "offer-thor-btc-eth-action",
      rail: "THORCHAIN",
      executionMode: "provider_direct",
      estimatedOut: "0",
      minAmountOut: "0",
      execution: {
        action: {
          kind: "thorchain_swap",
          amountIn: "15000000",
          expectedAmountOut: "298765432",
          minAmountOut: "295777777",
        },
      },
      economics: {
        providerFeeUSD: "0",
        protocolFeeUSD: "0",
        settlementTimeSeconds: 720,
      },
    };

    expect(formatCrossOffer(offer, 18)).toMatchObject({
      outputAmount: "2.987654",
      minimumReceived: "2.957778",
    });
  });

  it("builds route hops from backend offer metadata", () => {
    expect(
      buildCrossRouteHops(
        {
          rail: "LAYERZERO",
          routeAsset: { canonicalAssetId: "USDC" },
          legs: {
            sourceSwap: { tokenOutSymbol: "USDC" },
            destinationSwap: { tokenOutSymbol: "USDT" },
          },
        },
        arbitrum,
        base,
        "ETH",
        "USDT",
      ),
    ).toEqual([
      { ticker: "ETH", chainName: "Arbitrum", chainColor: "#28A0F0", via: "Source swap", venueType: "DEX" },
      { ticker: "USDC", chainName: "Arbitrum", chainColor: "#28A0F0", via: "LAYERZERO", venueType: "RAIL" },
      { ticker: "USDC", chainName: "Base", chainColor: "#0052FF", via: "Destination swap", venueType: "DEX" },
      { ticker: "USDT", chainName: "Base", chainColor: "#0052FF" },
    ]);
  });

  it("shows short tickers for THORChain asset ids and skips raw addresses in route hops", () => {
    const hops = buildCrossRouteHops(
      {
        rail: "THORCHAIN",
        routeAsset: { canonicalAssetId: "ETH.USDC-0XA0B86991C6218B36C1D19D4A2E9EB0CE3606EB48" },
        destinationSettlementAsset: { canonicalAssetId: "ETH.USDC-0XA0B86991C6218B36C1D19D4A2E9EB0CE3606EB48" },
      },
      { id: 0, name: "Bitcoin", color: "#F7931A" },
      { id: 1, name: "Ethereum", color: "#627EEA" },
      "BTC",
      "USDC",
    );
    expect(hops.map((hop) => hop.ticker)).toEqual(["BTC", "USDC"]);

    const swapHops = buildCrossRouteHops(
      {
        rail: "CCTP",
        legs: { sourceSwap: { tokenOut: "0xaf88d065e77c8cC2239327C5EDb3A432268e5831" } },
        routeAsset: { canonicalAssetId: "BTC.BTC" },
      },
      arbitrum,
      base,
      "WETH",
      "USDC",
    );
    // The raw address is skipped in favour of the next symbol source.
    expect(swapHops[1].ticker).toBe("BTC");
    // Ordinary symbols, including dotted ones like USDC.e, are left alone.
    expect(buildCrossRouteHops({ rail: "CCTP", routeAsset: { symbol: "USDC.e" } }, arbitrum, base, "USDC.e", "USDC")[1].ticker).toBe("USDC.e");
  });

  it("builds a source-swap hop from composed route metadata", () => {
    expect(buildCrossRouteHops(
      {
        rail: "CCTP",
        offerType: "cctp_fast",
        planPreview: { stepKinds: ["source_swap", "rail_transfer"] },
        composition: {
          sourceSwap: { tokenOut: "0xaf88d065e77c8cC2239327C5EDb3A432268e5831" },
          carrier: { canonicalAssetId: "USDC" },
        },
        legs: {
          bridge: { tokenInSymbol: "USDC", tokenOutSymbol: "USDC" },
        },
      },
      arbitrum,
      base,
      "WETH",
      "USDC",
    )).toEqual([
      { ticker: "WETH", chainName: "Arbitrum", chainColor: "#28A0F0", via: "Source swap", venueType: "DEX" },
      { ticker: "USDC", chainName: "Arbitrum", chainColor: "#28A0F0", via: "CCTP Fast", venueType: "RAIL" },
      { ticker: "USDC", chainName: "Base", chainColor: "#0052FF" },
    ]);
  });

  it("derives timeline states from tracking and session data", () => {
    expect(
      buildCrossTimeline(
        { status: "DELIVERED", srcTxHash: "0xsource", dstTxHash: "0xdest" },
        { status: "SUBMITTED" },
        "Arbitrum",
        "Base",
        "USDC",
      ),
    ).toEqual([
      { label: "Source confirmation", description: "0xsource", state: "complete" },
      { label: "Rail settlement", description: "DELIVERED", state: "complete" },
      { label: "Destination delivery", description: "0xdest", state: "complete" },
    ]);
  });
});
