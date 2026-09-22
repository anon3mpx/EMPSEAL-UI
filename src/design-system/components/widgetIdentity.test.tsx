import { fireEvent, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { resetLogoRegistryCache } from "../data/logoRegistry";
import { ChainPill, TokenIdentityRow } from "../widgetKit";
import ChainLogo from "./ChainLogo";
import LogoTile from "./LogoTile";
import TokenLogo from "./TokenLogo";

describe("identity primitives never render a blank frame", () => {
  beforeEach(() => {
    resetLogoRegistryCache();
  });

  afterEach(() => {
    resetLogoRegistryCache();
  });

  it("TokenLogo with no candidates shows its ticker", () => {
    const { getByText, queryByRole } = render(<TokenLogo ticker="PRVX" size={34} />);
    expect(queryByRole("img")).toBeNull();
    expect(getByText("PRVX")).toBeInTheDocument();
  });

  it("ChainLogo with unknown chain shows its provided symbol", () => {
    const { getByText, queryByRole } = render(
      <ChainLogo chainId={424242} symbol="XYZ" bg="#123456" size={32} />,
    );
    expect(queryByRole("img")).toBeNull();
    expect(getByText("XYZ")).toBeInTheDocument();
  });

  it("LogoTile shows fallback after an image error", () => {
    const { getByRole, getByText } = render(
      <LogoTile src="https://missing.example/logo.png" fallback={<span>USDC</span>} size={34} />,
    );
    expect(getByRole("img")).toHaveAttribute("src", "https://missing.example/logo.png");
    fireEvent.error(getByRole("img"));
    expect(getByText("USDC")).toBeInTheDocument();
  });

  it("TokenIdentityRow with no logo renders an abbreviation from name", () => {
    const { getByText, queryByRole } = render(
      <TokenIdentityRow name="Wrapped Ether" />,
    );
    expect(queryByRole("img")).toBeNull();
    expect(getByText("Wrap")).toBeInTheDocument();
  });

  it("ChainPill with no logo renders fallbackLabel", () => {
    const { getByText, queryByRole } = render(
      <ChainPill name="Arbitrum" fallbackLabel="ARB" />,
    );
    expect(queryByRole("img")).toBeNull();
    expect(getByText("ARB")).toBeInTheDocument();
    expect(getByText("Arbitrum")).toBeInTheDocument();
  });

  it("renders a supplied TokenLogo node once", () => {
    const { getAllByRole } = render(
      <TokenIdentityRow
        name="USDC"
        logo={<TokenLogo ticker="USDC" logoUrl="/icons/usdc.svg" size={30} />}
      />,
    );
    const images = getAllByRole("img");
    expect(images).toHaveLength(1);
    expect(images[0]).toHaveAttribute("src", "/icons/usdc.svg");
  });

  it("LogoTile clears a prior failure when src changes", () => {
    const view = render(
      <LogoTile src="https://one.example/a.png" fallback={<span>A</span>} size={34} />,
    );
    fireEvent.error(view.getByRole("img"));
    expect(view.getByText("A")).toBeInTheDocument();
    view.rerender(
      <LogoTile src="https://two.example/b.png" fallback={<span>B</span>} size={34} />,
    );
    expect(view.getByRole("img")).toHaveAttribute("src", "https://two.example/b.png");
  });
});
