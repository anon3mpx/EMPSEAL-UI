import { afterEach, describe, expect, it, vi } from "vitest";
import { basketApi } from "./basketApi";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

afterEach(() => {
  vi.unstubAllGlobals();
});

const WALLET = "0x1111111111111111111111111111111111111111";

describe("basketApi", () => {
  it("maps quote, plan, submitted, retry, and status onto public routes", async () => {
    const fetchMock = vi.fn().mockImplementation(() =>
      Promise.resolve(new Response(JSON.stringify({ ok: true }))),
    );
    vi.stubGlobal("fetch", fetchMock);

    await basketApi.getCapabilities();
    await basketApi.quote({
      mode: "multi-to-one",
      inputs: [{ chainId: 8453, token: WALLET, amount: "1", wallet: WALLET }],
      outputs: [{ chainId: 8453, token: WALLET, allocationBps: 10_000 }],
    });
    await basketApi.plan("basket-1", {
      basketId: "basket-1",
      expectedQuoteVersion: 2,
      acknowledgeSkippedLegIds: [],
      wallet: WALLET,
      timestamp: 1,
      expiresAt: 2,
      signature: "0xsig",
    }, "idem-plan");
    await basketApi.acknowledgeSubmitted("basket-1", "leg-1", {
      basketId: "basket-1",
      legId: "leg-1",
      transactionId: "tx-1",
      txHash: "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
      chainId: 8453,
      sender: WALLET,
      expectedPlanVersion: 1,
      wallet: WALLET,
      timestamp: 1,
      expiresAt: 2,
      signature: "0xsig",
    }, "idem-sub");
    await basketApi.retryLeg("basket-1", "leg-1", {
      basketId: "basket-1",
      legId: "leg-1",
      expectedPlanVersion: 1,
      wallet: WALLET,
      timestamp: 1,
      expiresAt: 2,
      signature: "0xsig",
    }, "idem-retry");
    await basketApi.getStatus("basket-1", {
      action: "status",
      basketId: "basket-1",
      wallet: WALLET,
      timestamp: 1,
      expiresAt: 2,
      signature: "0xsig",
    });
    await basketApi.scanWallet({ wallet: WALLET, chainIds: [8453, 42161] });

    const urls = fetchMock.mock.calls.map((call) => String(call[0]));
    expect(urls[0]).toContain("/api/v1/basket/capabilities");
    expect(urls[1]).toContain("/api/v1/basket/quote");
    expect(urls[2]).toContain("/api/v1/basket/basket-1/plan");
    expect(urls[3]).toContain("/api/v1/basket/basket-1/legs/leg-1/submitted");
    expect(urls[4]).toContain("/api/v1/basket/basket-1/legs/leg-1/retry");
    expect(urls[5]).toContain("/api/v1/basket/basket-1/status?");
    expect(urls[6]).toContain("/api/v1/wallet/scan");
    expect(fetchMock.mock.calls[2][1].headers["Idempotency-Key"]).toBe("idem-plan");
    expect(urls.some((url) => url.includes("/basket/execute"))).toBe(false);
    expect(urls.some((url) => url.includes("/wallet/liquidate"))).toBe(false);
  });

  it("surfaces stable HTTP errors from the shared fetch helper", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ error: "BASKET_CAPABILITY_UNAVAILABLE", message: "disabled" }), { status: 422 }),
    ));
    await expect(basketApi.getCapabilities()).rejects.toMatchObject({
      status: 422,
      body: { error: "BASKET_CAPABILITY_UNAVAILABLE" },
    });
  });

  it("never references the deprecated execute route or partner keys in basket feature code", () => {
    const root = join(dirname(fileURLToPath(import.meta.url)), "..");
    const files = [
      "api/basketApi.ts",
      "api/contracts.ts",
      "execution/basketExecution.ts",
      "hooks/useBasketSession.ts",
    ];
    const source = files.map((file) => readFileSync(join(root, file), "utf8")).join("\n");
    expect(source).not.toMatch(/\/api\/v1\/basket\/execute/);
    expect(source).not.toMatch(/\/api\/v1\/wallet\/liquidate/);
    expect(source).not.toMatch(/partnerApiKey|x-api-key|BRIDGE_API_KEY/i);
  });
});
