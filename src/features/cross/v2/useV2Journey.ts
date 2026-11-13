// Drives a committed two-order journey from the server's view (GET /v2/journeys/:id): polls with backoff, calls `advance` when the first
// leg has landed, and exposes the user's own actions — sign the second order, or (when it did not happen) fetch and accept new terms.
// Every signature is preceded by a local check of the exact plan; nothing is signed automatically.
import { useCallback, useEffect, useRef, useState } from "react";
import type { CrossV2Client } from "./client";
import { intentKindOf, performSteps, type ExecuteOptions, type WalletPort } from "./execute";
import { checkSecondOrder } from "./journeyCheck";
import { forgetJourney } from "./journeyStore";
import { checkOffer, checkPlan } from "./planCheck";
import type { JourneyDetail, TwoHopQuote, WirePlan } from "./types";
import type { CheckedOffer } from "./widgetView";

const POLL_START_MS = 2_000;
const POLL_MAX_MS = 15_000;

export interface V2JourneyWant {
  sender: string;
  toAsset: string;
  recipient: string;
}

export interface V2JourneyState {
  detail: JourneyDetail | null;
  busy: boolean;
  stepNote: string | null;
  error: string | null;
  /** The best new-terms offer after restart, checked locally; null until fetched. */
  newTerms: CheckedOffer | null;
  /** Signs the order the journey is waiting for: the first (if its signature never happened) or the second. */
  signNext: () => Promise<void>;
  fetchNewTerms: () => Promise<void>;
  acceptNewTerms: () => Promise<void>;
}

export function useV2Journey(
  client: CrossV2Client,
  journeyId: string | null,
  wallet: WalletPort | null,
  want: V2JourneyWant | null,
  describeError: (e: unknown) => string,
): V2JourneyState {
  const [detail, setDetail] = useState<JourneyDetail | null>(null);
  const [busy, setBusy] = useState(false);
  const [stepNote, setStepNote] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [newTerms, setNewTerms] = useState<CheckedOffer | null>(null);
  const [nonce, setNonce] = useState(0);
  const advancing = useRef(false);

  // Poll the journey; advance automatically once the first leg's delivery is final (safe to repeat, never resubmits leg 1).
  useEffect(() => {
    if (!journeyId) {
      setDetail(null);
      return;
    }
    const ctl = new AbortController();
    let wait = POLL_START_MS;
    let timer: ReturnType<typeof setTimeout>;
    const tick = async () => {
      try {
        let d = await client.journey(journeyId, ctl.signal);
        if (d.view.nextAction === "advance" && !advancing.current) {
          advancing.current = true;
          try {
            d = await client.advanceJourney(journeyId, ctl.signal);
          } finally {
            advancing.current = false;
          }
        }
        if (ctl.signal.aborted) return;
        setDetail(d);
        if (d.view.state === "completed") {
          if (want) forgetJourney(want.sender, journeyId);
          return;
        }
        // Waiting on the user: no need to poll fast.
        wait = d.view.nextAction === "sign_hop1" || d.view.nextAction === "sign_hop2" || d.view.nextAction === "restart_hop2" || d.view.nextAction === "review" ? POLL_MAX_MS : Math.min(POLL_MAX_MS, wait * 1.5);
      } catch (e) {
        if (ctl.signal.aborted) return;
        setError(describeError(e));
        wait = POLL_MAX_MS;
      }
      timer = setTimeout(tick, wait);
    };
    void tick();
    return () => {
      ctl.abort();
      clearTimeout(timer);
    };
  }, [client, journeyId, nonce, want, describeError]);

  const run = useCallback(
    async (fn: () => Promise<void>) => {
      setBusy(true);
      setError(null);
      try {
        await fn();
      } catch (e) {
        setError(describeError(e));
      } finally {
        setStepNote(null);
        setBusy(false);
        setNonce((n) => n + 1);
      }
    },
    [describeError],
  );

  const signNext = useCallback(
    () =>
      run(async () => {
        if (!journeyId || !wallet || !want) return;
        const d = await client.journey(journeyId);
        const now = Math.floor(Date.now() / 1000);
        const p = d.next?.execution?.plan;
        // The first order pays the sender's own address on the intermediate chain (D04); the second spends exactly what arrived.
        const check =
          d.view.nextAction === "sign_hop1" && p
            ? checkPlan(p, { fromAsset: p.journey.from.asset, amount: p.journey.from.amount, toAsset: p.journey.toAsset, sender: want.sender, recipient: want.sender, now })
            : checkSecondOrder(d, { ...want, now });
        if (!check.ok || !check.plan || !d.next) throw new Error(`This order can't be signed: ${check.problems[0]}`);
        await performSteps(client, d.next.intentId, intentKindOf(check.plan), check.plan, check.sourceChainId!, wallet, {
          onStep: (id, phase) => setStepNote(phase === "wallet" ? `Confirm in your wallet (${id})` : phase === "confirming" ? `Waiting for confirmation (${id})` : null),
        });
      }),
    [client, journeyId, wallet, want, run],
  );

  const fetchNewTerms = useCallback(
    () =>
      run(async () => {
        if (!journeyId || !want) return;
        const d = await client.journey(journeyId);
        const received = d.view.received;
        if (!received) throw new Error("The journey does not say what the first order delivered.");
        const res = await client.restartJourneyQuote(journeyId);
        const now = Math.floor(Date.now() / 1000);
        const checked = (res.plans ?? []).map((offer) => ({
          offer,
          check: checkOffer(offer, { fromAsset: received.asset, amount: received.amount, toAsset: want.toAsset, sender: want.sender, recipient: want.recipient, now }),
        }));
        const best = checked.find((o) => o.check.ok) ?? null;
        if (!best) throw new Error("No new terms are available for the second order right now. Your funds stay in your wallet; try again later.");
        setNewTerms(best);
      }),
    [client, journeyId, want, run],
  );

  const acceptNewTerms = useCallback(
    () =>
      run(async () => {
        if (!journeyId || !newTerms) return;
        await client.acceptNewTerms(journeyId, newTerms.offer);
        setNewTerms(null);
      }),
    [client, journeyId, newTerms, run],
  );

  return { detail, busy, stepNote, error, newTerms, signNext, fetchNewTerms, acceptNewTerms };
}

/** Commits the first order of a checked two-hop quote, remembers the journey for resume, then runs the first order's wallet steps.
 *  One commit key per first-order plan, so a retry after a network failure replays the same journey instead of opening a second one. */
export async function startTwoHop(
  client: CrossV2Client,
  q: TwoHopQuote,
  hop1: { plan: WirePlan; sourceChainId: number },
  wallet: WalletPort,
  o: { commitKey: string; remember: (journeyId: string) => void; onStep?: ExecuteOptions["onStep"] },
): Promise<{ journeyId: string }> {
  const { journeyId, hop1IntentId } = await client.commitJourney(q, wallet.address, o.commitKey);
  o.remember(journeyId);
  await performSteps(client, hop1IntentId, intentKindOf(hop1.plan), hop1.plan, hop1.sourceChainId, wallet, { onStep: o.onStep });
  return { journeyId };
}
