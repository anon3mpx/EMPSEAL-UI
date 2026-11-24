import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import SubstituteStrips from "./SubstituteStrips";
import { makeOffer } from "./v2Fixtures";
import type { CheckedOffer } from "./widgetView";

const USDT = "eip155:42161/erc20:0xfd086bc7cd5c481dcc9c85ebe478a1c0b69fcbb9";
const ETH = "eip155:42161/slip44:60";
const T = (a: string) => (a === USDT ? "USDT" : a === ETH ? "ETH" : "USDC");
const offer = (id: string, rail: string, asset: string, decimals = 6): CheckedOffer => {
  const o = makeOffer({ plan: { id }, journey: { expectedOutput: { asset, amount: "2000000", decimals } } });
  o.journey.hops = [{ ...o.journey.hops[0]!, planId: id, rail }];
  return { offer: o, check: { ok: true, problems: [] } as never };
};

describe("SubstituteStrips", () => {
  it("one rail strip per delivered token, labelled with that token; picking a card picks its plan", () => {
    const onPick = vi.fn();
    render(
      <SubstituteStrips
        substitutes={[
          { asset: USDT, offers: [offer("u1", "layerzero", USDT), offer("u2", "debridge", USDT)] },
          { asset: ETH, offers: [offer("e1", "gaszip", ETH, 18)] },
          { asset: "eip155:42161/erc20:0xempty", offers: [] },
        ]}
        selectedPlanId={null}
        ticker={T}
        onPick={onPick}
      />,
    );
    const usdt = screen.getByRole("region", { name: "Delivers USDT" });
    expect(within(usdt).getByText("LayerZero")).toBeTruthy();
    expect(within(usdt).getByText("deBridge")).toBeTruthy();
    expect(screen.getByRole("region", { name: "Delivers ETH" })).toBeTruthy();
    expect(screen.queryAllByRole("region")).toHaveLength(2);
    fireEvent.click(within(usdt).getByText("deBridge").closest("button")!);
    expect(onPick).toHaveBeenCalledWith("u2");
  });
  it("renders nothing without substitutes", () => {
    const { container } = render(<SubstituteStrips substitutes={[]} selectedPlanId={null} ticker={T} onPick={() => undefined} />);
    expect(container.firstChild).toBeNull();
  });
});
