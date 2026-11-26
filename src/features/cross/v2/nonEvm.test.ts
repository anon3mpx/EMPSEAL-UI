import { describe, expect, it } from "vitest";
import { addressValidFor, caip2OfChainId, canonicalAddressFor, chainIdOfCaip2, nativeAssetOf, nativeDecimals } from "./nonEvm";

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
  it("Bitcoin Cash: its own chain id, native asset, and the bare CashAddr the API takes", () => {
    expect(chainIdOfCaip2("bip122:000000000000000000651ef99cb9fcbe")).toBe(101);
    expect(nativeAssetOf(101)).toBe("bip122:000000000000000000651ef99cb9fcbe/slip44:145");
    const bare = "qpm2qsznhks23z7629mms6s4cwef74vcwvy22gdx6a";
    expect(addressValidFor(101, `bitcoincash:${bare}`)).toBe(true);
    expect(canonicalAddressFor(101, ` bitcoincash:${bare} `)).toBe(bare);
    expect(canonicalAddressFor(101, `BITCOINCASH:${bare.toUpperCase()}`)).toBe(bare);
    expect(canonicalAddressFor(0, " bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq ")).toBe("bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq");
  });
  it("Zcash: transparent t1, t3 and TEX only", () => {
    expect(chainIdOfCaip2("bip122:00040fe8ec8471911baa1db1266ea15d")).toBe(106);
    expect(nativeAssetOf(106)).toBe("bip122:00040fe8ec8471911baa1db1266ea15d/slip44:133");
    for (const ok of ["t1gvnNKava3fMofoW3kWViEUggTcv3TLA94", "t3hcoHs5N7wyjtqVwArB68rqcpyuddmgd8y", "tex1lnjv5hlpmmf2ak68fytgp64a2c3lp737f702rv"]) expect(addressValidFor(106, ok)).toBe(true);
    for (const bad of ["t1gvnNKava3fMofoW3kWViEUggTcv3TLA9B", "zs1z7rejlpsa98s2rrrfkwmaxu53e4ue0ulcrw0h4x5g8jl04tak0d3mm47vdtahatqrlkngh9sly", "bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq"])
      expect(addressValidFor(106, bad)).toBe(false);
  });
  it("Cardano: its CIP-34 chain id and mainnet payment addresses only", () => {
    expect(chainIdOfCaip2("cip34:1-764824073")).toBe(270);
    expect(nativeAssetOf(270)).toBe("cip34:1-764824073/slip44:1815");
    expect(nativeDecimals(270)).toBe(6);
    expect(addressValidFor(270, "addr1qx2fxv2umyhttkxyxp8x0dlpdt3k6cwng5pxj3jhsydzer3n0d3vllmyqwsx5wktcd8cc3sq835lu7drv2xwl2wywfgse35a3x")).toBe(true);
    expect(addressValidFor(270, "addr1vyu7dvsylnvqky62napq5ggqm3cvvskqmvxn25ckr393tzgm64zra")).toBe(true);
    expect(addressValidFor(270, "stake1uyehkck0lajq8gr28t9uxnuvgcqrc6070x3k9r8048z8y5gh6ffgw")).toBe(false);
  });
});
