import { describe, expect, it, vi } from "vitest";
import { createCrossV2Client } from "./client";
import { reviveTypedMessage } from "./typedData";
import { tickerOf, describeOffer } from "./offerView";
import { makeOffer } from "./v2Fixtures";

const json = (status: number, body: unknown) => new Response(typeof body === "string" ? body : JSON.stringify(body), { status });

describe("createCrossV2Client", () => {
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
