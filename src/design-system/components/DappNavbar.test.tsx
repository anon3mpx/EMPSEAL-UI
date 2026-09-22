import { render, screen } from "@testing-library/react";
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
});
