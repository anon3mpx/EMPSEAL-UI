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
});
