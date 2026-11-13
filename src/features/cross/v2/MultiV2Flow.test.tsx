import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import MultiV2Flow from "./MultiV2Flow";
import { MODE_LABEL } from "../../basket/model/modes";
import { CTX, SENDER } from "./v2Fixtures";
import type { BasketView } from "./basketTypes";
import type * as ClientModule from "./client";
import type * as ComponentsModule from "../../../design-system/components";
const mocks = vi.hoisted(() => ({ view: null as unknown, plan: vi.fn(), status: vi.fn(), requote: vi.fn() }));
vi.mock("./client", async (original) => ({
  ...(await original<typeof ClientModule>()),
  createCrossV2Client: () => ({ basketPlan: mocks.plan, basketStatus: mocks.status, basketRequoteLeg: mocks.requote }),
}));
vi.mock("./useV2WalletPort", () => ({ useV2WalletPort: () => ({ address: SENDER }) }));
vi.mock("../../../design-system/hooks/useWalletConnection", () => ({
  useWalletConnection: () => ({
    walletState: { status: "connected", address: SENDER },
    walletOptions: [],
    onSelectWallet: vi.fn(),
    disconnect: vi.fn(),
  }),
}));
vi.mock("../../../design-system/components", async (original) => {
  const actual = await original<typeof ComponentsModule>();
  return {
    ...actual,
    DappNavbar: () => null,
    DappFooter: () => null,
    WalletModal: () => null,
    WalletButton: () => null,
    Toaster: () => null,
  };
});
beforeEach(() => {
  vi.clearAllMocks();
  const view: BasketView = {
    basketId: "bsk_1",
    version: 3,
    status: "quoted",
    expiresAt: 2000000000,
    legs: [
      {
        legId: "leg_000",
        state: "planned",
        input: { asset: CTX.fromAsset, amount: "1000000", decimals: 6 },
        quotedOut: "990000",
        minimumOut: "985000",
        maxFeeBps: 100,
        expiresAt: 2000000000,
        reason: null,
        intentId: null,
        intentStatus: null,
        delivered: null,
        nextAction: "requote",
      },
      {
        legId: "leg_001",
        state: "skipped",
        input: null,
        quotedOut: null,
        minimumOut: null,
        maxFeeBps: null,
        expiresAt: null,
        reason: "No route for this token",
        intentId: null,
        intentStatus: null,
        delivered: null,
        nextAction: "none",
      },
    ],
    aggregate: { atomic: false, inputsByAsset: {}, worstCaseFeeByAsset: {}, deliveredByAsset: {}, outcome: "not_started", unknownLegs: [] },
  };
  mocks.view = view;
  mocks.plan.mockResolvedValue(view);
  mocks.status.mockResolvedValue(view);
  mocks.requote.mockResolvedValue(view);
});
async function review() {
  fireEvent.change(screen.getByLabelText("Input 1 amount"), { target: { value: "1" } });
  fireEvent.click(screen.getByRole("button", { name: /Review basket/ }));
  await screen.findByText("No route for this token");
}
describe("MultiV2Flow", () => {
  it("hides liquidator under V2", () => {
    render(<MultiV2Flow />);
    expect(screen.queryByRole("button", { name: MODE_LABEL["wallet-liquidator"] })).toBeNull();
    expect(screen.queryByRole("tab", { name: MODE_LABEL["wallet-liquidator"] })).toBeNull();
  });
  it("shows skipped legs before begin", async () => {
    render(<MultiV2Flow />);
    await review();
    expect(screen.getByText("Legs settle independently. Some may finish while others fail.")).toBeTruthy();
    const rows = screen.getAllByTestId("basket-review-leg");
    expect(rows[0]!.textContent).toContain("No route for this token");
    expect(rows[1]!.textContent).toContain("985000");
    expect(screen.getByRole("button", { name: /Begin/ })).toBeTruthy();
  });
  it("requote button calls requote", async () => {
    render(<MultiV2Flow />);
    await review();
    fireEvent.click(screen.getByRole("button", { name: "Re-quote" }));
    await waitFor(() => expect(mocks.requote).toHaveBeenCalledWith("bsk_1", "leg_000", 3));
  });
});
