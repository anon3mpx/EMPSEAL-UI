import { describe, expect, it } from "vitest";
import { allocateBps, buildV2BasketRequest } from "./basketRequest";
import { getV2Chain } from "../../../design-system/data/v2ChainView";
import { getTokensForChain } from "../../../design-system/data/v2TokenView";
import { registerCatalog } from "./catalog";
import { v2Tokens } from "./assets";
const input = { chainId: 8453, ticker: "ETH", amount: "1" };
const output = { chainId: 42161, ticker: "USDC", allocationBps: 10000 };
const request = {
  mode: "many-to-many" as const,
  wallet: "0x1111111111111111111111111111111111111111",
  inputs: [input],
  outputs: [output],
  slippageBps: 50,
  maxTier: 3 as const,
};
describe("basket request", () => {
  it("allocateBps conserves", () => {
    const parts = allocateBps(1001n, [3333, 3333, 3334]);
    expect(parts).toEqual([333n, 333n, 335n]);
    expect(parts.reduce((s, p) => s + p, 0n)).toBe(1001n);
  });
  it("allocateBps ties go to the first largest", () => expect(allocateBps(101n, [5000, 5000])).toEqual([51n, 50n]));
  it("allocateBps refuses a zero part", () => expect(() => allocateBps(1n, [5000, 5000])).toThrow());
  it.each([[], [0, 10000], [5000], Array(11).fill(1000), [1.5, 9998.5]])("refuses invalid allocation %j", (...bps) => {
    expect(() => allocateBps(100000n, bps as number[])).toThrow();
  });
  it("many-to-many makes inputs × outputs legs", () => {
    const r = buildV2BasketRequest({
      ...request,
      inputs: [input, input],
      outputs: [3333, 3333, 3334].map((allocationBps) => ({ ...output, allocationBps })),
    });
    expect(r.legs.map((l) => l.legId)).toEqual(["leg_000", "leg_001", "leg_002", "leg_003", "leg_004", "leg_005"]);
  });
  it("11 legs is refused", () => {
    expect(() =>
      buildV2BasketRequest({
        ...request,
        inputs: Array(4).fill(input),
        outputs: [3333, 3333, 3334].map((allocationBps) => ({ ...output, allocationBps })),
      }),
    ).toThrow("A V2 basket has 1 to 10 legs");
  });
  it("asset ids are CAIP-19", () => expect(buildV2BasketRequest(request).legs[0]!.from.asset).toBe("eip155:8453/slip44:60"));
  it("a picked native output needs no ticker lookup", () => {
    const nativeOutput = { ...output, chainId: 999_999, ticker: "NOPE", decimals: 18 };
    expect(buildV2BasketRequest({ ...request, outputs: [nativeOutput] }).legs[0]!.toAsset).toBe("eip155:999999/slip44:60");
  });
  it("uses the stored address for a catalog-only output token", () => {
    const address = "0x00000000000000000000000000000000000000A2";
    registerCatalog(
      [{ from: "eip155:8453/slip44:60", to: `eip155:42161/erc20:${address.toLowerCase()}` }],
      getV2Chain,
      getTokensForChain,
      [{ name: "Arbitrum", shortName: "Arbitrum", chainKey: "arbitrum", chainType: "EVM", chainId: 42161 }],
      [{ chainKey: "arbitrum", address, decimals: 6, symbol: "USDT0", name: "USDT0" }],
    );
    try {
      const token = v2Tokens(42161).find((t) => t.address?.toLowerCase() === address.toLowerCase())!;
      expect(getTokensForChain(42161).some((t) => t.ticker === token.ticker)).toBe(false);
      const selectedOutput = { ...output, ticker: token.ticker, token: token.address, decimals: token.decimals };
      const result = buildV2BasketRequest({ ...request, outputs: [selectedOutput] });
      expect(result.legs[0]!.toAsset).toBe(`eip155:42161/erc20:${address.toLowerCase()}`);
    } finally {
      registerCatalog([], getV2Chain, getTokensForChain, [], []);
    }
  });
});
