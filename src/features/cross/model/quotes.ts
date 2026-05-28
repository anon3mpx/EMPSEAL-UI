export function normalizeOfferSet(response: any) {
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
    offers: (offerSet.offers ?? []).map((offer: any) => ({
      offerSetId: offerSet.offerSetId,
      offerId: offer.offerId,
      quoteExpiresAt: offer.expiresAt ?? offerSet.expiresAt,
      isBest: offer.offerId === offerSet.bestOfferId,
      isComposedEligible: composedEligible,
      actionKind: offer.integration?.action?.kind,
      ...offer,
    })),
  };
}

export function getPrimaryOffers(quote: any) {
  const offers = quote?.offers ?? [];
  const gasOfferIds = new Set(
    quote?.gasZipComposition?.destinationGasOffers?.map((offer: any) => offer.offerId) ??
      [],
  );

  const primaryOffers = offers.filter((offer: any) => !gasOfferIds.has(offer.offerId));
  return primaryOffers.length ? primaryOffers : offers;
}

export function findMatchingRefreshedOffer(quote: any, previousOffer: any) {
  if (!quote || !previousOffer) return null;

  const primaryOffers = getPrimaryOffers(quote);
  if (!primaryOffers.length) return null;

  const matches = (predicate: (offer: any) => boolean) =>
    primaryOffers.find((offer: any) => predicate(offer)) ?? null;

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
