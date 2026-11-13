import { describe, expect, it } from "vitest";
import { addressValidFor, caip2OfChainId, chainIdOfCaip2, nativeAssetOf, nativeDecimals } from "./nonEvm";

const btc = "bip122:000000000019d6689c085ae165831e93";
describe("non-EVM mapping", () => {
  it("maps bitcoin", () => {
    expect(chainIdOfCaip2(btc)).toBe(0);
    expect(caip2OfChainId(0)).toBe(btc);
  });
  it("maps evm", () => {
    expect(chainIdOfCaip2("eip155:8453")).toBe(8453);
    expect(chainIdOfCaip2("eip155:14")).toBe(14);
    expect(caip2OfChainId(14)).toBe("eip155:14");
    expect(caip2OfChainId(103)).toBeUndefined();
  });
  it("unknown namespace is undefined", () => expect(chainIdOfCaip2("ton:-239")).toBeUndefined());
  it("dot is not mapped", () => expect(chainIdOfCaip2("polkadot:91b171bb158e2d3848fa23a9f1c25182")).toBeUndefined());
  it("bitcoin native asset", () => {
    expect(nativeAssetOf(0)).toBe(`${btc}/slip44:0`);
    expect(nativeDecimals(0)).toBe(8);
  });
  it("address families", () => {
    const evm = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";
    expect(addressValidFor(0, "bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq")).toBe(true);
    expect(addressValidFor(0, evm)).toBe(false);
    expect(addressValidFor(8453, evm)).toBe(true);
    expect(addressValidFor(123456789, evm)).toBe(false);
  });
});
