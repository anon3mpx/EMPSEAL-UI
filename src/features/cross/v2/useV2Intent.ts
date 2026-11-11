// One single-order transfer after it was committed (plan 7.1–7.3): polls GET /v2/intents/:id with backoff (2 s → 15 s) until a terminal
// status, remembers it per wallet so a reload resumes it, and claims a parked delivery for its recipient. The status is the server's word.
import { useCallback, useEffect, useState } from "react";
import { encodeFunctionData, parseAbi } from "viem";
import type { CrossV2Client } from "./client";
import { EMPX_DEPLOYMENTS } from "./deployments";
import type { WalletPort } from "./execute";
import { forgetIntent, openIntents, rememberIntent, type StoredIntent } from "./journeyStore";
import { TERMINAL_STATUSES, type IntentStatus } from "./types";

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
  status: IntentStatus | null;
  pollError: string | null;
  claiming: boolean;
  /** Starts tracking a transfer the page just committed. */
  track: (i: StoredIntent) => void;
  claim: () => Promise<string | null>;
  clear: () => void;
}

export function useV2Intent(client: CrossV2Client, sender: string | undefined, wallet: WalletPort | null, describeError: (e: unknown) => string): V2IntentState {
  const [stored, setStored] = useState<StoredIntent | null>(null);
  const [status, setStatus] = useState<IntentStatus | null>(null);
  const [pollError, setPollError] = useState<string | null>(null);
  const [claiming, setClaiming] = useState(false);
  const [nonce, setNonce] = useState(0);
  const intentId = stored?.intentId ?? null;

  // Resume the newest transfer this wallet left open.
  useEffect(() => {
    setStored(sender ? openIntents(sender)[0] ?? null : null);
    setStatus(null);
  }, [sender]);

  useEffect(() => {
    if (!intentId) return;
    const ctl = new AbortController();
    let wait = POLL_START_MS;
    let timer: ReturnType<typeof setTimeout>;
    const tick = async () => {
      try {
        const s = await client.status(intentId, ctl.signal);
        if (ctl.signal.aborted) return;
        setStatus(s);
        setPollError(null);
        if (TERMINAL_STATUSES.has(s.status)) {
          if (sender) forgetIntent(sender, intentId);
          return;
        }
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
  }, [client, intentId, sender, nonce, describeError]);

  const track = useCallback(
    (i: StoredIntent) => {
      if (sender) rememberIntent(sender, i);
      // Re-tracking the same transfer (a new transaction was sent) keeps its status; a new one starts empty.
      if (stored?.intentId !== i.intentId) setStatus(null);
      setStored(i);
    },
    [sender, stored?.intentId],
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

  const clear = useCallback(() => {
    if (sender && intentId) forgetIntent(sender, intentId);
    setStored(null);
    setStatus(null);
    setPollError(null);
  }, [sender, intentId]);

  return { intentId, stored, status, pollError, claiming, track, claim, clear };
}
