// @vitest-environment node
import { createServer, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import { afterEach, describe, expect, it, vi } from "vitest";
import { crossV2NodeHandler, handleCrossV2Proxy, MAX_BODY_BYTES, resolveUpstreamBase, type InboundRequest, type ProxyEnv } from "./crossV2Proxy";

const SERVER_KEY = "sk_test_server_secret_123";
const env: ProxyEnv = { baseUrl: "https://v2.example.test/", apiKey: SERVER_KEY };
const upstream = (status = 200, body: unknown = { ok: true }, headers: Record<string, string> = {}) =>
  vi.fn(async (_url: string, _init: RequestInit) => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json", ...headers } }));
const req = (method: string, url: string, headers: InboundRequest["headers"] = {}, body?: string): InboundRequest => ({
  method,
  url,
  headers,
  body: body === undefined ? undefined : new TextEncoder().encode(body),
});
const sentHeaders = (f: ReturnType<typeof upstream>) => f.mock.calls[0]![1].headers as Record<string, string>;

describe("allowlist", () => {
  const allowed: Array<[string, string]> = [
    ["GET", "/api/cross-v2/v2/capabilities"],
    ["GET", "/api/cross-v2/v2/capabilities/corridors"],
    ["POST", "/api/cross-v2/v2/quote"],
    ["POST", "/api/cross-v2/v2/intents"],
    ["GET", "/api/cross-v2/v2/intents/int_123"],
    ["POST", "/api/cross-v2/v2/intents/int_123/orders"],
    ["POST", "/api/cross-v2/v2/intents/int_123/steps"],
    ["POST", "/api/cross-v2/v2/intents/int_123/reference"],
    ["POST", "/api/cross-v2/v2/journeys/quote"],
    ["POST", "/api/cross-v2/v2/journeys"],
    ["GET", "/api/cross-v2/v2/journeys/jny_1"],
    ["POST", "/api/cross-v2/v2/journeys/jny_1/advance"],
    ["POST", "/api/cross-v2/v2/journeys/jny_1/restart-quote"],
    ["POST", "/api/cross-v2/v2/journeys/jny_1/accept-new-terms"],
  ];
  it.each(allowed)("forwards %s %s to the configured host only", async (method, url) => {
    const f = upstream();
    const r = await handleCrossV2Proxy(req(method, url, { host: "evil.example" }, method === "POST" ? "{}" : undefined), env, f as never);
    expect(r.status).toBe(200);
    expect(f.mock.calls[0]![0]).toBe(`https://v2.example.test${url.slice("/api/cross-v2".length)}`);
  });

  const refused: Array<[string, string]> = [
    ["GET", "/api/cross-v2/v2/quote"],
    ["DELETE", "/api/cross-v2/v2/intents/int_123"],
    ["GET", "/api/cross-v2/v2/capabilities/mesh"],
    ["POST", "/api/cross-v2/v2/baskets"],
    ["GET", "/api/cross-v2/v2/dashboard/summary"],
    ["GET", "/api/cross-v2/v2/analytics/overview"],
    ["GET", "/api/cross-v2/v2/webhooks"],
    ["POST", "/api/cross-v2/v2/journeys/jny_1/cancel"],
    ["GET", "/api/cross-v2/v2/intents/../webhooks"],
    ["GET", "/api/cross-v2/v2/intents/%2e%2e"],
    ["GET", "/api/cross-v2/v2/intents/.."],
    ["POST", "/api/cross-v2/v2/intents/a/orders/extra"],
    ["GET", "/api/cross-v2/https://evil.example/v2/quote"],
    ["GET", "/api/cross-v2-tenant/v2/dashboard/summary"],
  ];
  it.each(refused)("404s %s %s without calling upstream, in the V2 error shape", async (method, url) => {
    const f = upstream();
    const r = await handleCrossV2Proxy(req(method, url), env, f as never);
    expect(r.status).toBe(404);
    expect(JSON.parse(r.body)).toEqual({ error: { code: "NOT_FOUND", message: "no such route", retryable: false } });
    expect(f).not.toHaveBeenCalled();
  });

  it("drops the query string", async () => {
    const f = upstream();
    await handleCrossV2Proxy(req("GET", "/api/cross-v2/v2/intents/i1?redirect=https://evil.example"), env, f as never);
    expect(f.mock.calls[0]![0]).toBe("https://v2.example.test/v2/intents/i1");
  });
});

describe("the key", () => {
  it("adds the server key and ignores a client-supplied x-api-key", async () => {
    const f = upstream();
    await handleCrossV2Proxy(req("POST", "/api/cross-v2/v2/quote", { "x-api-key": "client-key", "content-type": "application/json" }, "{}"), env, f as never);
    expect(sentHeaders(f)["x-api-key"]).toBe(SERVER_KEY);
  });

  it("never returns the key to the client, even when upstream echoes headers", async () => {
    const f = upstream(200, { ok: true }, { "x-api-key": SERVER_KEY, "set-cookie": "s=1", "x-request-id": "rid-1", "retry-after": "3" });
    const r = await handleCrossV2Proxy(req("GET", "/api/cross-v2/v2/intents/i1"), env, f as never);
    expect(JSON.stringify(r)).not.toContain(SERVER_KEY);
    expect(r.headers).toEqual({ "cache-control": "no-store", "content-type": "application/json", "x-request-id": "rid-1", "retry-after": "3" });
  });

  it("forwards only content-type and Idempotency-Key from the browser", async () => {
    const f = upstream(201);
    await handleCrossV2Proxy(
      req("POST", "/api/cross-v2/v2/intents", { "content-type": "application/json", "idempotency-key": "commit-1", cookie: "c=1", authorization: "Bearer x", origin: "https://a" }, '{"a":1}'),
      env,
      f as never,
    );
    expect(sentHeaders(f)).toEqual({ accept: "application/json", "x-api-key": SERVER_KEY, "content-type": "application/json", "idempotency-key": "commit-1" });
    expect(f.mock.calls[0]![1].redirect).toBe("error");
  });

  it("is a 503 without a server key or a valid upstream, and never calls out", async () => {
    const f = upstream();
    expect((await handleCrossV2Proxy(req("GET", "/api/cross-v2/v2/intents/i1"), { baseUrl: env.baseUrl }, f as never)).status).toBe(503);
    expect((await handleCrossV2Proxy(req("GET", "/api/cross-v2/v2/intents/i1"), { apiKey: SERVER_KEY, baseUrl: "http://v2.example.test" }, f as never)).status).toBe(503);
    expect(f).not.toHaveBeenCalled();
  });

  it("refuses an oversized body", async () => {
    const f = upstream();
    const r = await handleCrossV2Proxy(req("POST", "/api/cross-v2/v2/quote", {}, "x".repeat(MAX_BODY_BYTES + 1)), env, f as never);
    expect(r.status).toBe(413);
    expect(f).not.toHaveBeenCalled();
  });

  it("maps an unreachable upstream to a retryable 502", async () => {
    const f = vi.fn(async () => {
      throw new TypeError("fetch failed");
    });
    const r = await handleCrossV2Proxy(req("GET", "/api/cross-v2/v2/intents/i1"), env, f as never);
    expect(r.status).toBe(502);
    expect(JSON.parse(r.body)).toEqual({ error: { code: "UPSTREAM_UNAVAILABLE", message: "the V2 API could not be reached", retryable: true } });
  });

  it("maps an upstream timeout to a retryable 504", async () => {
    const f = vi.fn(async () => {
      throw Object.assign(new Error("timed out"), { name: "TimeoutError" });
    });
    const r = await handleCrossV2Proxy(req("POST", "/api/cross-v2/v2/journeys/quote", {}, "{}"), env, f as never);
    expect(r.status).toBe(504);
    expect(JSON.parse(r.body).error.code).toBe("UPSTREAM_TIMEOUT");
  });

  it("passes an upstream error body through unchanged", async () => {
    const body = { error: { code: "POLICY_DENIED", message: "no", retryable: false, details: { code: "economic_unpriced_unhealthy" } } };
    const f = upstream(403, body, { "x-request-id": "rid-2" });
    const r = await handleCrossV2Proxy(req("POST", "/api/cross-v2/v2/intents", {}, "{}"), env, f as never);
    expect(r.status).toBe(403);
    expect(JSON.parse(r.body)).toEqual(body);
    expect(r.headers["x-request-id"]).toBe("rid-2");
  });
});

describe("upstream base", () => {
  it("accepts https, or http on loopback only", () => {
    expect(resolveUpstreamBase(" https://crosschain-v2.empx.io/ ")).toBe("https://crosschain-v2.empx.io");
    expect(resolveUpstreamBase("http://localhost:8787")).toBe("http://localhost:8787");
    expect(resolveUpstreamBase("http://crosschain-v2.empx.io")).toBeNull();
    expect(resolveUpstreamBase("https://user:pw@v2.example.test")).toBeNull();
    expect(resolveUpstreamBase(undefined)).toBeNull();
  });
});

describe("Node handler (the Vercel function and dev middleware)", () => {
  let server: Server | undefined;
  afterEach(() => server?.close());

  it("serves over HTTP: key added upstream, body cap enforced on the stream", async () => {
    const f = upstream(202, { state: "accepted" }, { "x-request-id": "rid-9" });
    server = createServer(crossV2NodeHandler(() => env, f as never));
    await new Promise<void>((ok) => server!.listen(0, "127.0.0.1", ok));
    const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;

    const ok = await fetch(`${base}/api/cross-v2/v2/intents/i1/orders`, { method: "POST", headers: { "content-type": "application/json", "idempotency-key": "order-i1" }, body: '{"signature":"0x"}' });
    expect(ok.status).toBe(202);
    expect(ok.headers.get("x-request-id")).toBe("rid-9");
    expect(await ok.text()).not.toContain(SERVER_KEY);
    expect(sentHeaders(f)["x-api-key"]).toBe(SERVER_KEY);
    expect(Buffer.from(f.mock.calls[0]![1].body as Buffer).toString()).toBe('{"signature":"0x"}');

    const big = await fetch(`${base}/api/cross-v2/v2/quote`, { method: "POST", body: "x".repeat(MAX_BODY_BYTES + 10) });
    expect(big.status).toBe(413);
    expect(f).toHaveBeenCalledTimes(1);
  });
});
