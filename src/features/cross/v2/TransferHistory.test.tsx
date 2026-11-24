import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import TransferHistory from "./TransferHistory";
import type { StoredIntent } from "./journeyStore";

const entry = (id: string, lastStatus?: string): StoredIntent => ({
  intentId: id,
  createdAt: Date.UTC(2026, 10, 24, 9, 5),
  fromChain: "eip155:8453",
  toChain: "eip155:42161",
  toAsset: "eip155:42161/erc20:0xfd08",
  sourceTxs: [],
  ...(lastStatus ? { lastStatus } : {}),
});
const ticker = () => "USDT";

describe("TransferHistory", () => {
  it("lists each transfer with its route, token and last status, and Track opens it", () => {
    const onOpen = vi.fn();
    const items = [entry("a", "delivered"), entry("b", "delivery_observed"), entry("c")];
    render(<TransferHistory entries={items} activeId={null} onOpen={onOpen} ticker={ticker} />);
    const rows = screen.getAllByRole("listitem");
    expect(rows.map((r) => r.textContent)).toEqual([
      expect.stringMatching(/Base → Arbitrum · USDT.*Delivered/),
      expect.stringMatching(/Base → Arbitrum · USDT.*In progress/),
      expect.stringMatching(/Base → Arbitrum · USDT.*Not checked yet/),
    ]);
    fireEvent.click(screen.getAllByRole("button", { name: "Track" })[1]!);
    expect(onOpen).toHaveBeenCalledWith(items[1]);
  });
  it("marks the transfer open in the panel and shows nothing without transfers", () => {
    const { container, rerender } = render(<TransferHistory entries={[]} activeId={null} onOpen={vi.fn()} ticker={ticker} />);
    expect(container.textContent).toBe("");
    rerender(<TransferHistory entries={[entry("a")]} activeId="a" onOpen={vi.fn()} ticker={ticker} />);
    expect((screen.getByRole("button", { name: "Open" }) as HTMLButtonElement).disabled).toBe(true);
  });
  it("shows the newest five until asked for all", () => {
    const items = Array.from({ length: 7 }, (_, n) => entry(`t${n}`, "delivered"));
    render(<TransferHistory entries={items} activeId={null} onOpen={vi.fn()} ticker={ticker} />);
    expect(screen.getAllByRole("listitem")).toHaveLength(5);
    fireEvent.click(screen.getByRole("button", { name: "Show all 7" }));
    expect(screen.getAllByRole("listitem")).toHaveLength(7);
  });
});
