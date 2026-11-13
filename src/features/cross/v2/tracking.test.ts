import { decodeFunctionData, parseAbi } from "viem";
import { describe, expect, it, vi } from "vitest";
import { CrossV2ApiError } from "./client";
import { railLink, stagesOf, txLabel, txLinks } from "./CrossV2ExecutionPanel";
import { EMPX_DEPLOYMENTS } from "./deployments";
import { describeV2Error } from "./errors";
import { AmbiguousSubmission } from "./execute";
import { forgetIntent, openIntents, rememberIntent } from "./journeyStore";
import type { IntentStatus } from "./types";
import { claimTx } from "./useV2Intent";
import { RECIPIENT, SENDER } from "./v2Fixtures";

const SETTLER = EMPX_DEPLOYMENTS[8453]!.rails.cctp.settler;
const KEY = `0x${"ab".repeat(32)}`;
const parked = (over: Partial<NonNullable<IntentStatus["claim"]>> = {}, status = "parked"): IntentStatus =>
  ({
    status, anomalies: [], nextSteps: [],
    claim: { chain: "eip155:8453", settler: SETTLER, key: KEY, recipient: RECIPIENT, token: "0x0", amount: "1", ...over },
  }) as unknown as IntentStatus;

describe("describeV2Error", () => {
  it("says a wallet rejection plainly, also inside an ambiguous submission with nothing sent", () => {
    expect(describeV2Error({ name: "UserRejectedRequestError" }).text).toMatch(/rejected/);
    expect(describeV2Error(new AmbiguousSubmission("s1", undefined, { cause: { code: 4001 } })).text).toMatch(/Nothing was sent/);
    expect(describeV2Error(new AmbiguousSubmission("s1", `0x${"1".repeat(64)}`, { code: 4001 })).text).toMatch(/Do not resend/);
  });
  it("maps API codes, keeps the request id, and reads Retry-After", () => {
    const e = new CrossV2ApiError(429, "RATE_LIMITED", "slow down", true, { requestId: "req-1", retryAfterSec: 2.2 });
    expect(describeV2Error(e)).toEqual({ text: "Too many requests. Try again in 3 s.", requestId: "req-1", retryAfterSec: 2.2 });
    expect(describeV2Error(new CrossV2ApiError(409, "REQUOTE_REQUIRED", "x", true)).text).toMatch(/Refresh the quote/);
    const pd = new CrossV2ApiError(403, "POLICY_DENIED", "x", false, { details: { code: "terms_do_not_match_receipt" } });
    expect(describeV2Error(pd).text).toMatch(/new terms/);
    expect(describeV2Error(new CrossV2ApiError(502, "SOMETHING_NEW", "raw", true)).text).toMatch(/had a problem/);
  });
  it("names network failures", () => {
    expect(describeV2Error(new TypeError("Failed to fetch")).text).toMatch(/Network error/);
  });
});

describe("claimTx", () => {
  it("encodes claim(key, recipient) to a published settler for a parked delivery", () => {
    const tx = claimTx(parked(), SENDER)!;
    expect(tx).toMatchObject({ chainId: 8453, to: SETTLER });
    const d = decodeFunctionData({ abi: parseAbi(["function claim(bytes32 key, address to)"]), data: tx.data as `0x${string}` });
    expect(d.args).toEqual([KEY, RECIPIENT]);
  });
  it("offers nothing for an unknown settler, a bad key, another status, or no wallet", () => {
    expect(claimTx(parked({ settler: `0x${"9".repeat(40)}` }), SENDER)).toBeNull();
    expect(claimTx(parked({ key: "0x12" }), SENDER)).toBeNull();
    expect(claimTx(parked({}, "delivered"), SENDER)).toBeNull();
    expect(claimTx(parked(), undefined)).toBeNull();
  });
});

describe("stagesOf / txLinks", () => {
  it("fills V1's three stages from the server status", () => {
    expect(stagesOf("submitted").map((s) => s.state)).toEqual(["active", "todo", "todo"]);
    expect(stagesOf("source_confirmed").map((s) => s.state)).toEqual(["done", "active", "todo"]);
    expect(stagesOf("delivered").map((s) => s.state)).toEqual(["done", "done", "done"]);
    expect(stagesOf("parked")[2]).toMatchObject({ state: "warn" });
    expect(stagesOf("failed", true).map((s) => s.state)).toEqual(["done", "bad", "todo"]);
  });
  it("merges page-sent and server-listed transactions without duplicates", () => {
    const h = `0x${"a".repeat(64)}`;
    const s = { transactions: [{ kind: "source", chain: "eip155:8453", txHash: h.toUpperCase().replace("0X", "0x") }, { kind: "destination", chain: "eip155:10", txHash: `0x${"b".repeat(64)}` }] } as unknown as IntentStatus;
    expect(txLinks([{ chainId: 8453, hash: h }], s).map((t) => [t.kind, t.chainId])).toEqual([["source", 8453], ["destination", 10]]);
  });
});

describe("intent store", () => {
  it("keeps open transfers per wallet and forgets one", () => {
    const mem = new Map<string, string>();
    vi.stubGlobal("localStorage", { getItem: (k: string) => mem.get(k) ?? null, setItem: (k: string, v: string) => void mem.set(k, v) });
    const i = (id: string) => ({ intentId: id, createdAt: 1, fromChain: "eip155:8453", toChain: "eip155:10", toAsset: "x", sourceTxs: [] });
    rememberIntent(SENDER, i("a"));
    rememberIntent(SENDER, i("b"));
    expect(openIntents(SENDER.toLowerCase()).map((x) => x.intentId)).toEqual(["b", "a"]);
    forgetIntent(SENDER, "b");
    expect(openIntents(SENDER).map((x) => x.intentId)).toEqual(["a"]);
    vi.unstubAllGlobals();
  });
});

describe("txLabel / railLink", () => {
  const sent = [
    { hash: "0xfee", stepId: "fee-leg" },
    { hash: "0xapp", stepId: "approve" },
    { hash: "0xbridge", stepId: "transfer-remote" },
  ];
  it("says what each source transaction was", () => {
    expect(sent.map((t) => txLabel({ kind: "source", ...t }))).toEqual(["EMPX fee", "Approval", "Bridge transfer"]);
    expect(txLabel({ kind: "source" })).toBe("Source tx");
    expect(txLabel({ kind: "destination" })).toBe("Destination tx");
  });
  it("links the rail's explorer from the transfer transaction, not the fee or approval", () => {
    expect(railLink("hyperlane", sent)?.url).toBe("https://explorer.hyperlane.xyz/?search=0xbridge");
    expect(railLink("layerzero", sent)?.url).toBe("https://layerzeroscan.com/tx/0xbridge");
    expect(railLink("ccip", sent)).toBeNull();
    expect(railLink(undefined, sent)).toBeNull();
  });
});
