import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { RampTransferPanel } from "./RampTransferPanel";

describe("RampTransferPanel", () => {
  it("keeps Preview distinct from Create after a matching preview", () => {
    const onPreview = vi.fn();
    const onCreate = vi.fn();
    render(
      <RampTransferPanel
        preview={{
          sourceAmount: "500.00",
          destinationAmount: "498.00",
          feeAmount: "2.00",
          feeCurrency: "USD",
          etaSeconds: 60,
        }}
        transfer={null}
        disabledReason={null}
        busy={false}
        canCreate
        onPreview={onPreview}
        onCreate={onCreate}
        onStatus={vi.fn()}
        onCancel={vi.fn()}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Preview" }));
    expect(onPreview).toHaveBeenCalledTimes(1);
    expect(onCreate).not.toHaveBeenCalled();
  });
  it.each(["not_started","failed"] as const)("offers %s leg2 without repeating the fiat transfer", state=>{
    render(<RampTransferPanel preview={null} transfer={{id:"tr-1",direction:"ON_RAMP",chainId:8453,tokenAddress:"0x1111111111111111111111111111111111111111",fiatCurrency:"USD",fiatRail:"ACH_PUSH",amount:"10",state:"COMPLETED",leg2:{state,suggestedQuote:{from:{asset:"eip155:8453/erc20:0x1111111111111111111111111111111111111111",amount:"9800000",decimals:6},recipient:"0x1111111111111111111111111111111111111111"}}}} busy={false} disabledReason={null} onCreate={vi.fn()} onPreview={vi.fn()} onStatus={vi.fn()} onCancel={vi.fn()}/>);
    expect(screen.getByRole("button",{name:state==="failed"?"Retry Move funds":"Move funds"})).toBeTruthy();
    expect(screen.getByText(/Fiat is complete/)).toBeTruthy();
  });
});
