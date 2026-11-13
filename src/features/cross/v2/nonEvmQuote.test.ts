import { createElement, type ReactNode } from "react";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import CrossV2Flow from "./CrossV2Flow";
import { getV2Chain } from "../../../design-system/data/v2ChainView";
import type { PickerChain } from "../../../design-system/components";

const mocks = vi.hoisted(() => ({ quote: vi.fn() }));
const wallet = "0x1111111111111111111111111111111111111111";
const btc = "bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq";
vi.mock("./client", () => ({ createCrossV2Client: () => ({ journeyQuote: mocks.quote }) }));
vi.mock("./useV2Corridors", () => ({
  useV2Corridors: () => ({
    sources: [getV2Chain(8453), getV2Chain(0)],
    destinationsFor: () => [getV2Chain(42161), getV2Chain(8453), getV2Chain(0)],
  }),
}));
vi.mock("./useV2WalletPort", () => ({ useV2WalletPort: () => null }));
vi.mock("./useV2Intent", () => ({ useV2Intent: () => ({}), claimTx: () => null }));
vi.mock("./useV2TwoHopFlow", () => ({ useV2TwoHopFlow: () => ({}) }));
vi.mock("./CrossV2ExecutionPanel", () => ({ default: () => null }));
vi.mock("./CrossV2JourneyPanel", () => ({ default: () => null }));
vi.mock("./V2OffersFooter", () => ({ default: () => null, acceptableWithheld: () => false }));
vi.mock("wagmi", () => ({ useBalance: () => ({}) }));
vi.mock("../../../design-system/hooks/useWalletConnection", () => ({
  useWalletConnection: () => ({
    walletState: { status: "connected", address: wallet, chain: { id: 8453, name: "Base", color: "#0052ff" } },
    walletOptions: [],
  }),
}));
vi.mock("../../../design-system/hooks/useAccountSnapshot", () => ({ useAccountSnapshot: () => ({}) }));
vi.mock("../../../design-system/hooks/useUnifiedPrice", () => ({ useUnifiedPrice: () => null }));
vi.mock("../../../design-system/hooks/useV2Balances", () => ({ useV2Balances: () => ({}) }));
vi.mock("../../../design-system/widgetKit", () => ({
  WidgetKitKeyframes: () => null,
  Disclosure: ({ children }: { children: ReactNode }) => children,
}));
vi.mock("../../../design-system/EmpxCrossWidget", () => ({
  default: (p: { destinationSlot: ReactNode; onSelectFromChain: () => void; onSelectToChain: () => void; swapDisabled: boolean }) =>
    createElement(
      "div",
      null,
      createElement("button", { onClick: p.onSelectFromChain }, "Source chain"),
      createElement("button", { onClick: p.onSelectToChain }, "Destination chain"),
      p.destinationSlot,
      createElement("button", { disabled: p.swapDisabled }, "Review route"),
    ),
}));
vi.mock("../../../design-system/components", () => {
  const empty = () => null;
  return {
    DappNavbar: empty,
    DappFooter: empty,
    AccountModal: empty,
    WalletModal: empty,
    WalletButton: empty,
    NetworkSelector: empty,
    ChainLogo: empty,
    TokenLogo: empty,
    Toaster: empty,
    TokenPicker: empty,
    ConfirmTradeModal: empty,
    useIsMobile: () => false,
    toast: { info: vi.fn() },
    ChainPicker: ({ chains, onSelect }: { chains: PickerChain[]; onSelect: (c: PickerChain) => void }) =>
      createElement("div", null, ...chains.map((c) => createElement("button", { key: c.id, onClick: () => onSelect(c) }, c.name))),
  };
});
beforeEach(() => {
  vi.useFakeTimers();
  mocks.quote.mockReset().mockResolvedValue({ kind: "none", quote: { plans: [] } });
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
});
async function settle() {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(500);
  });
}
describe("non-EVM quotes", () => {
  it("btc source uses the typed source address as sender", async () => {
    render(createElement(CrossV2Flow));
    fireEvent.click(screen.getByText("Source chain"));
    fireEvent.click(screen.getByText("Bitcoin"));
    fireEvent.click(screen.getByText("Destination chain"));
    fireEvent.click(screen.getByText("Base"));
    const source = document.getElementById("cross-v2-source-address");
    expect(source).toBeTruthy();
    fireEvent.change(source!, { target: { value: btc } });
    await settle();
    expect(mocks.quote.mock.calls.at(-1)?.[0]).toMatchObject({
      sender: btc,
      recipient: wallet,
      fromAsset: "bip122:000000000019d6689c085ae165831e93/slip44:0",
    });
  });
  it("wrong family recipient blocks quote", async () => {
    render(createElement(CrossV2Flow));
    fireEvent.click(screen.getByText("Destination chain"));
    fireEvent.click(screen.getByText("Bitcoin"));
    fireEvent.change(document.getElementById("cross-v2-recipient")!, { target: { value: wallet } });
    fireEvent.blur(document.getElementById("cross-v2-recipient")!);
    await settle();
    expect(mocks.quote).not.toHaveBeenCalled();
    expect((screen.getByRole("button", { name: "Review route" }) as HTMLButtonElement).disabled).toBe(true);
    expect(screen.getByTestId("destination-address-wrong-chain").textContent).toContain("EVM");
  });
});
