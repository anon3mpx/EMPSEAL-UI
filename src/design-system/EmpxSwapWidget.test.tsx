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
});
