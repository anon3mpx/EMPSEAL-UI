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
    offers: (offerSet.offers ?? []).map((offer) => ({
      offerSetId: offerSet.offerSetId,
      offerId: offer.offerId,
      quoteExpiresAt: offer.expiresAt ?? offerSet.expiresAt,
      isBest: offer.offerId === offerSet.bestOfferId,
      isComposedEligible: composedEligible,
      actionKind:
        typeof offer.execution?.action === "object" &&
        offer.execution.action !== null &&
        "kind" in offer.execution.action
          ? String(offer.execution.action.kind)
          : undefined,
      ...offer,
    })),
  };
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
