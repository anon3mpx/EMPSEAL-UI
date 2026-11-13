import { act, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useV2Basket } from "./useV2Basket";
import { executeBasketLeg } from "./basketExecute";
import { CrossV2ApiError, type CrossV2Client } from "./client";
import type { BasketView, LegView } from "./basketTypes";
import { CTX, SENDER, makeOffer } from "./v2Fixtures";
import type { WalletPort } from "./execute";
vi.mock("./basketExecute", () => ({ executeBasketLeg: vi.fn(async () => ({})) }));
export function basketView(actions: LegView["nextAction"][] = []): BasketView {
  return {
    basketId: "bsk_1",
    version: 3,
    status: "quoted",
    expiresAt: 2000000000,
    legs: actions.map((nextAction, i) => ({
      legId: `leg_00${i}`,
      state: "planned",
      input: { asset: CTX.fromAsset, amount: CTX.amount, decimals: 6 },
      quotedOut: "990000",
      minimumOut: "985000",
      maxFeeBps: 100,
      expiresAt: 2000000000,
      reason: null,
      intentId: null,
      intentStatus: null,
      delivered: null,
      nextAction,
    })),
    aggregate: { atomic: false, inputsByAsset: {}, worstCaseFeeByAsset: {}, deliveredByAsset: {}, outcome: "not_started", unknownLegs: [] },
  };
}
function setup(view: BasketView) {
  const client = {
    basketStatus: vi.fn(async () => view),
    basketBegin: vi.fn(async () => ({ ...view, status: "active" })),
    basketRequoteLeg: vi.fn(async () => view),
  };
  const wallet = { address: SENDER } as WalletPort;
  const hook = renderHook(() => useV2Basket(client as unknown as CrossV2Client, wallet, CTX));
  Object.assign(client, {
    basketCommitLeg: vi.fn(async () => ({ intentId: "int_1", replayed: true })),
    basketLegSteps: vi.fn(async () => ({ execution: { plan: makeOffer().execution.plan } })),
  });
  return { ...hook, client };
}
afterEach(() => {
  vi.useRealTimers();
  vi.clearAllMocks();
});
describe("useV2Basket", () => {
  it("begin acknowledges skipped legs", async () => {
    const view = basketView(["none", "none"]);
    view.legs[1]!.state = "skipped";
    const s = setup(view);
    await act(() => s.result.current.resume("bsk_1"));
    await act(() => s.result.current.begin());
    expect(s.client.basketBegin).toHaveBeenCalledWith("bsk_1", 3, ["leg_001"]);
  });
  it("runs legs in order and skips waiting legs", async () => {
    const s = setup(basketView(["commit", "wait", "sign"]));
    await act(() => s.result.current.resume("bsk_1"));
    await act(() => s.result.current.begin());
    expect(vi.mocked(executeBasketLeg).mock.calls.map((c) => c[2])).toEqual(["leg_000", "leg_002"]);
  });
  it("stale version re-reads and stops", async () => {
    const s = setup(basketView(["commit"]));
    await act(() => s.result.current.resume("bsk_1"));
    s.client.basketStatus.mockClear();
    s.client.basketBegin.mockRejectedValue(new CrossV2ApiError(409, "CONFLICT", "stale", false));
    await act(() => s.result.current.begin());
    expect(s.client.basketStatus).toHaveBeenCalledTimes(1);
    expect(s.result.current.phase).toBe("review");
    expect(s.result.current.error).toBe("The basket changed; review the new terms.");
    expect(executeBasketLeg).not.toHaveBeenCalled();
  });
  it("stops polling at a terminal outcome", async () => {
    vi.useFakeTimers();
    const view = basketView();
    view.status = "active";
    const s = setup(view);
    await act(() => s.result.current.resume("bsk_1"));
    s.client.basketStatus.mockResolvedValue({ ...view, aggregate: { ...view.aggregate, outcome: "partial" } });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(5000);
    });
    expect(s.result.current.phase).toBe("done");
    const count = s.client.basketStatus.mock.calls.length;
    await act(async () => {
      await vi.advanceTimersByTimeAsync(30000);
    });
    expect(s.client.basketStatus).toHaveBeenCalledTimes(count);
  });
});
