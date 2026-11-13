import { afterEach, describe, expect, it } from "vitest";
import { getV2Chain } from "../../../design-system/data/v2ChainView";
import { getTokensForChain } from "../../../design-system/data/v2TokenView";
import { assetIdOf, tickerForAsset, v2ChainById, v2ChainsFor, v2Tokens } from "./assets";
import { catalogHasChain, catalogTokens, registerCatalog } from "./catalog";

const USDT0_ARB = "0x00000000000000000000000000000000000000a2";
const lzChains = [
  { name: "Arbitrum", shortName: "Arbitrum", chainKey: "arbitrum", chainType: "EVM", chainId: 42161 },
  { name: "Flare", shortName: "Flare", chainKey: "flare", chainType: "EVM", chainId: 14 },
];
const lzTokens = [
  { chainKey: "arbitrum", address: "0x00000000000000000000000000000000000000A2", decimals: 6, symbol: "USDT0", name: "USDT0" },
  { chainKey: "flare", address: "0x00000000000000000000000000000000000000f1", decimals: 6, symbol: "USDT0", name: "USDT0" },
  { chainKey: "flare", address: "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE", decimals: 18, symbol: "FLR", name: "Flare" },
];
const load = (entries: Array<{ from: string; to: string }>) =>
  registerCatalog(entries, getV2Chain, getTokensForChain, lzChains, lzTokens);

afterEach(() => load([]));

describe("V2 catalogue from the server's capabilities", () => {
  it("offers bitcoin when the server routes it", () => {
    load([{ from: "bip122:000000000019d6689c085ae165831e93/slip44:0", to: "eip155:8453/slip44:60" }]);
    expect(catalogHasChain(0)).toBe(true);
    expect(catalogTokens(0)[0]?.ticker).toBe("BTC");
    expect(v2ChainsFor([0]).map((c) => c.id)).toEqual([0]);
    expect(assetIdOf(v2Tokens(0)[0]!)).toBe("bip122:000000000019d6689c085ae165831e93/slip44:0");
  });
  it("offers Solana USDC without lowercasing its mint", () => {
    const asset = "solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp/token:EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";
    load([{ from: "eip155:8453/slip44:60", to: asset }]);
    expect(catalogHasChain(99)).toBe(true);
    const token = v2Tokens(99).find((t) => t.ticker === "USDC");
    expect(token).toBeDefined();
    expect(assetIdOf(token!)).toBe(asset);
    expect(tickerForAsset(asset)).toBe("USDC");
    expect(v2ChainsFor([99]).map((c) => c.id)).toEqual([99]);
  });
  it("offers a routed ERC-20 the shared list lacks, with LayerZero's metadata", () => {
    load([{ from: `eip155:42161/erc20:${USDT0_ARB}`, to: "eip155:14/erc20:0x00000000000000000000000000000000000000f1" }]);
    const t = v2Tokens(42161).find((x) => assetIdOf(x) === `eip155:42161/erc20:${USDT0_ARB}`);
    expect(t?.ticker).toBe("USDT0");
    expect(t?.decimals).toBe(6);
    expect(tickerForAsset(`eip155:42161/erc20:${USDT0_ARB}`)).toBe("USDT0");
  });

  it("adds a chain the app has no config for when the wallet can switch to it", () => {
    load([{ from: "eip155:14/slip44:60", to: "eip155:14/erc20:0x00000000000000000000000000000000000000f1" }]);
    expect(getV2Chain(14)).toBeUndefined();
    expect(v2ChainById(14)?.name).toBe("Flare Mainnet");
    expect(v2ChainsFor([14]).map((c) => c.id)).toEqual([14]);
    expect(v2Tokens(14).map((t) => t.ticker).sort()).toEqual(["FLR", "USDT0"]);
  });

  it("names the native asset with the server's coin type", () => {
    load([{ from: "eip155:14/slip44:7777", to: "eip155:42161/slip44:60" }]);
    const native = v2Tokens(14).find((t) => t.isNative)!;
    expect(assetIdOf(native)).toBe("eip155:14/slip44:7777");
  });

  it("skips an asset with no known symbol or decimals, and chains the wallet cannot use", () => {
    load([
      { from: "eip155:42161/erc20:0x1111111111111111111111111111111111111111", to: "eip155:999999/slip44:60" },
    ]);
    expect(v2Tokens(42161).some((t) => t.address?.toLowerCase() === "0x1111111111111111111111111111111111111111")).toBe(false);
    expect(v2ChainById(999999)).toBeUndefined();
  });
});
