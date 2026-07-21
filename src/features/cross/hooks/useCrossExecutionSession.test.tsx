import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import { useCrossExecutionSession } from "./useCrossExecutionSession";

describe("useCrossExecutionSession", () => {
  it("forwards single-intent selection payloads unchanged", async () => {
    const wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={new QueryClient()}>
        {children}
      </QueryClientProvider>
    );

    const selectOffer = vi.fn().mockResolvedValue({ ok: true });

    const { result } = renderHook(
      () => useCrossExecutionSession({ api: { selectOffer } as any }),
      { wrapper },
    );

    await act(async () => {
      await result.current.selectSingleIntent({
        offerSetId: "set-1",
        offerId: "offer-2",
        userAddress: "0xabc",
      });
    });

    expect(selectOffer).toHaveBeenCalledWith({
      offerSetId: "set-1",
      offerId: "offer-2",
      userAddress: "0xabc",
    });
  });

  it("forwards composed-intent selection payloads unchanged", async () => {
    const wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={new QueryClient()}>
        {children}
      </QueryClientProvider>
    );

    const selectComposed = vi.fn().mockResolvedValue({ ok: true });

    const { result } = renderHook(
      () => useCrossExecutionSession({ api: { selectComposed } as any }),
      { wrapper },
    );

    await act(async () => {
      await result.current.selectComposedIntent({
        offerSetId: "set-1",
        primaryTransferOfferId: "offer-2",
        gasZipDestinationGasOfferId: "gas-1",
        userAddress: "0xabc",
      });
    });

    expect(selectComposed).toHaveBeenCalledWith({
      offerSetId: "set-1",
      primaryTransferOfferId: "offer-2",
      gasZipDestinationGasOfferId: "gas-1",
      userAddress: "0xabc",
    });
  });

  it("surfaces fallback offer sets from 409 selection conflicts", async () => {
    const wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={new QueryClient()}>
        {children}
      </QueryClientProvider>
    );

    const selectOffer = vi.fn().mockRejectedValue({
      status: 409,
      body: { fallbackOfferSet: { offerSetId: "replacement" } },
    });

    const { result } = renderHook(
      () => useCrossExecutionSession({ api: { selectOffer } as any }),
      { wrapper },
    );

    await act(async () => {
      await expect(
        result.current.selectSingleIntent({
          offerSetId: "old",
          offerId: "offer-1",
          userAddress: "0xabc",
        }),
      ).rejects.toBeTruthy();
    });

    await waitFor(() => {
      expect(result.current.fallbackOfferSet?.offerSetId).toBe("replacement");
    });
  });
});
