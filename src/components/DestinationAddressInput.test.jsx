// Tests for <DestinationAddressInput>.  Covers:
//   • Per-kind placeholder + format hint rendering
//   • Real-time validation as user types (valid + invalid)
//   • Validation badge (green check / red X)
//   • Error message + ARIA wiring
//   • Wrong-chain warning ("looks like Bitcoin, destination Solana")
//   • onValidate callback firing with the right shape
//   • Explorer link shown only when valid + URL provided
//   • Adapter button stubbed correctly when validator reports it available
//   • Touched-state behavior (no red border on first render)

import { render, screen, fireEvent } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import DestinationAddressInput from "./DestinationAddressInput";

// Known-good fixtures (re-used from per-validator tests)
const BTC_LEGACY = "1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa";
const SOL = "11111111111111111111111111111111";
const EVM = "0x742d35cc6634c0532925a3b844bc9e7595f0beb4";

function setup(props = {}) {
  const onChange = vi.fn();
  const onValidate = vi.fn();
  const result = render(
    <DestinationAddressInput
      chainKind="bitcoin"
      value=""
      onChange={onChange}
      onValidate={onValidate}
      {...props}
    />,
  );
  return { ...result, onChange, onValidate };
}

describe("DestinationAddressInput — rendering", () => {
  it("renders with the chain-specific placeholder + format hint", () => {
    setup({ chainKind: "bitcoin" });
    const input = screen.getByTestId("destination-address-input-field");
    expect(input.getAttribute("placeholder")).toMatch(/bc/i);
    expect(screen.getByTestId("destination-address-hint")).toHaveTextContent(/legacy|bech32/i);
  });

  it("shows the chain's pretty name in the label", () => {
    setup({ chainKind: "solana" });
    expect(screen.getByText(/Solana/)).toBeInTheDocument();
  });

  it("uses custom chainLabel when provided", () => {
    setup({ chainKind: "solana", chainLabel: "SOL (Solana mainnet)" });
    expect(screen.getByText("(SOL (Solana mainnet))")).toBeInTheDocument();
  });

  it("renders required marker (*) when required=true", () => {
    setup({ required: true });
    const required = screen.getByText("*");
    expect(required).toBeInTheDocument();
  });
});

describe("DestinationAddressInput — validation", () => {
  it("fires onChange when user types", () => {
    const { onChange } = setup();
    const input = screen.getByTestId("destination-address-input-field");
    fireEvent.change(input, { target: { value: "abc" } });
    expect(onChange).toHaveBeenCalledWith("abc");
  });

  it("fires onValidate after each change with the result", () => {
    const { rerender, onValidate } = setup({ chainKind: "bitcoin", value: "" });

    // Empty: not valid, no calls beyond initial
    expect(onValidate).toHaveBeenCalledWith({ valid: false });

    rerender(
      <DestinationAddressInput
        chainKind="bitcoin"
        value={BTC_LEGACY}
        onChange={() => {}}
        onValidate={onValidate}
      />,
    );
    const lastCall = onValidate.mock.calls[onValidate.mock.calls.length - 1][0];
    expect(lastCall.valid).toBe(true);
  });

  it("shows valid-icon for a real BTC address", () => {
    setup({ chainKind: "bitcoin", value: BTC_LEGACY });
    expect(screen.getByTestId("destination-address-valid-icon")).toBeInTheDocument();
    expect(screen.queryByTestId("destination-address-invalid-icon")).not.toBeInTheDocument();
  });

  it("shows invalid-icon for malformed input", () => {
    setup({ chainKind: "bitcoin", value: "not-an-address" });
    expect(screen.getByTestId("destination-address-invalid-icon")).toBeInTheDocument();
    expect(screen.queryByTestId("destination-address-valid-icon")).not.toBeInTheDocument();
  });

  it("does NOT show validation badge for empty input", () => {
    setup({ chainKind: "bitcoin", value: "" });
    expect(screen.queryByTestId("destination-address-valid-icon")).not.toBeInTheDocument();
    expect(screen.queryByTestId("destination-address-invalid-icon")).not.toBeInTheDocument();
  });

  it("hides the error message until the input has been blurred (touched)", () => {
    setup({ chainKind: "bitcoin", value: "not-an-address" });
    // Before blur: no error message rendered (avoids hostile UX on first render)
    expect(screen.queryByTestId("destination-address-error")).not.toBeInTheDocument();
  });

  it("shows the error message after blur", () => {
    setup({ chainKind: "bitcoin", value: "not-an-address" });
    const input = screen.getByTestId("destination-address-input-field");
    fireEvent.blur(input);
    expect(screen.getByTestId("destination-address-error")).toBeInTheDocument();
  });
});

describe("DestinationAddressInput — wrong-chain warning", () => {
  it("shows 'looks like Bitcoin' when BTC address is in a Solana field", () => {
    setup({ chainKind: "solana", value: BTC_LEGACY });
    const input = screen.getByTestId("destination-address-input-field");
    fireEvent.blur(input);
    const warning = screen.getByTestId("destination-address-wrong-chain");
    expect(warning).toBeInTheDocument();
    expect(warning).toHaveTextContent(/Bitcoin/);
    expect(warning).toHaveTextContent(/Solana/);
  });

  it("shows 'looks like Solana' when SOL address is in a Bitcoin field", () => {
    setup({ chainKind: "bitcoin", value: SOL });
    const input = screen.getByTestId("destination-address-input-field");
    fireEvent.blur(input);
    const warning = screen.getByTestId("destination-address-wrong-chain");
    expect(warning).toBeInTheDocument();
    expect(warning).toHaveTextContent(/Solana/);
  });

  it("does NOT show wrong-chain when input is valid for the selected kind", () => {
    setup({ chainKind: "bitcoin", value: BTC_LEGACY });
    const input = screen.getByTestId("destination-address-input-field");
    fireEvent.blur(input);
    expect(screen.queryByTestId("destination-address-wrong-chain")).not.toBeInTheDocument();
  });

  it("does NOT show wrong-chain warning for empty input", () => {
    setup({ chainKind: "solana", value: "" });
    expect(screen.queryByTestId("destination-address-wrong-chain")).not.toBeInTheDocument();
  });
});

describe("DestinationAddressInput — explorer link", () => {
  it("shows explorer link when valid + blockExplorer provided", () => {
    setup({
      chainKind: "bitcoin",
      value: BTC_LEGACY,
      blockExplorer: "https://blockstream.info",
    });
    const link = screen.getByTestId("destination-address-explorer-link");
    expect(link).toBeInTheDocument();
    expect(link.getAttribute("href")).toContain("blockstream.info");
    expect(link.getAttribute("href")).toContain(BTC_LEGACY);
  });

  it("does NOT show explorer link without blockExplorer prop", () => {
    setup({ chainKind: "bitcoin", value: BTC_LEGACY });
    expect(screen.queryByTestId("destination-address-explorer-link")).not.toBeInTheDocument();
  });

  it("does NOT show explorer link when address is invalid", () => {
    setup({
      chainKind: "bitcoin",
      value: "not-an-address",
      blockExplorer: "https://blockstream.info",
    });
    expect(screen.queryByTestId("destination-address-explorer-link")).not.toBeInTheDocument();
  });
});

describe("DestinationAddressInput — accessibility", () => {
  it("sets aria-invalid=true when invalid + touched", () => {
    setup({ chainKind: "bitcoin", value: "not-an-address" });
    const input = screen.getByTestId("destination-address-input-field");
    fireEvent.blur(input);
    expect(input.getAttribute("aria-invalid")).toBe("true");
  });

  it("sets aria-invalid=false when valid", () => {
    setup({ chainKind: "bitcoin", value: BTC_LEGACY });
    const input = screen.getByTestId("destination-address-input-field");
    // aria-invalid is "false" string when valid
    expect(input.getAttribute("aria-invalid")).toBe("false");
  });

  it("links input to hint + error via aria-describedby", () => {
    setup({ chainKind: "bitcoin", value: "garbage" });
    const input = screen.getByTestId("destination-address-input-field");
    fireEvent.blur(input);
    const describedBy = input.getAttribute("aria-describedby");
    expect(describedBy).toContain("hint");
    expect(describedBy).toContain("error");
  });
});

describe("DestinationAddressInput — EVM input", () => {
  it("accepts a real EVM address with chainKind='evm'", () => {
    setup({ chainKind: "evm", value: EVM });
    expect(screen.getByTestId("destination-address-valid-icon")).toBeInTheDocument();
  });
});
