import { describe, expect, it } from "vitest";
import { chooseRoute, defaultChoiceOf, routeCardsOf } from "./routeCards";
import { makeOffer } from "./v2Fixtures";
import type { WireAssessment, WithheldOffer } from "./types";
import type { CheckedWithheld } from "./useV2Quote";
import type { CheckedOffer } from "./widgetView";

const usd = (x: number) => (BigInt(Math.round(x * 1e6)) * 10n ** 12n).toString();
const T = () => "USDC";
const ok = { ok: true, problems: [] } as never;
const bad = { ok: false, problems: ["wrong spender"] } as never;
const offer = (id: string, rail: string, out: string): CheckedOffer => {
  const o = makeOffer({ plan: { id }, journey: { expectedOutput: { asset: "eip155:42161/erc20:0xaf88", amount: out, decimals: 6 } } });
  o.journey.hops = [{ ...o.journey.hops[0]!, planId: id, rail }];
  return { offer: o, check: ok };
};
const held = (id: string, rail: string, status: WireAssessment["status"], o: { check?: never; key?: boolean; reason?: string } = {}): CheckedWithheld => {
  const c = offer(id, rail, "900000");
  const w = c.offer as WithheldOffer;
  w.journey.assessment = { status, label: status, reason: o.reason ?? "", executableByApiKey: true, policyVersion: "pv1" };
  w.assessment = { status, reason: o.reason, reasons: o.reason ? [o.reason] : [], journey: { inputUsd: usd(1), outputUsd: usd(0.9), unpricedFees: [] }, legs: [] };
  if (o.key === false) w.executableByApiKey = false;
  return { offer: w, check: o.check ?? ok };
};

describe("routeCardsOf", () => {
  it("one strip: routes that passed the value check first, then the held-back ones, each tagged and with its value note", () => {
    const { cards } = routeCardsOf(
      [offer("p1", "cctp", "990000")],
      [held("h1", "hyperlane", "warning"), held("h2", "debridge", "blocked"), held("h3", "layerzero", "unpriced", { reason: "output_unpriced:no-evidence" })],
      "h1",
      T,
    );
    expect(cards.map((c) => [c.name, c.tag, c.isActive])).toEqual([
      ["CCTP", "BEST", false],
      ["Hyperlane Nexus", "HIGH COST", true],
      ["deBridge", "VERY HIGH COST", false],
      ["LayerZero", "UNVERIFIED", false],
    ]);
    expect(cards[1]!.note).toBe("High cost: ≈ $0.10 for $1.00 (-10.0%)");
    expect([cards[1]!.tone, cards[2]!.tone]).toEqual(["warn", "bad"]);
    expect(cards[3]!.note).toBe("No price for USDC: value can't be checked");
  });
  it("a route that fails the local check, or that this app may not commit, is shown as unavailable", () => {
    const { cards, offerOf } = routeCardsOf([], [held("h1", "cctp", "warning", { check: bad }), held("h2", "ccip", "warning", { key: false })], null, T);
    expect(cards.map((c) => c.tag)).toEqual(["UNAVAILABLE", "UNAVAILABLE"]);
    expect(offerOf("CCTP")).toBeUndefined();
  });
  it("offerOf finds the route a card names", () => {
    const h = held("h1", "hyperlane", "warning");
    const { offerOf } = routeCardsOf([offer("p1", "cctp", "990000")], [h], null, T);
    expect(offerOf("Hyperlane Nexus")).toBe(h);
  });
});

describe("defaultChoiceOf", () => {
  it("the best route that passed the value check; without one, the first held-back route the user can take, so the output field shows a quote", () => {
    const p = offer("p1", "cctp", "990000");
    expect(defaultChoiceOf([p], [held("h1", "x", "warning")])).toBe(p);
    const w = held("h2", "hyperlane", "warning");
    expect(defaultChoiceOf([], [held("h1", "cctp", "warning", { check: bad }), w])).toBe(w);
    expect(defaultChoiceOf([], [])).toBeUndefined();
  });
  it("lists Bridge but preselects it only when no other route passed", () => {
    const b = offer("b1", "bridge", "999000"), c = offer("c1", "cctp", "990000");
    expect(defaultChoiceOf([b, c], [])).toBe(c);
    expect(defaultChoiceOf([b], [held("h1", "hyperlane", "warning")])).toBe(b);
  });
});

describe("chooseRoute", () => {
  it("the picked route if it is still offered, else the default; a held route carries the acceptance for its own label, blocked included", () => {
    const p = offer("p1", "cctp", "990000");
    const b = held("h1", "hyperlane", "blocked");
    expect(chooseRoute([p], [b], [], "h1")).toMatchObject({ chosen: b, humanAcceptance: { status: "blocked", policyVersion: "pv1" } });
    const fallback = chooseRoute([p], [b], [], "gone");
    expect([fallback.chosen, fallback.chosenAssessment, fallback.humanAcceptance]).toEqual([p, null, undefined]);
    const sub = offer("s1", "ccip", "5");
    expect(chooseRoute([], [], [sub], "s1").chosen).toBe(sub);
  });
});

describe("chooseRoute while a pick is pinned", () => {
  it("a picked route that disappears falls back only to a route that passed the value check, never silently to a held one", () => {
    const h = held("h1", "hyperlane", "warning");
    const r = chooseRoute([], [h], [], "picked-but-gone");
    expect([r.chosen, r.humanAcceptance]).toEqual([undefined, undefined]);
    expect(chooseRoute([], [h], [], null).chosen).toBe(h);
  });
});

describe("chooseRoute across re-quotes", () => {
  it("keeps a picked rail when the re-quote gives its plan a new id, instead of falling back to the top route", async () => {
    const { routeKeyOf } = await import("./widgetView");
    const first = [offer("debridge:100:1", "debridge", "995000"), offer("hyperlane:100:4", "hyperlane", "990000")];
    const pick = routeKeyOf(first[1]!.offer);
    const requoted = [offer("debridge:160:1", "debridge", "996000"), offer("hyperlane:160:5", "hyperlane", "991000")];
    expect(chooseRoute(requoted, [], [], pick).chosen).toBe(requoted[1]);
    expect(routeKeyOf(first[0]!.offer)).not.toBe(pick);
  });
});
