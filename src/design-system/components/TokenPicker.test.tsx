import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { resetLogoRegistryCache } from "../data/logoRegistry";
import TokenPicker, { type PickerToken } from "./TokenPicker";

const tokens: PickerToken[] = [
  {
    chainId: 42161,
    address: "0xaf88d065e77c8cC2239327C5EDb3A432268e5831",
    ticker: "USDC",
    name: "USD Coin",
    logoUrl: "/icons/usdc.svg",
  },
  { chainId: 369, ticker: "PRVX", name: "ProveX" },
];

describe("TokenPicker identity", () => {
  beforeEach(() => {
    resetLogoRegistryCache();
  });

  afterEach(() => {
    resetLogoRegistryCache();
  });

  it("uses configured artwork and readable fallback in recent and list rows", () => {
    const onSelect = vi.fn();
    render(
      <TokenPicker
        open
        onClose={() => undefined}
        tokens={tokens}
        recent={tokens}
        onSelect={onSelect}
      />,
    );

    const usdcImages = screen.getAllByRole("img", { name: "USDC logo" });
    expect(usdcImages.length).toBeGreaterThanOrEqual(2);
    for (const image of usdcImages) {
      expect(image).toHaveAttribute("src", "/icons/usdc.svg");
    }

    expect(screen.getAllByText("PRVX").length).toBeGreaterThanOrEqual(2);
    expect(screen.queryByRole("img", { name: "PRVX logo" })).toBeNull();

    fireEvent.click(screen.getByText("USD Coin"));
    expect(onSelect).toHaveBeenCalledWith(tokens[0]);
  });
});
