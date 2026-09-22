import type {
  ExecutionPlan,
  SelectedOfferIntegration,
  SingleCrossExecutionSession,
} from "../api/contracts";
import {
  classifyProviderDirectAction,
  getProviderDirectTx,
} from "./providerDirect";
import { toSendTransactionArgs } from "./routerIntent";

export interface ExecuteCrossIntegrationInput {
  intentId: string;
  integration: SelectedOfferIntegration;
  sourceChainId: number;
  approvalsComplete: boolean;
}

export interface CrossExecutionDependencies {
  sendEvmTransaction: (
    tx: Record<string, unknown>,
    chainId: number,
  ) => Promise<string>;
  executeLayerZeroIntent: (
    intentId: string,
    integration: SelectedOfferIntegration,
    sourceChainId: number,
  ) => Promise<string>;
  submitStandardIntent: (intentId: string, txHash: string) => Promise<unknown>;
  markLayerZeroSubmitted: (
    intentId: string,
    txHash: string,
  ) => Promise<unknown>;
  markExecutionPlanStepSubmitted: (
    planId: string,
    stepId: string,
    txHash: string,
    expectedVersion: number,
  ) => Promise<unknown>;
  executeThorchainBitcoinIntent?: (
    intentId: string,
    integration: SelectedOfferIntegration,
    sourceChainId: number,
  ) => Promise<string>;
  executeGardenSolanaIntent?: (
    intentId: string,
    integration: SelectedOfferIntegration,
    sourceChainId: number,
  ) => Promise<string>;
  executeGardenBitcoinIntent?: (
    intentId: string,
    integration: SelectedOfferIntegration,
    sourceChainId: number,
  ) => Promise<string>;
}

export async function executeCrossIntegration(
  input: ExecuteCrossIntegrationInput,
  dependencies: CrossExecutionDependencies,
): Promise<string> {
  const { integration, intentId, sourceChainId } = input;

  if (integration.mode === "router_intent") {
    const txHash = await dependencies.sendEvmTransaction(
      toSendTransactionArgs(integration.integration),
      sourceChainId,
    );
    await dependencies.submitStandardIntent(intentId, txHash);
    return txHash;
  }

  if (integration.mode === "sequential_wallet") {
    if ((integration.approvals?.length ?? 0) > 0 && !input.approvalsComplete) {
      throw new Error(
        "PROVIDER_APPROVAL_FAILED: Sequential action approval is required before execution.",
      );
    }
    const txHash = await dependencies.sendEvmTransaction(
      { ...integration.tx },
      integration.tx.chainId,
    );
    await dependencies.markExecutionPlanStepSubmitted(
      integration.planId,
      integration.stepId,
      txHash,
      integration.expectedVersion,
    );
    return txHash;
  }

  if ((integration.approvals?.length ?? 0) > 0 && !input.approvalsComplete) {
    throw new Error(
      "PROVIDER_APPROVAL_FAILED: Provider approval is required before execution.",
    );
  }

  const classification = classifyProviderDirectAction(integration, {
    selectedSourceChainId: sourceChainId,
  });

  if (classification === "layerzero_steps") {
    return dependencies.executeLayerZeroIntent(
      intentId,
      integration,
      sourceChainId,
    );
  }

  if (classification === "garden_solana_source") {
    if (!dependencies.executeGardenSolanaIntent) {
      throw new Error("UNSUPPORTED_SOURCE_WALLET: Solana Garden execution is unavailable.");
    }
    return dependencies.executeGardenSolanaIntent(
      intentId,
      integration,
      sourceChainId,
    );
  }

  if (classification === "garden_bitcoin_source") {
    if (!dependencies.executeGardenBitcoinIntent) {
      throw new Error("UNSUPPORTED_SOURCE_WALLET: Bitcoin Garden execution is unavailable.");
    }
    return dependencies.executeGardenBitcoinIntent(
      intentId,
      integration,
      sourceChainId,
    );
  }

  if (classification === "evm_transaction") {
    const tx = getProviderDirectTx(integration);
    const txChainId = Number(tx.chainId);
    const txHash = await dependencies.sendEvmTransaction(tx, txChainId);
    if (integration.action.kind === "layerzero_value_transfer_api") {
      await dependencies.markLayerZeroSubmitted(intentId, txHash);
    } else {
      await dependencies.submitStandardIntent(intentId, txHash);
    }
    return txHash;
  }

  if (classification === "quote_only") {
    throw new Error(
      "CHAINFLIP_BROKER_UNAVAILABLE: This route is quote only because private broker execution is unavailable.",
    );
  }

  if (
    classification === "deposit_instructions" &&
    sourceChainId === 0 &&
    integration.action.kind === "thorchain_swap"
  ) {
    if (!dependencies.executeThorchainBitcoinIntent) {
      throw new Error("UNSUPPORTED_SOURCE_WALLET: Bitcoin execution is unavailable.");
    }
    return dependencies.executeThorchainBitcoinIntent(
      intentId,
      integration,
      sourceChainId,
    );
  }

  if (classification === "non_evm_wallet_required" || classification === "deposit_instructions") {
    throw new Error(
      "UNSUPPORTED_SOURCE_WALLET: This route requires a compatible non-EVM source wallet.",
    );
  }

  throw new Error(
    "INVALID_NON_EVM_TRANSACTION: The provider transaction is not executable by the connected wallet.",
  );
}

export function syncSequentialExecutionPlan(
  session: SingleCrossExecutionSession,
  plan: ExecutionPlan,
): SingleCrossExecutionSession {
  if (session.integration.mode !== "sequential_wallet" || session.integration.planId !== plan.planId) {
    return session;
  }
  const currentStep = plan.steps[plan.currentStep];
  const prepared = currentStep?.status === "READY" ? currentStep.preparedAction : undefined;
  return {
    ...session,
    executionPlan: plan,
    status: plan.status,
    integration: prepared ? {
      mode: "sequential_wallet",
      planId: plan.planId,
      stepId: currentStep.stepId,
      expectedVersion: plan.version,
      tx: prepared.tx,
      approvals: prepared.approvals ?? [],
    } : session.integration,
  };
}
