import { describe, expect, it } from "vitest";
import { assetIdOf } from "./assets";
import { corridorMap } from "./useV2Corridors";
import { selectableHeld } from "./routeCards";
import type { CheckedWithheld } from "./useV2Quote";

describe("corridorMap", () => {
  it("keeps only EVM corridors with an automatic rail, never a chain to itself", () => {
    const m = corridorMap([
      { from: "eip155:8453", to: "eip155:42161", executableAutomatic: 2 },
      { from: "eip155:8453", to: "eip155:10", executableAutomatic: 0 },
      { from: "eip155:8453", to: "eip155:8453", executableAutomatic: 1 },
    ]);
    expect([...m.keys()]).toEqual([8453]);
    expect([...m.get(8453)!]).toEqual([42161]);
  });
  it("corridor to bitcoin", () => {
    const m = corridorMap([{ from: "eip155:8453", to: "bip122:000000000019d6689c085ae165831e93", executableAutomatic: 1 }]);
    expect(m.get(8453)?.has(0)).toBe(true);
  });
});

describe("assetIdOf native coin types", () => {
  it("names each chain's gas token with its own SLIP-44 type", () => {
    expect(assetIdOf({ chainId: 56, isNative: true })).toBe("eip155:56/slip44:714");
    expect(assetIdOf({ chainId: 137, isNative: true })).toBe("eip155:137/slip44:966");
    expect(assetIdOf({ chainId: 8453, isNative: true })).toBe("eip155:8453/slip44:60");
  });
});

describe("selectableHeld", () => {
  const offer = (status: string, policyVersion: string | undefined, ok = true) =>
    ({ offer: { journey: { assessment: { status, policyVersion } } }, check: { ok } }) as unknown as CheckedWithheld;
  it("allows warning, unpriced and blocked routes that carry a policy version and pass the check (the user chooses)", () => {
    expect(selectableHeld(offer("warning", "p1"))).toBe(true);
    expect(selectableHeld(offer("unpriced", "p1"))).toBe(true);
    expect(selectableHeld(offer("blocked", "p1"))).toBe(true);
  });
  it("never allows one without a policy version, one failing the check, or one this app's key may not commit", () => {
    expect(selectableHeld(offer("warning", undefined))).toBe(false);
    expect(selectableHeld(offer("warning", "p1", false))).toBe(false);
    const refused = offer("unpriced", "p1");
    (refused.offer as { executableByApiKey?: boolean }).executableByApiKey = false;
    expect(selectableHeld(refused)).toBe(false);
  });
});
