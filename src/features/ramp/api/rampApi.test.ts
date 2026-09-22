import { afterEach, describe, expect, it, vi } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { rampApi } from "./rampApi";

afterEach(() => {
  vi.unstubAllGlobals();
});

const WALLET = "0x1111111111111111111111111111111111111111";
const signed = {
  action: "RAMP_PROFILE",
  wallet: WALLET,
  chainId: 8453,
  payloadHash: "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
  nonce: "n1",
  timestamp: 1,
  expiresAt: 2,
  signature: "0xsig",
};

describe("rampApi", () => {
  it("posts public ramp routes with UUID idempotency keys and never uses agent-grant aliases", async () => {
    const fetchMock = vi.fn().mockImplementation(() =>
      Promise.resolve(new Response(JSON.stringify({ ok: true }))),
    );
    vi.stubGlobal("fetch", fetchMock);
    const command = { wallet: WALLET, chainId: 8453, signedAction: signed };

    await rampApi.getCapabilities();
    await rampApi.registerWallet(command, "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa");
    await rampApi.getProfile(command);
    await rampApi.createKycLink({
      ...command,
      fullName: "Ada",
      email: "ada@example.com",
      type: "individual",
      redirectUri: "https://app.empx.io/ramp",
    }, "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb");
    await rampApi.refreshKyc(command);
    await rampApi.createBankLink(command, "cccccccc-cccc-4ccc-8ccc-cccccccccccc");
    await rampApi.exchangeBankLink({ ...command, sessionId: "sess", publicToken: "public" });
    await rampApi.syncExternalAccounts(command);
    await rampApi.preview({
      ...command,
      direction: "OFF_RAMP",
      tokenAddress: WALLET,
      fiatCurrency: "USD",
      fiatRail: "ACH",
      amount: "500.00",
    });
    await rampApi.createTransfer({
      ...command,
      direction: "OFF_RAMP",
      tokenAddress: WALLET,
      fiatCurrency: "USD",
      fiatRail: "ACH",
      amount: "500.00",
      basketId: "funding-ref",
    }, "dddddddd-dddd-4ddd-8ddd-dddddddddddd");
    await rampApi.getTransferStatus("11111111-1111-4111-8111-111111111111", command);
    await rampApi.cancelTransfer("11111111-1111-4111-8111-111111111111", command, "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee");
    await rampApi.createDelegation({
      ...command,
      partner: "partner-1",
      delegateType: "PARTNER",
      operations: ["READ"],
      directions: ["OFF_RAMP"],
      chainIds: [8453],
      externalAccountIds: [],
      expiresAt: "2099-01-01T00:00:00.000Z",
    }, "ffffffff-ffff-4fff-8fff-ffffffffffff");
    await rampApi.revokeDelegation("22222222-2222-4222-8222-222222222222", command);

    const urls = fetchMock.mock.calls.map((call) => String(call[0]));
    expect(urls).toEqual(expect.arrayContaining([
      expect.stringContaining("/api/v1/ramp/capabilities"),
      expect.stringContaining("/api/v1/ramp/wallets/register"),
      expect.stringContaining("/api/v1/ramp/profile"),
      expect.stringContaining("/api/v1/ramp/kyc-link"),
      expect.stringContaining("/api/v1/ramp/kyc/refresh"),
      expect.stringContaining("/api/v1/ramp/bank-link"),
      expect.stringContaining("/api/v1/ramp/bank-link/exchange"),
      expect.stringContaining("/api/v1/ramp/external-accounts"),
      expect.stringContaining("/api/v1/ramp/preview"),
      expect.stringContaining("/api/v1/ramp/transfers"),
      expect.stringContaining("/api/v1/ramp/transfers/11111111-1111-4111-8111-111111111111/status"),
      expect.stringContaining("/api/v1/ramp/transfers/11111111-1111-4111-8111-111111111111/cancel"),
      expect.stringContaining("/api/v1/ramp/delegations"),
      expect.stringContaining("/api/v1/ramp/delegations/22222222-2222-4222-8222-222222222222/revoke"),
    ]));
    expect(urls.join("\n")).not.toMatch(/agent-grants/);
    expect(fetchMock.mock.calls[1][1].headers["Idempotency-Key"]).toBe("aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa");
  });

  it("does not ship Partner API keys or demo execution paths in ramp feature code", () => {
    const root = join(dirname(fileURLToPath(import.meta.url)), "..");
    const files: string[] = [];
    const walk = (dir: string) => {
      for (const entry of readdirSync(dir, { withFileTypes: true })) {
        const path = join(dir, entry.name);
        if (entry.isDirectory()) walk(path);
        else if (/\.(ts|tsx)$/.test(entry.name) && !entry.name.endsWith(".test.ts") && !entry.name.endsWith(".test.tsx")) {
          files.push(path);
        }
      }
    };
    walk(root);
    const source = files.map((file) => readFileSync(file, "utf8")).join("\n");
    expect(source).not.toMatch(/partnerApiKey|x-api-key|BRIDGE_API_KEY|PRICE_USD_DEMO|demoQuoteFor/i);
    expect(source).not.toMatch(/\/api\/v1\/ramp\/agent-grants/);
  });
});
