// Local checks for a two-order journey (D04), before the wallet is asked and again before the second signature. The quote is two separate
// orders through an intermediate chain: the first delivers to the user's own address, the second is built later from what actually arrived.
// Mirrors the parts of the SDK's verifyJourneyQuote (empx-core/server packages/core-types) a wallet prompt depends on; the server re-verifies.
import { assessmentProblems, checkPlan, type PlanCheck, type PlanCheckContext } from "./planCheck";
import type { JourneyDetail, TwoHopQuote, WirePlan } from "./types";

const eqAddr = (a: unknown, b: unknown) => typeof a === "string" && typeof b === "string" && a.toLowerCase() === b.toLowerCase();

export interface TwoHopCheck {
  ok: boolean;
  problems: string[];
  /** Set exactly when ok. */
  hop1?: PlanCheck;
}

/** The whole two-hop quote: the journey names both plans, leg 1 pays the sender at the intermediate chain, leg 2 pays the requested recipient. */
export function checkTwoHop(q: TwoHopQuote | null | undefined, ctx: PlanCheckContext): TwoHopCheck {
  const problems: string[] = [];
  const bad = (m: string) => void problems.push(m);
  const j = q?.journey;
  const hop1 = q?.execution?.hop1?.plan;
  const hop2 = q?.execution?.hop2Preview?.plan;
  if (!q || !j || !hop1 || !hop2 || !q.via) return { ok: false, problems: ["the API returned no usable two-step route"] };

  if (j.mode !== "sequential_wallet") bad("the journey is not a two-order journey");
  if (!Array.isArray(j.hops) || j.hops.length !== 2) bad("the journey does not name exactly two orders");
  else {
    if (j.hops[0]!.planId !== hop1.id || j.hops[0]!.planHash !== hop1.hash) bad("the journey's first order is not this plan");
    if (j.hops[1]!.planId !== hop2.id || j.hops[1]!.planHash !== hop2.hash) bad("the journey's second order is not this plan");
  }
  if (!(j.expiresAt > ctx.now)) bad("the quote has expired; request a new quote");
  if (j.input?.amount !== ctx.amount || j.toAsset !== ctx.toAsset || !eqAddr(j.recipient, ctx.recipient))
    bad("the journey does not describe the requested transfer");
  if (j.fees?.allIn?.withinCeiling === false || j.fees?.empx?.withinCap === false) bad("the journey's fees exceed the stated ceiling");
  problems.push(...assessmentProblems(j, false));

  // Leg 1: exactly the user's input, delivered to the user's own address on the intermediate chain.
  if (hop1.journey?.toAsset !== q.via.asset) bad("the first order does not deliver the intermediate asset");
  const leg1 = checkPlan(hop1, { ...ctx, toAsset: q.via.asset, recipient: ctx.sender });
  for (const p of leg1.problems) bad(`first order: ${p}`);

  // Leg 2 (preview): spends the intermediate asset and pays the requested recipient. Its amount is fixed only after leg 1 lands.
  if (hop2.journey?.from?.asset !== q.via.asset) bad("the second order does not spend the intermediate asset");
  const leg2 = checkPlan(hop2, { ...ctx, fromAsset: q.via.asset, amount: hop2.journey?.from?.amount ?? "", allowHeldBack: false });
  for (const p of leg2.problems) bad(`second order: ${p}`);

  return problems.length ? { ok: false, problems } : { ok: true, problems: [], hop1: leg1 };
}

/** The second order the server built after leg 1 landed: it must spend exactly what was received and pay the requested recipient. */
export function checkSecondOrder(
  d: JourneyDetail,
  want: { toAsset: string; recipient: string; sender: string; now: number },
): PlanCheck {
  const plan: WirePlan | undefined = d.next?.execution?.plan;
  const received = d.view.received;
  if (!plan) return { ok: false, problems: ["the journey has no order waiting for a signature"] };
  if (!received) return { ok: false, problems: ["the journey does not say what the first order delivered"] };
  const r = checkPlan(plan, { fromAsset: received.asset, amount: received.amount, toAsset: want.toAsset, sender: want.sender, recipient: want.recipient, now: want.now });
  return r.ok ? r : { ...r, problems: r.problems.map((p) => `second order: ${p}`) };
}
