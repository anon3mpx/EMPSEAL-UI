export const SWAP_EXECUTION_MODE = {
  SDK: "sdk",
  LEGACY: "legacy",
  AUTO: "auto",
};

export function hasSwapContractApi(swapContractApi) {
  return (
    !!swapContractApi &&
    typeof swapContractApi.checkAllowance === "function" &&
    typeof swapContractApi.callApprove === "function" &&
    typeof swapContractApi.swapTokens === "function"
  );
}

function normalizeExecutionMode(executionMode) {
  if (executionMode === SWAP_EXECUTION_MODE.LEGACY) return SWAP_EXECUTION_MODE.LEGACY;
  if (executionMode === SWAP_EXECUTION_MODE.AUTO) return SWAP_EXECUTION_MODE.AUTO;
  return SWAP_EXECUTION_MODE.SDK;
}

export function resolveSwapExecutionMode({
  executionMode,
  routeSource,
  hasLegacyApi,
  hasRouter,
  hasSigner,
}) {
  const requestedMode = normalizeExecutionMode(executionMode);
  const canUseLegacy = Boolean(hasLegacyApi);
  const canUseSdk = Boolean(hasRouter && hasSigner);

  if (requestedMode === SWAP_EXECUTION_MODE.LEGACY) {
    return {
      requestedMode,
      mode: canUseLegacy ? SWAP_EXECUTION_MODE.LEGACY : SWAP_EXECUTION_MODE.SDK,
      canUseLegacy,
      canUseSdk,
    };
  }

  if (requestedMode === SWAP_EXECUTION_MODE.AUTO) {
    if (routeSource === "local" && canUseLegacy) {
      return {
        requestedMode,
        mode: SWAP_EXECUTION_MODE.LEGACY,
        canUseLegacy,
        canUseSdk,
      };
    }
    if (routeSource === "sdk") {
      return {
        requestedMode,
        mode: SWAP_EXECUTION_MODE.SDK,
        canUseLegacy,
        canUseSdk,
      };
    }
    return {
      requestedMode,
      mode: canUseSdk || !canUseLegacy ? SWAP_EXECUTION_MODE.SDK : SWAP_EXECUTION_MODE.LEGACY,
      canUseLegacy,
      canUseSdk,
    };
  }

  return {
    requestedMode,
    mode: SWAP_EXECUTION_MODE.SDK,
    canUseLegacy,
    canUseSdk,
  };
}
