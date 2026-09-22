import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { hyperlaneApprovalSelectionFixture } from "../__fixtures__/railOffers";
import { CrossExecutionPanel } from "./CrossExecutionPanel";

describe("CrossExecutionPanel", () => {
  it("shows sequential step progress and blocks duplicate submission while confirmation is pending", () => {
    render(
      <CrossExecutionPanel
        session={{
          mode: "single",
          intentId: "intent-sequential",
          selectedOfferId: "offer",
          offerSetId: "set",
          quote: { rail: "CCTP", srcChainId: 8453, dstChainId: 42161 },
          sourceChainId: 8453,
          status: "ACTIVE",
          integration: {
            mode: "sequential_wallet", planId: "plan", stepId: "source",
            expectedVersion: 2, tx: { to: "0x1111111111111111111111111111111111111111", data: "0x", value: "0", chainId: 8453 },
          },
          executionPlan: {
            planId: "plan", intentId: "intent-sequential", mode: "sequential_wallet",
            status: "ACTIVE", version: 2, atomic: false, currentStep: 0, expiresAt: 9999999999,
            steps: [
              { stepId: "source", index: 0, kind: "source_swap", chainId: 8453, status: "SUBMITTED", tokenIn: "a", tokenOut: "b", quotedAmountIn: "1", quotedAmountOut: "1", minimumAmountOut: "1", expiresAt: 9999999999 },
              { stepId: "destination", index: 1, kind: "destination_swap", chainId: 42161, status: "PLANNED", tokenIn: "b", tokenOut: "c", quotedAmountIn: "1", quotedAmountOut: "1", minimumAmountOut: "1", expiresAt: 9999999999 },
            ],
          },
        } as any}
        isExecuting={false}
        onExecuteSingle={() => {}}
        onExecutePrimary={() => {}}
        onExecuteGas={() => {}}
      />,
    );

    expect(screen.getByText(/provisional/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /awaiting confirmation/i })).toBeDisabled();
  });

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

  it("shows THORChain Bitcoin deposit instructions without blocking review", () => {
    render(
      <CrossExecutionPanel
        session={{
          mode: "single",
          intentId: "intent-thor-btc",
          selectedOfferId: "offer-thor-btc",
          offerSetId: "set-thor-btc",
          quote: {
            intentId: "intent-thor-btc",
            srcChainId: 0,
            dstChainId: 1,
            tokenIn: "BTC.BTC",
            tokenOut: "ETH.ETH",
            amountIn: "100000",
            estimatedOut: "1",
            minAmountOut: "1",
            rail: "THORCHAIN",
            expiresAt: Date.now() + 60_000,
          },
          integration: {
            mode: "provider_direct",
            action: {
              kind: "thorchain_swap",
              depositAddress: "bc1qthorvault",
              memo: "=:ETH.ETH:0x1111111111111111111111111111111111111111",
              refundAddress: "bc1quserrefund",
            },
          },
          status: "SELECTED",
          sourceChainId: 0,
        }}
        isExecuting={false}
        onExecuteSingle={() => {}}
        onExecutePrimary={() => {}}
        onExecuteGas={() => {}}
      />,
    );

    expect(screen.getByText("bc1qthorvault")).toBeInTheDocument();
    expect(screen.getByText("bc1quserrefund")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /review deposit instructions/i }),
    ).not.toBeDisabled();
  });

  it("shows Garden Solana signing copy and keeps execution enabled", () => {
    render(
      <CrossExecutionPanel
        session={{
          mode: "single",
          intentId: "intent-garden-sol",
          selectedOfferId: "offer-garden-sol",
          offerSetId: "set-garden-sol",
          quote: {
            intentId: "intent-garden-sol",
            srcChainId: 99,
            dstChainId: 1,
            tokenIn: "SOL",
            tokenOut: "ETH",
            amountIn: "100000",
            estimatedOut: "1",
            minAmountOut: "1",
            rail: "GARDEN",
            expiresAt: Date.now() + 60_000,
          },
          integration: {
            mode: "provider_direct",
            action: { kind: "garden_htlc_order" },
            nativeFunding: {
              runtime: "solana",
              unsignedTransaction: "AQIDBA==",
            },
          },
          status: "SELECTED",
          sourceChainId: 99,
        } as any}
        isExecuting={false}
        onExecuteSingle={() => {}}
        onExecutePrimary={() => {}}
        onExecuteGas={() => {}}
      />,
    );

    expect(
      screen.getByText(/Garden Solana transaction is ready to sign and send/i),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /sign garden solana transaction/i }),
    ).not.toBeDisabled();
  });

  it("shows Garden BTC PSBT copy and deposit summary", () => {
    render(
      <CrossExecutionPanel
        session={{
          mode: "single",
          intentId: "intent-garden-btc",
          selectedOfferId: "offer-garden-btc",
          offerSetId: "set-garden-btc",
          quote: {
            intentId: "intent-garden-btc",
            srcChainId: 0,
            dstChainId: 1,
            tokenIn: "BTC",
            tokenOut: "ETH",
            amountIn: "100000",
            estimatedOut: "1",
            minAmountOut: "1",
            rail: "GARDEN",
            expiresAt: Date.now() + 60_000,
          },
          integration: {
            mode: "provider_direct",
            action: { kind: "garden_htlc_order" },
            nativeFunding: {
              runtime: "bitcoin",
              unsignedTransaction: "cHNidP8=",
              depositAddress: "bc1qgardendeposit",
              depositAmount: "100000",
              changeAtomic: "48000",
              feeAtomic: "2000",
            },
          },
          status: "SELECTED",
          sourceChainId: 0,
        } as any}
        sourceWallet={{ kind: "bitcoin", addressType: "p2wpkh" }}
        isExecuting={false}
        onExecuteSingle={() => {}}
        onExecutePrimary={() => {}}
        onExecuteGas={() => {}}
      />,
    );

    expect(
      screen.getByText(/Garden Bitcoin PSBT is ready to sign and broadcast/i),
    ).toBeInTheDocument();
    expect(screen.getByText("bc1qgardendeposit")).toBeInTheDocument();
    expect(screen.getByText("100000 sats")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /sign garden btc psbt/i }),
    ).not.toBeDisabled();
  });
});
