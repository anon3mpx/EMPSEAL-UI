// One single-order transfer after it was committed (plan 7.1–7.3): polls GET /v2/intents/:id with backoff (2 s → 15 s) until a terminal
// status, keeps it in the wallet's history with its last status, and claims a parked delivery for its recipient. The status is the server's word.
// An earlier transfer is never opened by itself on load: it is listed in `history`, and `track` opens it.
import { useCallback, useEffect, useState } from "react";
import { encodeFunctionData, parseAbi } from "viem";
import type { CrossV2Client } from "./client";
import { EMPX_DEPLOYMENTS } from "./deployments";
import type { WalletPort } from "./execute";
import { noteIntentStatus, openIntents, rememberIntent, type StoredIntent } from "./journeyStore";
import { TERMINAL_STATUSES, type CompositionStatus, type IntentStatus } from "./types";

const POLL_START_MS = 2_000;
const POLL_MAX_MS = 15_000;
const SETTLER_ABI = parseAbi(["function claim(bytes32 key, address to)"]);
const eq = (a: string, b: string) => a.toLowerCase() === b.toLowerCase();

/** The claim, if the page may send it: the settler is one EMPX publishes on that chain, and the funds go to the signed recipient only. */
export function claimTx(status: IntentStatus | null, wallet: string | undefined): { chainId: number; to: string; data: string } | null {
  const c = status?.status === "parked" ? status.claim : null;
  if (!c || !wallet) return null;
  const chainId = Number(/^eip155:(\d+)$/.exec(c.chain)?.[1]);
  const d = EMPX_DEPLOYMENTS[chainId];
  if (!d || !Object.values(d.rails).some((r) => eq(r.settler, c.settler))) return null;
  if (!/^0x[0-9a-fA-F]{64}$/.test(c.key) || !/^0x[0-9a-fA-F]{40}$/.test(c.recipient)) return null;
  return {
    chainId,
    to: c.settler,
    data: encodeFunctionData({ abi: SETTLER_ABI, functionName: "claim", args: [c.key as `0x${string}`, c.recipient as `0x${string}`] }),
  };
}

export interface V2IntentState {
  intentId: string | null;
  stored: StoredIntent | null;
  /** This wallet's transfers, newest first, with the last status seen. */
  history: StoredIntent[];
  status: IntentStatus | null;
  composition: CompositionStatus | null;
  pollError: string | null;
  claiming: boolean;
  /** Starts tracking a transfer: one the page just committed, or one picked from the history. */
  track: (i: StoredIntent) => void;
  claim: () => Promise<string | null>;
  clear: () => void;
}

export function useV2Intent(client: CrossV2Client, sender: string | undefined, wallet: WalletPort | null, describeError: (e: unknown) => string): V2IntentState {
  const [stored, setStored] = useState<StoredIntent | null>(null);
  const [status, setStatus] = useState<IntentStatus | null>(null);
  const [composition, setComposition] = useState<CompositionStatus | null>(null);
  const [pollError, setPollError] = useState<string | null>(null);
  const [claiming, setClaiming] = useState(false);
  const [nonce, setNonce] = useState(0);
  const [history, setHistory] = useState<StoredIntent[]>([]);
  const intentId = stored?.intentId ?? null;
  const reloadHistory = useCallback(() => setHistory(sender ? openIntents(sender) : []), [sender]);

  // A new wallet starts with nothing open; its earlier transfers are in the history.
  useEffect(() => {
    setStored(null);
    setStatus(null);
    setComposition(null);
    reloadHistory();
  }, [reloadHistory]);

  useEffect(() => {
    if (!intentId) return;
    const ctl = new AbortController();
    let wait = POLL_START_MS;
    let timer: ReturnType<typeof setTimeout>;
    const tick = async () => {
      try {
        const combined = stored?.compositionId ? await client.compositionStatus(stored.compositionId, ctl.signal) : null;
        const s = combined?.primary ?? await client.status(intentId, ctl.signal);
        if (ctl.signal.aborted) return;
        setStatus(s);
        setComposition(combined);
        setPollError(null);
        if (sender) {
          noteIntentStatus(sender, intentId, combined ? combined.state : s.status);
          reloadHistory();
        }
        if (combined ? combined.state !== "in_progress" : TERMINAL_STATUSES.has(s.status)) return;
      } catch (e) {
        if (ctl.signal.aborted) return;
        setPollError(describeError(e));
      }
      wait = Math.min(POLL_MAX_MS, wait * 1.5);
      timer = setTimeout(tick, wait);
    };
    void tick();
    return () => {
      ctl.abort();
      clearTimeout(timer);
    };
  }, [client, intentId, stored?.compositionId, sender, nonce, describeError, reloadHistory]);

  const track = useCallback(
    (i: StoredIntent) => {
      if (sender) rememberIntent(sender, i);
      reloadHistory();
      // Re-tracking the same transfer (a new transaction was sent) keeps its status; a new one starts empty.
      if (stored?.intentId !== i.intentId) setStatus(null);
      if (stored?.intentId !== i.intentId) setComposition(null);
      setStored(i);
    },
    [sender, stored?.intentId, reloadHistory],
  );

  const claim = useCallback(async (): Promise<string | null> => {
    const tx = claimTx(status, sender);
    if (!tx || !wallet) return "This delivery can't be claimed from here.";
    setClaiming(true);
    try {
      await wallet.ensureChain(tx.chainId);
      await wallet.sendTransaction({ ...tx, value: 0n });
      setNonce((n) => n + 1);
      return null;
    } catch (e) {
      return describeError(e);
    } finally {
      setClaiming(false);
    }
  }, [status, sender, wallet, describeError]);

  // Closes the panel; the transfer stays in the history.
  const clear = useCallback(() => {
    setStored(null);
    setStatus(null);
    setComposition(null);
    setPollError(null);
  }, []);

  return { intentId, stored, history, status, composition, pollError, claiming, track, claim, clear };
}
