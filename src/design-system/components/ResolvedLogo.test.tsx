import { fireEvent, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { resetLogoRegistryCache, setCachedLogoStatus } from "../data/logoRegistry";
import ResolvedLogo from "./ResolvedLogo";

describe("ResolvedLogo", () => {
  beforeEach(() => {
    resetLogoRegistryCache();
  });

  afterEach(() => {
    resetLogoRegistryCache();
  });

  it("advances through candidates and then shows fallback", () => {
    const { getByRole, getByText } = render(
      <ResolvedLogo
        candidates={["https://one/logo.png", "https://two/logo.png"]}
        alt="USDC logo"
        fallback={<span>USDC</span>}
        size={32}
      />,
    );

    expect(getByRole("img")).toHaveAttribute("src", "https://one/logo.png");
    fireEvent.error(getByRole("img"));
    expect(getByRole("img")).toHaveAttribute("src", "https://two/logo.png");
    fireEvent.error(getByRole("img"));
    expect(getByText("USDC")).toBeInTheDocument();
  });

  it("resets when the identity changes", () => {
    const view = render(
      <ResolvedLogo candidates={["https://one/a.png"]} alt="A" fallback={<span>A</span>} size={32} />,
    );
    fireEvent.error(view.getByRole("img"));
    view.rerender(
      <ResolvedLogo candidates={["https://two/b.png"]} alt="B" fallback={<span>B</span>} size={32} />,
    );
    expect(view.getByRole("img")).toHaveAttribute("src", "https://two/b.png");
  });

  it("skips URLs cached as failed", () => {
    setCachedLogoStatus("https://one/logo.png", "fail");
    const { getByRole } = render(
      <ResolvedLogo
        candidates={["https://one/logo.png", "https://two/logo.png"]}
        alt="USDC logo"
        fallback={<span>USDC</span>}
        size={32}
      />,
    );
    expect(getByRole("img")).toHaveAttribute("src", "https://two/logo.png");
  });

  it("renders fallback immediately when there are no candidates", () => {
    const { getByText, queryByRole } = render(
      <ResolvedLogo candidates={[]} alt="PRVX logo" fallback={<span>PRVX</span>} size={32} />,
    );
    expect(queryByRole("img")).toBeNull();
    expect(getByText("PRVX")).toBeInTheDocument();
  });
});
