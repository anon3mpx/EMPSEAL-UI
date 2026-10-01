import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import EmpxCrossWidget, { type EmpxCrossWidgetProps } from "./EmpxCrossWidget";

const rails = [
  { name: "CCTP", mode: "B" as const, outAmount: "99.8", eta: "~1m", tag: "BEST", isActive: true },
  { name: "Across", mode: "B" as const, outAmount: "99.5", eta: "~2m", isActive: false },
];

function renderWidget(overrides: Partial<EmpxCrossWidgetProps> = {}) {
  const props: EmpxCrossWidgetProps = {
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
  return render(<EmpxCrossWidget {...props} />);
}

describe("EmpxCrossWidget", () => {
  it("renders rail cards and selects a rail", () => {
    const onSelectRail = vi.fn();
    renderWidget({ rails, onSelectRail, railsState: "ready" });
    fireEvent.click(screen.getByText("Across"));
    expect(onSelectRail).toHaveBeenCalledWith("Across");
  });

  it("keeps the previous rails visible while re-quoting", () => {
    renderWidget({ rails, onSelectRail: vi.fn(), railsState: "refreshing" });
    expect(screen.getByText("CCTP")).toBeInTheDocument();
  });

  it("shows the rail message instead of cards for error / empty / idle states", () => {
    const { rerender } = renderWidget({
      rails: [],
      onSelectRail: vi.fn(),
      railsState: "error",
      railsMessage: "Quote engine unreachable",
    });
    expect(screen.getByRole("alert")).toHaveTextContent("Quote engine unreachable");

    rerender(
      <EmpxCrossWidget
        fromChain={{ id: 42161, name: "Arbitrum" }}
        fromToken={{ ticker: "USDC" }}
        fromAmount="100"
        onFromAmountChange={vi.fn()}
        onSelectFromToken={vi.fn()}
        onSelectFromChain={vi.fn()}
        toChain={{ id: 8453, name: "Base" }}
        toToken={{ ticker: "USDC" }}
        toAmount="0"
        onSelectToToken={vi.fn()}
        onSelectToChain={vi.fn()}
        onSwap={vi.fn()}
        railsState="empty"
        railsMessage="No live offers were returned for this pair."
      />,
    );
    expect(screen.getByText("No live offers were returned for this pair.")).toBeInTheDocument();
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("renders the offers footer and the destination slot", () => {
    renderWidget({
      rails,
      onSelectRail: vi.fn(),
      railsFooter: <div>All offers · 2</div>,
      destinationSlot: <label>Native destination address</label>,
    });
    expect(screen.getByText("All offers · 2")).toBeInTheDocument();
    expect(screen.getByText("Native destination address")).toBeInTheDocument();
  });

  it("toggles gas drop, and disables it when unavailable", () => {
    const onToggle = vi.fn();
    const { unmount } = renderWidget({
      gasDrop: { enabled: false, available: true, hint: "Routed via Gas.zip side-leg.", onToggle },
    });
    fireEvent.click(screen.getByText("Gas drop on Base"));
    expect(onToggle).toHaveBeenCalledTimes(1);
    unmount();

    const onToggleUnavailable = vi.fn();
    renderWidget({
      gasDrop: { enabled: false, available: false, hint: "Gas.zip doesn't support Base.", onToggle: onToggleUnavailable },
    });
    fireEvent.click(screen.getByText("Gas drop on Base"));
    expect(onToggleUnavailable).not.toHaveBeenCalled();
  });

  it("labels fees taken from the output as included, not free, and shows the network fee", () => {
    const { rerender } = renderWidget({ protocolFeeUSD: 0, bridgeFeeUSD: 0, feeIncludedInQuote: true, networkFee: "0.00042 BNB" });
    expect(screen.getByText("Included in quote")).toBeInTheDocument();
    expect(screen.queryByText("FREE")).not.toBeInTheDocument();
    expect(screen.getByText("Network fee")).toBeInTheDocument();
    expect(screen.getByText("0.00042 BNB")).toBeInTheDocument();

    rerender(
      <EmpxCrossWidget
        fromChain={{ id: 42161, name: "Arbitrum" }}
        fromToken={{ ticker: "USDC" }}
        fromAmount="100"
        onFromAmountChange={vi.fn()}
        onSelectFromToken={vi.fn()}
        onSelectFromChain={vi.fn()}
        toChain={{ id: 8453, name: "Base" }}
        toToken={{ ticker: "USDC" }}
        toAmount="99.8"
        onSelectToToken={vi.fn()}
        onSelectToChain={vi.fn()}
        onSwap={vi.fn()}
        protocolFeeUSD={0}
        bridgeFeeUSD={0}
      />,
    );
    expect(screen.getByText("FREE")).toBeInTheDocument();
  });

  it("shows the quote row with refresh locked until expiry", () => {
    renderWidget({ quote: { issuedAt: Date.now(), validMs: 30_000, onRefresh: vi.fn() } });
    expect(screen.getByText(/quote fresh · 30s/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /refresh/i })).toBeDisabled();
  });
});
