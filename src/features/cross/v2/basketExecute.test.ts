import { describe, expect, it, vi } from "vitest";
import { executeBasketLeg } from "./basketExecute";
import { CTX, makeOffer, SENDER } from "./v2Fixtures";
import type { CrossV2Client } from "./client";
import type { WalletPort } from "./execute";

function setup() {
  const calls: string[] = [];
  const plan = makeOffer().execution.plan;
  const client = {
    basketCommitLeg: vi.fn(async () => (calls.push("commit"), { intentId: "int_1", replayed: false })),
    basketLegSteps: vi.fn(
      async () => (
        calls.push("steps"),
        { basketId: "bsk_1", legId: "leg_000", intentId: "int_1", execution: { plan }, walletSteps: ["approve-1", "order-1"] }
      ),
    ),
    reportStep: vi.fn(async () => (calls.push("reportStep"), { accepted: true, remaining: [] })),
    submitOrder: vi.fn(async () => ({ state: "accepted" })),
    status: vi.fn(async () => ({ status: "created", nextSteps: [] as string[] })),
  };
  const wallet: WalletPort = {
    address: SENDER,
    ensureChain: vi.fn(async () => {}),
    sendTransaction: vi.fn(async () => ({ hash: "0xabc" })),
    signTypedData: vi.fn(async () => "0xsig"),
  };
  const run = () => executeBasketLeg(client as unknown as CrossV2Client, "bsk_1", "leg_000", wallet, CTX);
  return { calls, plan, client, wallet, run };
}
describe("executeBasketLeg", () => {
  it("commits then fetches steps then performs them", async () => {
    const s = setup();
    await s.run();
    expect(s.calls).toEqual(["commit", "steps", "reportStep"]);
  });
  it("a rejected plan never reaches the wallet", async () => {
    const s = setup();
    s.plan.hash = "tampered";
    await expect(s.run()).rejects.toThrow(/plan rejected:.*hash/);
    expect(s.wallet.sendTransaction).not.toHaveBeenCalled();
    expect(s.wallet.signTypedData).not.toHaveBeenCalled();
  });
  it("rerun after commit reuses the intent", async () => {
    const s = setup();
    s.client.basketCommitLeg.mockResolvedValue({ intentId: "int_1", replayed: true });
    s.client.basketLegSteps.mockResolvedValue({
      basketId: "bsk_1",
      legId: "leg_000",
      intentId: "int_1",
      execution: { plan: s.plan },
      walletSteps: ["order-1"],
    });
    s.client.status.mockResolvedValueOnce({ status: "created", nextSteps: ["order-1"] });
    const r = await s.run();
    expect(r.intentId).toBe("int_1");
    expect(s.wallet.sendTransaction).not.toHaveBeenCalled();
    expect(s.client.submitOrder).toHaveBeenCalledWith("int_1", "0xsig", undefined);
    s.client.status.mockResolvedValue({ status: "source_executed", nextSteps: ["order-1"] });
    await s.run();
    expect(s.wallet.signTypedData).toHaveBeenCalledTimes(1);
  });
  it("replay links only the final provider transaction", async () => {
    const s = setup();
    const plan = makeOffer({
      plan: {
        compiled: { rail: "gaszip", shape: "A" },
        steps: [
          {
            id: "fee",
            type: "tx",
            dependsOn: [],
            walletMode: "evm-signer",
            readiness: "executable",
            expiresAt: CTX.now + 600,
            chain: "eip155:8453",
            to: s.plan.verify.allowedTargets[0]!,
            data: "0x",
            value: "0",
          },
          {
            id: "deposit",
            type: "tx",
            dependsOn: ["fee"],
            walletMode: "evm-signer",
            readiness: "executable",
            expiresAt: CTX.now + 600,
            chain: "eip155:8453",
            to: s.plan.verify.allowedTargets[0]!,
            data: "0x",
            value: "0",
          },
        ],
      },
    }).execution.plan;
    s.client.basketCommitLeg.mockResolvedValue({ intentId: "int_1", replayed: true });
    s.client.basketLegSteps.mockResolvedValue({
      basketId: "bsk_1",
      legId: "leg_000",
      intentId: "int_1",
      execution: { plan },
      walletSteps: ["fee", "deposit"],
    });
    s.client.status
      .mockResolvedValueOnce({ status: "created", nextSteps: ["fee"] })
      .mockResolvedValueOnce({ status: "created", nextSteps: ["deposit"] });
    const attachReference = vi.fn(async () => ({ attached: true }));
    Object.assign(s.client, { attachReference });
    vi.mocked(s.wallet.sendTransaction)
      .mockResolvedValueOnce({ hash: `0x${"ab".repeat(32)}` })
      .mockResolvedValueOnce({ hash: `0x${"cd".repeat(32)}` });
    await s.run();
    expect(attachReference).toHaveBeenCalledTimes(1);
    expect(attachReference).toHaveBeenCalledWith("int_1", `0x${"cd".repeat(32)}`, undefined);
  });
});
