import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { CrossTrackingPanel } from "./CrossTrackingPanel";

describe("CrossTrackingPanel", () => {
  it("renders selected offer metadata separately from the intent id", () => {
    render(
      <CrossTrackingPanel
        tracking={{}}
        session={{
          mode: "single",
          status: "SELECTED",
          intentId: "0xintent",
          selectedOfferId: "0xoffer",
          offerSetId: "0xset",
        }}
        isCancelling={false}
        isRefunding={false}
        onCancel={() => {}}
        onRefund={() => {}}
      />,
    );

    expect(screen.getByText("Selected Offer")).toBeInTheDocument();
    expect(screen.getByText("0xoffer")).toBeInTheDocument();
    expect(screen.getByText("Offer Set")).toBeInTheDocument();
    expect(screen.getByText("0xset")).toBeInTheDocument();
    expect(screen.getByText("Intent")).toBeInTheDocument();
    expect(screen.getByText("0xintent")).toBeInTheDocument();
  });
});
