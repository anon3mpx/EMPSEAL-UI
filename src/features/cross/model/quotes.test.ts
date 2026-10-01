import { describe, expect, it } from "vitest";
import {
  findMatchingRefreshedOffer,
  getBestAvailableOfferId,
  getDefaultPrimaryOfferId,
  getGasDropBlockReason,
  getPrimaryOffers,
  normalizeOfferSet,
} from "./quotes";

describe("normalizeOfferSet", () => {
  it("normalizes best-offer metadata even when top-level quote is absent", () => {
    const normalized = normalizeOfferSet({
      offerSet: {
        offerSetId: "set-1",
        expiresAt: 1740000000000,
        bestOfferId: "offer-2",
        offers: [
          {
            offerId: "offer-1",
            rail: "layerzero",
            railType: "provider_direct",
            executionMode: "provider_direct",
            deliveryShape: "direct",
            srcChainId: 56,
            dstChainId: 8453,
            tokenIn: "0x1",
            tokenOut: "0x2",
            amountIn: "1000000",
            estimatedOut: "990000",
            minAmountOut: "980000",
            economics: { settlementTimeSeconds: 120 },
          },
          {
            offerId: "offer-2",
            rail: "cctp",
            railType: "router_intent",
            executionMode: "router_intent",
            deliveryShape: "src_and_dst_swap_required",
            srcChainId: 42161,
            dstChainId: 8453,
            tokenIn: "0xa",
            tokenOut: "0xb",
            amountIn: "1000000",
            estimatedOut: "995000",
            minAmountOut: "990000",
            economics: { settlementTimeSeconds: 90 },
          },
        ],
      },
    });

    expect(normalized.bestOfferId).toBe("offer-2");
    expect(normalized.offers[1].isBest).toBe(true);
    expect(normalized.offers[0].actionKind).toBeUndefined();
  });

  it("marks offers composed-eligible when gasZipComposition exists", () => {
    const normalized = normalizeOfferSet({
      offerSet: {
        offerSetId: "set-2",
        expiresAt: 1740000000000,
        bestOfferId: "offer-1",
        offers: [
          {
            offerId: "offer-1",
            rail: "cctp",
            railType: "router_intent",
            executionMode: "router_intent",
            deliveryShape: "direct",
            srcChainId: 10,
            dstChainId: 8453,
            tokenIn: "0x1",
            tokenOut: "0x2",
            amountIn: "1000000",
            estimatedOut: "999000",
            minAmountOut: "998000",
            economics: { settlementTimeSeconds: 75 },
          },
        ],
      },
      gasZipComposition: {
        gasZipDestinationGasOffer: { offerId: "gas-1", rail: "GASZIP" },
      },
    });

    expect(normalized.offers[0].isComposedEligible).toBe(true);
    expect(normalized.gasZipComposition.destinationGasOffers).toEqual([
      { offerId: "gas-1", rail: "GASZIP" },
    ]);
  });

  it("matches a refreshed offer by rail family instead of stale offer id", () => {
    const normalized = normalizeOfferSet({
      offerSet: {
        offerSetId: "set-3",
        expiresAt: 1740000000000,
        bestOfferId: "fresh-1",
        offers: [
          {
            offerId: "fresh-1",
            rail: "LAYERZERO",
            offerType: "lz_stargate_pool",
            railType: "messaging",
            executionMode: "router_intent",
            deliveryShape: "direct",
            srcChainId: 8453,
            dstChainId: 10,
            tokenIn: "0xbase",
            tokenOut: "0xop",
            amountIn: "1000000",
            estimatedOut: "995000",
            minAmountOut: "990000",
            routeAsset: {
              canonicalAssetId: "USDC",
              providerAssetId: "layerzero:usdc",
            },
            economics: { settlementTimeSeconds: 90 },
          },
          {
            offerId: "gas-1",
            rail: "GASZIP",
            offerType: "gaszip_api_direct",
            railType: "provider_direct",
            executionMode: "provider_direct",
            deliveryShape: "direct",
            srcChainId: 8453,
            dstChainId: 10,
            tokenIn: "0xbase",
            tokenOut: "0xbase",
            amountIn: "1000",
            estimatedOut: "1000",
            minAmountOut: "1000",
            economics: { settlementTimeSeconds: 30 },
          },
        ],
      },
      gasZipComposition: {
        gasZipDestinationGasOffer: { offerId: "gas-1", rail: "GASZIP" },
      },
    });

    const previousOffer = {
      offerId: "stale-offer-id",
      rail: "LAYERZERO",
      offerType: "lz_stargate_pool",
      executionMode: "router_intent",
      tokenIn: "0xbase",
      tokenOut: "0xop",
      routeAsset: {
        canonicalAssetId: "USDC",
        providerAssetId: "layerzero:usdc",
      },
    };

    expect(getPrimaryOffers(normalized)).toHaveLength(1);
    expect(findMatchingRefreshedOffer(normalized, previousOffer)?.offerId).toBe(
      "fresh-1",
    );
  });

  it("returns null when the refreshed quote no longer contains the same route family", () => {
    const normalized = normalizeOfferSet({
      offerSet: {
        offerSetId: "set-4",
        expiresAt: 1740000000000,
        bestOfferId: "fresh-2",
        offers: [
          {
            offerId: "fresh-2",
            rail: "CCTP",
            offerType: "cctp_standard",
            railType: "messaging",
            executionMode: "router_intent",
            deliveryShape: "direct",
            srcChainId: 8453,
            dstChainId: 10,
            tokenIn: "0xbase",
            tokenOut: "0xop",
            amountIn: "1000000",
            estimatedOut: "995000",
            minAmountOut: "990000",
            routeAsset: {
              canonicalAssetId: "USDC",
              providerAssetId: "cctp:usdc",
            },
            economics: { settlementTimeSeconds: 60 },
          },
        ],
      },
    });

    const previousOffer = {
      offerId: "stale-offer-id",
      rail: "LAYERZERO",
      offerType: "lz_stargate_pool",
      executionMode: "router_intent",
      tokenIn: "0xbase",
      tokenOut: "0xop",
      routeAsset: {
        canonicalAssetId: "USDC",
        providerAssetId: "layerzero:usdc",
      },
    };

    expect(findMatchingRefreshedOffer(normalized, previousOffer)).toBeNull();
  });

  it("keeps deferred rails out of the advertised primary offer list", () => {
    const normalized = normalizeOfferSet({
      offerSet: {
        offerSetId: "set-hidden",
        expiresAt: 1740000000000,
        offers: [
          { offerId: "cctp", rail: "CCTP", srcChainId: 1, dstChainId: 10, economics: {} },
          { offerId: "chainflip", rail: "CHAINFLIP", srcChainId: 1, dstChainId: 0, economics: {} },
          { offerId: "maya", rail: "MAYA", srcChainId: 1, dstChainId: 0, economics: {} },
          { offerId: "lz-native", rail: "LAYERZERO", offerType: "lz_stargate_native", srcChainId: 8453, dstChainId: 42161, economics: {} },
        ] as any,
      },
    });

    expect(getPrimaryOffers(normalized).map((offer) => offer.offerId)).toEqual(["cctp"]);
    expect(getPrimaryOffers({
      ...normalized,
      offers: normalized.offers.filter((offer) => offer.offerId !== "cctp"),
    })).toEqual([]);
  });

  it("marks Garden native offers ineligible for Gas.zip composition", () => {
    const normalized = normalizeOfferSet({
      offerSet: {
        offerSetId: "set-garden-native",
        expiresAt: 1740000000000,
        bestOfferId: "garden-btc",
        offers: [
          {
            offerId: "garden-btc",
            rail: "GARDEN",
            offerType: "garden_htlc",
            railType: "liquidity",
            executionMode: "provider_direct",
            srcChainId: 0,
            dstChainId: 8453,
            tokenIn: "BTC",
            tokenOut: "0x1",
            amountIn: "100000",
            estimatedOut: "99000",
            minAmountOut: "98000",
            economics: { settlementTimeSeconds: 120 },
          },
          {
            offerId: "garden-sol",
            rail: "GARDEN",
            railType: "liquidity",
            executionMode: "provider_direct",
            srcChainId: 99,
            dstChainId: 8453,
            tokenIn: "SOL",
            tokenOut: "0x1",
            amountIn: "100000",
            estimatedOut: "99000",
            minAmountOut: "98000",
            execution: { action: { kind: "garden_htlc_order" } },
            economics: { settlementTimeSeconds: 90 },
          },
          {
            offerId: "cctp",
            rail: "CCTP",
            railType: "messaging",
            executionMode: "router_intent",
            srcChainId: 8453,
            dstChainId: 42161,
            tokenIn: "0x1",
            tokenOut: "0x2",
            amountIn: "1000000",
            estimatedOut: "999000",
            minAmountOut: "998000",
            economics: { settlementTimeSeconds: 60 },
          },
        ] as any,
      },
      gasZipComposition: {
        gasZipDestinationGasOffer: { offerId: "gas-1", rail: "GASZIP" },
      },
    } as any);

    expect(normalized.offers.find((offer) => offer.offerId === "garden-btc")?.isComposedEligible).toBe(false);
    expect(normalized.offers.find((offer) => offer.offerId === "garden-sol")?.isComposedEligible).toBe(false);
    expect(normalized.offers.find((offer) => offer.offerId === "cctp")?.isComposedEligible).toBe(true);
  });
});

describe("Gas Drop composition with mixed offer sets", () => {
  const baseOffer = {
    railType: "messaging",
    srcChainId: 8453,
    dstChainId: 42161,
    tokenIn: "0x1",
    tokenOut: "0x2",
    amountIn: "1000000",
    economics: { settlementTimeSeconds: 60 },
  };
  // Ranked best-first like the backend: the multi-step route has the best
  // guaranteed output, then an explicit-only rail, one-step rails, and Gas.zip last.
  const mixedQuote = () =>
    normalizeOfferSet({
      offerSet: {
        offerSetId: "set-mixed",
        expiresAt: 1740000000000,
        bestOfferId: "sequential",
        offers: [
          { ...baseOffer, offerId: "sequential", rail: "ACROSS", executionMode: "sequential_wallet", estimatedOut: "999500", minAmountOut: "999000" },
          { ...baseOffer, offerId: "bridge-xyz", rail: "BRIDGE_XYZ", executionMode: "provider_direct", selectionPolicy: "explicit_only", estimatedOut: "999400", minAmountOut: "0" },
          { ...baseOffer, offerId: "cctp", rail: "CCTP", executionMode: "router_intent", estimatedOut: "999000", minAmountOut: "998000" },
          { ...baseOffer, offerId: "hyperlane", rail: "HYPERLANE", executionMode: "router_intent", estimatedOut: "998000", minAmountOut: "997000" },
          { ...baseOffer, offerId: "gas-1", rail: "GASZIP", offerType: "gaszip_api_direct", executionMode: "provider_direct", estimatedOut: "1000", minAmountOut: "1000" },
        ] as any,
      },
      gasZipComposition: {
        kind: "primary_transfer_with_gaszip_destination_gas",
        primaryTransferOfferId: "cctp",
        gasZipDestinationGasOfferId: "gas-1",
        gasZipDestinationGasOffer: { offerId: "gas-1", rail: "GASZIP" },
      },
    } as any);

  it("never marks multi-step or explicit-only offers composed-eligible", () => {
    const eligibility = Object.fromEntries(
      mixedQuote().offers.map((offer) => [offer.offerId, offer.isComposedEligible]),
    );

    expect(eligibility.sequential).toBe(false);
    expect(eligibility["bridge-xyz"]).toBe(false);
    expect(eligibility.cctp).toBe(true);
    expect(eligibility.hyperlane).toBe(true);
  });

  it("explains why an offer cannot be a Gas Drop primary", () => {
    const offers = mixedQuote().offers;
    const byId = (id: string) => offers.find((offer) => offer.offerId === id);

    expect(getGasDropBlockReason(byId("sequential"))).toMatch(/multi-step/i);
    expect(getGasDropBlockReason(byId("bridge-xyz"))).toMatch(/cannot be combined/i);
    expect(getGasDropBlockReason(byId("cctp"))).toBeNull();
  });

  it("keeps the sequential best offer and the Gas.zip offer apart in the primary list", () => {
    expect(getPrimaryOffers(mixedQuote()).map((offer) => offer.offerId)).toEqual([
      "sequential",
      "bridge-xyz",
      "cctp",
      "hyperlane",
    ]);
  });

  it("defaults to bestOfferId without Gas Drop and to the composition primary with it", () => {
    const quote = mixedQuote();
    const displayOffers = getPrimaryOffers(quote);

    expect(getDefaultPrimaryOfferId(quote, displayOffers, false)).toBe("sequential");
    expect(getDefaultPrimaryOfferId(quote, displayOffers, true)).toBe("cctp");
  });

  it("falls back to the first composable visible offer when the composition primary is hidden", () => {
    const quote = mixedQuote();
    const displayOffers = getPrimaryOffers(quote).filter((offer) => offer.offerId !== "cctp");

    expect(getDefaultPrimaryOfferId(quote, displayOffers, true)).toBe("hyperlane");
    // Before the Gas Drop requote arrives there is no composition yet.
    expect(
      getDefaultPrimaryOfferId({ ...quote, gasZipComposition: null }, displayOffers, true),
    ).toBe("hyperlane");
  });
});

describe("best-available fallback when bestOfferId is hidden", () => {
  const offer = (offerId: string, extra: Record<string, unknown> = {}) => ({
    offerId,
    rail: "CCTP",
    railType: "messaging",
    executionMode: "router_intent",
    srcChainId: 8453,
    dstChainId: 42161,
    tokenIn: "0x1",
    tokenOut: "0x2",
    amountIn: "1000000",
    estimatedOut: "999000",
    minAmountOut: "998000",
    economics: { settlementTimeSeconds: 60 },
    ...extra,
  });
  const quoteWithHiddenBest = () =>
    normalizeOfferSet({
      offerSet: {
        offerSetId: "set-lz-best",
        expiresAt: 1740000000000,
        bestOfferId: "lz-native",
        offers: [
          offer("lz-native", { rail: "LAYERZERO", offerType: "lz_stargate_native" }),
          offer("bridge-xyz", { rail: "BRIDGE_XYZ", selectionPolicy: "explicit_only" }),
          offer("cctp"),
          offer("hyperlane", { rail: "HYPERLANE" }),
        ] as any,
      },
    });

  it("auto-selects and tags the next automatic offer, skipping explicit-only ones", () => {
    const quote = quoteWithHiddenBest();
    const displayOffers = getPrimaryOffers(quote);

    expect(displayOffers.map((item) => item.offerId)).toEqual(["bridge-xyz", "cctp", "hyperlane"]);
    expect(getDefaultPrimaryOfferId(quote, displayOffers)).toBe("cctp");
    expect(getBestAvailableOfferId(quote, displayOffers)).toBe("cctp");
  });

  it("does not tag a fallback when the best offer is visible or absent", () => {
    const quote = quoteWithHiddenBest();
    const displayOffers = getPrimaryOffers(quote);

    expect(getBestAvailableOfferId({ ...quote, bestOfferId: "cctp" }, displayOffers)).toBeNull();
    expect(getBestAvailableOfferId({ ...quote, bestOfferId: undefined }, displayOffers)).toBeNull();
  });
});
