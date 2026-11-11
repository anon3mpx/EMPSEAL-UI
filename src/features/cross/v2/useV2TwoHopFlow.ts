// The page's side of a two-order journey: start one from a checked two-hop quote, resume the newest open one for the connected wallet
// after a reload (journeyStore), and hand the journey to useV2Journey for advance / second signature / new terms.
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { CrossV2Client } from "./client";
import type { WalletPort } from "./execute";
import { checkTwoHop } from "./journeyCheck";
import { forgetJourney, openJourneys, rememberJourney, type StoredJourney } from "./journeyStore";
import { startTwoHop, useV2Journey, type V2JourneyState } from "./useV2Journey";
import type { TwoHopInfo } from "./useV2Quote";

export interface TwoHopRequest {
  fromAsset: string;
  amount: string;
  toAsset: string;
  recipient: string;
}

export interface V2TwoHopFlow {
  journeyId: string | null;
  stored: StoredJourney | null;
  j: V2JourneyState;
  /** Re-checks the quote, commits the first order and runs its wallet steps. Resolves with an error message, or null. */
  start: (t: TwoHopInfo, req: TwoHopRequest, onStep: (note: string | null) => void) => Promise<string | null>;
  clear: () => void;
}

export function useV2TwoHopFlow(client: CrossV2Client, sender: string | undefined, wallet: WalletPort | null, describeError: (e: unknown) => string): V2TwoHopFlow {
  const [stored, setStored] = useState<StoredJourney | null>(null);
  const commitKeys = useRef(new Map<string, string>());

  // Resume: the newest journey this wallet left open.
  useEffect(() => {
    setStored(sender ? openJourneys(sender)[0] ?? null : null);
  }, [sender]);

  const want = useMemo(
    () => (sender && stored ? { sender, toAsset: stored.toAsset, recipient: stored.recipient } : null),
    [sender, stored],
  );
  const j = useV2Journey(client, stored?.journeyId ?? null, wallet, want, describeError);

  const start = useCallback(
    async (t: TwoHopInfo, req: TwoHopRequest, onStep: (note: string | null) => void): Promise<string | null> => {
      if (!sender || !wallet) return "Connect a wallet first.";
      const check = checkTwoHop(t.quote, { ...req, sender, now: Math.floor(Date.now() / 1000) });
      if (!check.ok || !check.hop1?.plan) return `This route can no longer be signed: ${check.problems[0]}. Refresh the quote.`;
      const hop1 = t.quote.execution.hop1.plan;
      const commitKey = commitKeys.current.get(hop1.hash) ?? `journey-${crypto.randomUUID()}`;
      commitKeys.current.set(hop1.hash, commitKey);
      const entry = (journeyId: string): StoredJourney => ({
        journeyId, createdAt: Date.now(), fromChain: req.fromAsset.split("/")[0]!, viaChain: t.viaChain, toChain: req.toAsset.split("/")[0]!,
        toAsset: req.toAsset, recipient: req.recipient,
      });
      let started: string | null = null;
      try {
        await startTwoHop(client, t.quote, { plan: check.hop1.plan, sourceChainId: check.hop1.sourceChainId! }, wallet, {
          commitKey,
          remember: (journeyId) => {
            started = journeyId;
            rememberJourney(sender, entry(journeyId));
            setStored(entry(journeyId));
          },
          onStep: (id, phase) => onStep(phase === "wallet" ? `Confirm in your wallet (${id})` : phase === "confirming" ? `Waiting for confirmation (${id})` : null),
        });
        return null;
      } catch (e) {
        // Once committed, the journey panel carries on (its status is the server's word); before that, nothing exists.
        return started ? `The first order did not finish: ${describeError(e)}` : describeError(e);
      } finally {
        onStep(null);
      }
    },
    [client, sender, wallet, describeError],
  );

  const clear = useCallback(() => {
    if (sender && stored) forgetJourney(sender, stored.journeyId);
    setStored(null);
  }, [sender, stored]);

  return { journeyId: stored?.journeyId ?? null, stored, j, start, clear };
}
