import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { checkOffer } from "./planCheck";
import type { CheckedWithheld } from "./useV2Quote";
import V2OffersFooter from "./V2OffersFooter";
import { CTX, makeOffer } from "./v2Fixtures";

const USDC = "eip155:8453/erc20:0x833589fcd6edb6e08f4c7c32d4f71b54bda02913";
const ETH = "eip155:8453/slip44:60";

describe("rails that need a larger amount", () => {
  it("names the rail, its fee and the minimum, and sets the amount on click", () => {
    const onUseAmount = vi.fn();
    render(
      <V2OffersFooter
        withheld={[]}
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

describe("held-back routes", () => {
  it("renders a held-back route the server sent without its plan, as information only", () => {
    const { execution: _omit, ...planless } = makeOffer({
      journey: { assessment: { status: "unpriced", label: "unpriced: value could not be verified", reason: "input_unpriced:no-evidence" } as never },
    });
    const held = { offer: { ...planless, executableByApiKey: false }, check: checkOffer(planless as never, CTX) } as unknown as CheckedWithheld;
    render(
      <V2OffersFooter withheld={[held]} substitutes={[]} twoHop={null} selectedPlanId={null} twoHopSelected={false}
        onPickTwoHop={() => undefined} ticker={() => "USDC"} onPick={() => undefined} />,
    );
    expect(screen.getByText(/can't price this token yet/)).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Accept route" })).toBeNull();
  });
});
