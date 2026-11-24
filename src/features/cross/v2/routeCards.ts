// Every route to the requested token in ONE strip (owner decision 2026-11-24: nothing is blocked, the user chooses):
// routes that passed the automatic value check first, then the held-back ones, each tagged and with what it is worth.
import type { RailCardData } from "../../../design-system/widgetKit";
import { offerValueOf } from "./offerValue";
import type { HumanAcceptance, JourneyQuote } from "./types";
import type { CheckedWithheld } from "./useV2Quote";
import { formatEta, formatUnitsShort, planIdOf, railCardNames, type CheckedOffer } from "./widgetView";

const CONTRACT_RAILS = new Set(["cctp", "ccip", "layerzero"]);
const HELD_TAG: Record<string, string> = { warning: "HIGH COST", blocked: "VERY HIGH COST", unpriced: "UNVERIFIED" };

/** A held-back route the user may take: it passes the local check, this app's key may commit it, and it names the policy version to accept. */
export function selectableHeld(o: CheckedWithheld): boolean {
  const a = o.offer.journey.assessment;
  return o.check.ok && o.offer.executableByApiKey !== false && a !== null && a.status !== "acceptable" && typeof a.policyVersion === "string";
}

export function routeCardsOf(
  offers: readonly CheckedOffer[],
  held: readonly CheckedWithheld[],
  selectedPlanId: string | null,
  ticker: (asset: string) => string,
): { cards: RailCardData[]; offerOf: (name: string) => CheckedOffer | undefined } {
  const all: CheckedOffer[] = [...offers, ...held];
  const names = railCardNames(all);
  const firstOk = offers.find((o) => o.check.ok);
  const heldSet = new Set<CheckedOffer>(held);
  const selectable = (o: CheckedOffer) => (heldSet.has(o) ? selectableHeld(o as CheckedWithheld) : o.check.ok);
  const cards = all.map((o, i): RailCardData => {
    const j = o.offer.journey;
    const value = heldSet.has(o) ? offerValueOf(o.offer, ticker) : undefined;
    const tag = !selectable(o)
      ? "UNAVAILABLE"
      : o === firstOk
        ? "BEST"
        : heldSet.has(o)
          ? HELD_TAG[j.assessment?.status ?? ""]
          : j.outputGuarantee === "estimate_only"
            ? "ESTIMATE"
            : undefined;
    return {
      name: names[i]!,
      mode: j.hops.every((h) => CONTRACT_RAILS.has(h.rail.toLowerCase())) ? "A" : "B",
      outAmount: formatUnitsShort(j.expectedOutput),
      eta: formatEta(j.etaSec),
      ...(tag ? { tag } : {}),
      isActive: planIdOf(o.offer) === selectedPlanId,
      ...(value ? { note: value.note, tone: value.tone } : {}),
    };
  });
  return {
    cards,
    offerOf: (name) => {
      const o = all[names.indexOf(name)];
      return o && selectable(o) ? o : undefined;
    },
  };
}

/** What the output field shows before the user picks: the best route that passed the value check, else the first held-back route they may take. */
export function defaultChoiceOf(offers: readonly CheckedOffer[], held: readonly CheckedWithheld[]): CheckedOffer | undefined {
  return offers.find((o) => o.check.ok) ?? held.find(selectableHeld);
}

/** The route in use: the user's pick while it is still offered, else the default. A held-back pick carries the acceptance of its own label (sent at commit).
 *  A held route is only a default while nothing is picked: a picked route that disappears (a refresh during review) never silently becomes a held one. */
export function chooseRoute(
  offers: readonly CheckedOffer[],
  held: readonly CheckedWithheld[],
  substituteOffers: readonly CheckedOffer[],
  pickedPlanId: string | null,
): { chosen?: CheckedOffer; chosenAssessment: JourneyQuote["assessment"]; humanAcceptance?: HumanAcceptance } {
  const selectable = held.filter(selectableHeld);
  const chosen =
    [...offers, ...selectable, ...substituteOffers].find((o) => o.check.ok && planIdOf(o.offer) === pickedPlanId) ??
    defaultChoiceOf(offers, pickedPlanId === null ? held : []);
  const a = chosen && selectable.includes(chosen as CheckedWithheld) ? chosen.offer.journey.assessment : null;
  const humanAcceptance = a && a.status !== "acceptable" && a.policyVersion ? { status: a.status, policyVersion: a.policyVersion } : undefined;
  return { ...(chosen ? { chosen } : {}), chosenAssessment: a, ...(humanAcceptance ? { humanAcceptance } : {}) };
}
