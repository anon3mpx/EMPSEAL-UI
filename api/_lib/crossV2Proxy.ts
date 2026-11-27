/// <reference types="node" />
// Same-origin proxy for the EMPX V2 API, shared by the Vercel function (api/cross-v2, prod) and the Vite dev server (vite.config.js).
// The V2 API says browsers must not hold keys, so /api/cross-v2/... adds EMPX_V2_API_KEY on the server (a client-supplied key is ignored)
// and allows only the intent, journey and basket calls src/features/cross/v2/client.ts makes.
// The upstream host comes from EMPX_V2_API_BASE_URL only, never from the request. Anything not allowlisted is a 404 and never reaches upstream.
// Errors the proxy produces itself use the V2 API's own shape: {"error":{"code","message","retryable"}}.
import type { IncomingMessage, ServerResponse } from "node:http";

export const PROXY_PREFIX = "/api/cross-v2";
export const MAX_BODY_BYTES = 256 * 1024;
// Long-tail token quotes take 20-40 s on the server today; the Vercel function's maxDuration (vercel.json) sits above this.
const UPSTREAM_TIMEOUT_MS = 45_000;

export interface ProxyEnv {
  baseUrl?: string;
  apiKey?: string;
}
export interface InboundRequest {
  method: string;
  url: string;
  headers: Record<string, string | string[] | undefined>;
  body?: Uint8Array;
}
export interface ProxyResponse {
  status: number;
  headers: Record<string, string>;
  /** A stream only for a streamed journey quote (text/event-stream), passed on event by event. */
  body: string | ReadableStream<Uint8Array>;
}
/** The one call that may be streamed: the journey quote, when the browser asks for an event stream. */
const STREAMABLE = /^\/v2\/journeys\/quote$/;

// A server id as client.ts sends it (encodeURIComponent of a server id). No leading dot, and the only escape allowed is %3A (the ":" of a `provider:0x<hash>` intent id), so the segment can never become a traversal.
const ID = "[A-Za-z0-9_-](?:[A-Za-z0-9_.-]|%3[Aa]){0,127}";
const ROUTES: ReadonlyArray<[string, RegExp]> = [
  ["GET", /^\/v2\/capabilities$/],
  ["GET", /^\/v2\/capabilities\/corridors$/],
  ["POST", /^\/v2\/quote$/],
  ["POST", /^\/v2\/intents$/],
  ["POST", /^\/v2\/compositions$/],
  ["GET", new RegExp(`^/v2/compositions/${ID}$`)],
  ["GET", new RegExp(`^/v2/intents/${ID}$`)],
  ["POST", new RegExp(`^/v2/intents/${ID}/orders$`)],
  ["POST", new RegExp(`^/v2/intents/${ID}/solana$`)],
  ["POST", new RegExp(`^/v2/intents/${ID}/steps$`)],
  ["POST", new RegExp(`^/v2/intents/${ID}/reference$`)],
  ["POST", /^\/v2\/journeys\/quote$/],
  ["POST", /^\/v2\/journeys$/],
  ["GET", new RegExp(`^/v2/journeys/${ID}$`)],
  ["POST", new RegExp(`^/v2/journeys/${ID}/(advance|restart-quote|accept-new-terms)$`)],
  ["POST", /^\/v2\/baskets$/],
  ["GET", new RegExp(`^/v2/baskets/${ID}$`)],
  ["POST", new RegExp(`^/v2/baskets/${ID}/(begin|cancel)$`)],
  ["POST", new RegExp(`^/v2/baskets/${ID}/legs/${ID}/(commit|requote)$`)],
  ["GET", new RegExp(`^/v2/baskets/${ID}/legs/${ID}/steps$`)],
  ["POST", /^\/v2\/wallet\/scan$/],
  ["POST", /^\/v2\/wallet\/solana-balance$/],
  ["POST", /^\/v2\/wallet\/liquidate\/quote$/],
  ["GET", /^\/v2\/ramp\/(capabilities|delegations|agent-grants)$/],
  ["POST", /^\/v2\/ramp\/(wallets\/register|profile|kyc-link|kyc\/refresh|bank-link|bank-link\/exchange|external-accounts|preview|transfers|delegations|agent-grants)$/],
  ["POST", new RegExp(`^/v2/ramp/transfers/${ID}/(status|cancel|leg2)$`)],
  ["POST", new RegExp(`^/v2/ramp/(delegations|agent-grants)/${ID}/revoke$`)],
];

/** The upstream path for an allowlisted (method, path), or null. `pathname` is the part after the prefix. */
export function matchRoute(method: string, pathname: string): string | null {
  return ROUTES.some(([m, re]) => m === method && re.test(pathname)) ? pathname : null;
}

/** https only, except plain http to a loopback host for a local V2 server. Trailing slashes are dropped. */
export function resolveUpstreamBase(configured: string | undefined): string | null {
  const raw = configured?.trim().replace(/\/+$/, "");
  if (!raw) return null;
  try {
    const u = new URL(raw);
    const loopback = u.hostname === "localhost" || u.hostname === "127.0.0.1" || u.hostname === "[::1]";
    if (u.protocol !== "https:" && !(u.protocol === "http:" && loopback)) return null;
    if (u.username || u.password || u.search || u.hash) return null;
    return raw;
  } catch {
    return null;
  }
}

const json = (status: number, code: string, message: string, retryable = false): ProxyResponse => ({
  status,
  headers: { "content-type": "application/json", "cache-control": "no-store" },
  body: JSON.stringify({ error: { code, message, retryable } }),
});
const header = (h: InboundRequest["headers"], name: string): string | undefined => {
  const v = h[name];
  return typeof v === "string" ? v : undefined;
};

/** `signal`: the browser's side of the request; when it goes away the upstream call is cancelled too. */
export async function handleCrossV2Proxy(req: InboundRequest, env: ProxyEnv, fetchImpl: typeof fetch = fetch, signal?: AbortSignal): Promise<ProxyResponse> {
  // Reject dot segments before URL normalizes them into another allowlisted route.
  if (/(?:^|\/)(?:\.|%2e){1,2}(?:\/|[?#]|$)/i.test(req.url)) return json(404, "NOT_FOUND", "no such route");
  const url = new URL(req.url, "http://proxy.invalid");
  if (!url.pathname.startsWith(`${PROXY_PREFIX}/`)) return json(404, "NOT_FOUND", "no such route");
  const upstreamPath = matchRoute(req.method, url.pathname.slice(PROXY_PREFIX.length));
  if (!upstreamPath) return json(404, "NOT_FOUND", "no such route");

  const key = env.apiKey?.trim();
  if (!key) return json(503, "NOT_CONFIGURED", "the V2 proxy has no EMPX_V2_API_KEY");
  const base = resolveUpstreamBase(env.baseUrl);
  if (!base) return json(503, "NOT_CONFIGURED", "the V2 proxy has no valid EMPX_V2_API_BASE_URL");

  if (req.body && req.body.byteLength > MAX_BODY_BYTES) return json(413, "PAYLOAD_TOO_LARGE", "request body is too large");
  const hasBody = req.method === "POST" && req.body !== undefined && req.body.byteLength > 0;

  // Headers are built from scratch: cookies, auth, origin and everything else the browser sent stay here.
  const wantsStream = STREAMABLE.test(upstreamPath) && /\btext\/event-stream\b/.test(header(req.headers, "accept") ?? "");
  const out: Record<string, string> = { accept: wantsStream ? "text/event-stream" : "application/json", "x-api-key": key };
  const contentType = header(req.headers, "content-type");
  if (hasBody && contentType) out["content-type"] = contentType;
  const idem = header(req.headers, "idempotency-key");
  if (idem && idem.length <= 256) out["idempotency-key"] = idem;

  let res: Response;
  try {
    // Only signed list requests use a query; never forward unrelated browser query parameters.
    const query = req.method === "GET" && /^\/v2\/ramp\/(delegations|agent-grants)$/.test(upstreamPath)
      && url.searchParams.has("payload") ? `?${new URLSearchParams({payload:url.searchParams.get("payload")!})}` : "";
    res = await fetchImpl(`${base}${upstreamPath}${query}`, {
      method: req.method,
      headers: out,
      body: hasBody ? Buffer.from(req.body!) : undefined,
      // A redirect would carry the key to wherever it points: refuse it.
      redirect: "error",
      signal: signal ? AbortSignal.any([signal, AbortSignal.timeout(UPSTREAM_TIMEOUT_MS)]) : AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
    });
  } catch (e) {
    if ((e as { name?: string } | null)?.name === "TimeoutError") return json(504, "UPSTREAM_TIMEOUT", "the V2 API did not answer in time", true);
    if (signal?.aborted) return json(499, "CLIENT_CLOSED", "the request was cancelled", true);
    return json(502, "UPSTREAM_UNAVAILABLE", "the V2 API could not be reached", true);
  }
  const headers: Record<string, string> = { "cache-control": "no-store" };
  for (const name of ["content-type", "x-request-id", "retry-after"]) {
    const v = res.headers.get(name);
    if (v) headers[name] = v;
  }
  if (wantsStream && res.body && /^text\/event-stream\b/.test(headers["content-type"] ?? "")) {
    headers["cache-control"] = "no-store, no-transform";
    headers["x-accel-buffering"] = "no";
    return { status: res.status, headers, body: res.body };
  }
  return { status: res.status, headers, body: await res.text() };
}

export class BodyTooLarge extends Error {}

/** Reads a request body, refusing more than `max` bytes (checked against Content-Length first, then while streaming). */
export async function readBody(req: IncomingMessage, max = MAX_BODY_BYTES): Promise<Uint8Array> {
  const declared = Number(req.headers["content-length"]);
  if (Number.isFinite(declared) && declared > max) throw new BodyTooLarge();
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of req) {
    const b = typeof chunk === "string" ? Buffer.from(chunk) : (chunk as Buffer);
    size += b.byteLength;
    if (size > max) throw new BodyTooLarge();
    chunks.push(b);
  }
  return Buffer.concat(chunks);
}

/** A Node (req, res) handler: the shape of a Vercel Node function and of a Vite/connect middleware. `getEnv` is read per request. */
export function crossV2NodeHandler(getEnv: () => ProxyEnv, fetchImpl?: typeof fetch) {
  return async (req: IncomingMessage, res: ServerResponse): Promise<void> => {
    let r: ProxyResponse;
    const gone = new AbortController();
    res.on("close", () => {
      if (!res.writableEnded) gone.abort();
    });
    try {
      const method = req.method ?? "GET";
      const body = method === "POST" ? await readBody(req) : undefined;
      r = await handleCrossV2Proxy({ method, url: req.url ?? "/", headers: req.headers, body }, getEnv(), fetchImpl, gone.signal);
    } catch (e) {
      r = e instanceof BodyTooLarge ? json(413, "PAYLOAD_TOO_LARGE", "request body is too large") : json(500, "PROXY_ERROR", "the V2 proxy failed");
    }
    res.statusCode = r.status;
    for (const [k, v] of Object.entries(r.headers)) res.setHeader(k, v);
    if (typeof r.body === "string") return void res.end(r.body);
    // a streamed quote: each event is written as it arrives; a browser that leaves cancels the read (and so the upstream quote)
    res.flushHeaders();
    const reader = r.body.getReader();
    gone.signal.addEventListener("abort", () => void reader.cancel().catch(() => undefined), { once: true });
    try {
      for (let c = await reader.read(); !c.done; c = await reader.read()) res.write(c.value);
    } catch {
      /* upstream or browser went away: end what was sent */
    }
    res.end();
  };
}

export const crossV2EnvFromProcess = (): ProxyEnv => ({
  baseUrl: process.env.EMPX_V2_API_BASE_URL,
  apiKey: process.env.EMPX_V2_API_KEY,
});
