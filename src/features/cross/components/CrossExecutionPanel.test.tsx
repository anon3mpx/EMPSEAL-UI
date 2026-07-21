import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { hyperlaneApprovalSelectionFixture } from "../__fixtures__/railOffers";
import { CrossExecutionPanel } from "./CrossExecutionPanel";

describe("CrossExecutionPanel", () => {
  it("renders a custom single-route action label when provided", () => {
    render(
      <CrossExecutionPanel
        session={{
          mode: "single",
          intentId: "0xintent",
          integration: { mode: "router_intent" },
        }}
        isExecuting={false}
        onExecuteSingle={() => {}}
        onExecutePrimary={() => {}}
        onExecuteGas={() => {}}
        singleActionLabel="Approve Token"
      />,
    );

    expect(
      screen.getByRole("button", { name: /approve token/i }),
    ).toBeInTheDocument();
  });

  it("disables the single-route action when instructed by the parent", () => {
    render(
      <CrossExecutionPanel
        session={{
          mode: "single",
          intentId: "0xintent",
          integration: { mode: "router_intent" },
        }}
        isExecuting={false}
        onExecuteSingle={() => {}}
        onExecutePrimary={() => {}}
        onExecuteGas={() => {}}
        singleActionLabel="Checking Approval..."
        singleActionDisabled
      />,
    );

    expect(
      screen.getByRole("button", { name: /checking approval/i }),
    ).toBeDisabled();
  });

  it("shows Hyperlane domain, interchain gas, and exact approval count", () => {
    render(
      <CrossExecutionPanel
        session={{
          mode: "single",
          intentId: hyperlaneApprovalSelectionFixture.intentId,
          selectedOfferId: "offer-hyperlane",
          offerSetId: "set-hyperlane",
          quote: hyperlaneApprovalSelectionFixture.quote,
          integration: hyperlaneApprovalSelectionFixture.integration,
          status: "SELECTED",
          sourceChainId: 8453,
        }}
        isExecuting={false}
        onExecuteSingle={() => {}}
        onExecutePrimary={() => {}}
        onExecuteGas={() => {}}
      />,
    );

    expect(screen.getByText("Hyperlane Nexus")).toBeInTheDocument();
    expect(screen.getByText("42161")).toBeInTheDocument();
    expect(screen.getByText("120000000000000")).toBeInTheDocument();
    expect(screen.getByText("1 exact request(s)")).toBeInTheDocument();
  });
});
