// The UI's gate between "the API answered" and "the wallet is asked". It mirrors the cheap, local part of the V2 verifier (ruflo empx-core packages/core-types plan.ts + packages/verify typedData.ts): a malformed, tampered, expired
// or mismatched offer is refused with reasons, so a bad 200 or a null integration never reaches a wallet prompt.
// EMPX order steps are also checked against the published deployment (registryCheck.ts). The full verifier (@empx/verify, unpublished) still re-runs on the server at commit.
import { sha256, toHex } from "viem";
import { isNativeWrap, orderInputToken, registryProblems } from "./registryCheck";
import { sourceSwapOf } from "./sourceSwapCheck";
import type { JourneyQuote, WireAmount, WireOffer, WirePlan, WireStep } from "./types";

export const PLAN_SCHEMA_VERSION = 1;
/** EMPX's all-in ceiling for its own order plans. Provider-direct plans carry the provider's fee as quoted (owner decision 2026-11-09). */
export const MAX_PLAN_FEE_BPS = 150;

/** A plan's intent kind: an EMPX order (a typed `empx-order` signature) is a contract intent, anything else is provider-direct. */
export const intentKindOf = (plan: WirePlan): "contract" | "provider-direct" =>
  (plan.steps as WireStep[]).some((s) => s.type === "typed_sign" && s.purpose === "empx-order") ? "contract" : "provider-direct";

export interface PlanCheckContext {
  /** What the user asked for; the offer must match it exactly. */
  fromAsset: string;
  amount: string;
  toAsset: string;
  sender: string;
  recipient: string;
  /** Unix seconds. */
  now: number;
  /** A held-back route the user may accept: a `warning` or `unpriced` assessment passes (never `blocked`). */
  allowHeldBack?: boolean;
}
/** `problems` is empty exactly when `ok`; `plan` and `sourceChainId` are set exactly when `ok`. */
export interface PlanCheck {
  ok: boolean;
  problems: string[];
  plan?: WirePlan;
  sourceChainId?: number;
  /** Native gas-token units (source chain) the transactions send beyond the amount being sent: a provider's own fee, shown before signing. */
  extraNative?: bigint;
}

const INT = /^(0|[1-9][0-9]*)$/;
const HEX = /^0x([0-9a-fA-F]{2})*$/;
const eqAddr = (a: unknown, b: unknown): boolean =>
  typeof a === "string" && typeof b === "string" && a.toLowerCase() === b.toLowerCase();
const inList = (list: unknown, v: unknown): boolean => Array.isArray(list) && list.some((x) => eqAddr(x, v));
const isObj = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);

/** Deterministic JSON with sorted keys, as the server hashes it (bigints are already decimal strings on the wire). */
export function canonicalJson(value: unknown): string {
  const norm = (v: unknown): unknown => {
    if (Array.isArray(v)) return v.map(norm);
    if (isObj(v)) {
      return Object.fromEntries(
        Object.keys(v)
          .sort()
          .filter((k) => v[k] !== undefined)
          .map((k) => [k, norm(v[k])]),
      );
    }
    return v;
  };
  return JSON.stringify(norm(value));
}
export function planHashOf(plan: WirePlan): string {
  const { hash: _h, ...rest } = plan;
  return sha256(toHex(new TextEncoder().encode(canonicalJson(rest))), "hex").slice(2);
}
const chainOfAsset = (asset: string): string => asset.split("/")[0] ?? "";
const evmChainId = (caip2: string): number | null => {
  const m = /^eip155:([1-9][0-9]*)$/.exec(caip2);
  return m ? Number(m[1]) : null;
};

/** Checks one plan on its own against what the user asked for: integrity, expiry, amounts, recipient, fees, every wallet step and the
 *  published deployment. Used for a quote's plan (through checkOffer) and for a journey's second order, which has no quote of its own. */
export function checkPlan(plan: WirePlan | null | undefined, ctx: PlanCheckContext): PlanCheck {
  const problems: string[] = [];
  const bad = (m: string) => void problems.push(m);
  if (!isObj(plan) || !Array.isArray(plan.steps) || !isObj(plan.amounts) || !isObj(plan.journey) || !isObj(plan.verify) || !isObj(plan.delivers) || !isObj(plan.guarantee) || !isObj(plan.fees)) {
    return { ok: false, problems: ["the plan is malformed (a required section is missing)"] };
  }

  if (plan.schemaVersion !== PLAN_SCHEMA_VERSION) bad(`plan schema ${String(plan.schemaVersion)} is not supported`);
  try {
    if (plan.hash !== planHashOf(plan)) bad("the plan hash does not match its content (tampered or stale)");
  } catch {
    bad("the plan cannot be hashed");
  }
  if (!(plan.expiresAt > ctx.now)) bad("the plan has expired; request a new quote");

  const amt = amountReader(bad);
  const input = amt(plan.journey.from, "plan input");
  const quoted = amt(plan.amounts.quoted, "plan expected output");

  // the plan is for exactly what the user asked
  if (plan.journey.from?.asset?.toLowerCase() !== ctx.fromAsset.toLowerCase() || plan.journey.from?.amount !== ctx.amount)
    bad("the plan's input is not what was requested");
  if (plan.journey.toAsset !== ctx.toAsset) bad("the plan's destination asset is not what was requested");
  if (!eqAddr(plan.journey.recipient, ctx.recipient) || !eqAddr(plan.verify.expectedRecipient, ctx.recipient))
    bad("the plan's recipient is not the requested recipient");

  if (plan.guarantee.output === "firm_minimum") {
    const min = amt(plan.amounts.minimum, "plan minimum output");
    if (min !== null && (min <= 0n || (quoted !== null && min > quoted))) bad("the plan's minimum is not a positive floor at or below the expected output");
    if (plan.delivers.minAmount !== plan.amounts.minimum?.amount) bad("delivers.minAmount disagrees with the minimum");
  } else if (plan.guarantee.output === "estimate_only") {
    if (plan.amounts.minimum !== null || plan.delivers.minAmount !== null) bad("an estimate-only plan must not state a minimum");
  } else bad("unknown output guarantee");
  if (plan.delivers.isRequested !== (plan.delivers.asset === plan.journey.toAsset)) bad("delivers.isRequested disagrees with the requested asset");

  // fees: EMPX's own orders stay inside its ceiling; a provider's fee is the provider's, shown as quoted (only a sanity bound)
  const feeCeiling = intentKindOf(plan) === "contract" ? MAX_PLAN_FEE_BPS : 10_000;
  if (!Number.isInteger(plan.fees.maxTotalBps) || plan.fees.maxTotalBps < 0 || plan.fees.maxTotalBps > feeCeiling)
    bad(`total fees are not within 0..${feeCeiling} bps`);

  // steps
  const srcChain = chainOfAsset(plan.journey.from?.asset ?? "");
  const srcId = evmChainId(srcChain);
  if (srcId === null) bad("the source chain is not an EVM chain");
  const ids = new Set<string>();
  const seen = new Set<string>();
  for (const s of plan.steps as WireStep[]) {
    if (ids.has(s.id)) bad(`duplicate step id ${s.id}`);
    ids.add(s.id);
  }
  for (const s of plan.steps as WireStep[]) {
    for (const d of s.dependsOn ?? []) if (!ids.has(d) || !seen.has(d)) bad(`step ${s.id} depends on ${d}, which does not come before it`);
    seen.add(s.id);
  }
  const inputToken = srcId === null ? null : orderInputToken(ctx.fromAsset, srcId);
  const hasOrder = (plan.steps as WireStep[]).some((s) => s.type === "typed_sign" && s.purpose === "empx-order");
  const nativeIn = /\/slip44:/.test(ctx.fromAsset);
  // a provider plan may swap the input into the rail's token first; its later approval then covers that token, up to the swap's minimum
  const swap = srcId !== null && !hasOrder ? sourceSwapOf(plan, { srcId, srcChain, input, fromAsset: ctx.fromAsset, sender: ctx.sender }, bad) : null;
  let nativeOut = 0n;
  for (const s of plan.steps as WireStep[])
    if (s.walletMode !== "server" && s.readiness === "blocked") bad(`step ${s.id} is blocked, so this route cannot be completed right now`);
  const wallet = (plan.steps as WireStep[]).filter((s) => s.walletMode !== "server" && s.readiness === "executable");
  if (!wallet.some((s) => s.type === "typed_sign" || s.type === "tx")) bad("the plan has no wallet step to execute");
  for (const s of wallet) {
    if (!(s.expiresAt > ctx.now)) bad(`step ${s.id} has expired`);
    if (s.type === "approve") {
      if (s.chain !== srcChain) bad(`approve ${s.id} is not on the source chain`);
      const carrier = plan.compiled.carrier && s.token === plan.compiled.carrier;
      const swapped = swap !== null && s.token.toLowerCase() === swap.outputAsset.toLowerCase();
      if (!carrier && !swapped && (!inputToken || s.token.toLowerCase() !== `${srcChain}/erc20:${inputToken}`.toLowerCase())) bad(`approve ${s.id} is not for the asset being sent`);
      if (!inList(plan.verify.allowedSpenders, s.spender)) bad(`approve ${s.id} names a spender the plan does not allow`);
      const ceiling = swapped ? swap.minimum : input;
      if (typeof s.amount !== "string" || !INT.test(s.amount) || BigInt(s.amount) <= 0n || (ceiling !== null && BigInt(s.amount) > ceiling))
        bad(`approve ${s.id} is not an exact amount within the amount being sent`);
    } else if (s.type === "tx") {
      if (s.chain !== srcChain) bad(`transaction ${s.id} is not on the source chain`);
      if (!inList(plan.verify.allowedTargets, s.to)) bad(`transaction ${s.id} calls a contract the plan does not allow`);
      if (!HEX.test(s.data ?? "")) bad(`transaction ${s.id} has malformed calldata`);
      if (typeof s.value !== "string" || !INT.test(s.value)) bad(`transaction ${s.id} has a malformed native value`);
      else if (s.value !== "0") {
        // An EMPX order plan sends native value only in its one WETH wrap; a provider plan may send it (the input, or the provider's fee).
        if (hasOrder && !(srcId !== null && isNativeWrap(plan, s, srcId))) bad(`transaction ${s.id} sends native value outside the wrap`);
        else if (!hasOrder) nativeOut += BigInt(s.value);
      }
    } else if (s.type === "typed_sign") {
      if (s.purpose !== "empx-order") bad(`signature ${s.id} is a provider signature, which this version does not sign`);
      else {
        // A Permit2 witness is bound to the router it names as spender (the domain is Permit2's); a plain Order to its domain's contract.
        const vc = s.primaryType === "PermitWitnessTransferFrom" ? s.message.spender : (s.domain as { verifyingContract?: unknown }).verifyingContract;
        if (Number((s.domain as { chainId?: unknown }).chainId) !== srcId) bad(`signature ${s.id} is bound to another chain`);
        if (!inList(plan.verify.allowedTargets, vc)) bad(`signature ${s.id} is bound to a contract the plan does not allow`);
        if (s.primaryType !== "Order" && s.primaryType !== "PermitWitnessTransferFrom") bad(`signature ${s.id} is not an EMPX order`);
        const m = (isObj(s.message.witness) ? s.message.witness : s.message) as Record<string, unknown>;
        if (!eqAddr(m.user, ctx.sender)) bad(`signature ${s.id} is not for the connected wallet`);
        if (!plan.verify.hook && !eqAddr(m.recipient, ctx.recipient)) bad(`signature ${s.id} pays someone other than the requested recipient`);
      }
    } else bad(`step ${s.id} (${s.type}) cannot be performed by this version`);
  }

  // contracts an EMPX order binds to are the published ones, not just the ones the plan allows itself
  if (srcId !== null) {
    for (const p of registryProblems(plan, srcId, inputToken)) bad(p);
  }

  const extra = nativeIn && input !== null ? (nativeOut > input ? nativeOut - input : 0n) : nativeOut;
  return problems.length ? { ok: false, problems } : { ok: true, problems: [], plan, sourceChainId: srcId!, ...(extra > 0n ? { extraNative: extra } : {}) };
}

const amountReader = (bad: (m: string) => void) => (a: WireAmount | null | undefined, what: string): bigint | null => {
  if (!isObj(a) || typeof a.amount !== "string" || !INT.test(a.amount) || !Number.isInteger(a.decimals)) {
    bad(`${what} is not an exact base-unit amount`);
    return null;
  }
  return BigInt(a.amount);
};

/** A single-order offer: its plan (checkPlan) plus the quote the user is shown, which must be exactly what that plan determines. */
export function checkOffer(offer: WireOffer | null | undefined, ctx: PlanCheckContext): PlanCheck {
  if (!isObj(offer) || !isObj(offer.journey) || !isObj(offer.execution) || !isObj(offer.execution.plan)) {
    return { ok: false, problems: ["the API returned no usable offer (missing journey or plan)"] };
  }
  const j = offer.journey;
  const plan = offer.execution.plan;
  const base = checkPlan(plan, ctx);
  if (base.problems[0] === "the plan is malformed (a required section is missing)") return base;
  const problems = [...base.problems];
  const bad = (m: string) => void problems.push(m);
  const amt = amountReader(bad);

  if (!(j.expiresAt > ctx.now)) bad("the quote has expired; request a new quote");
  if (!eqAddr(j.recipient, ctx.recipient) || j.toAsset !== ctx.toAsset || j.input?.amount !== ctx.amount)
    bad("the quote does not describe the requested transfer");
  if (j.mode !== "direct") bad("a two-order (sequential wallet) journey is checked as a journey, not as one offer");
  if (!Array.isArray(j.hops) || j.hops.length !== 1 || j.hops[0]?.planId !== plan.id || j.hops[0]?.planHash !== plan.hash)
    bad("the quote does not name this plan");
  if (j.outputGuarantee !== plan.guarantee.output) bad("quote and plan disagree on the output guarantee");
  const input = INT.test(plan.journey.from?.amount ?? "") ? BigInt(plan.journey.from.amount) : null;
  const quoted = INT.test(plan.amounts.quoted?.amount ?? "") ? BigInt(plan.amounts.quoted.amount) : null;
  const jInput = amt(j.input, "quote input");
  const jExpected = amt(j.expectedOutput, "quote expected output");
  if (jInput !== null && input !== null && jInput !== input) bad("quote and plan disagree on the input amount");
  if (jExpected !== null && quoted !== null && jExpected !== quoted) bad("quote and plan disagree on the expected output");
  if (plan.guarantee.output === "firm_minimum") {
    const jMin = amt(j.minimumOutput, "quote minimum output");
    if (jMin !== null && plan.amounts.minimum?.amount !== jMin.toString()) bad("quote and plan disagree on the minimum output");
  } else if (plan.guarantee.output === "estimate_only" && j.minimumOutput !== null) bad("an estimate-only plan must not state a minimum");
  if (j.fees?.allIn?.withinCeiling === false || j.fees?.empx?.withinCap === false) bad("the quote's fees exceed the stated ceiling");
  problems.push(...assessmentProblems(j, ctx.allowHeldBack === true));
  return problems.length ? { ok: false, problems } : base;
}

/** The server's own assessment gates execution; a warning/unpriced route passes only as a held-back route the user accepts. */
export function assessmentProblems(j: Pick<JourneyQuote, "assessment">, allowHeldBack: boolean): string[] {
  const held = allowHeldBack && (j.assessment?.status === "warning" || j.assessment?.status === "unpriced");
  if (!j.assessment) return ["the quote has no value assessment"];
  if (j.assessment.status !== "acceptable" && !held) return [`the quote is not executable here: ${j.assessment.label || j.assessment.status}`];
  return [];
}
