import { describe, expect, it } from "vitest";
import {
  findMatchingRefreshedOffer,
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
});
