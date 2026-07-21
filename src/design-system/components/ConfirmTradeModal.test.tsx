import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import ConfirmTradeModal from "./ConfirmTradeModal";

const baseProps = {
  open: true,
  onClose: vi.fn(),
  onConfirm: vi.fn(),
  fromTicker: "USDC",
  fromAmount: "100",
  fromChainName: "Arbitrum",
  toTicker: "ETH",
  toAmount: "0.04",
  toChainName: "Arbitrum",
  feeRows: [],
};

describe("ConfirmTradeModal", () => {
  it("shows split route provenance and branches", () => {
    render(
      <ConfirmTradeModal
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
    expect(screen.getByText("40%")).toBeInTheDocument();
  });
});
