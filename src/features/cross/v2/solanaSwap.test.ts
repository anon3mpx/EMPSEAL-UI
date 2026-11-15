// @vitest-environment node
import { expect, it } from "vitest";
import { NON_EVM_CHAIN_IDS } from "@/lib/wallet/chainKind";
import { allowSameChain } from "./solanaSwap";
import { corridorMap } from "./useV2Corridors";
const sol = "solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp";
it("allows only Solana same-chain swaps, not EVM same-chain transfers", () => {
  expect(allowSameChain(NON_EVM_CHAIN_IDS.SOL, NON_EVM_CHAIN_IDS.SOL)).toBe(true);
  expect(allowSameChain(8453, 8453)).toBe(false);
  expect(allowSameChain(8453, 42161)).toBe(false);
});
it("retains executable Solana swap corridors and keeps EVM same-chain behavior unchanged", () => {
  const row = { executableAutomatic: 1, executableExplicit: 0, quoteOnly: 0, rails: [] };
  const map = corridorMap([{ ...row, from: sol, to: sol }, { ...row, from: "eip155:8453", to: "eip155:8453" }] as never);
  expect([...map.get(NON_EVM_CHAIN_IDS.SOL)!]).toEqual([NON_EVM_CHAIN_IDS.SOL]);
  expect(map.has(8453)).toBe(false);
});
