import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import ChainLogo from "./ChainLogo";
import NetworkSelector from "./NetworkSelector";

describe("NetworkSelector", () => {
  it("renders a supplied chain logo and name", () => {
    render(
      <NetworkSelector
        name="Arbitrum"
        color="#28A0F0"
        logo={<ChainLogo chainId={42161} symbol="ARB" bg="#28A0F0" size={14} />}
        onClick={() => undefined}
      />,
    );
    expect(screen.getByRole("img", { name: "ARB logo" })).toHaveAttribute("src", "/icons/arbitrum.svg");
    expect(screen.getByText("Arbitrum")).toBeInTheDocument();
  });

  it("retains the colored dot when no logo is provided", () => {
    const { container } = render(
      <NetworkSelector name="Arbitrum" color="#28A0F0" onClick={() => undefined} />,
    );
    expect(screen.queryByRole("img")).toBeNull();
    expect(screen.getByText("Arbitrum")).toBeInTheDocument();
    expect(container.querySelector("span")).toBeTruthy();
  });

  it("invokes the existing click callback", () => {
    const onClick = vi.fn();
    render(<NetworkSelector name="Arbitrum" color="#28A0F0" onClick={onClick} />);
    fireEvent.click(screen.getByRole("button"));
    expect(onClick).toHaveBeenCalledTimes(1);
  });
});
