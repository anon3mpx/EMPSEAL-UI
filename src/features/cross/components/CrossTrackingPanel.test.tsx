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

  it("renders linked transaction hashes and rail trackers", () => {
    render(
      <CrossTrackingPanel
        tracking={{}}
        links={{
          sourceTx: {
            hash: "0x1234567890abcdef",
            url: "https://basescan.org/tx/0x1234567890abcdef",
          },
          destinationTx: {
            hash: "0xabcdef1234567890",
            url: "https://arbiscan.io/tx/0xabcdef1234567890",
          },
          railLinks: [{
            label: "LayerZero",
            url: "https://layerzeroscan.com/tx/0x1234567890abcdef",
          }],
        }}
        session={{
          mode: "single",
          status: "SUBMITTED",
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

    expect(screen.getByText("0x123456...abcdef")).toHaveAttribute(
      "href",
      "https://basescan.org/tx/0x1234567890abcdef",
    );
    expect(screen.getByText("0xabcdef...567890")).toHaveAttribute(
      "href",
      "https://arbiscan.io/tx/0xabcdef1234567890",
    );
    expect(screen.getByText("LayerZero")).toHaveAttribute(
      "href",
      "https://layerzeroscan.com/tx/0x1234567890abcdef",
    );
  });
});
