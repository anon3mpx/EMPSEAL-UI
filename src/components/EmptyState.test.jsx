import { render, screen, fireEvent } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import EmptyState from "./EmptyState";

describe("EmptyState", () => {
  it("renders title only when no description or action", () => {
    render(<EmptyState title="No tokens found" />);
    expect(screen.getByTestId("empty-state-title")).toHaveTextContent("No tokens found");
    expect(screen.queryByTestId("empty-state-description")).not.toBeInTheDocument();
    expect(screen.queryByTestId("empty-state-action-0")).not.toBeInTheDocument();
  });

  it("renders description when provided", () => {
    render(
      <EmptyState
        title="No tokens"
        description="Try a different search."
      />,
    );
    expect(screen.getByTestId("empty-state-description")).toHaveTextContent(
      "Try a different search.",
    );
  });

  it("renders a single action button", () => {
    const onClick = vi.fn();
    render(
      <EmptyState
        title="No results"
        action={{ label: "Reset filter", onClick }}
      />,
    );
    fireEvent.click(screen.getByTestId("empty-state-action-0"));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("renders multiple actions when given an array", () => {
    render(
      <EmptyState
        title="Connect wallet"
        action={[
          { label: "Connect", onClick: () => {}, primary: true },
          { label: "Learn more", onClick: () => {} },
        ]}
      />,
    );
    expect(screen.getByTestId("empty-state-action-0")).toHaveTextContent("Connect");
    expect(screen.getByTestId("empty-state-action-1")).toHaveTextContent("Learn more");
  });

  it("styles primary action distinctly from ghost", () => {
    render(
      <EmptyState
        title="x"
        action={[
          { label: "Primary", onClick: () => {}, primary: true },
          { label: "Ghost", onClick: () => {} },
        ]}
      />,
    );
    const primary = screen.getByTestId("empty-state-action-0");
    const ghost = screen.getByTestId("empty-state-action-1");
    // Primary uses the orange brand bg; ghost uses bordered transparent.
    expect(primary.className).toMatch(/bg-\[#FF8A00\]/);
    expect(ghost.className).toMatch(/border/);
    expect(ghost.className).not.toMatch(/bg-\[#FF8A00\]/);
  });

  it("uses role=status + aria-live for screen readers", () => {
    render(<EmptyState title="x" />);
    const el = screen.getByTestId("empty-state");
    expect(el).toHaveAttribute("role", "status");
    expect(el).toHaveAttribute("aria-live", "polite");
  });

  it("falls back to default Inbox icon when none provided", () => {
    render(<EmptyState title="x" />);
    // The default lucide-react Inbox renders as an SVG.
    const el = screen.getByTestId("empty-state");
    expect(el.querySelector("svg")).toBeInTheDocument();
  });

  it("applies size classes based on prop", () => {
    const { rerender } = render(<EmptyState title="x" size="compact" />);
    let el = screen.getByTestId("empty-state");
    expect(el.className).toMatch(/py-6/);

    rerender(<EmptyState title="x" size="default" />);
    el = screen.getByTestId("empty-state");
    expect(el.className).toMatch(/py-10/);

    rerender(<EmptyState title="x" size="large" />);
    el = screen.getByTestId("empty-state");
    expect(el.className).toMatch(/py-16/);
  });
});
