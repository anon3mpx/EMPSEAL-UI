// Tests for the wallet adapter registry + the Phantom (Solana) implementation.
//
// We avoid testing the actual `connect()` path against a real Phantom
// extension (no browser extension in jsdom).  Instead:
//   • Test registry returns the expected adapter shapes
//   • Test isInstalled() returns false in jsdom (no window.phantom)
//   • Test connect() throws NOT_INSTALLED when provider is absent
//   • Test that the kind dispatch is correct

import { describe, it, expect, beforeEach } from "vitest";
import { hasAdaptersFor, loadAdaptersFor } from "./index";

describe("adapter registry", () => {
  it("hasAdaptersFor returns true for solana", () => {
    expect(hasAdaptersFor("solana")).toBe(true);
  });

  it("hasAdaptersFor returns true for bitcoin (Unisat + Phantom-BTC)", () => {
    expect(hasAdaptersFor("bitcoin")).toBe(true);
  });

  it("hasAdaptersFor returns true for tron (TronLink)", () => {
    expect(hasAdaptersFor("tron")).toBe(true);
  });

  it("hasAdaptersFor returns true for cosmos (Keplr + Leap)", () => {
    expect(hasAdaptersFor("cosmos")).toBe(true);
  });

  it("hasAdaptersFor returns false for kinds without implementations yet", () => {
    expect(hasAdaptersFor("xmr")).toBe(false);
    expect(hasAdaptersFor("ada")).toBe(false);
    expect(hasAdaptersFor("ton")).toBe(false);
    expect(hasAdaptersFor("near")).toBe(false);
  });

  it("loadAdaptersFor('solana') returns at least Phantom", async () => {
    const adapters = await loadAdaptersFor("solana");
    expect(adapters.length).toBeGreaterThanOrEqual(1);
    expect(adapters[0].brand).toBe("Phantom");
    expect(adapters[0].kind).toBe("solana");
    expect(adapters[0].installUrl).toMatch(/phantom\.app/);
  });

  it("loadAdaptersFor('bitcoin') returns Unisat + Phantom-BTC", async () => {
    const adapters = await loadAdaptersFor("bitcoin");
    expect(adapters.length).toBe(2);
    expect(adapters[0].brand).toBe("Unisat");
    expect(adapters[1].brand).toBe("Phantom");
    expect(adapters.every((a) => a.kind === "bitcoin")).toBe(true);
  });

  it("loadAdaptersFor('tron') returns TronLink", async () => {
    const adapters = await loadAdaptersFor("tron");
    expect(adapters.length).toBe(1);
    expect(adapters[0].brand).toBe("TronLink");
    expect(adapters[0].kind).toBe("tron");
  });

  it("loadAdaptersFor('cosmos') returns Keplr + Leap in order", async () => {
    const adapters = await loadAdaptersFor("cosmos");
    expect(adapters.length).toBe(2);
    expect(adapters[0].brand).toBe("Keplr");
    expect(adapters[1].brand).toBe("Leap");
    expect(adapters.every((a) => a.kind === "cosmos")).toBe(true);
  });

  it("loadAdaptersFor returns [] for kinds without implementations", async () => {
    expect(await loadAdaptersFor("xmr")).toEqual([]);
    expect(await loadAdaptersFor("ada")).toEqual([]);
  });
});

describe("Bitcoin adapters (no extension in test env)", () => {
  beforeEach(() => {
    const w = window as unknown as { unisat?: unknown; phantom?: unknown };
    delete w.unisat;
    delete w.phantom;
  });

  it("Unisat isInstalled returns false when window.unisat absent", async () => {
    const [unisat] = await loadAdaptersFor("bitcoin");
    expect(unisat.brand).toBe("Unisat");
    expect(unisat.isInstalled()).toBe(false);
  });

  it("Unisat connect returns first account address", async () => {
    const w = window as unknown as {
      unisat?: {
        requestAccounts: () => Promise<string[]>;
        getPublicKey: () => Promise<string>;
      };
    };
    w.unisat = {
      requestAccounts: async () => ["bc1qrealaddress1", "bc1qrealaddress2"],
      getPublicKey: async () => "02".padEnd(66, "1"),
    };
    const [unisat] = await loadAdaptersFor("bitcoin");
    const result = await unisat.connect();
    expect(result.address).toBe("bc1qrealaddress1");
    expect(result.publicKey).toBe("02".padEnd(66, "1"));
    expect(result.addressType).toBe("p2wpkh");
  });

  it("Unisat throws WRONG_NETWORK when on testnet", async () => {
    const w = window as unknown as {
      unisat?: {
        requestAccounts: () => Promise<string[]>;
        getNetwork: () => Promise<string>;
      };
    };
    w.unisat = {
      requestAccounts: async () => ["tb1qtestaddr"],
      getNetwork: async () => "testnet",
    };
    const [unisat] = await loadAdaptersFor("bitcoin");
    await expect(unisat.connect()).rejects.toMatchObject({ code: "WRONG_NETWORK" });
  });

  it("Phantom-BTC picks payment address, public key, and address type, skipping ordinals", async () => {
    const w = window as unknown as {
      phantom?: {
        bitcoin?: {
          requestAccounts: () => Promise<Array<{
            address: string;
            publicKey?: string;
            purpose: string;
            addressType?: string;
          }>>;
        };
      };
    };
    w.phantom = {
      bitcoin: {
        requestAccounts: async () => [
          { address: "bc1pordinals_addr", purpose: "ordinals" },
          {
            address: "bc1qpayment_addr",
            publicKey: "03".padEnd(66, "2"),
            purpose: "payment",
            addressType: "native_segwit",
          },
        ],
      },
    };
    const [, phantomBtc] = await loadAdaptersFor("bitcoin");
    expect(phantomBtc.brand).toBe("Phantom");
    const result = await phantomBtc.connect();
    expect(result.address).toBe("bc1qpayment_addr");
    expect(result.publicKey).toBe("03".padEnd(66, "2"));
    expect(result.addressType).toBe("p2wpkh");
  });
});

describe("TronLink adapter (no extension in test env)", () => {
  beforeEach(() => {
    const w = window as unknown as { tronLink?: unknown; tronWeb?: unknown };
    delete w.tronLink;
    delete w.tronWeb;
  });

  it("isInstalled false when window.tronLink absent", async () => {
    const [tron] = await loadAdaptersFor("tron");
    expect(tron.isInstalled()).toBe(false);
  });

  it("connect throws NOT_INSTALLED when absent", async () => {
    const [tron] = await loadAdaptersFor("tron");
    await expect(tron.connect()).rejects.toMatchObject({ code: "NOT_INSTALLED" });
  });

  it("connect returns address from tronWeb.defaultAddress.base58 on code 200", async () => {
    const w = window as unknown as {
      tronLink?: { request: (args: unknown) => Promise<{ code: number }> };
      tronWeb?: { defaultAddress: { base58: string } };
    };
    w.tronLink = { request: async () => ({ code: 200 }) };
    w.tronWeb = { defaultAddress: { base58: "TLa2f6VPqDgRE67v1736s7bJ8Ray5wYjU7" } };
    const [tron] = await loadAdaptersFor("tron");
    const result = await tron.connect();
    expect(result.address).toBe("TLa2f6VPqDgRE67v1736s7bJ8Ray5wYjU7");
  });

  it("connect accepts code 4000 (already authorised)", async () => {
    const w = window as unknown as {
      tronLink?: { request: (args: unknown) => Promise<{ code: number }> };
      tronWeb?: { defaultAddress: { base58: string } };
    };
    w.tronLink = { request: async () => ({ code: 4000 }) };
    w.tronWeb = { defaultAddress: { base58: "TLa2f6VPqDgRE67v1736s7bJ8Ray5wYjU7" } };
    const [tron] = await loadAdaptersFor("tron");
    const result = await tron.connect();
    expect(result.address).toBeTruthy();
  });

  it("connect throws USER_REJECTED on code 4001", async () => {
    const w = window as unknown as {
      tronLink?: { request: (args: unknown) => Promise<{ code: number }> };
    };
    w.tronLink = { request: async () => ({ code: 4001 }) };
    const [tron] = await loadAdaptersFor("tron");
    await expect(tron.connect()).rejects.toMatchObject({ code: "USER_REJECTED" });
  });

  it("connect throws when account is locked (no tronWeb.defaultAddress)", async () => {
    const w = window as unknown as {
      tronLink?: { request: (args: unknown) => Promise<{ code: number }> };
      tronWeb?: { defaultAddress?: { base58?: string } };
    };
    w.tronLink = { request: async () => ({ code: 200 }) };
    w.tronWeb = { defaultAddress: {} };
    const [tron] = await loadAdaptersFor("tron");
    await expect(tron.connect()).rejects.toMatchObject({ code: "UNKNOWN" });
  });
});

describe("Cosmos adapters (Keplr + Leap)", () => {
  beforeEach(() => {
    const w = window as unknown as { keplr?: unknown; leap?: unknown };
    delete w.keplr;
    delete w.leap;
  });

  it("Keplr isInstalled false when window.keplr absent", async () => {
    const [keplr] = await loadAdaptersFor("cosmos");
    expect(keplr.isInstalled()).toBe(false);
  });

  it("Keplr connect throws NOT_INSTALLED when absent", async () => {
    const [keplr] = await loadAdaptersFor("cosmos");
    await expect(keplr.connect()).rejects.toMatchObject({ code: "NOT_INSTALLED" });
  });

  it("Keplr connect returns bech32Address after enable + getKey", async () => {
    const w = window as unknown as {
      keplr?: {
        enable: (chainId: string) => Promise<void>;
        getKey: (chainId: string) => Promise<{ bech32Address: string }>;
      };
    };
    w.keplr = {
      enable: async () => {},
      getKey: async () => ({ bech32Address: "cosmos1abc...xyz" }),
    };
    const [keplr] = await loadAdaptersFor("cosmos");
    const result = await keplr.connect();
    expect(result.address).toBe("cosmos1abc...xyz");
  });

  it("Keplr maps 'chain not enabled' to WRONG_NETWORK", async () => {
    const w = window as unknown as {
      keplr?: { enable: (chainId: string) => Promise<void> };
    };
    w.keplr = {
      enable: async () => {
        throw new Error("There is no chain info for the chain cosmoshub-4. Add chain not supported.");
      },
    };
    const [keplr] = await loadAdaptersFor("cosmos");
    await expect(keplr.connect()).rejects.toMatchObject({ code: "WRONG_NETWORK" });
  });

  it("Leap adapter works the same as Keplr when window.leap is present", async () => {
    const w = window as unknown as {
      leap?: {
        enable: (chainId: string) => Promise<void>;
        getKey: (chainId: string) => Promise<{ bech32Address: string }>;
      };
    };
    w.leap = {
      enable: async () => {},
      getKey: async () => ({ bech32Address: "osmo1xyzleap" }),
    };
    const [, leap] = await loadAdaptersFor("cosmos");
    expect(leap.brand).toBe("Leap");
    const result = await leap.connect();
    expect(result.address).toBe("osmo1xyzleap");
  });
});

describe("Phantom adapter (no extension in test env)", () => {
  beforeEach(() => {
    // Ensure no stray phantom from previous tests
    const w = window as unknown as { phantom?: unknown; solana?: unknown };
    delete w.phantom;
    delete w.solana;
  });

  it("isInstalled returns false when window.phantom is absent", async () => {
    const [phantom] = await loadAdaptersFor("solana");
    expect(phantom.isInstalled()).toBe(false);
  });

  it("connect throws NOT_INSTALLED when provider absent", async () => {
    const [phantom] = await loadAdaptersFor("solana");
    await expect(phantom.connect()).rejects.toMatchObject({
      code: "NOT_INSTALLED",
    });
  });

  it("isInstalled returns true when phantom is mocked into window", async () => {
    const w = window as unknown as { phantom?: { solana?: object } };
    w.phantom = { solana: { isPhantom: true, connect: () => Promise.resolve({}) } };
    const [phantom] = await loadAdaptersFor("solana");
    expect(phantom.isInstalled()).toBe(true);
  });

  it("connect returns address when phantom resolves with a publicKey", async () => {
    const w = window as unknown as {
      phantom?: { solana?: { connect: () => Promise<unknown> } };
    };
    w.phantom = {
      solana: {
        connect: async () => ({ publicKey: { toString: () => "ExpectedAddress11111" } }),
      },
    };
    const [phantom] = await loadAdaptersFor("solana");
    const result = await phantom.connect();
    expect(result.address).toBe("ExpectedAddress11111");
    expect(result.publicKey).toBe("ExpectedAddress11111");
  });

  it("connect throws USER_REJECTED for code 4001", async () => {
    const w = window as unknown as {
      phantom?: { solana?: { connect: () => Promise<never> } };
    };
    w.phantom = {
      solana: {
        connect: async () => {
          const err = new Error("User rejected the request") as Error & { code?: number };
          err.code = 4001;
          throw err;
        },
      },
    };
    const [phantom] = await loadAdaptersFor("solana");
    await expect(phantom.connect()).rejects.toMatchObject({ code: "USER_REJECTED" });
  });
});
