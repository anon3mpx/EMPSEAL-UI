import { useCallback, useEffect, useRef, useState } from "react";
import { basketApi } from "../api/basketApi";
import type {
  BasketExecutionPlan,
  BasketMode,
  BasketQuote,
  BasketQuoteRequest,
  BasketSessionSnapshot,
  BasketStatus,
  SignedBasketAction,
} from "../api/contracts";
import {
  allExecutionTransactionsAcknowledged,
  executeBasketPlan,
  failedLegs,
  isTerminalBasketStatus,
  isTxHash,
} from "../execution/basketExecution";
import { skippedLegIds } from "../model/modes";
import { isUserRejectedError, mapBasketApiError } from "../utils/errors";
import {
  clearBasketSession,
  loadBasketSession,
  saveBasketSession,
} from "../utils/session";
import {
  buildBasketActionMessage,
  createUnsignedBasketAction,
} from "../utils/signatures";
import { chainIdFromSwitchResult, requireWalletForAction } from "../utils/wallet";

const STATUS_TTL_SECONDS = 600;
const ACTION_TTL_SECONDS = 120;
const STATUS_POLL_MS = 5_000;

export interface BasketWalletAdapter {
  address?: string | null;
  chainId?: number | null;
  signMessage: (message: string) => Promise<string>;
  switchChain: (chainId: number) => Promise<unknown>;
  sendTransaction: (tx: {
    to: string;
    data: string;
    value: string;
    chainId: number;
  }) => Promise<string>;
  approveToken?: (approval: {
    token: string;
    spender: string;
    amount: string;
    chainId: number;
  }) => Promise<string>;
  getConnectedChainId?: () => number | null | undefined;
}

export function useBasketSession(input: {
  wallet: BasketWalletAdapter;
  now?: () => number;
  randomUUID?: () => string;
  api?: typeof basketApi;
}) {
  const api = input.api ?? basketApi;
  const nowRef = useRef(input.now);
  nowRef.current = input.now;
  const randomUUIDRef = useRef(input.randomUUID);
  randomUUIDRef.current = input.randomUUID;
  const walletRef = useRef(input.wallet);
  walletRef.current = input.wallet;
  const apiRef = useRef(api);
  apiRef.current = api;

  const getNow = useCallback(() => {
    return (nowRef.current ?? (() => Math.floor(Date.now() / 1000)))();
  }, []);
  const nextUUID = useCallback(() => {
    return (randomUUIDRef.current ?? (() => crypto.randomUUID()))();
  }, []);

  const [quote, setQuote] = useState<BasketQuote | null>(null);
  const [plan, setPlan] = useState<BasketExecutionPlan | null>(null);
  const [status, setStatus] = useState<BasketStatus | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [storedPlanVersion, setStoredPlanVersion] = useState<number | undefined>();
  const [acknowledgedTransactionIds, setAcknowledgedTransactionIds] = useState<string[]>([]);
  const statusAuth = useRef<SignedBasketAction | null>(null);
  const resumedBasketId = useRef<string | null>(null);
  const statusRef = useRef<BasketStatus | null>(null);
  const storedPlanVersionRef = useRef<number | undefined>(undefined);
  const statusInFlight = useRef<Promise<BasketStatus> | null>(null);
  const statusPollPaused = useRef(false);
  statusRef.current = status;
  storedPlanVersionRef.current = storedPlanVersion;

  const persist = useCallback((snapshot: BasketSessionSnapshot) => {
    saveBasketSession(snapshot);
    if (snapshot.planVersion != null) {
      storedPlanVersionRef.current = snapshot.planVersion;
      setStoredPlanVersion(snapshot.planVersion);
    }
  }, []);

  const signAction = useCallback(async (unsigned: ReturnType<typeof createUnsignedBasketAction>) => {
    const wallet = walletRef.current;
    const address = await requireWalletForAction({
      connectedAddress: wallet.address,
      connectedChainId: wallet.chainId,
      expectedAddress: unsigned.wallet,
    });
    const signature = await wallet.signMessage(buildBasketActionMessage(unsigned));
    return { ...unsigned, wallet: address, signature };
  }, []);

  const refreshStatus = useCallback(async (basketId: string, wallet: string) => {
    if (statusInFlight.current) return statusInFlight.current;

    const run = (async () => {
      const current = getNow();
      let signed = statusAuth.current;
      if (!signed || signed.basketId !== basketId || signed.expiresAt <= current + 30) {
        signed = await signAction(createUnsignedBasketAction({
          action: "status",
          basketId,
          wallet,
          timestamp: current,
          expiresAt: current + STATUS_TTL_SECONDS,
        }));
        statusAuth.current = signed;
      }
      const next = await apiRef.current.getStatus(basketId, signed);
      statusRef.current = next;
      setStatus(next);
      return next;
    })();

    statusInFlight.current = run;
    try {
      const next = await run;
      statusPollPaused.current = false;
      return next;
    } catch (error) {
      if (isUserRejectedError(error)) statusPollPaused.current = true;
      throw error;
    } finally {
      if (statusInFlight.current === run) statusInFlight.current = null;
    }
  }, [getNow, signAction]);

  useEffect(() => {
    const snapshot = loadBasketSession();
    const address = input.wallet.address;
    if (!snapshot || !address) return;
    if (snapshot.wallet.toLowerCase() !== address.toLowerCase()) return;
    if (snapshot.planVersion != null) {
      storedPlanVersionRef.current = snapshot.planVersion;
      setStoredPlanVersion(snapshot.planVersion);
    }
    // Quote-only snapshots must not prompt a status signature.
    if (snapshot.planVersion == null && !snapshot.planId) return;
    if (resumedBasketId.current === snapshot.basketId) return;
    resumedBasketId.current = snapshot.basketId;
    void (async () => {
      try {
        await refreshStatus(snapshot.basketId, snapshot.wallet);
      } catch (error) {
        setErrorMessage(mapBasketApiError(error));
      }
    })();
  }, [input.wallet.address, refreshStatus]);

  useEffect(() => {
    const wallet = input.wallet.address;
    const basketId = status?.basketId;
    if (!basketId || !wallet) return;
    if (isTerminalBasketStatus(status?.composite)) return;
    if (statusPollPaused.current) return;
    const timer = window.setInterval(() => {
      if (statusPollPaused.current) return;
      if (isTerminalBasketStatus(statusRef.current?.composite)) return;
      void refreshStatus(basketId, wallet).catch((error) => {
        setErrorMessage(mapBasketApiError(error));
      });
    }, STATUS_POLL_MS);
    return () => window.clearInterval(timer);
  }, [input.wallet.address, refreshStatus, status?.basketId, status?.composite]);

  const requestQuote = useCallback(async (payload: BasketQuoteRequest, mode: BasketMode) => {
    setBusy(true);
    setErrorMessage(null);
    try {
      const nextQuote = await apiRef.current.quote(payload);
      setQuote(nextQuote);
      setPlan(null);
      setAcknowledgedTransactionIds([]);
      persist({
        basketId: nextQuote.basketId,
        quoteVersion: nextQuote.quoteVersion,
        wallet: payload.inputs[0]!.wallet,
        mode,
      });
      return nextQuote;
    } catch (error) {
      const message = mapBasketApiError(error);
      setErrorMessage(message);
      throw error;
    } finally {
      setBusy(false);
    }
  }, [persist]);

  const requestPlan = useCallback(async () => {
    if (!quote) throw new Error("Quote a basket before planning.");
    if (!quote.capabilities.canPlan) {
      throw new Error(quote.capabilities.unavailableReasons[0] ?? "Planning is unavailable for this quote.");
    }
    setBusy(true);
    setErrorMessage(null);
    statusPollPaused.current = false;
    try {
      const timestamp = getNow();
      const idempotencyKey = nextUUID();
      const unsigned = createUnsignedBasketAction({
        action: "plan",
        basketId: quote.basketId,
        wallet: walletRef.current.address ?? "",
        planVersion: quote.quoteVersion,
        idempotencyKey,
        timestamp,
        expiresAt: timestamp + ACTION_TTL_SECONDS,
      });
      const signed = await signAction(unsigned);
      const nextPlan = await apiRef.current.plan(quote.basketId, {
        basketId: quote.basketId,
        expectedQuoteVersion: quote.quoteVersion,
        acknowledgeSkippedLegIds: skippedLegIds(quote.skipped),
        mode: "sequential",
        wallet: signed.wallet,
        timestamp: signed.timestamp,
        expiresAt: signed.expiresAt,
        signature: signed.signature,
      }, idempotencyKey);
      setPlan(nextPlan);
      setAcknowledgedTransactionIds([]);
      persist({
        basketId: quote.basketId,
        quoteVersion: quote.quoteVersion,
        planId: nextPlan.planId,
        planVersion: nextPlan.version,
        wallet: signed.wallet,
        mode: quote.mode,
      });
      return nextPlan;
    } catch (error) {
      const message = mapBasketApiError(error);
      setErrorMessage(message);
      throw error;
    } finally {
      setBusy(false);
    }
  }, [getNow, nextUUID, persist, quote, signAction]);

  const executePlan = useCallback(async () => {
    const currentPlan = plan;
    const wallet = walletRef.current;
    if (!currentPlan || !quote || !wallet.address) {
      throw new Error("Plan a basket before execution.");
    }
    setBusy(true);
    setErrorMessage(null);
    statusPollPaused.current = false;
    try {
      let liveChainId = wallet.getConnectedChainId?.() ?? wallet.chainId ?? null;
      await executeBasketPlan(currentPlan, {
        ensureWallet: async (chainId) => {
          const current = walletRef.current;
          const address = await requireWalletForAction({
            connectedAddress: current.address,
            connectedChainId: liveChainId,
            expectedAddress: current.address!,
            expectedChainId: chainId,
            switchChain: async (id) => {
              const result = await current.switchChain(id);
              liveChainId = chainIdFromSwitchResult(result, id);
              return result;
            },
            getConnectedChainId: () => liveChainId,
          });
          liveChainId = chainId;
          return address;
        },
        sendTransaction: (tx) => walletRef.current.sendTransaction(tx),
        approveToken: walletRef.current.approveToken
          ? (approval) => walletRef.current.approveToken!(approval)
          : undefined,
        acknowledgeSubmitted: async ({ legId, transactionId, txHash, chainId, sender }) => {
          if (!isTxHash(txHash)) {
            throw new Error("WALLET_TX_HASH_MISSING: wallet did not return a transaction hash");
          }
          const timestamp = getNow();
          const idempotencyKey = nextUUID();
          const signed = await signAction(createUnsignedBasketAction({
            action: "submitted",
            basketId: currentPlan.basketId,
            wallet: sender,
            legId,
            planVersion: currentPlan.version,
            idempotencyKey,
            timestamp,
            expiresAt: timestamp + ACTION_TTL_SECONDS,
          }));
          const response = await apiRef.current.acknowledgeSubmitted(currentPlan.basketId, legId, {
            basketId: currentPlan.basketId,
            legId,
            transactionId,
            txHash,
            chainId,
            sender,
            expectedPlanVersion: currentPlan.version,
            wallet: signed.wallet,
            timestamp: signed.timestamp,
            expiresAt: signed.expiresAt,
            signature: signed.signature,
          }, idempotencyKey);
          setAcknowledgedTransactionIds((prev) => (
            prev.includes(transactionId) ? prev : [...prev, transactionId]
          ));
          return response;
        },
      }, { skipTransactionIds: acknowledgedTransactionIds });
      return refreshStatus(currentPlan.basketId, wallet.address);
    } catch (error) {
      const message = mapBasketApiError(error);
      setErrorMessage(message);
      throw error;
    } finally {
      setBusy(false);
    }
  }, [acknowledgedTransactionIds, getNow, nextUUID, plan, quote, refreshStatus, signAction]);

  const retryFailedLegs = useCallback(async () => {
    const currentStatus = statusRef.current;
    const planVersion = plan?.version ?? storedPlanVersionRef.current;
    const walletAddress = walletRef.current.address;
    if (!currentStatus || planVersion == null || !walletAddress) {
      throw new Error("Reload basket status before retrying.");
    }
    const retryable = failedLegs(currentStatus);
    if (retryable.length === 0) {
      throw new Error("Only failed legs can be retried.");
    }
    setBusy(true);
    setErrorMessage(null);
    statusPollPaused.current = false;
    try {
      for (const leg of retryable) {
        const timestamp = getNow();
        const idempotencyKey = nextUUID();
        const signed = await signAction(createUnsignedBasketAction({
          action: "retry",
          basketId: currentStatus.basketId,
          wallet: walletAddress,
          legId: leg.legId,
          planVersion,
          idempotencyKey,
          timestamp,
          expiresAt: timestamp + ACTION_TTL_SECONDS,
        }));
        await apiRef.current.retryLeg(currentStatus.basketId, leg.legId, {
          basketId: currentStatus.basketId,
          legId: leg.legId,
          expectedPlanVersion: planVersion,
          wallet: signed.wallet,
          timestamp: signed.timestamp,
          expiresAt: signed.expiresAt,
          signature: signed.signature,
        }, idempotencyKey);
      }
      return refreshStatus(currentStatus.basketId, walletAddress);
    } catch (error) {
      const message = mapBasketApiError(error);
      setErrorMessage(message);
      throw error;
    } finally {
      setBusy(false);
    }
  }, [getNow, nextUUID, plan, refreshStatus, signAction]);

  const clearQuote = useCallback(() => {
    setQuote(null);
    setPlan(null);
    setAcknowledgedTransactionIds([]);
  }, []);

  const reset = useCallback(() => {
    setQuote(null);
    setPlan(null);
    setStatus(null);
    setErrorMessage(null);
    setStoredPlanVersion(undefined);
    setAcknowledgedTransactionIds([]);
    statusAuth.current = null;
    resumedBasketId.current = null;
    statusInFlight.current = null;
    statusPollPaused.current = false;
    clearBasketSession();
  }, []);

  const executeLocked = Boolean(
    plan && allExecutionTransactionsAcknowledged(plan, acknowledgedTransactionIds),
  ) || status?.composite === "SETTLED";

  return {
    quote,
    plan,
    status,
    errorMessage,
    busy,
    executeLocked,
    acknowledgedTransactionIds,
    requestQuote,
    requestPlan,
    executePlan,
    retryFailedLegs,
    refreshStatus,
    clearQuote,
    reset,
    failedLegs: status ? failedLegs(status) : [],
  };
}
