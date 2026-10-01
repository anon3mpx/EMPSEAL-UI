import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import EmpxSwapWidget from "./EmpxSwapWidget";

const baseProps = {
  chain: { id: 42161, name: "Arbitrum", color: "#28A0F0" },
  fromToken: { ticker: "ETH", decimals: 18, address: "0x0000000000000000000000000000000000000000" },
  fromAmount: "1",
  onFromAmountChange: vi.fn(),
  toToken: { ticker: "USDC", decimals: 6, address: "0xaf88d065e77c8cc2239327c5edb3a432268e5831" },
  toAmount: "1621.24",
  onSwap: vi.fn(),
};

describe("EmpxSwapWidget", () => {
  it("fires token selector callbacks from the visible token controls", () => {
    const onSelectFromToken = vi.fn();
    const onSelectToToken = vi.fn();

    render(
      <EmpxSwapWidget
        {...baseProps}
        onSelectFromToken={onSelectFromToken}
        onSelectToToken={onSelectToToken}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /select from token, current eth/i }));
    fireEvent.click(screen.getByRole("button", { name: /select to token, current usdc/i }));

    expect(onSelectFromToken).toHaveBeenCalledTimes(1);
    expect(onSelectToToken).toHaveBeenCalledTimes(1);
  });

  it("shows the SDK split label and split branches", () => {
    render(
      <EmpxSwapWidget
        {...baseProps}
        routeLabel="Split swap · SDK"
        splitBranches={[
          { via: "UniswapV3", pct: 60 },
          { via: "Camelot", pct: 40 },
        ]}
      />,
    );

    expect(screen.getByText("Split swap · SDK")).toBeInTheDocument();
    expect(screen.getByText("UniswapV3")).toBeInTheDocument();
    expect(screen.getByText("60%")).toBeInTheDocument();
  });

  it("shows a local no-split fallback label", () => {
    render(
      <EmpxSwapWidget
        {...baseProps}
        routeLabel="No-split fallback · Local router"
      />,
    );

    expect(
      screen.getByText("No-split fallback · Local router"),
    ).toBeInTheDocument();
  });

  it("edits slippage from the settings toggle", () => {
    const onSlippageChange = vi.fn();
    render(
      <EmpxSwapWidget
        {...baseProps}
        onSelectFromToken={vi.fn()}
        onSelectToToken={vi.fn()}
        slippageBps={50}
        onSlippageChange={onSlippageChange}
      />,
    );

    expect(screen.queryByText("Max slippage")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: /trade settings/i }));
    fireEvent.click(screen.getByRole("button", { name: "1.00%" }));
    expect(onSlippageChange).toHaveBeenCalledWith(100);

    fireEvent.change(screen.getByLabelText(/custom slippage percent/i), { target: { value: "2.5" } });
    fireEvent.keyDown(screen.getByLabelText(/custom slippage percent/i), { key: "Enter" });
    expect(onSlippageChange).toHaveBeenCalledWith(250);
  });

  it("hides settings, quote row and notice when the host doesn't opt in (embed)", () => {
    render(<EmpxSwapWidget {...baseProps} onSelectFromToken={vi.fn()} onSelectToToken={vi.fn()} slippageBps={50} />);
    expect(screen.queryByRole("button", { name: /trade settings/i })).toBeNull();
    expect(screen.queryByText(/quote fresh/i)).toBeNull();
    expect(screen.getByText("Slippage 0.50%")).toBeInTheDocument();
  });

  it("shows quote freshness and the status notice", () => {
    render(
      <EmpxSwapWidget
        {...baseProps}
        onSelectFromToken={vi.fn()}
        onSelectToToken={vi.fn()}
        quote={{ issuedAt: Date.now(), validMs: 60_000, onRefresh: vi.fn() }}
        notice={{ tone: "info", text: "Optimizing for a split route…" }}
      />,
    );
    expect(screen.getByText(/quote fresh · 60s/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /refresh/i })).toBeDisabled();
    expect(screen.getByText("Optimizing for a split route…")).toBeInTheDocument();
  });
});
