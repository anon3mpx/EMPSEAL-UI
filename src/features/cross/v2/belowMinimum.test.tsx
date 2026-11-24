import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import V2OffersFooter from "./V2OffersFooter";
import { makeOffer } from "./v2Fixtures";

const USDC = "eip155:8453/erc20:0x833589fcd6edb6e08f4c7c32d4f71b54bda02913";
const ETH = "eip155:8453/slip44:60";

describe("rails that need a larger amount", () => {
  it("names the rail, its fee and the minimum, and sets the amount on click", () => {
    const onUseAmount = vi.fn();
    render(
      <V2OffersFooter
        substitutes={[]}
        twoHop={null}
        selectedPlanId={null}
        twoHopSelected={false}
        onPickTwoHop={() => undefined}
        ticker={(a) => (a === USDC ? "USDC" : "ETH")}
        onPick={() => undefined}
        belowMinimum={[
          {
            rail: "layerzero", cap: "relayer", feeBps: 158, capBps: 100,
            fee: { asset: ETH, amount: "330000000000000", decimals: 18 },
            minimumInput: { asset: USDC, amount: "112000000", decimals: 6 },
          },
        ]}
        onUseAmount={onUseAmount}
      />,
    );
    expect(screen.getByText(/needs at least 112 USDC/)).toBeTruthy();
    expect(screen.getByText(/158 bps of this amount, above the 100 bps cap/)).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Use 112" }));
    expect(onUseAmount).toHaveBeenCalledWith({ asset: USDC, amount: "112000000", decimals: 6 });
  });
});

describe("destination gas offer", () => {
  it("is absent without a quote offer and defaults on when present", () => {
    const onToggle = vi.fn();
    const props = { substitutes: [], twoHop: null, selectedPlanId: null, twoHopSelected: false, onPickTwoHop: vi.fn(), ticker: () => "ETH", onPick: vi.fn() };
    const { rerender } = render(<V2OffersFooter {...props} />);
    expect(screen.queryByRole("checkbox", { name: /Add ~/ })).toBeNull();
    rerender(<V2OffersFooter {...props} gasTopUp={{ offer: makeOffer(), reason: "Low native balance", enabled: true, chain: "Arbitrum", onToggle }} />);
    const toggle = screen.getByRole("checkbox", { name: /Add ~.*gas on Arbitrum for/ });
    expect(toggle instanceof HTMLInputElement && toggle.checked).toBe(true);
    fireEvent.click(toggle);
    expect(onToggle).toHaveBeenCalledTimes(1);
    rerender(<V2OffersFooter {...props} gasTopUp={{ offer: makeOffer(), reason: "Low native balance", enabled: false, chain: "Arbitrum", onToggle }} />);
    const unchecked = screen.getByRole("checkbox", { name: /Add ~/ });
    expect(unchecked instanceof HTMLInputElement && unchecked.checked).toBe(false);
  });
  it("says it in one short line and one short note, never the server's technical reason", () => {
    const props = { substitutes: [], twoHop: null, selectedPlanId: null, twoHopSelected: false, onPickTwoHop: vi.fn(), ticker: () => "ETH", onPick: vi.fn() };
    const reason = "destination native balance below chain minimum; separate offer of at least 100000000000000 atomic native (estimate only)";
    render(<V2OffersFooter {...props} gasTopUp={{ offer: makeOffer(), reason, enabled: true, chain: "Base", onToggle: vi.fn() }} />);
    expect(screen.getByRole("checkbox", { name: /^Add ~\S+ ETH gas on Base for \S+ ETH$/ })).toBeTruthy();
    expect(screen.getByText("Your wallet has almost no gas on Base. Sent separately via Gas.zip; arrival is estimated.")).toBeTruthy();
    expect(screen.queryByText(/atomic native|below chain minimum/)).toBeNull();
  });
});
