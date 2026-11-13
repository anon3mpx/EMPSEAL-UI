import { describe, expect, it, vi } from "vitest";
import { AmbiguousSubmission, executeCheckedPlan, performSteps, type WalletPort } from "./execute";
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

describe("deposits", () => {
  it("evm erc20 deposit sends transfer", async () => {
    const { client, wallet } = setup();
    const plan = makeOffer().execution.plan;
    plan.steps = [{ id: "deposit", type: "deposit", chain: "eip155:1", address: SENDER,
      asset: "eip155:1/erc20:0x3333333333333333333333333333333333333333", amount: "12345",
      walletMode: "external-wallet", readiness: "executable", dependsOn: [], expiresAt: plan.expiresAt }];
    await performSteps(client, "int_1", "contract", plan, 1, wallet);
    expect(wallet.sendTransaction).toHaveBeenCalledWith({ chainId: 1, to: "0x3333333333333333333333333333333333333333",
      data: expect.stringMatching(/^0xa9059cbb/), value: 0n });
    expect(client.reportStep).toHaveBeenCalledWith("int_1", "deposit", "0xabc", undefined);
  });
  it("btc deposit returns instructions without the wallet", async () => {
    const { client, wallet } = setup();
    const plan = makeOffer().execution.plan;
    plan.steps = [{ id: "deposit", type: "deposit", chain: "bip122:000000000019d6689c085ae165831e93",
      asset: "bip122:000000000019d6689c085ae165831e93/slip44:0", address: "bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq", amount: "12345",
      walletMode: "external-wallet", readiness: "executable", dependsOn: [], expiresAt: plan.expiresAt }];
    const result = await performSteps(client, "int_1", "provider-direct", plan, 0, wallet);
    expect(wallet.sendTransaction).not.toHaveBeenCalled();
    expect(wallet.ensureChain).not.toHaveBeenCalled();
    expect(result.deposit?.address).toBe("bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq");
  });
  it("evm native deposit sends the exact value", async () => {
    const { client, wallet } = setup();
    const plan = makeOffer().execution.plan;
    plan.steps = [{ id: "deposit", type: "deposit", chain: "eip155:1", address: SENDER, asset: "eip155:1/slip44:60", amount: "12345",
      walletMode: "external-wallet", readiness: "executable", dependsOn: [], expiresAt: plan.expiresAt }];
    await performSteps(client, "int_1", "contract", plan, 1, wallet);
    expect(wallet.sendTransaction).toHaveBeenCalledWith({ chainId: 1, to: SENDER, data: "0x", value: 12345n });
  });
});
