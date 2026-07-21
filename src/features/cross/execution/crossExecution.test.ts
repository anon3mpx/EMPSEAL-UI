import { describe, expect, it, vi } from "vitest";
import { executeCrossIntegration } from "./crossExecution";

const TX = {
  to: "0x1111111111111111111111111111111111111111",
  data: "0x",
  value: "0",
  chainId: 8453,
};

function dependencies() {
  return {
    sendEvmTransaction: vi.fn().mockResolvedValue("0xhash"),
    executeLayerZeroIntent: vi.fn().mockResolvedValue("0xlz"),
    submitStandardIntent: vi.fn().mockResolvedValue(undefined),
    markLayerZeroSubmitted: vi.fn().mockResolvedValue(undefined),
  };
}

describe("executeCrossIntegration", () => {
  it("cannot send a provider transaction before returned approvals pass", async () => {
    const deps = dependencies();

    await expect(
      executeCrossIntegration(
        {
          intentId: "intent-1",
          sourceChainId: 8453,
          approvalsComplete: false,
          integration: {
            mode: "provider_direct",
            action: { kind: "hyperlane_transfer_remote" },
            approvals: [
              {
                token: "0x2222222222222222222222222222222222222222",
                spender: TX.to,
                amount: "900",
              },
            ],
            tx: TX,
          },
        },
        deps,
      ),
    ).rejects.toThrow(/provider approval is required/i);
    expect(deps.sendEvmTransaction).not.toHaveBeenCalled();
  });

  it("uses the integration tx chain after capability validation", async () => {
    const deps = dependencies();

    await expect(
      executeCrossIntegration(
        {
          intentId: "intent-1",
          sourceChainId: 8453,
          approvalsComplete: true,
          integration: {
            mode: "provider_direct",
            action: { kind: "optimism_standard_bridge", direction: "deposit" },
            tx: TX,
          },
        },
        deps,
      ),
    ).resolves.toBe("0xhash");
    expect(deps.sendEvmTransaction).toHaveBeenCalledWith(TX, 8453);
    expect(deps.submitStandardIntent).toHaveBeenCalledWith("intent-1", "0xhash");
  });

  it("never selects or executes Chainflip", async () => {
    const deps = dependencies();

    await expect(
      executeCrossIntegration(
        {
          intentId: "intent-1",
          sourceChainId: 8453,
          approvalsComplete: true,
          integration: {
            mode: "provider_direct",
            action: { kind: "chainflip_deposit" },
            tx: TX,
          },
        },
        deps,
      ),
    ).rejects.toThrow(/quote only/i);
    expect(deps.sendEvmTransaction).not.toHaveBeenCalled();
  });
});
