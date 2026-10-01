import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import EmpxBridgeWidget, { type EmpxBridgeWidgetProps } from "./EmpxBridgeWidget";

function renderWidget(overrides: Partial<EmpxBridgeWidgetProps> = {}) {
  const props: EmpxBridgeWidgetProps = {
    fromChain: { id: 42161, name: "Arbitrum" },
    fromToken: { ticker: "USDC" },
    fromAmount: "100",
    onFromAmountChange: vi.fn(),
    onSelectFromToken: vi.fn(),
    onSelectFromChain: vi.fn(),
    toChain: { id: 8453, name: "Base" },
    toToken: { ticker: "USDC" },
    toAmount: "99.8",
    onSelectToToken: vi.fn(),
    onSelectToChain: vi.fn(),
    onSwap: vi.fn(),
    ...overrides,
  };
  return render(<EmpxBridgeWidget {...props} />);
}

describe("EmpxBridgeWidget", () => {
  it("shows the protocol fee bps and USD without a hard-coded rail name", () => {
    renderWidget({ protocolFeeBps: 15, protocolFeeUSD: 0.79 });
    expect(screen.getByText("Protocol fee · 15 bps · $0.79")).toBeInTheDocument();
    expect(screen.queryByText(/via labs/i)).not.toBeInTheDocument();
  });

  it("shows only the USD protocol fee when bps is not provided", () => {
    renderWidget({ protocolFeeUSD: 0.45 });
    expect(screen.getByText("Protocol fee · $0.45")).toBeInTheDocument();
    expect(screen.queryByText(/bps/)).not.toBeInTheDocument();
  });
});
