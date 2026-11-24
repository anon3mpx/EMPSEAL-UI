import { act, renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { CrossV2Client } from "./client";
import { useV2Quote } from "./useV2Quote";
import { FROM_ASSET, makeOffer, RECIPIENT, SENDER, TO_ASSET } from "./v2Fixtures";
import type { WireQuoteResponse } from "./types";

const input = { fromAsset: FROM_ASSET, fromDecimals: 6, toAsset: TO_ASSET, amount: "1", sender: SENDER, recipient: RECIPIENT };
const a = makeOffer({ plan: { id: "a" } });
const b = makeOffer({ plan: { id: "b" } });

/** A client whose journey quote streams `partial` at once and answers only when `finish` is called. */
function streamingClient(partial: WireQuoteResponse) {
  let finish!: (r: unknown) => void;
  let fail!: (e: unknown) => void;
  const journeyQuote = vi.fn((_i: unknown, _s: AbortSignal | undefined, onPartial?: (q: WireQuoteResponse) => void) => {
    setTimeout(() => onPartial?.(partial), 0);
    return new Promise((ok, no) => ((finish = ok), (fail = no)));
  });
  return { client: { journeyQuote } as unknown as CrossV2Client, finish: (r: unknown) => finish(r), fail: (e: unknown) => fail(e), journeyQuote };
}

describe("useV2Quote streaming", () => {
  it("shows the first routes as soon as they stream in, says more may come, and takes the final result when it lands", async () => {
    const s = streamingClient({ plans: [a] });
    const { result } = renderHook(() => useV2Quote(s.client, input, String));
    await waitFor(() => expect(result.current.offers.map((o) => o.offer.execution.plan.id)).toEqual(["a"]), { timeout: 3_000 });
    expect([result.current.state, result.current.streaming, result.current.forNewInput]).toEqual(["ready", true, false]);
    await act(async () => s.finish({ kind: "direct", quote: { plans: [b, a] } }));
    await waitFor(() => expect(result.current.streaming).toBe(false));
    expect(result.current.offers.map((o) => o.offer.execution.plan.id)).toEqual(["b", "a"]);
  });
  it("a stream that breaks after routes were shown keeps those routes instead of blanking the page", async () => {
    const s = streamingClient({ plans: [a] });
    const { result } = renderHook(() => useV2Quote(s.client, input, String));
    await waitFor(() => expect(result.current.offers).toHaveLength(1), { timeout: 3_000 });
    await act(async () => s.fail(new Error("connection lost")));
    await waitFor(() => expect(result.current.streaming).toBe(false));
    expect([result.current.state, result.current.offers.length, result.current.error]).toEqual(["ready", 1, null]);
  });
});
