import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import EmpxGasWidget from "./EmpxGasWidget";

describe("EmpxGasWidget", () => {
  it("uses a single-destination contract", () => {
    const onSetDestinationUsd = vi.fn();
    const onSwitchChains = vi.fn();
    const destination = {
      id: "base",
      chain: { id: 8453, name: "Base", ticker: "ETH" },
      usd: 10,
      nativeOut: 0.003,
    };

    render(
      <EmpxGasWidget
        sourceChain={{ id: 42161, name: "Arbitrum", ticker: "ETH" }}
        sourceAmount="0.004"
        sourceUsdValue={10.05}
        onSelectSourceChain={vi.fn()}
        onSwitchChains={onSwitchChains}
        destination={destination}
        onSelectDestinationChain={vi.fn()}
        onSetDestinationUsd={onSetDestinationUsd}
        presets={[5, 10, 20]}
        bridgeFeeUSD={0.05}
        useDifferentRecipient={false}
        onToggleRecipient={vi.fn()}
        recipient=""
        onSetRecipient={vi.fn()}
        recipientValid
        canSubmit
        swapLabel="Send gas to Base"
        onSubmit={vi.fn()}
        walletConnected
        onConnect={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "$20" }));
    fireEvent.click(screen.getByRole("button", { name: "Switch source and destination chains" }));

    expect(onSetDestinationUsd).toHaveBeenCalledWith(20);
    expect(onSwitchChains).toHaveBeenCalledOnce();
    expect(screen.queryByText(/swaps?/i)).not.toBeInTheDocument();
    expect(screen.queryByText("1 / 5")).not.toBeInTheDocument();
    expect(screen.getByText("Single destination")).toBeInTheDocument();
  });
});
