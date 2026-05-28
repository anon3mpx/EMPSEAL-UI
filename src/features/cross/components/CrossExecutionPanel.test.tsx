import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
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
});
