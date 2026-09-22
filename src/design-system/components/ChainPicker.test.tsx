import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { resetLogoRegistryCache } from "../data/logoRegistry";
import ChainPicker from "./ChainPicker";

describe("ChainPicker identity", () => {
  beforeEach(() => {
    resetLogoRegistryCache();
  });

  afterEach(() => {
    resetLogoRegistryCache();
  });

  it("keeps ETH-native chains visually distinct by chain ID", () => {
    render(
      <ChainPicker
        open
        onClose={() => undefined}
        onSelect={() => undefined}
        chains={[
          { id: 1, name: "Ethereum", ticker: "ETH", color: "#627EEA" },
          { id: 42161, name: "Arbitrum", ticker: "ETH", color: "#28A0F0" },
          { id: 8453, name: "Base", ticker: "ETH", color: "#0052FF" },
        ]}
      />,
    );

    expect(screen.getByRole("img", { name: "ETH logo" })).toHaveAttribute("src", "/icons/eth.svg");
    expect(screen.getByRole("img", { name: "ARB logo" })).toHaveAttribute("src", "/icons/arbitrum.svg");
    expect(screen.getByRole("img", { name: "BAS logo" })).toHaveAttribute("src", "/icons/base.svg");
  });

  it("uses the canonical ticker when chain artwork fails", () => {
    render(
      <ChainPicker
        open
        onClose={() => undefined}
        onSelect={() => undefined}
        chains={[
          { id: 101, name: "Bitcoin Cash", ticker: "BCH", color: "#0AC18E" },
        ]}
      />,
    );

    fireEvent.error(screen.getByRole("img"));
    expect(screen.getByText("BCH")).toBeInTheDocument();
    expect(screen.queryByText("BIT")).toBeNull();
  });
});
