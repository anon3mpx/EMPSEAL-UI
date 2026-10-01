import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import DappNavbar from "./DappNavbar";

describe("DappNavbar", () => {
  it("renders grouped nav triggers", () => {
    render(<DappNavbar activeHref="/swap-v2" />);

    expect(screen.getByRole("button", { name: /trade/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /fund/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /portfolio/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /widget/i })).toBeInTheDocument();
  });

  it("marks Trade as active on /swap-v2", () => {
    render(<DappNavbar activeHref="/swap-v2" />);

    const trade = screen.getByRole("button", { name: /trade/i });
    expect(trade).toHaveStyle({ color: "#FF8A00" });
  });

  it("lists Bridge and Ramp as disabled items, not links", () => {
    render(<DappNavbar activeHref="/swap-v2" />);

    fireEvent.click(screen.getByRole("button", { name: /trade/i }));
    const bridge = screen.getByRole("menuitem", { name: /bridge/i });
    expect(bridge).toHaveAttribute("aria-disabled", "true");
    expect(bridge).not.toHaveAttribute("href");
    expect(screen.getByRole("menuitem", { name: /swap/i })).toHaveAttribute("href", "/swap-v2");

    fireEvent.click(screen.getByRole("button", { name: /fund/i }));
    const ramp = screen.getByRole("menuitem", { name: /ramp/i });
    expect(ramp).toHaveAttribute("aria-disabled", "true");
    expect(ramp).not.toHaveAttribute("href");
    expect(screen.getByRole("menuitem", { name: /gas/i })).toHaveAttribute("href", "/gas-v2");
  });
});
