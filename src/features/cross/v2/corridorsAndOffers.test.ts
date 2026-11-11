import { describe, expect, it } from "vitest";
import { assetIdOf } from "./assets";
import { corridorMap } from "./useV2Corridors";
import { acceptableWithheld } from "./V2OffersFooter";
import type { CheckedWithheld } from "./useV2Quote";

describe("corridorMap", () => {
  it("keeps only EVM corridors with an automatic rail, never a chain to itself", () => {
    const m = corridorMap([
      { from: "eip155:8453", to: "eip155:42161", executableAutomatic: 2 },
      { from: "eip155:8453", to: "eip155:10", executableAutomatic: 0 },
      { from: "eip155:8453", to: "eip155:8453", executableAutomatic: 1 },
      { from: "bip122:000000000019d6689c085ae165831e93", to: "eip155:1", executableAutomatic: 1 },
      { from: "eip155:56", to: "solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp", executableAutomatic: 1 },
    ]);
    expect([...m.keys()]).toEqual([8453]);
    expect([...m.get(8453)!]).toEqual([42161]);
  });
});

describe("assetIdOf native coin types", () => {
  it("names each chain's gas token with its own SLIP-44 type", () => {
    expect(assetIdOf({ chainId: 56, isNative: true })).toBe("eip155:56/slip44:714");
    expect(assetIdOf({ chainId: 137, isNative: true })).toBe("eip155:137/slip44:966");
    expect(assetIdOf({ chainId: 8453, isNative: true })).toBe("eip155:8453/slip44:60");
  });
});

describe("acceptableWithheld", () => {
  const offer = (status: string, policyVersion: string | undefined, ok = true) =>
    ({ offer: { journey: { assessment: { status, policyVersion } } }, check: { ok } }) as unknown as CheckedWithheld;
  it("allows warning and unpriced routes that carry a policy version and pass the check", () => {
    expect(acceptableWithheld(offer("warning", "p1"))).toBe(true);
    expect(acceptableWithheld(offer("unpriced", "p1"))).toBe(true);
  });
  it("never allows a blocked route, one without a policy version, or one failing the check", () => {
    expect(acceptableWithheld(offer("blocked", "p1"))).toBe(false);
    expect(acceptableWithheld(offer("warning", undefined))).toBe(false);
    expect(acceptableWithheld(offer("warning", "p1", false))).toBe(false);
    const refused = offer("unpriced", "p1");
    (refused.offer as { executableByApiKey?: boolean }).executableByApiKey = false;
    expect(acceptableWithheld(refused)).toBe(false);
  });
});
