// Mirrors ruflo empx-core/server packages/basket/src/BasketService.ts (LegView, BasketView) and packages/sdk/src/baskets.ts.
import type { WireAmount, WirePlan } from "./types";

export type LegAction = "begin" | "commit" | "sign" | "wait" | "claim" | "recover" | "none" | "requote";
export interface LegView {
  legId: string;
  state: "planned" | "skipped" | "committed" | "cancelled";
  input: WireAmount | null;
  quotedOut: string | null;
  minimumOut: string | null;
  maxFeeBps: number | null;
  expiresAt: number | null;
  reason: string | null;
  intentId: string | null;
  intentStatus: string | null;
  delivered: { asset: string; amount: string } | null;
  nextAction: LegAction;
}
export interface BasketView {
  basketId: string;
  version: number;
  status: "quoted" | "active" | "cancelled";
  expiresAt: number;
  legs: LegView[];
  aggregate: {
    atomic: false;
    inputsByAsset: Record<string, string>;
    worstCaseFeeByAsset: Record<string, string>;
    deliveredByAsset: Record<string, string>;
    outcome: "not_started" | "in_progress" | "partial" | "completed" | "failed" | "cancelled";
    unknownLegs: string[];
  };
}
export interface BasketPlanLeg {
  legId?: string;
  from: WireAmount;
  toAsset: string;
  recipient?: string;
  slippageBps?: number;
  floor?: string;
}
export interface BasketPlanRequest {
  sender: string;
  recipient: string;
  maxTier: 1 | 2 | 3;
  slippageBps?: number;
  legs: BasketPlanLeg[];
}
export interface BasketLegSteps {
  basketId: string;
  legId: string;
  intentId: string;
  execution: { plan: WirePlan };
  walletSteps: string[];
}
