import { act, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useBasketSession } from "./useBasketSession";
import { clearBasketSession, saveBasketSession } from "../utils/session";
import { modeCapability } from "./useBasketCapabilities";

afterEach(() => {
  clearBasketSession();
  vi.useRealTimers();
});

const WALLET = "0x1111111111111111111111111111111111111111";
const HASH = "0xcccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc";

function quote() {
  return {
    schemaVersion: 2,
    basketId: "basket-1",
    quoteVersion: 2,
    mode: "multi-to-one" as const,
    legs: [{ legId: "leg-1", legIndex: 0, estimatedOut: "1", minAmountOut: "1", etaSeconds: 1, feeUsd: 0, revenueTier: "agg-wired", opaqueLegRef: "leg-1", quoteExpiresAt: 9 }],
    totals: { inputsUsd: 0, outputsUsd: 0, feeUsd: 0, worstEtaSeconds: 1, parallelEtaSeconds: 1 },
    aggregateTier: "agg-wired",
    skipped: [],
    capabilities: { canPlan: true, canUseMulticall: false, canSatisfyAtomicRequired: false, unavailableReasons: [] },
    expiresAt: 9,
  };
}

function plan(transactions?: Array<{
  transactionId: string;
  chainId: number;
  to: string;
  data: string;
  value: string;
  kind: "approval" | "same-chain-swap" | "cross-chain-intent" | "multicall";
  coveredLegIds: string[];
}>) {
  return {
    schemaVersion: 2 as const,
    planId: "plan-1",
    basketId: "basket-1",
    version: 3,
    status: "READY" as const,
    approvals: [],
    transactions: transactions ?? [{
      transactionId: "tx-1",
      chainId: 8453,
      to: WALLET,
      data: "0x",
      value: "0",
      kind: "same-chain-swap" as const,
      coveredLegIds: ["leg-1"],
    }],
    legs: [],
    atomicity: { requested: false, achieved: false },
    simulation: { kind: "not-performed" as const },
    createdAt: 1,
    expiresAt: Date.now() + 3_600_000,
  };
}

describe("useBasketSession", () => {
  it("does not request a status signature after quoting", async () => {
    vi.useFakeTimers();
    const api = {
      quote: vi.fn().mockResolvedValue(quote()),
      getStatus: vi.fn(),
    };
    const signMessage = vi.fn().mockResolvedValue("0xsig");
    const { result } = renderHook(() => useBasketSession({
      api: api as any,
      now: () => 1700000000,
      wallet: {
        address: WALLET,
        chainId: 8453,
        signMessage,
        switchChain: vi.fn(),
        sendTransaction: vi.fn(),
      },
    }));
    await act(async () => {
      await result.current.requestQuote({
        mode: "multi-to-one",
        inputs: [{ chainId: 8453, token: WALLET, amount: "1", wallet: WALLET }],
        outputs: [{ chainId: 8453, token: WALLET, allocationBps: 10_000 }],
      }, "multi-to-one");
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(15_000);
    });
    expect(signMessage).not.toHaveBeenCalled();
    expect(api.getStatus).not.toHaveBeenCalled();
    vi.useRealTimers();
  });

  it("reuses one in-flight status signature instead of overlapping wallet prompts", async () => {
    let release: (value: string) => void = () => undefined;
    const signMessage = vi.fn().mockImplementation(() => new Promise<string>((resolve) => {
      release = resolve;
    }));
    const api = {
      getStatus: vi.fn().mockResolvedValue({
        schemaVersion: 2, basketId: "basket-1", composite: "IN_PROGRESS",
        counts: { total: 1, quoted: 0, ready: 1, submitted: 0, confirmed: 0, settled: 0, failed: 0, stuck: 0, skipped: 0 },
        legs: [], generatedAt: 1,
      }),
    };
    const { result } = renderHook(() => useBasketSession({
      api: api as any,
      now: () => 1700000000,
      wallet: {
        address: WALLET,
        chainId: 8453,
        signMessage,
        switchChain: vi.fn(),
        sendTransaction: vi.fn(),
      },
    }));
    const first = result.current.refreshStatus("basket-1", WALLET);
    const second = result.current.refreshStatus("basket-1", WALLET);
    await act(async () => {
      await Promise.resolve();
    });
    expect(signMessage).toHaveBeenCalledTimes(1);
    await act(async () => {
      release("0xsig");
      await Promise.all([first, second]);
    });
    expect(signMessage).toHaveBeenCalledTimes(1);
    expect(api.getStatus).toHaveBeenCalledTimes(1);
  });

  it("quotes, signs a plan, and acks only after a wallet hash", async () => {
    const api = {
      quote: vi.fn().mockResolvedValue(quote()),
      plan: vi.fn().mockResolvedValue(plan()),
      acknowledgeSubmitted: vi.fn().mockResolvedValue({ basketId: "basket-1", legId: "leg-1", state: "SUBMITTED", updatedAt: 1 }),
      getStatus: vi.fn().mockResolvedValue({
        schemaVersion: 2, basketId: "basket-1", composite: "IN_PROGRESS",
        counts: { total: 1, quoted: 0, ready: 0, submitted: 1, confirmed: 0, settled: 0, failed: 0, stuck: 0, skipped: 0 },
        legs: [], generatedAt: 1,
      }),
      retryLeg: vi.fn(),
    };
    const sendTransaction = vi.fn().mockResolvedValue(HASH);
    const signMessage = vi.fn().mockResolvedValue("0xsig");
    const { result } = renderHook(() => useBasketSession({
      api: api as any,
      now: () => 1700000000,
      randomUUID: () => "11111111-1111-4111-8111-111111111111",
      wallet: {
        address: WALLET,
        chainId: 8453,
        signMessage,
        switchChain: vi.fn(),
        sendTransaction,
      },
    }));

    await act(async () => {
      await result.current.requestQuote({
        mode: "multi-to-one",
        inputs: [{ chainId: 8453, token: WALLET, amount: "1", wallet: WALLET }],
        outputs: [{ chainId: 8453, token: WALLET, allocationBps: 10_000 }],
      }, "multi-to-one");
    });
    await act(async () => {
      await result.current.requestPlan();
    });
    await act(async () => {
      await result.current.executePlan();
    });

    expect(api.plan).toHaveBeenCalled();
    expect(sendTransaction).toHaveBeenCalled();
    expect(api.acknowledgeSubmitted).toHaveBeenCalledWith(
      "basket-1",
      "leg-1",
      expect.objectContaining({ txHash: HASH }),
      "11111111-1111-4111-8111-111111111111",
    );
    expect(result.current.executeLocked).toBe(true);
  });

  it("does not ack when the wallet rejects and only retries failed legs", async () => {
    const api = {
      quote: vi.fn().mockResolvedValue(quote()),
      plan: vi.fn().mockResolvedValue(plan()),
      acknowledgeSubmitted: vi.fn(),
      retryLeg: vi.fn().mockResolvedValue({}),
      getStatus: vi.fn().mockResolvedValue({
        schemaVersion: 2, basketId: "basket-1", composite: "PARTIAL_FAILED",
        counts: { total: 2, quoted: 0, ready: 0, submitted: 0, confirmed: 0, settled: 1, failed: 1, stuck: 0, skipped: 0 },
        legs: [
          { legId: "leg-ok", legIndex: 0, legKind: "single-chain", state: "SETTLED", attemptNumber: 1, updatedAt: 1 },
          { legId: "leg-bad", legIndex: 1, legKind: "cross-chain", state: "FAILED", attemptNumber: 1, updatedAt: 1 },
        ],
        generatedAt: 1,
      }),
    };
    const { result } = renderHook(() => useBasketSession({
      api: api as any,
      now: () => 1700000000,
      randomUUID: () => "22222222-2222-4222-8222-222222222222",
      wallet: {
        address: WALLET,
        chainId: 8453,
        signMessage: vi.fn().mockResolvedValue("0xsig"),
        switchChain: vi.fn(),
        sendTransaction: vi.fn().mockRejectedValue({ code: 4001, message: "User rejected the request" }),
      },
    }));

    await act(async () => {
      await result.current.requestQuote({
        mode: "one-to-many",
        inputs: [{ chainId: 8453, token: WALLET, amount: "1", wallet: WALLET }],
        outputs: [{ chainId: 8453, token: WALLET, allocationBps: 10_000 }],
      }, "one-to-many");
    });
    await act(async () => {
      await result.current.requestPlan();
    });
    await act(async () => {
      await expect(result.current.executePlan()).rejects.toBeTruthy();
    });
    expect(api.acknowledgeSubmitted).not.toHaveBeenCalled();

    await act(async () => {
      await result.current.refreshStatus("basket-1", WALLET);
    });
    await act(async () => {
      await result.current.retryFailedLegs();
    });
    expect(api.retryLeg).toHaveBeenCalledWith(
      "basket-1",
      "leg-bad",
      expect.anything(),
      "22222222-2222-4222-8222-222222222222",
    );
    expect(api.retryLeg.mock.calls.map((call: unknown[]) => call[1])).toEqual(["leg-bad"]);
  });

  it("retries failed legs from persisted planVersion when plan is null", async () => {
    saveBasketSession({ basketId: "basket-9", wallet: WALLET, mode: "many-to-many", planVersion: 7 });
    const api = {
      getStatus: vi.fn().mockResolvedValue({
        schemaVersion: 2, basketId: "basket-9", composite: "PARTIAL_FAILED",
        counts: { total: 1, quoted: 0, ready: 0, submitted: 0, confirmed: 0, settled: 0, failed: 1, stuck: 0, skipped: 0 },
        legs: [
          { legId: "leg-bad", legIndex: 0, legKind: "cross-chain", state: "FAILED", attemptNumber: 1, updatedAt: 1 },
        ],
        generatedAt: 1,
      }),
      retryLeg: vi.fn().mockResolvedValue({}),
    };
    const { result } = renderHook(() => useBasketSession({
      api: api as any,
      now: () => 1700000000,
      randomUUID: () => "33333333-3333-4333-8333-333333333333",
      wallet: {
        address: WALLET,
        chainId: 8453,
        signMessage: vi.fn().mockResolvedValue("0xsig"),
        switchChain: vi.fn(),
        sendTransaction: vi.fn(),
      },
    }));
    await act(async () => {
      await vi.waitFor(() => expect(api.getStatus).toHaveBeenCalled());
    });
    expect(result.current.plan).toBeNull();
    await act(async () => {
      await result.current.retryFailedLegs();
    });
    expect(api.retryLeg).toHaveBeenCalledWith(
      "basket-9",
      "leg-bad",
      expect.objectContaining({ expectedPlanVersion: 7 }),
      "33333333-3333-4333-8333-333333333333",
    );
  });

  it("does not refetch status on render churn", async () => {
    saveBasketSession({ basketId: "basket-9", wallet: WALLET, mode: "many-to-many", planVersion: 1 });
    const api = {
      getStatus: vi.fn().mockResolvedValue({
        schemaVersion: 2, basketId: "basket-9", composite: "IN_PROGRESS",
        counts: { total: 1, quoted: 0, ready: 1, submitted: 0, confirmed: 0, settled: 0, failed: 0, stuck: 0, skipped: 0 },
        legs: [], generatedAt: 1,
      }),
    };
    const { rerender } = renderHook(({ chainId }) => useBasketSession({
      api: api as any,
      now: () => 1700000000,
      wallet: {
        address: WALLET,
        chainId,
        signMessage: vi.fn().mockResolvedValue("0xsig"),
        switchChain: vi.fn(),
        sendTransaction: vi.fn(),
      },
    }), { initialProps: { chainId: 8453 } });
    await act(async () => {
      await vi.waitFor(() => expect(api.getStatus).toHaveBeenCalledTimes(1));
    });
    rerender({ chainId: 1 });
    rerender({ chainId: 8453 });
    rerender({ chainId: 137 });
    await act(async () => { await Promise.resolve(); });
    expect(api.getStatus).toHaveBeenCalledTimes(1);
  });

  it("switches back to chain A after an intervening B hop even if render chainId stays A", async () => {
    const switchChain = vi.fn(async (chainId: number) => ({ id: chainId }));
    const api = {
      quote: vi.fn().mockResolvedValue(quote()),
      plan: vi.fn().mockResolvedValue(plan([
        { transactionId: "tx-a", chainId: 8453, to: WALLET, data: "0xa", value: "0", kind: "same-chain-swap", coveredLegIds: ["leg-1"] },
        { transactionId: "tx-b", chainId: 1, to: WALLET, data: "0xb", value: "0", kind: "same-chain-swap", coveredLegIds: ["leg-2"] },
        { transactionId: "tx-a2", chainId: 8453, to: WALLET, data: "0xc", value: "0", kind: "same-chain-swap", coveredLegIds: ["leg-3"] },
      ])),
      acknowledgeSubmitted: vi.fn().mockResolvedValue({ basketId: "basket-1", legId: "leg-1", state: "SUBMITTED", updatedAt: 1 }),
      getStatus: vi.fn().mockResolvedValue({
        schemaVersion: 2, basketId: "basket-1", composite: "IN_PROGRESS",
        counts: { total: 3, quoted: 0, ready: 0, submitted: 3, confirmed: 0, settled: 0, failed: 0, stuck: 0, skipped: 0 },
        legs: [], generatedAt: 1,
      }),
    };
    const { result } = renderHook(() => useBasketSession({
      api: api as any,
      now: () => 1700000000,
      randomUUID: () => "44444444-4444-4444-8444-444444444444",
      wallet: {
        address: WALLET,
        chainId: 8453,
        signMessage: vi.fn().mockResolvedValue("0xsig"),
        switchChain,
        sendTransaction: vi.fn().mockResolvedValue(HASH),
      },
    }));
    await act(async () => {
      await result.current.requestQuote({
        mode: "multi-to-one",
        inputs: [{ chainId: 8453, token: WALLET, amount: "1", wallet: WALLET }],
        outputs: [{ chainId: 8453, token: WALLET, allocationBps: 10_000 }],
      }, "multi-to-one");
    });
    await act(async () => {
      await result.current.requestPlan();
    });
    await act(async () => {
      await result.current.executePlan();
    });
    expect(switchChain.mock.calls.map((call) => call[0])).toEqual([1, 8453]);
  });

  it("skips settled execution txs on a later execute and clears quote independently", async () => {
    const sendTransaction = vi.fn()
      .mockResolvedValueOnce(HASH)
      .mockRejectedValueOnce({ code: 4001, message: "User rejected the request" })
      .mockResolvedValueOnce(HASH);
    const api = {
      quote: vi.fn().mockResolvedValue(quote()),
      plan: vi.fn().mockResolvedValue(plan([
        { transactionId: "tx-1", chainId: 8453, to: WALLET, data: "0x01", value: "0", kind: "same-chain-swap", coveredLegIds: ["leg-1"] },
        { transactionId: "tx-2", chainId: 8453, to: WALLET, data: "0x02", value: "0", kind: "same-chain-swap", coveredLegIds: ["leg-2"] },
      ])),
      acknowledgeSubmitted: vi.fn().mockResolvedValue({ basketId: "basket-1", legId: "leg-1", state: "SUBMITTED", updatedAt: 1 }),
      getStatus: vi.fn().mockResolvedValue({
        schemaVersion: 2, basketId: "basket-1", composite: "IN_PROGRESS",
        counts: { total: 2, quoted: 0, ready: 0, submitted: 1, confirmed: 0, settled: 0, failed: 0, stuck: 0, skipped: 0 },
        legs: [], generatedAt: 1,
      }),
    };
    const { result } = renderHook(() => useBasketSession({
      api: api as any,
      now: () => 1700000000,
      randomUUID: () => "55555555-5555-4555-8555-555555555555",
      wallet: {
        address: WALLET,
        chainId: 8453,
        signMessage: vi.fn().mockResolvedValue("0xsig"),
        switchChain: vi.fn(),
        sendTransaction,
      },
    }));
    await act(async () => {
      await result.current.requestQuote({
        mode: "multi-to-one",
        inputs: [{ chainId: 8453, token: WALLET, amount: "1", wallet: WALLET }],
        outputs: [{ chainId: 8453, token: WALLET, allocationBps: 10_000 }],
      }, "multi-to-one");
    });
    await act(async () => {
      await result.current.requestPlan();
    });
    await act(async () => {
      await expect(result.current.executePlan()).rejects.toBeTruthy();
    });
    expect(result.current.acknowledgedTransactionIds).toEqual(["tx-1"]);
    await act(async () => {
      await result.current.executePlan();
    });
    expect(sendTransaction.mock.calls.map((call) => call[0].data)).toEqual(["0x01", "0x02", "0x02"]);
    act(() => {
      result.current.clearQuote();
    });
    expect(result.current.quote).toBeNull();
    expect(result.current.plan).toBeNull();
  });

  it("does not resume a quote-only session into status signatures", async () => {
    saveBasketSession({ basketId: "basket-quote-only", wallet: WALLET, mode: "multi-to-one", quoteVersion: 1 });
    const api = { getStatus: vi.fn() };
    const signMessage = vi.fn().mockResolvedValue("0xsig");
    renderHook(() => useBasketSession({
      api: api as any,
      now: () => 1700000000,
      wallet: {
        address: WALLET,
        chainId: 8453,
        signMessage,
        switchChain: vi.fn(),
        sendTransaction: vi.fn(),
      },
    }));
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(signMessage).not.toHaveBeenCalled();
    expect(api.getStatus).not.toHaveBeenCalled();
  });

  it("resumes from persisted ids and disables disabled capabilities", async () => {
    saveBasketSession({ basketId: "basket-9", wallet: WALLET, mode: "many-to-many", planVersion: 1 });
    const api = {
      getStatus: vi.fn().mockResolvedValue({
        schemaVersion: 2, basketId: "basket-9", composite: "IN_PROGRESS",
        counts: { total: 1, quoted: 0, ready: 1, submitted: 0, confirmed: 0, settled: 0, failed: 0, stuck: 0, skipped: 0 },
        legs: [], generatedAt: 1,
      }),
    };
    renderHook(() => useBasketSession({
      api: api as any,
      wallet: {
        address: WALLET,
        chainId: 8453,
        signMessage: vi.fn().mockResolvedValue("0xsig"),
        switchChain: vi.fn(),
        sendTransaction: vi.fn(),
      },
    }));
    await act(async () => {
      await vi.waitFor(() => expect(api.getStatus).toHaveBeenCalled());
    });
    expect(modeCapability({
      enabled: false,
      modes: {
        "multi-to-one": { enabled: false, reason: "intent baskets are disabled" },
        "one-to-many": { enabled: false },
        "wallet-liquidator": { enabled: false },
        "many-to-many": { enabled: false },
      },
      supportedChainIds: [],
      limits: {},
      multicall: {},
    }, "multi-to-one").reason).toMatch(/disabled/i);
  });
});
