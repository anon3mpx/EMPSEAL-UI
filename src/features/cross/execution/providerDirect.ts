import type { ProviderDirectExecutionKind } from "./types";
import { isAddress } from "viem";
import { isEvmChain } from "@/lib/wallet/chainKind";

export const getLayerZeroStepTx = (step: any) =>
  step?.tx?.encoded ??
  step?.tx ??
  step?.transaction?.encoded ??
  step?.transaction ??
  step?.evmTx?.encoded ??
  step?.evmTx ??
  step?.userAction?.tx?.encoded ??
  step?.userAction?.tx ??
  step?.data?.tx?.encoded ??
  step?.data?.tx ??
  step?.payload?.tx?.encoded ??
  step?.payload?.tx ??
  step?.payload?.transaction?.encoded ??
  step?.payload?.transaction ??
  step?.walletAction?.tx?.encoded ??
  step?.walletAction?.tx ??
  step?.walletAction?.transaction?.encoded ??
  step?.walletAction?.transaction ??
  null;

export const getLayerZeroStepMessage = (step: any) =>
  step?.message ??
  step?.signMessage ??
  step?.payload?.message ??
  step?.data?.message ??
  step?.walletAction?.message ??
  step?.walletAction?.signMessage ??
  null;

export function mergeLayerZeroUserSteps(integration: any, refreshed: any) {
  const nextSteps =
    refreshed?.userSteps ??
    refreshed?.action?.userSteps ??
    integration?.action?.userSteps ??
    [];

  return {
    ...integration,
    action: {
      ...(integration?.action ?? {}),
      ...(refreshed?.action ?? {}),
      userSteps: nextSteps,
    },
  };
}

export function classifyProviderDirectAction(
  integration: any,
  context: {
    selectedSourceChainId?: number;
  } = {},
): ProviderDirectExecutionKind {
  const action = integration?.action ?? integration;
  const userSteps = action?.userSteps ?? [];
  const directTx =
    integration?.tx ??
    action?.tx ??
    integration?.transaction ??
    action?.transaction ??
    null;

  if (action?.kind === "chainflip_deposit") {
    return "quote_only";
  }

  if (
    action?.kind === "teleswap_transfer" ||
    action?.kind === "teleswap_deposit" ||
    (action?.kind === "optimism_standard_bridge" &&
      action?.direction === "withdraw")
  ) {
    return "unsupported";
  }

  if (action?.kind === "layerzero_value_transfer_api") {
    const hasNonEvmStep = userSteps.some(
      (step: any) =>
        (typeof step?.type === "string" && step.type.startsWith("svm_")) ||
        String(step?.chainType ?? "").toUpperCase() === "SOLANA",
    );
    if (hasNonEvmStep) return "non_evm_wallet_required";

    const hasUnsupportedStep = userSteps.some(
      (step: any) =>
        (!getLayerZeroStepTx(step)?.to &&
          typeof getLayerZeroStepMessage(step) !== "string"),
    );
    return hasUnsupportedStep ? "unsupported" : "layerzero_steps";
  }

  const txChainId = Number(directTx?.chainId ?? NaN);
  if (
    txChainId === 0 ||
    (Number.isFinite(txChainId) && !isEvmChain(txChainId))
  ) {
    return "non_evm_wallet_required";
  }

  if (
    action?.kind === "maya_swap" &&
    (!Number.isFinite(txChainId) || txChainId === 0)
  ) {
    return "non_evm_wallet_required";
  }

  if (
    context.selectedSourceChainId !== undefined &&
    txChainId !== context.selectedSourceChainId
  ) {
    return "unsupported";
  }

  const supportedActions = new Set([
    "thorchain_swap",
    "gaszip_transfer",
    "hyperlane_transfer_remote",
    "maya_swap",
    "optimism_standard_bridge",
  ]);

  if (
    directTx?.to &&
    isAddress(directTx.to) &&
    Number.isSafeInteger(txChainId) &&
    isEvmChain(txChainId) &&
    supportedActions.has(action?.kind)
  ) {
    return "evm_transaction";
  }

  if (typeof action?.depositAddress === "string" && action.depositAddress) {
    return "deposit_instructions";
  }

  return "unsupported";
}

export function getProviderDirectTx(integration: any) {
  const action = integration?.action ?? integration;
  return (
    action?.tx ??
    integration?.tx ??
    integration?.integration?.tx ??
    action?.transaction ??
    null
  );
}
