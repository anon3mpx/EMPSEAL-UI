import type { ProviderDirectExecutionKind } from "./types";

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
): ProviderDirectExecutionKind {
  const action = integration?.action ?? integration;
  const userSteps = action?.userSteps ?? [];
  const directTx =
    integration?.tx ??
    action?.tx ??
    integration?.transaction ??
    action?.transaction ??
    null;

  if (action?.kind === "layerzero_value_transfer_api") {
    const hasUnsupportedStep = userSteps.some(
      (step: any) =>
        (typeof step?.type === "string" && step.type.startsWith("svm_")) ||
        (!getLayerZeroStepTx(step)?.to &&
          typeof getLayerZeroStepMessage(step) !== "string"),
    );

    return hasUnsupportedStep ? "unsupported" : "layerzero_steps";
  }

  if (directTx?.to) {
    return "evm_tx";
  }

  return "unsupported";
}
