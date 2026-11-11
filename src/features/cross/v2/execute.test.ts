import { describe, expect, it, vi } from "vitest";
import { AmbiguousSubmission, executeCheckedPlan, type WalletPort } from "./execute";
import { describeV2Error } from "./errors";
import { makeOffer, SENDER } from "./v2Fixtures";
import type { CrossV2Client } from "./client";

function setup(over: Partial<WalletPort> = {}) {
  const calls: string[] = [];
  const client = {
    commit: vi.fn(async () => (calls.push("commit"), { intentId: "i-1", kind: "contract" as const, replayed: false })),
    submitOrder: vi.fn(async () => (calls.push("order"), { state: "accepted" as const })),
    reportStep: vi.fn(async (_i: string, step: string) => (calls.push(`report:${step}`), { accepted: true, remaining: [] })),
  } as unknown as CrossV2Client;
  const wallet: WalletPort = {
    address: SENDER,
    ensureChain: vi.fn(async () => void calls.push("chain")),
    allowance: vi.fn(async () => 0n),
    sendTransaction: vi.fn(async () => (calls.push("send"), { hash: "0xabc" })),
    signTypedData: vi.fn(async () => (calls.push("sign"), "0xsig")),
    ...over,
  };
  return { client, wallet, calls };
}

describe("executeCheckedPlan", () => {
  it("commits, approves, signs the order and submits only the signature, in dependency order", async () => {
    const { client, wallet, calls } = setup();
    const o = makeOffer();
    const r = await executeCheckedPlan(client, { plan: o.execution.plan, journey: o.journey }, 8453, wallet);
    expect(calls).toEqual(["commit", "chain", "send", "report:approve-1", "chain", "sign", "order"]);
    expect(r).toEqual({ intentId: "i-1", done: ["approve-1", "order-1"], waiting: [], tracking: "not-needed", txs: [{ stepId: "approve-1", chainId: 8453, hash: "0xabc" }] });
    expect((client.submitOrder as ReturnType<typeof vi.fn>).mock.calls[0]).toEqual(["i-1", "0xsig", undefined]);
  });

  it("skips an approval the wallet already has", async () => {
    const { client, wallet } = setup({ allowance: vi.fn(async () => 5_000_000n) });
    const o = makeOffer();
    await executeCheckedPlan(client, { plan: o.execution.plan, journey: o.journey }, 8453, wallet);
    expect(wallet.sendTransaction).not.toHaveBeenCalled();
    expect(wallet.signTypedData).toHaveBeenCalledTimes(1);
  });

  it("waits while the API reports the transaction is not mined yet, then continues", async () => {
    const { client, wallet } = setup();
    (client.reportStep as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce({ accepted: false, reason: "not mined yet", remaining: [] })
      .mockResolvedValueOnce({ accepted: true, remaining: [] });
    const o = makeOffer();
    const r = await executeCheckedPlan(client, { plan: o.execution.plan, journey: o.journey }, 8453, wallet, { sleep: async () => {} });
    expect(r.done).toContain("order-1");
    expect(client.reportStep).toHaveBeenCalledTimes(2);
  });

  it("stops without signing or resending when a sent transaction is not accepted", async () => {
    const { client, wallet } = setup();
    (client.reportStep as ReturnType<typeof vi.fn>).mockResolvedValue({ accepted: false, reason: "reverted", remaining: [] });
    const o = makeOffer();
    await expect(executeCheckedPlan(client, { plan: o.execution.plan, journey: o.journey }, 8453, wallet)).rejects.toBeInstanceOf(AmbiguousSubmission);
    expect(wallet.signTypedData).not.toHaveBeenCalled();
    expect(wallet.sendTransaction).toHaveBeenCalledTimes(1);
  });

  it("hands out the intent at commit and each hash at broadcast, and names the API's reason when it stops", async () => {
    const { client, wallet } = setup();
    (client.reportStep as ReturnType<typeof vi.fn>).mockResolvedValue({ accepted: false, reason: "the calldata differs from the plan", remaining: [] });
    const o = makeOffer();
    const events: string[] = [];
    const err = await executeCheckedPlan(client, { plan: o.execution.plan, journey: o.journey }, 8453, wallet, {
      onCommitted: (id) => events.push(`committed:${id}`),
      onSent: (t) => events.push(`sent:${t.stepId}:${t.hash}`),
    }).catch((e) => e);
    expect(events).toEqual(["committed:i-1", "sent:approve-1:0xabc"]);
    expect(describeV2Error(err).text).toMatch(/Do not resend.*Reason: the calldata differs from the plan\.$/);
  });

  it("treats a failed wallet send as ambiguous, not as safe to resend", async () => {
    const { client, wallet } = setup({ sendTransaction: vi.fn(async () => { throw new Error("rpc timeout"); }) });
    const o = makeOffer();
    await expect(executeCheckedPlan(client, { plan: o.execution.plan, journey: o.journey }, 8453, wallet)).rejects.toThrow(/may or may not have been sent/);
  });
});
