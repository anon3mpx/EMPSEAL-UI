import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { BasketReviewPanel } from "./BasketReviewPanel";
import type { BasketExecutionPlan, BasketQuote } from "../api/contracts";

const WALLET = "0x1111111111111111111111111111111111111111";

const quote: BasketQuote = {
  schemaVersion: 2,
  basketId: "basket-1",
  quoteVersion: 2,
  mode: "multi-to-one",
  legs: [{
    legId: "leg-1",
    legIndex: 0,
    estimatedOut: "1",
    minAmountOut: "1",
    etaSeconds: 1,
    feeUsd: 0,
    revenueTier: "agg-wired",
    opaqueLegRef: "leg-1",
    quoteExpiresAt: 9,
  }],
  totals: { inputsUsd: 0, outputsUsd: 0, feeUsd: 0, worstEtaSeconds: 1, parallelEtaSeconds: 1 },
  aggregateTier: "agg-wired",
  skipped: [],
  capabilities: { canPlan: true, canUseMulticall: false, canSatisfyAtomicRequired: false, unavailableReasons: [] },
  expiresAt: 9,
};

const plan: BasketExecutionPlan = {
  schemaVersion: 2,
  planId: "plan-1",
  basketId: "basket-1",
  version: 3,
  status: "READY",
  approvals: [],
  transactions: [{
    transactionId: "tx-1",
    chainId: 8453,
    to: WALLET,
    data: "0x",
    value: "0",
    kind: "same-chain-swap",
    coveredLegIds: ["leg-1"],
  }],
  legs: [],
  atomicity: { requested: false, achieved: false },
  simulation: { kind: "not-performed" },
  createdAt: 1,
  expiresAt: Date.now() + 3_600_000,
};

describe("BasketReviewPanel", () => {
  it("disables execute until a plan exists and after execution is locked", () => {
    const { rerender } = render(
      <BasketReviewPanel
        mode="multi-to-one"
        capabilities={{
          enabled: true,
          modes: {
            "multi-to-one": { enabled: true },
            "one-to-many": { enabled: true },
            "wallet-liquidator": { enabled: true },
            "many-to-many": { enabled: true },
          },
          supportedChainIds: [8453],
          limits: {},
          multicall: {},
        }}
        quote={quote}
        plan={null}
        status={null}
        busy={false}
        walletConnected
        canQuote
        onQuote={vi.fn()}
        onPlan={vi.fn()}
        onExecute={vi.fn()}
        onRetry={vi.fn()}
      />,
    );
    expect(screen.getByRole("button", { name: "Execute server plan" })).toBeDisabled();

    rerender(
      <BasketReviewPanel
        mode="multi-to-one"
        capabilities={{
          enabled: true,
          modes: {
            "multi-to-one": { enabled: true },
            "one-to-many": { enabled: true },
            "wallet-liquidator": { enabled: true },
            "many-to-many": { enabled: true },
          },
          supportedChainIds: [8453],
          limits: {},
          multicall: {},
        }}
        quote={quote}
        plan={plan}
        status={null}
        busy={false}
        walletConnected
        canQuote
        onQuote={vi.fn()}
        onPlan={vi.fn()}
        onExecute={vi.fn()}
        onRetry={vi.fn()}
      />,
    );
    expect(screen.getByRole("button", { name: "Execute server plan" })).toBeEnabled();

    rerender(
      <BasketReviewPanel
        mode="multi-to-one"
        capabilities={{
          enabled: true,
          modes: {
            "multi-to-one": { enabled: true },
            "one-to-many": { enabled: true },
            "wallet-liquidator": { enabled: true },
            "many-to-many": { enabled: true },
          },
          supportedChainIds: [8453],
          limits: {},
          multicall: {},
        }}
        quote={quote}
        plan={plan}
        status={null}
        busy={false}
        walletConnected
        canQuote
        executeLocked
        onQuote={vi.fn()}
        onPlan={vi.fn()}
        onExecute={vi.fn()}
        onRetry={vi.fn()}
      />,
    );
    expect(screen.getByRole("button", { name: "Execute server plan" })).toBeDisabled();
  });

  it("styles review actions as full-width buttons, not unstyled text", () => {
    render(
      <BasketReviewPanel
        mode="multi-to-one"
        capabilities={{
          enabled: true,
          modes: {
            "multi-to-one": { enabled: true },
            "one-to-many": { enabled: true },
            "wallet-liquidator": { enabled: true },
            "many-to-many": { enabled: true },
          },
          supportedChainIds: [8453],
          limits: {},
          multicall: {},
        }}
        quote={null}
        plan={null}
        status={null}
        busy={false}
        walletConnected
        canQuote
        onQuote={vi.fn()}
        onPlan={vi.fn()}
        onExecute={vi.fn()}
        onRetry={vi.fn()}
      />,
    );
    const quote = screen.getByRole("button", { name: "Quote basket" });
    expect(quote).toHaveStyle({ background: "#FF8A00", width: "100%" });
    expect(screen.getByRole("button", { name: "Sign plan" })).toHaveStyle({
      background: "rgba(255,255,255,0.04)",
    });
  });
});
