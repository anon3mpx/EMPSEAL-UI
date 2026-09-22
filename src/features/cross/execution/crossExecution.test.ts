import { describe, expect, it, vi } from "vitest";
import { executeCrossIntegration, syncSequentialExecutionPlan } from "./crossExecution";

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
    markExecutionPlanStepSubmitted: vi.fn().mockResolvedValue(undefined),
    executeThorchainBitcoinIntent: vi.fn().mockResolvedValue("btctxid"),
    executeGardenSolanaIntent: vi.fn().mockResolvedValue("solsig"),
    executeGardenBitcoinIntent: vi.fn().mockResolvedValue("gardentxid"),
  };
}

describe("executeCrossIntegration", () => {
  it("promotes a newly ready sequential step into the wallet integration", () => {
    const session: any = {
      mode: "single", intentId: "intent", selectedOfferId: "offer", offerSetId: "set",
      quote: {}, sourceChainId: 8453, status: "SUBMITTED",
      integration: { mode: "sequential_wallet", planId: "plan", stepId: "source", expectedVersion: 3, tx: TX },
    };
    const destinationTx = { ...TX, chainId: 42161 };
    const plan: any = {
      planId: "plan", status: "ACTIVE", version: 4, currentStep: 1,
      steps: [{ stepId: "source", status: "CONFIRMED" }, {
        stepId: "rail", status: "READY", preparedAction: { tx: destinationTx, approvals: [] },
      }],
    };

    expect(syncSequentialExecutionPlan(session, plan).integration).toEqual({
      mode: "sequential_wallet", planId: "plan", stepId: "rail",
      expectedVersion: 4, tx: destinationTx, approvals: [],
    });
  });

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

  it("submits the current sequential-wallet action and records its plan step", async () => {
    const deps = dependencies();

    await expect(
      executeCrossIntegration(
        {
          intentId: "intent-sequential",
          sourceChainId: 8453,
          approvalsComplete: true,
          integration: {
            mode: "sequential_wallet",
            planId: "plan-sequential",
            stepId: "step-source-swap",
            expectedVersion: 3,
            tx: TX,
            approvals: [],
          },
        },
        deps,
      ),
    ).resolves.toBe("0xhash");
    expect(deps.sendEvmTransaction).toHaveBeenCalledWith(TX, 8453);
    expect(deps.markExecutionPlanStepSubmitted).toHaveBeenCalledWith(
      "plan-sequential",
      "step-source-swap",
      "0xhash",
      3,
    );
    expect(deps.submitStandardIntent).not.toHaveBeenCalled();
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

  it("executes THORChain BTC deposit instructions through the BTC wallet path", async () => {
    const deps = dependencies();
    const integration = {
      mode: "provider_direct" as const,
      action: {
        kind: "thorchain_swap" as const,
        depositAddress: "bc1qthorvault",
        memo: "=:e:0x1111111111111111111111111111111111111111",
        amountIn: "100000",
      },
    };

    await expect(
      executeCrossIntegration(
        {
          intentId: "intent-1",
          sourceChainId: 0,
          approvalsComplete: true,
          integration,
        },
        deps,
      ),
    ).resolves.toBe("btctxid");
    expect(deps.executeThorchainBitcoinIntent).toHaveBeenCalledWith(
      "intent-1",
      integration,
      0,
    );
    expect(deps.submitStandardIntent).not.toHaveBeenCalled();
  });

  it("dispatches Garden Solana native funding through the Solana wallet path", async () => {
    const deps = dependencies();
    const integration = {
      mode: "provider_direct" as const,
      action: { kind: "garden_htlc_order" as const },
      nativeFunding: {
        runtime: "solana" as const,
        unsignedTransaction: "AQIDBA==",
      },
    };

    await expect(
      executeCrossIntegration(
        {
          intentId: "intent-garden-sol",
          sourceChainId: 99,
          approvalsComplete: true,
          integration,
        },
        deps,
      ),
    ).resolves.toBe("solsig");
    expect(deps.executeGardenSolanaIntent).toHaveBeenCalledWith(
      "intent-garden-sol",
      integration,
      99,
    );
  });

  it("dispatches Garden Bitcoin native funding through the Bitcoin wallet path", async () => {
    const deps = dependencies();
    const integration = {
      mode: "provider_direct" as const,
      action: { kind: "garden_htlc_order" as const },
      nativeFunding: {
        runtime: "bitcoin" as const,
        unsignedTransaction: "cHNidP8BA...",
      },
    };

    await expect(
      executeCrossIntegration(
        {
          intentId: "intent-garden-btc",
          sourceChainId: 0,
          approvalsComplete: true,
          integration,
        },
        deps,
      ),
    ).resolves.toBe("gardentxid");
    expect(deps.executeGardenBitcoinIntent).toHaveBeenCalledWith(
      "intent-garden-btc",
      integration,
      0,
    );
  });
});
