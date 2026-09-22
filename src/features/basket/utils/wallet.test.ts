import { describe, expect, it, vi } from "vitest";
import { assertExpectedAccount, requireWalletForAction } from "./wallet";

const WALLET = "0x1111111111111111111111111111111111111111";

describe("basket wallet guard", () => {
  it("rejects a disconnected or swapped account", () => {
    expect(() => assertExpectedAccount({ expectedAddress: WALLET })).toThrow(/connect/i);
    expect(() => assertExpectedAccount({
      connectedAddress: "0x2222222222222222222222222222222222222222",
      expectedAddress: WALLET,
    })).toThrow(/does not match/i);
  });

  it("switches chain before signing when the connected chain is wrong", async () => {
    const switchChain = vi.fn().mockResolvedValue({ id: 8453 });
    await expect(
      requireWalletForAction({
        connectedAddress: WALLET,
        connectedChainId: 1,
        expectedAddress: WALLET,
        expectedChainId: 8453,
        switchChain,
      }),
    ).resolves.toBe(WALLET);
    expect(switchChain).toHaveBeenCalledWith(8453);
  });

  it("re-reads live chain so A→B→A switches back to A", async () => {
    let live = 8453;
    const switchChain = vi.fn(async (chainId: number) => {
      live = chainId;
      return { id: chainId };
    });
    await requireWalletForAction({
      connectedAddress: WALLET,
      connectedChainId: live,
      expectedAddress: WALLET,
      expectedChainId: 1,
      switchChain,
      getConnectedChainId: () => live,
    });
    expect(live).toBe(1);
    await requireWalletForAction({
      connectedAddress: WALLET,
      connectedChainId: 8453,
      expectedAddress: WALLET,
      expectedChainId: 8453,
      switchChain,
      getConnectedChainId: () => live,
    });
    expect(switchChain).toHaveBeenCalledWith(8453);
    expect(live).toBe(8453);
  });
});
