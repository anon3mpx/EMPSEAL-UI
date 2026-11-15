import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import MultiV2Flow from "./MultiV2Flow";
import { CTX, makeOffer, SENDER, TO_ASSET } from "./v2Fixtures";
import type { BasketView } from "./basketTypes";
import type * as ClientModule from "./client";
import type * as ComponentsModule from "../../../design-system/components";
const mocks = vi.hoisted(() => ({ view: null as unknown, plan: vi.fn(), status: vi.fn(), requote: vi.fn(), scan: vi.fn(), liquidate: vi.fn(), quote: vi.fn() }));
vi.mock("./client", async (original) => ({
  ...(await original<typeof ClientModule>()),
  createCrossV2Client: () => ({ basketPlan: mocks.plan, basketStatus: mocks.status, basketRequoteLeg: mocks.requote, scanWallet: mocks.scan, liquidateQuote: mocks.liquidate, quote: mocks.quote }),
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
  mocks.quote.mockResolvedValue({ plans: [] });
});
async function review() {
  fireEvent.change(screen.getByLabelText("Input 1 amount"), { target: { value: "1" } });
  fireEvent.click(screen.getByRole("button", { name: /Review basket/ }));
  await screen.findByText("No route for this token");
}
describe("MultiV2Flow", () => {
  it("sweeps only explicitly selected unpriced balances into the chosen target and resumes the returned basket", async () => {
    const asset = "eip155:8453/erc20:0x2222222222222222222222222222222222222222";
    const scan = {wallet: SENDER, chains: [
      {chainId: 8453, balances: [{asset, token: "0x2222222222222222222222222222222222222222", symbol: "UNKNOWN", decimals: 6, amount: "2500000", usd: null, dust: false}]},
      {chainId: 10, error: "rpc-unavailable", balances: []},
    ]};
    mocks.scan.mockResolvedValue(scan);
    mocks.liquidate.mockResolvedValue({scan, basket: mocks.view, skipped: [{asset: "eip155:8453/slip44:60", reason: "below-gas-reserve"}]});
    render(<MultiV2Flow />);
    fireEvent.click(screen.getByRole("button", {name: "Sweep wallet"}));
    // Entering Sweep wallet with a wallet connected scans once on its own.
    const row = await screen.findByRole("button", {name: /UNKNOWN.*Unpriced/});
    expect(row.getAttribute("aria-pressed")).toBe("false");
    expect(screen.getByText("Chain 10: rpc-unavailable")).toBeTruthy();
    fireEvent.click(row);
    fireEvent.click(screen.getByRole("button", {name: "USDC logo USDC ▾"}));
    fireEvent.click(screen.getAllByRole("button", {name: /^ETH/})[0]!);
    fireEvent.click(screen.getByRole("button", {name: /Review basket/}));
    await screen.findByText("No route for this token");
    expect(mocks.liquidate).toHaveBeenCalledWith(expect.objectContaining({wallet: SENDER, target: "eip155:42161/slip44:60", include: [asset], maxTier: 3}), expect.any(AbortSignal));
    expect(mocks.status).toHaveBeenCalledWith("bsk_1");
    expect(screen.getByText(/below-gas-reserve/)).toBeTruthy();
    expect(mocks.plan).not.toHaveBeenCalled();
  });
  it("shows skipped legs before begin", async () => {
    render(<MultiV2Flow />);
    await review();
    expect(screen.getByText("Legs settle independently. Some may finish while others fail.")).toBeTruthy();
    const rows = screen.getAllByTestId("basket-review-leg");
    expect(rows[0]!.textContent).toContain("No route for this token");
    expect(rows[1]!.textContent).toContain("0.99 USDC");
    expect(rows[1]!.textContent).toContain("Min 0.985 USDC");
    expect(screen.getByRole("button", { name: /Begin/ })).toBeTruthy();
  });
  it("quotes each leg live and shows the converged output and slowest ETA before review", async () => {
    mocks.quote.mockResolvedValue({ plans: [makeOffer({ journey: { expectedOutput: { asset: TO_ASSET, amount: "2462500000", decimals: 6 }, etaSec: 240 } })] });
    render(<MultiV2Flow />);
    fireEvent.change(screen.getByLabelText("Input 1 amount"), { target: { value: "1" } });
    await screen.findByText("2,462.5", undefined, { timeout: 3000 });
    expect(screen.getByText("~4 min")).toBeTruthy();
    expect(screen.getByText("Slowest leg governs")).toBeTruthy();
    expect(mocks.quote).toHaveBeenCalledWith(expect.objectContaining({ amount: "1000000000000000000", toAsset: TO_ASSET, maxTier: 3 }), expect.any(AbortSignal));
    expect(mocks.plan).not.toHaveBeenCalled();
  });
  it("requote button calls requote", async () => {
    render(<MultiV2Flow />);
    await review();
    fireEvent.click(screen.getByRole("button", { name: "Re-quote" }));
    await waitFor(() => expect(mocks.requote).toHaveBeenCalledWith("bsk_1", "leg_000", 3));
  });
});
