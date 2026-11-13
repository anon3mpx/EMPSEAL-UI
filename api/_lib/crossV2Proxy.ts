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
  body: string;
}

// A server id as client.ts sends it (encodeURIComponent of a server id). No leading dot, and the only escape allowed is %3A (the ":" of a `provider:0x<hash>` intent id), so the segment can never become a traversal.
const ID = "[A-Za-z0-9_-](?:[A-Za-z0-9_.-]|%3[Aa]){0,127}";
const ROUTES: ReadonlyArray<[string, RegExp]> = [
  ["GET", /^\/v2\/capabilities$/],
  ["GET", /^\/v2\/capabilities\/corridors$/],
  ["POST", /^\/v2\/quote$/],
  ["POST", /^\/v2\/intents$/],
  ["GET", new RegExp(`^/v2/intents/${ID}$`)],
  ["POST", new RegExp(`^/v2/intents/${ID}/orders$`)],
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

export async function handleCrossV2Proxy(req: InboundRequest, env: ProxyEnv, fetchImpl: typeof fetch = fetch): Promise<ProxyResponse> {
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
  const out: Record<string, string> = { accept: "application/json", "x-api-key": key };
  const contentType = header(req.headers, "content-type");
  if (hasBody && contentType) out["content-type"] = contentType;
  const idem = header(req.headers, "idempotency-key");
  if (idem && idem.length <= 256) out["idempotency-key"] = idem;

  let res: Response;
  try {
    // The query string is never forwarded: no allowlisted route takes one.
    res = await fetchImpl(`${base}${upstreamPath}`, {
      method: req.method,
      headers: out,
      body: hasBody ? Buffer.from(req.body!) : undefined,
      // A redirect would carry the key to wherever it points: refuse it.
      redirect: "error",
      signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
    });
  } catch (e) {
    if ((e as { name?: string } | null)?.name === "TimeoutError") return json(504, "UPSTREAM_TIMEOUT", "the V2 API did not answer in time", true);
    return json(502, "UPSTREAM_UNAVAILABLE", "the V2 API could not be reached", true);
  }
  const headers: Record<string, string> = { "cache-control": "no-store" };
  for (const name of ["content-type", "x-request-id", "retry-after"]) {
    const v = res.headers.get(name);
    if (v) headers[name] = v;
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
    try {
      const method = req.method ?? "GET";
      const body = method === "POST" ? await readBody(req) : undefined;
      r = await handleCrossV2Proxy({ method, url: req.url ?? "/", headers: req.headers, body }, getEnv(), fetchImpl);
    } catch (e) {
      r = e instanceof BodyTooLarge ? json(413, "PAYLOAD_TOO_LARGE", "request body is too large") : json(500, "PROXY_ERROR", "the V2 proxy failed");
    }
    res.statusCode = r.status;
    for (const [k, v] of Object.entries(r.headers)) res.setHeader(k, v);
    res.end(r.body);
  };
}

export const crossV2EnvFromProcess = (): ProxyEnv => ({
  baseUrl: process.env.EMPX_V2_API_BASE_URL,
  apiKey: process.env.EMPX_V2_API_KEY,
});
