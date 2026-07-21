import { describe, expect, it } from "vitest";

import { resolveSwapPageChain } from "./swapPageChainState";

const arbitrum = {
  id: 42161,
  name: "Arbitrum",
  color: "#28A0F0",
  ticker: "ETH",
};

const optimism = {
  id: 10,
  name: "Optimism",
  color: "#FF0420",
  ticker: "ETH",
};

describe("resolveSwapPageChain", () => {
  it("uses the locally selected chain while the wallet is disconnected", () => {
    expect(
      resolveSwapPageChain({
        walletState: { status: "disconnected" },
        selectedChainId: optimism.id,
        chains: [arbitrum, optimism],
        defaultChain: arbitrum,
      }),
    ).toBe(optimism);
  });

  it("uses the connected wallet chain over the local preview chain", () => {
    expect(
      resolveSwapPageChain({
        walletState: { status: "connected", chain: arbitrum },
        selectedChainId: optimism.id,
        chains: [arbitrum, optimism],
        defaultChain: optimism,
      }),
    ).toBe(arbitrum);
  });

  it("falls back to the default chain when the selected chain is not supported", () => {
    expect(
      resolveSwapPageChain({
        walletState: { status: "disconnected" },
        selectedChainId: 999999,
        chains: [arbitrum, optimism],
        defaultChain: arbitrum,
      }),
    ).toBe(arbitrum);
  });
});
