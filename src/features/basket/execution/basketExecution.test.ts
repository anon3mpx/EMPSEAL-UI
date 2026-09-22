import { describe, expect, it, vi } from "vitest";
import {
  executableTransactions,
  executeBasketPlan,
  failedLegs,
  isTerminalBasketStatus,
  isTxHash,
} from "./basketExecution";
import type { BasketExecutionPlan, BasketStatus } from "../api/contracts";

const HASH = "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb";
const APPROVAL_HASH = "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
const WALLET = "0x1111111111111111111111111111111111111111";

function plan(overrides: Partial<BasketExecutionPlan> = {}): BasketExecutionPlan {
  return {
    schemaVersion: 2,
    planId: "plan-1",
    basketId: "basket-1",
    version: 1,
    status: "READY",
    approvals: [],
    transactions: [{
      transactionId: "tx-1",
      chainId: 8453,
      to: WALLET,
      data: "0xdead",
      value: "0",
      kind: "same-chain-swap",
      coveredLegIds: ["leg-1"],
    }],
    legs: [],
    atomicity: { requested: false, achieved: false },
    simulation: { kind: "not-performed" },
    createdAt: 1,
    expiresAt: Date.now() + 3_600_000,
    ...overrides,
  };
}

describe("executeBasketPlan", () => {
  it("acknowledges a leg only after the wallet returns a hash", async () => {
    const acknowledgeSubmitted = vi.fn();
    await expect(
      executeBasketPlan(plan(), {
        ensureWallet: async () => WALLET,
        sendTransaction: async () => "",
        acknowledgeSubmitted,
      }),
    ).rejects.toThrow(/WALLET_TX_HASH_MISSING/);
    expect(acknowledgeSubmitted).not.toHaveBeenCalled();
  });

  it("sends server calldata and then acknowledges the covered leg", async () => {
    const sendTransaction = vi.fn().mockResolvedValue(HASH);
    const acknowledgeSubmitted = vi.fn().mockResolvedValue({
      basketId: "basket-1",
      legId: "leg-1",
      state: "SUBMITTED",
      updatedAt: 1,
    });
    await expect(
      executeBasketPlan(plan(), {
        ensureWallet: async () => WALLET,
        sendTransaction,
        acknowledgeSubmitted,
      }),
    ).resolves.toEqual([HASH]);
    expect(sendTransaction).toHaveBeenCalledWith({
      to: WALLET,
      data: "0xdead",
      value: "0",
      chainId: 8453,
    });
    expect(acknowledgeSubmitted).toHaveBeenCalledWith({
      legId: "leg-1",
      transactionId: "tx-1",
      txHash: HASH,
      chainId: 8453,
      sender: WALLET,
    });
  });

  it("never sends an approval hash as a leg txHash", async () => {
    const sendTransaction = vi.fn()
      .mockResolvedValueOnce(APPROVAL_HASH)
      .mockResolvedValueOnce(HASH);
    const acknowledgeSubmitted = vi.fn().mockResolvedValue({
      basketId: "basket-1",
      legId: "leg-1",
      state: "SUBMITTED",
      updatedAt: 1,
    });
    const mixed = plan({
      transactions: [
        {
          transactionId: "approval-1",
          chainId: 8453,
          to: WALLET,
          data: "0xapprove",
          value: "0",
          kind: "approval",
          coveredLegIds: ["leg-1"],
        },
        {
          transactionId: "tx-1",
          chainId: 8453,
          to: WALLET,
          data: "0xdead",
          value: "0",
          kind: "same-chain-swap",
          coveredLegIds: ["leg-1"],
        },
      ],
    });
    expect(executableTransactions(mixed).map((tx) => tx.transactionId)).toEqual(["tx-1"]);
    await executeBasketPlan(mixed, {
      ensureWallet: async () => WALLET,
      sendTransaction,
      acknowledgeSubmitted,
    });
    expect(acknowledgeSubmitted).toHaveBeenCalledTimes(1);
    expect(acknowledgeSubmitted).toHaveBeenCalledWith(expect.objectContaining({
      transactionId: "tx-1",
      txHash: HASH,
    }));
    expect(acknowledgeSubmitted.mock.calls[0]?.[0].txHash).not.toBe(APPROVAL_HASH);
  });

  it("treats plan expiresAt as unix milliseconds", async () => {
    const deps = {
      ensureWallet: async () => WALLET,
      sendTransaction: vi.fn().mockResolvedValue(HASH),
      acknowledgeSubmitted: vi.fn().mockResolvedValue({
        basketId: "basket-1",
        legId: "leg-1",
        state: "SUBMITTED",
        updatedAt: 1,
      }),
    };
    await expect(executeBasketPlan(plan({ expiresAt: Date.now() - 1_000 }), deps)).rejects.toThrow(/expired/i);
    await expect(executeBasketPlan(plan({ expiresAt: Date.now() + 60_000 }), deps)).resolves.toEqual([HASH]);
  });

  it("skips already acknowledged execution transactions", async () => {
    const sendTransaction = vi.fn().mockResolvedValue(HASH);
    const acknowledgeSubmitted = vi.fn().mockResolvedValue({
      basketId: "basket-1",
      legId: "leg-2",
      state: "SUBMITTED",
      updatedAt: 1,
    });
    const two = plan({
      transactions: [
        {
          transactionId: "tx-1",
          chainId: 8453,
          to: WALLET,
          data: "0x01",
          value: "0",
          kind: "same-chain-swap",
          coveredLegIds: ["leg-1"],
        },
        {
          transactionId: "tx-2",
          chainId: 8453,
          to: WALLET,
          data: "0x02",
          value: "0",
          kind: "same-chain-swap",
          coveredLegIds: ["leg-2"],
        },
      ],
    });
    await executeBasketPlan(two, {
      ensureWallet: async () => WALLET,
      sendTransaction,
      acknowledgeSubmitted,
    }, { skipTransactionIds: ["tx-1"] });
    expect(sendTransaction).toHaveBeenCalledTimes(1);
    expect(sendTransaction).toHaveBeenCalledWith(expect.objectContaining({ data: "0x02" }));
    expect(acknowledgeSubmitted).toHaveBeenCalledWith(expect.objectContaining({ transactionId: "tx-2" }));
  });

  it("retries failed legs only", () => {
    const status: BasketStatus = {
      schemaVersion: 2,
      basketId: "basket-1",
      composite: "PARTIAL_FAILED",
      counts: {
        total: 2, quoted: 0, ready: 0, submitted: 0, confirmed: 0, settled: 1, failed: 1, stuck: 0, skipped: 0,
      },
      legs: [
        { legId: "leg-ok", legIndex: 0, legKind: "single-chain", state: "SETTLED", attemptNumber: 1, updatedAt: 1 },
        { legId: "leg-bad", legIndex: 1, legKind: "cross-chain", state: "FAILED", attemptNumber: 1, updatedAt: 1 },
      ],
      generatedAt: 1,
    };
    expect(failedLegs(status).map((leg) => leg.legId)).toEqual(["leg-bad"]);
    expect(isTxHash(HASH)).toBe(true);
    expect(isTerminalBasketStatus("SETTLED")).toBe(true);
    expect(isTerminalBasketStatus("FAILED")).toBe(true);
    expect(isTerminalBasketStatus("CANCELLED")).toBe(true);
    expect(isTerminalBasketStatus("IN_PROGRESS")).toBe(false);
  });
});
