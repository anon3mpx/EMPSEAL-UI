import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import { useCrossQuote } from "./useCrossQuote";

const { quote } = vi.hoisted(() => ({ quote: vi.fn() }));

vi.mock("../api/crossApi", () => ({
  crossApi: { quote },
}));

describe("useCrossQuote", () => {
  it("does not call the quote API when a disabled query is manually refreshed without a request", async () => {
    const client = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    const wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    );

    const { result } = renderHook(() => useCrossQuote(false, null), { wrapper });

    await act(async () => {
      await result.current.refetch();
    });

    expect(quote).not.toHaveBeenCalled();
  });
});
