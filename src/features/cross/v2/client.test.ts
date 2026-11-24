import { describe, expect, it, vi } from "vitest";
import { createCrossV2Client } from "./client";
import { reviveTypedMessage } from "./typedData";
import { tickerOf, describeOffer } from "./offerView";
import { makeOffer } from "./v2Fixtures";

const json = (status: number, body: unknown) => new Response(typeof body === "string" ? body : JSON.stringify(body), { status });

describe("createCrossV2Client", () => {
  it("submits only signed Solana bytes to the encoded intent", async () => {
    const f = vi.fn(async (_url: string, _init: RequestInit) => json(200, { signature: "sig", replayed: false }));
    const r = await createCrossV2Client({ fetchImpl: f as never }).submitSolana("provider:abc", "AQ==");
    expect(r).toEqual({ signature: "sig", replayed: false });
    expect(f.mock.calls[0]?.[0]).toBe("/api/cross-v2/v2/intents/provider%3Aabc/solana");
    expect(JSON.parse(String(f.mock.calls[0]?.[1].body))).toEqual({ signedTransaction: "AQ==" });
  });
  it("retries a composition with the same key after an uncertain HTTP result and reads combined status", async () => {
    const f = vi.fn(async (_url: string, _init: RequestInit) => json(503, { error: { code: "PROVIDER_UNAVAILABLE", message: "unavailable", retryable: true } }));
    const c = createCrossV2Client({ fetchImpl: f as never });
    const offer = makeOffer();
    const input = { sender: "wallet", primary: { plan: offer.execution.plan, journey: offer.journey }, gasTopUp: { plan: offer.execution.plan, journey: offer.journey } };
    await expect(c.commitComposition(input, "stable-composition")).rejects.toMatchObject({ code: "PROVIDER_UNAVAILABLE" });
    f.mockImplementation(async () => json(200, { compositionId: "c-1", replayed: true }));
    expect((await c.commitComposition(input, "stable-composition")).replayed).toBe(true);
    expect(f.mock.calls.slice(0, 2).map(([, init]) => new Headers(init.headers).get("Idempotency-Key"))).toEqual(["stable-composition", "stable-composition"]);
    f.mockImplementation(async () => json(200, { compositionId: "c-1", state: "delivered_without_gas" }));
    expect((await c.compositionStatus("c-1")).state).toBe("delivered_without_gas");
  });
  it("scans and liquidates only the selected assets with the exact target", async () => {
    const f = vi.fn(async (_url: string, _init: RequestInit) => json(200, {}));
    const c = createCrossV2Client({ fetchImpl: f as never });
    const scan = { wallet: "0x1111111111111111111111111111111111111111", tokensByChain: {8453: ["0x2222222222222222222222222222222222222222"]}, includeNative: true };
    await c.scanWallet(scan);
    const liquidate = {...scan, target: "eip155:1/slip44:60", include: ["eip155:8453/erc20:0x2222222222222222222222222222222222222222"], maxTier: 3 as const, slippageBps: 50};
    await c.liquidateQuote(liquidate);
    expect(f.mock.calls.map(([url]) => url)).toEqual(["/api/cross-v2/v2/wallet/scan", "/api/cross-v2/v2/wallet/liquidate/quote"]);
    expect(f.mock.calls.map(([, init]) => JSON.parse(init.body as string))).toEqual([scan, liquidate]);
    expect((f.mock.calls[1]![1].headers as Record<string, string>)["Idempotency-Key"]).toMatch(/^liquidate-/);
  });
  it("basketPlan posts the request unchanged to /v2/baskets", async () => {
    const f = vi.fn(async (_url: string, _init: RequestInit) => json(200, {}));
    const r = { sender: "s", recipient: "r", maxTier: 3 as const, legs: [{ from: { asset: "a", amount: "123", decimals: 6 }, toAsset: "b" }] };
    await createCrossV2Client({ fetchImpl: f as never }).basketPlan(r);
    const [url, init] = f.mock.calls[0]!;
    expect(url).toBe("/api/cross-v2/v2/baskets");
    expect(init.method).toBe("POST");
    expect(JSON.parse(init.body as string)).toEqual(r);
    expect((init.headers as Record<string, string>)["Idempotency-Key"]).toMatch(/^basket-/);
  });
  it("basketCommitLeg uses a stable idempotency key", async () => {
    const f = vi.fn(async (_url: string, _init: RequestInit) => json(200, {}));
    const c = createCrossV2Client({ fetchImpl: f as never });
    await c.basketCommitLeg("bsk_1", "leg_000");
    await c.basketCommitLeg("bsk_1", "leg_000");
    expect(f.mock.calls.map(([, i]) => (i.headers as Record<string, string>)["Idempotency-Key"])).toEqual(["commit-bsk_1-leg_000", "commit-bsk_1-leg_000"]);
  });
  it("basketBegin sends expectedVersion and acknowledgeSkipped", async () => {
    const f = vi.fn(async (_url: string, _init: RequestInit) => json(200, {}));
    await createCrossV2Client({ fetchImpl: f as never }).basketBegin("bsk_1", 3, ["leg_002"]);
    expect(JSON.parse(f.mock.calls[0]![1].body as string)).toEqual({ expectedVersion: 3, acknowledgeSkipped: ["leg_002"] });
  });
  it("basket ids are URL-encoded", async () => {
    const f = vi.fn(async (_url: string, _init: RequestInit) => json(200, {}));
    await createCrossV2Client({ fetchImpl: f as never }).basketStatus("a/b");
    expect(f.mock.calls[0]![0]).toBe("/api/cross-v2/v2/baskets/a%2Fb");
  });
  it("posts a quote to the same-origin proxy with the policy ceiling and no key, without inventing slippage", async () => {
    const f = vi.fn(async () => json(200, { plans: [] }));
    const c = createCrossV2Client({ fetchImpl: f as never });
    await c.quote({ fromAsset: "a", amount: "1", decimals: 6, toAsset: "b", sender: "s", recipient: "r", maxTier: 3 });
    const [url, init] = f.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("/api/cross-v2/v2/quote");
    expect(Object.keys(init.headers as Record<string, string>).map((h) => h.toLowerCase())).not.toContain("x-api-key");
    expect(JSON.parse(init.body as string)).toEqual({ from: { asset: "a", amount: "1", decimals: 6 }, toAsset: "b", sender: "s", recipient: "r", policy: { maxTier: 3 } });
  });

  it("sends the commit with an idempotency key and the unchanged plan and journey", async () => {
    const f = vi.fn(async () => json(201, { intentId: "i", kind: "contract", replayed: false }));
    const c = createCrossV2Client({ baseUrl: "https://v2.test", fetchImpl: f as never });
    const o = makeOffer();
    await c.commit(o.execution.plan, o.journey, "0xs", "key-1");
    const [, init] = f.mock.calls[0] as unknown as [string, RequestInit];
    expect((init.headers as Record<string, string>)["Idempotency-Key"]).toBe("key-1");
    expect(JSON.parse(init.body as string)).toEqual({ plan: o.execution.plan, journey: o.journey, sender: "0xs" });
  });

  it("surfaces API errors in the V2 shape {error:{...}}, and refuses a 2xx that is not an object", async () => {
    const c = createCrossV2Client({ baseUrl: "https://v2.test", fetchImpl: vi.fn(async () => json(409, { error: { code: "QUOTE_MISMATCH", message: "no", retryable: false } })) as never });
    await expect(c.status("i")).rejects.toMatchObject({ status: 409, code: "QUOTE_MISMATCH", message: "no", retryable: false });
    for (const body of ["null", "[]", "not json", ""]) {
      const bad = createCrossV2Client({ baseUrl: "https://v2.test", fetchImpl: vi.fn(async () => json(200, body)) as never });
      await expect(bad.status("i")).rejects.toMatchObject({ code: "BAD_RESPONSE" });
    }
  });

  it("keeps details, the request id and Retry-After for the error view", async () => {
    const body = { error: { code: "POLICY_DENIED", message: "denied", retryable: false, details: { code: "agent_opt_in_required" } } };
    const res = new Response(JSON.stringify(body), { status: 403, headers: { "x-request-id": "rid-7" } });
    const c = createCrossV2Client({ baseUrl: "https://v2.test", fetchImpl: vi.fn(async () => res) as never });
    await expect(c.status("i")).rejects.toMatchObject({ code: "POLICY_DENIED", details: { code: "agent_opt_in_required" }, requestId: "rid-7", retryAfterSec: undefined });

    const limited = new Response(JSON.stringify({ error: { code: "RATE_LIMITED", message: "slow down", retryable: true } }), { status: 429, headers: { "retry-after": "12" } });
    const c2 = createCrossV2Client({ baseUrl: "https://v2.test", fetchImpl: vi.fn(async () => limited) as never });
    await expect(c2.status("i")).rejects.toMatchObject({ code: "RATE_LIMITED", retryable: true, retryAfterSec: 12 });
  });

  it("falls back to HTTP_ERROR for a non-JSON error page", async () => {
    const c = createCrossV2Client({ baseUrl: "https://v2.test", fetchImpl: vi.fn(async () => new Response("<html>bad gateway</html>", { status: 502 })) as never });
    await expect(c.status("i")).rejects.toMatchObject({ status: 502, code: "HTTP_ERROR", retryable: false });
  });

});

describe("presentation and signing helpers", () => {
  it("labels expected output, minimum output and each fee bucket separately", () => {
    const v = describeOffer(makeOffer().journey);
    expect(v.expectedOutput).toBe("0.99 USDC");
    expect(v.minimumOutput).toBe("0.985 USDC");
    expect(v.fees.map((f) => f.label)).toEqual(["EMPX fee", "Provider & bridge fee", "Relayer & gas"]);
    expect(tickerOf("eip155:8453/erc20:0x833589fcd6edb6e08f4c7c32d4f71b54bda02913")).toBe("USDC");
  });
  it("says estimate-only instead of showing a minimum", () => {
    const j = makeOffer({ journey: { minimumOutput: null, outputGuarantee: "estimate_only", fallback: { asset: "eip155:1/erc20:0xabcdef0123456789abcdef0123456789abcdef01", minAmount: "1" } } }).journey;
    expect(describeOffer(j).minimumOutput).toMatch(/^No guaranteed minimum \(estimate only\); falls back to/);
  });
  it("revives uint fields of an EIP-712 message from decimal strings, including nested structs", () => {
    const types = { Order: [{ name: "n", type: "uint256" }, { name: "w", type: "Inner" }, { name: "a", type: "address" }], Inner: [{ name: "x", type: "uint8[]" }] };
    expect(reviveTypedMessage(types, "Order", { n: "10", a: "0xabc", w: { x: ["1", "2"] } })).toEqual({ n: 10n, a: "0xabc", w: { x: [1n, 2n] } });
    expect(() => reviveTypedMessage(types, "Order", { n: "1.5", a: "0x", w: { x: [] } })).toThrow();
  });
});

describe("journeyQuote streaming", () => {
  const input = { fromAsset: "a", amount: "1", decimals: 6, toAsset: "b", sender: "s", recipient: "r", maxTier: 3 as const };
  const sse = (chunks: string[]) =>
    new Response(
      new ReadableStream<Uint8Array>({
        start(c) {
          for (const x of chunks) c.enqueue(new TextEncoder().encode(x));
          c.close();
        },
      }),
      { status: 200, headers: { "content-type": "text/event-stream" } },
    );
  it("asks for an event stream, hands each snapshot over as it arrives (even split across chunks) and resolves with the final body", async () => {
    const f = vi.fn(async (_url: string, _init: RequestInit) =>
      sse(['data: {"type":"partial","quote":{"plans":[1]}}\n', '\ndata: {"type":"partial","quote":{"plans":[1,2]}}\n\ndata: {"type":"res', 'ult","kind":"direct","quote":{"plans":[1,2]}}\n\n']),
    );
    const seen: unknown[] = [];
    const r = await createCrossV2Client({ fetchImpl: f as never }).journeyQuote(input, undefined, (q) => seen.push(q.plans));
    expect(new Headers(f.mock.calls[0]![1].headers).get("Accept")).toBe("text/event-stream");
    expect(seen).toEqual([[1], [1, 2]]);
    expect(r).toEqual({ kind: "direct", quote: { plans: [1, 2] } });
  });
  it("an error event is thrown like an error reply; a stream that ends without a result is refused", async () => {
    const err = vi.fn(async () => sse(['data: {"type":"error","status":404,"error":{"code":"NO_ROUTE","message":"none","retryable":false}}\n\n']));
    await expect(createCrossV2Client({ fetchImpl: err as never }).journeyQuote(input, undefined, () => undefined)).rejects.toMatchObject({ status: 404, code: "NO_ROUTE" });
    const cut = vi.fn(async () => sse(['data: {"type":"partial","quote":{"plans":[]}}\n\n']));
    await expect(createCrossV2Client({ fetchImpl: cut as never }).journeyQuote(input, undefined, () => undefined)).rejects.toMatchObject({ code: "BAD_RESPONSE" });
  });
  it("a server that answers plain JSON (no streaming) still works, and without a listener nothing is streamed", async () => {
    const f = vi.fn(async (_url: string, _init: RequestInit) => json(200, { kind: "direct", quote: { plans: [] } }));
    const c = createCrossV2Client({ fetchImpl: f as never });
    expect(await c.journeyQuote(input, undefined, () => undefined)).toEqual({ kind: "direct", quote: { plans: [] } });
    await c.journeyQuote(input);
    expect(new Headers(f.mock.calls[1]![1].headers).get("Accept")).toBeNull();
  });
});
