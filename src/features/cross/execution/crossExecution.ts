import type { SelectedOfferIntegration } from "../api/contracts";
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
    classification === "non_evm_wallet_required" ||
    classification === "deposit_instructions"
  ) {
    throw new Error(
      "UNSUPPORTED_SOURCE_WALLET: This route requires a compatible non-EVM source wallet.",
    );
  }

  throw new Error(
    "INVALID_NON_EVM_TRANSACTION: The provider transaction is not executable by the connected wallet.",
  );
}
