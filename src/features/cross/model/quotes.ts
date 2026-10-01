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
    providerDiagnostics: offerSet.providerDiagnostics,
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
          composedEligible && isGasDropComposableOffer({ ...offer, actionKind }),
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

type GasDropComposableCandidate = {
  rail?: string | null;
  srcChainId?: number;
  offerType?: string;
  actionKind?: string;
  executionMode?: string;
  selectionPolicy?: string;
};

/**
 * Why an offer cannot be the primary transfer of a Gas.zip destination-gas
 * composition, or null when it can. The composed flow runs two independent
 * one-step transfers, so multi-step and explicit-only routes are excluded
 * (the backend rejects a sequential primary with
 * SEQUENTIAL_PRIMARY_NOT_COMPOSABLE).
 */
export function getGasDropBlockReason(
  offer: GasDropComposableCandidate | null | undefined,
): string | null {
  if (!offer) return null;
  if (isGardenNativeOffer(offer)) {
    return "Garden native routes cannot be composed with Gas.zip.";
  }
  if (offer.executionMode === "sequential_wallet") {
    return "Multi-step routes cannot be combined with Gas Drop.";
  }
  if (offer.selectionPolicy === "explicit_only") {
    return "This route cannot be combined with Gas Drop.";
  }
  return null;
}

export function isGasDropComposableOffer(
  offer: GasDropComposableCandidate | null | undefined,
): boolean {
  return Boolean(offer) && getGasDropBlockReason(offer) === null;
}

/**
 * The offer to select when the user has not picked one. With Gas Drop on, the
 * primary must be composable, so prefer the backend's composition primary and
 * then the first composable visible offer over bestOfferId.
 */
export function getDefaultPrimaryOfferId(
  quote: NormalizedOfferSet | null | undefined,
  displayOffers: readonly RailOffer[],
  gasDropOn = false,
): string | null {
  const visible = (offerId: string | undefined) =>
    offerId ? displayOffers.find((offer) => offer.offerId === offerId) : undefined;

  if (gasDropOn) {
    const composablePrimary =
      visible(quote?.gasZipComposition?.primaryTransferOfferId) ??
      [visible(quote?.bestOfferId), ...displayOffers].find((offer) =>
        isGasDropComposableOffer(offer),
      );
    if (composablePrimary && isGasDropComposableOffer(composablePrimary)) {
      return composablePrimary.offerId;
    }
  }

  // bestOfferId can be hidden by the UI (e.g. LayerZero native); fall back to
  // the next automatically selectable offer, never an explicit-only one.
  return (
    visible(quote?.bestOfferId)?.offerId ??
    displayOffers.find((offer) => offer.selectionPolicy !== "explicit_only")?.offerId ??
    displayOffers[0]?.offerId ??
    null
  );
}

/**
 * The offer to tag "best available" when the backend's bestOfferId is hidden
 * in this UI, so the auto-selected fallback does not look arbitrary. Null when
 * the best offer is visible (it carries the normal best tag) or there is none.
 */
export function getBestAvailableOfferId(
  quote: NormalizedOfferSet | null | undefined,
  displayOffers: readonly RailOffer[],
): string | null {
  const bestOfferId = quote?.bestOfferId;
  if (!bestOfferId || displayOffers.some((offer) => offer.offerId === bestOfferId)) {
    return null;
  }
  return getDefaultPrimaryOfferId(quote, displayOffers, false);
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
