import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useQuoteLifecycle, type QuoteLifecycleOptions } from "./useQuoteLifecycle";

const T0 = new Date("2026-09-25T12:00:00.000Z").getTime();

function advance(ms: number) {
  act(() => {
    vi.advanceTimersByTime(ms);
  });
}

describe("useQuoteLifecycle", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(T0);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("is inactive without a quote", () => {
    const { result } = renderHook(() => useQuoteLifecycle({ issuedAt: null, validMs: 60_000, onRefresh: vi.fn() }));
    expect(result.current.active).toBe(false);
    expect(result.current.canRefresh).toBe(false);
  });

  it("unlocks manual refresh at the configured age and tracks remaining time", () => {
    const { result } = renderHook(() =>
      useQuoteLifecycle({ issuedAt: T0, validMs: 60_000, onRefresh: vi.fn(), manualUnlockMs: 30_000 }),
    );
    expect(result.current.totalSeconds).toBe(60);
    expect(result.current.remainingPct).toBe(100);
    expect(result.current.canRefresh).toBe(false);

    advance(30_000);
    expect(result.current.ageSeconds).toBe(30);
    expect(result.current.remainingPct).toBe(50);
    expect(result.current.canRefresh).toBe(true);
  });

  it("auto-refreshes exactly once when the quote expires", () => {
    const onRefresh = vi.fn();
    const { result } = renderHook(() =>
      useQuoteLifecycle({ issuedAt: T0, validMs: 60_000, onRefresh, autoRefresh: true }),
    );
    advance(59_000);
    expect(onRefresh).not.toHaveBeenCalled();

    advance(1_000);
    expect(onRefresh).toHaveBeenCalledTimes(1);
    expect(result.current.refreshing).toBe(true);

    // Same (failed) quote keeps ageing — no refresh loop.
    advance(5_000);
    expect(onRefresh).toHaveBeenCalledTimes(1);
  });

  it("does not auto-refresh unless enabled", () => {
    const onRefresh = vi.fn();
    renderHook(() => useQuoteLifecycle({ issuedAt: T0, validMs: 30_000, onRefresh }));
    advance(40_000);
    expect(onRefresh).not.toHaveBeenCalled();
  });

  it("holds auto-refresh while paused and fires once unpaused", () => {
    const onRefresh = vi.fn();
    const { rerender } = renderHook((props: QuoteLifecycleOptions) => useQuoteLifecycle(props), {
      initialProps: { issuedAt: T0, validMs: 60_000, onRefresh, autoRefresh: true, paused: true },
    });
    advance(61_000);
    expect(onRefresh).not.toHaveBeenCalled();

    rerender({ issuedAt: T0, validMs: 60_000, onRefresh, autoRefresh: true, paused: false });
    expect(onRefresh).toHaveBeenCalledTimes(1);
  });

  it("clears the refreshing state when a new quote arrives", () => {
    const onRefresh = vi.fn();
    const { result, rerender } = renderHook((props: QuoteLifecycleOptions) => useQuoteLifecycle(props), {
      initialProps: { issuedAt: T0, validMs: 60_000, onRefresh, manualUnlockMs: 0 },
    });
    act(() => result.current.refresh());
    expect(result.current.refreshing).toBe(true);
    expect(result.current.canRefresh).toBe(false);

    rerender({ issuedAt: T0 + 2_000, validMs: 60_000, onRefresh, manualUnlockMs: 0 });
    expect(result.current.refreshing).toBe(false);
  });
});
