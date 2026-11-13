import type { CrossV2Client } from "./client";
import { performSteps, type ExecuteOptions, type ExecuteResult, type WalletPort } from "./execute";
import { checkPlan, intentKindOf, type PlanCheckContext } from "./planCheck";

export async function executeBasketLeg(
  client: CrossV2Client,
  basketId: string,
  legId: string,
  wallet: WalletPort,
  ctx: PlanCheckContext,
  o: ExecuteOptions = {},
): Promise<ExecuteResult & { basketId: string; legId: string; intentId: string }> {
  const { intentId, replayed } = await client.basketCommitLeg(basketId, legId, o.signal);
  o.onCommitted?.(intentId);
  const steps = await client.basketLegSteps(basketId, legId, o.signal);
  if (steps.intentId !== intentId || steps.basketId !== basketId || steps.legId !== legId)
    throw new Error("plan rejected: basket leg identity mismatch");
  const plan = steps.execution.plan;
  const checked = checkPlan(plan, { ...ctx, sender: wallet.address });
  if (!checked.ok) throw new Error(`plan rejected: ${checked.problems.join("; ")}`);
  if (!replayed) {
    const result = await performSteps(client, intentId, intentKindOf(plan), plan, checked.sourceChainId!, wallet, o);
    return { ...result, basketId, legId, intentId };
  }
  // walletSteps lists ALL executable steps. On reload only status.nextSteps is
  // safe to execute. Re-read after each frontier; never resend the same step.
  const result: ExecuteResult = { intentId, done: [], waiting: [], tracking: "not-needed", txs: [] };
  const sent = new Set<string>();
  const kind = intentKindOf(plan);
  const finalTransaction = [...plan.steps].reverse().find((s) => s.type === "tx" && steps.walletSteps.includes(s.id));
  for (;;) {
    const status = await client.status(intentId, o.signal);
    if (kind === "contract" && status.status !== "created") break;
    const ready = new Set(status.nextSteps.filter((id) => steps.walletSteps.includes(id) && !sent.has(id)));
    if (!ready.size) break;
    const executable = {
      ...plan,
      steps: plan.steps.map((s) => (s.walletMode !== "server" && !ready.has(s.id) ? { ...s, readiness: "informational" as const } : s)),
    };
    // An intermediate fee/swap transaction is not the provider deposit reference.
    const trackFinal = finalTransaction && ready.has(finalTransaction.id);
    const part = await performSteps(client, intentId, trackFinal ? kind : "contract", executable, checked.sourceChainId!, wallet, o);
    for (const id of ready) sent.add(id);
    result.done.push(...part.done);
    result.txs.push(...part.txs);
    result.waiting = part.waiting;
    if (part.tracking !== "not-needed") result.tracking = part.tracking;
  }
  return { ...result, basketId, legId, intentId };
}
