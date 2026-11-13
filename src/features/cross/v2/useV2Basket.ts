import { useEffect, useRef, useState } from "react";
import { CrossV2ApiError, type CrossV2Client } from "./client";
import { executeBasketLeg } from "./basketExecute";
import type { BasketPlanRequest, BasketView, LegView } from "./basketTypes";
import type { WalletPort } from "./execute";
import type { PlanCheckContext } from "./planCheck";
import { forgetBasket, rememberBasket } from "./journeyStore";

type Phase = "idle" | "planning" | "review" | "running" | "done" | "error";
export function useV2Basket(client: CrossV2Client, wallet: WalletPort | null, ctx: PlanCheckContext) {
  const [view, setView] = useState<BasketView | null>(null);
  const [phase, setPhase] = useState<Phase>("idle");
  const [error, setError] = useState<string | null>(null);
  const busy = useRef(false);
  const generation = useRef(0);
  const operationGeneration = useRef(0);
  const controller = useRef(new AbortController());
  const current = useRef({ wallet, ctx });
  current.current = { wallet, ctx };
  useEffect(() => {
    generation.current++;
    controller.current.abort();
    controller.current = new AbortController();
    setView(null);
    setPhase("idle");
    setError(null);
    return () => {
      generation.current++;
      controller.current.abort();
    };
  }, [wallet?.address]);

  function accept(v: BasketView, review = false) {
    if (operationGeneration.current !== generation.current) return;
    setView(v);
    const terminal = !["not_started", "in_progress"].includes(v.aggregate.outcome);
    setPhase(review ? "review" : terminal ? "done" : v.status === "quoted" ? "review" : "running");
    const address = current.current.wallet?.address;
    if (address) {
      if (terminal) forgetBasket(address, v.basketId);
      else rememberBasket(address, { basketId: v.basketId, createdAt: Date.now() });
    }
  }
  async function operation(action: () => Promise<void>, staleId?: string) {
    if (busy.current) return;
    busy.current = true;
    operationGeneration.current = generation.current;
    setError(null);
    try {
      await action();
    } catch (e) {
      if (operationGeneration.current !== generation.current) return;
      if (e instanceof CrossV2ApiError && e.status === 409 && staleId) {
        try {
          accept(await client.basketStatus(staleId), true);
          setError("The basket changed; review the new terms.");
        } catch (readError) {
          setError(readError instanceof Error ? readError.message : String(readError));
          setPhase("error");
        }
      } else {
        setError(e instanceof Error ? e.message : String(e));
        setPhase("error");
      }
    } finally {
      busy.current = false;
    }
  }
  async function executeLeg(v: BasketView, leg: LegView) {
    const w = current.current.wallet;
    if (!w) throw new Error("Connect a wallet to run this basket.");
    if (leg.nextAction !== "commit" && leg.nextAction !== "sign") return;
    // A basket can contain different assets/recipients. Bind the gate to this leg,
    // not to the editor's first input. The reviewed input remains authoritative.
    await client.basketCommitLeg(v.basketId, leg.legId);
    const detail = await client.basketLegSteps(v.basketId, leg.legId);
    const p = detail.execution.plan;
    if (operationGeneration.current !== generation.current) return;
    if (
      leg.quotedOut !== p.amounts.quoted.amount ||
      leg.minimumOut !== (p.amounts.minimum?.amount ?? null) ||
      leg.maxFeeBps !== p.fees.maxTotalBps
    ) {
      throw new Error("plan rejected: leg terms differ from the reviewed basket");
    }
    await executeBasketLeg(
      client,
      v.basketId,
      leg.legId,
      w,
      {
        ...current.current.ctx,
        fromAsset: leg.input?.asset ?? p.journey.from.asset,
        amount: leg.input?.amount ?? p.journey.from.amount,
        toAsset: p.journey.toAsset,
        recipient: p.journey.recipient,
        sender: w.address,
        now: Math.floor(Date.now() / 1000),
      },
      { signal: controller.current.signal },
    );
  }
  useEffect(() => {
    if (!view || view.status !== "active" || phase !== "running" || !["not_started", "in_progress"].includes(view.aggregate.outcome))
      return;
    let disposed = false;
    const timer = setTimeout(async () => {
      if (busy.current) {
        if (!disposed) setView({ ...view });
        return;
      }
      try {
        const next = await client.basketStatus(view.basketId);
        if (!disposed) accept(next);
      } catch (e) {
        if (!disposed) {
          setError(e instanceof Error ? e.message : String(e));
          setPhase("error");
        }
      }
    }, 5000);
    return () => {
      disposed = true;
      clearTimeout(timer);
    };
  }, [client, view, phase]);

  return {
    view,
    phase,
    error,
    plan: (r: BasketPlanRequest) =>
      operation(async () => {
        setPhase("planning");
        accept(await client.basketPlan(r));
      }),
    begin: () =>
      operation(async () => {
        if (!view) return;
        setPhase("running");
        const active =
          view.status === "quoted"
            ? await client.basketBegin(
                view.basketId,
                view.version,
                view.legs.filter((l) => l.state === "skipped").map((l) => l.legId),
              )
            : view;
        accept(active);
        const epoch = generation.current;
        for (const leg of active.legs) {
          if (epoch !== generation.current) return;
          await executeLeg(active, leg);
        }
        if (epoch === generation.current) accept(await client.basketStatus(active.basketId));
      }, view?.basketId),
    runLeg: (legId: string) =>
      operation(async () => {
        const leg = view?.legs.find((l) => l.legId === legId);
        if (!view || !leg) return;
        setPhase("running");
        await executeLeg(view, leg);
        accept(await client.basketStatus(view.basketId));
      }),
    requote: (legId: string) =>
      operation(async () => {
        if (view) accept(await client.basketRequoteLeg(view.basketId, legId, view.version), true);
      }, view?.basketId),
    cancel: () =>
      operation(async () => {
        if (view?.status === "quoted") accept(await client.basketCancel(view.basketId));
      }),
    resume: (basketId: string) =>
      operation(async () => {
        accept(await client.basketStatus(basketId));
      }),
  };
}
