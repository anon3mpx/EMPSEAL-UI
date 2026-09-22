import type {
  GasZipOfferComposition,
  OfferSet,
  QuoteResponse,
  RailOffer,
} from "../api/contracts";

export interface NormalizedRailOffer extends RailOffer {
  offerSetId: string;
  quoteExpiresAt: number;
  isBest: boolean;
  isComposedEligible: boolean;
  actionKind?: string;
}

export interface NormalizedOfferSet
  extends Omit<OfferSet, "offers"> {
  gasZipComposition: (GasZipOfferComposition & {
    destinationGasOffers: RailOffer[];
  }) | null;
  offers: NormalizedRailOffer[];
}

export function normalizeOfferSet(response: QuoteResponse): NormalizedOfferSet {
  const offerSet = response.offerSet;
  const rawGasZipComposition = response.gasZipComposition ?? null;
  const destinationGasOffers = Array.isArray(
    rawGasZipComposition?.destinationGasOffers,
  )
    ? rawGasZipComposition.destinationGasOffers
    : rawGasZipComposition?.gasZipDestinationGasOffer
      ? [rawGasZipComposition.gasZipDestinationGasOffer]
      : [];
  const gasZipComposition = rawGasZipComposition
    ? {
        ...rawGasZipComposition,
        destinationGasOffers,
      }
    : null;
  const composedEligible = Boolean(gasZipComposition);

  return {
    offerSetId: offerSet.offerSetId,
    expiresAt: offerSet.expiresAt,
    bestOfferId: offerSet.bestOfferId,
    gasZipComposition,
    offers: (offerSet.offers ?? []).map((offer) => {
      const actionKind =
        typeof offer.execution?.action === "object" &&
        offer.execution.action !== null &&
        "kind" in offer.execution.action
          ? String(offer.execution.action.kind)
          : undefined;
      return {
        ...offer,
        offerSetId: offerSet.offerSetId,
        offerId: offer.offerId,
        quoteExpiresAt: offer.expiresAt ?? offerSet.expiresAt,
        isBest: offer.offerId === offerSet.bestOfferId,
        actionKind,
        isComposedEligible:
          composedEligible &&
          !isGardenNativeOffer({
            rail: offer.rail,
            srcChainId: offer.srcChainId,
            offerType: offer.offerType,
            actionKind,
          }),
      };
    }),
  };
}

export function isGardenNativeOffer(offer: {
  rail?: string | null;
  srcChainId?: number;
  offerType?: string;
  actionKind?: string;
}): boolean {
  const rail = String(offer.rail ?? "").toUpperCase();
  const actionKind = String(offer.actionKind ?? "").toLowerCase();
  const offerType = String(offer.offerType ?? "").toLowerCase();
  const nativeSource = offer.srcChainId === 0 || offer.srcChainId === 99;
  if (!nativeSource) return false;
  return (
    rail === "GARDEN" ||
    actionKind === "garden_htlc_order" ||
    offerType === "garden_htlc"
  );
}

export function getPrimaryOffers(quote: NormalizedOfferSet | null | undefined) {
  const offers = quote?.offers ?? [];
  const gasOfferIds = new Set(
    quote?.gasZipComposition?.destinationGasOffers?.map((offer) => offer.offerId) ??
      [],
  );

  const hiddenRails = new Set(["CHAINFLIP", "MAYA", "TELESWAP", "AXELAR", "VIA_LABS"]);
  const visibleOffers = offers.filter((offer) =>
    !hiddenRails.has(String(offer.rail).toUpperCase()) &&
    offer.offerType !== "lz_stargate_native"
  );
  const primaryOffers = visibleOffers.filter((offer) => !gasOfferIds.has(offer.offerId));
  return primaryOffers.length ? primaryOffers : visibleOffers;
}

export function findMatchingRefreshedOffer(
  quote: NormalizedOfferSet | null | undefined,
  previousOffer: RailOffer | null | undefined,
) {
  if (!quote || !previousOffer) return null;

  const primaryOffers = getPrimaryOffers(quote);
  if (!primaryOffers.length) return null;

  const matches = (predicate: (offer: NormalizedRailOffer) => boolean) =>
    primaryOffers.find((offer) => predicate(offer)) ?? null;

  return (
    matches((offer) =>
      offer.executionMode === previousOffer.executionMode &&
      offer.rail === previousOffer.rail &&
      offer.offerType === previousOffer.offerType &&
      offer.tokenIn?.toLowerCase() === previousOffer.tokenIn?.toLowerCase() &&
      offer.tokenOut?.toLowerCase() === previousOffer.tokenOut?.toLowerCase() &&
      offer.routeAsset?.providerAssetId === previousOffer.routeAsset?.providerAssetId,
    ) ??
    matches((offer) =>
      offer.executionMode === previousOffer.executionMode &&
      offer.rail === previousOffer.rail &&
      offer.offerType === previousOffer.offerType &&
      offer.routeAsset?.canonicalAssetId === previousOffer.routeAsset?.canonicalAssetId,
    ) ??
    null
  );
}
