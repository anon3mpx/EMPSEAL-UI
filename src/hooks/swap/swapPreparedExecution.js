export async function checkPreparedAllowance({
  route,
  router,
  token,
  owner,
  amount,
}) {
  if (route?.source !== "sdk") {
    throw new Error("SDK prepared route is required for SDK allowance checks");
  }
  return route.routing === "split"
    ? router.checkSplitAllowance(token, owner, amount)
    : router.checkAllowance(token, owner, amount);
}

export function getPreparedApproval({ route, router, token, amount }) {
  if (route?.source !== "sdk") {
    throw new Error("SDK prepared route is required for SDK approval calldata");
  }
  const options = { mode: "exact", amount };
  return route.routing === "split"
    ? router.getSplitApprovalCalldataForAmount(token, options)
    : router.getApprovalCalldataForAmount(token, options);
}

export async function prepareExecutableSdkRoute({ route, router, sender }) {
  if (route?.source !== "sdk" || !route.executionRequest) {
    throw new Error("SDK preview execution request is unavailable");
  }
  if (!router?.splitSwap) {
    throw new Error("SDK executable route preparation is unavailable");
  }
  if (!sender) {
    throw new Error("Connected wallet address is required for SDK route preparation");
  }

  const request = route.executionRequest;
  const prepared = await router.splitSwap(
    request.amountIn,
    request.tokenIn,
    request.tokenOut,
    request.recipient,
    {
      ...request.options,
      sender,
    },
  );

  if (!prepared?.calldata) {
    throw new Error("SDK executable calldata is unavailable");
  }
  if (prepared.routing !== route.routing) {
    throw new Error(
      "SDK route changed during preparation. Refresh and review the new route before swapping.",
    );
  }

  return {
    source: "sdk",
    ...prepared,
    recipient: request.recipient,
    executionRequest: request,
  };
}

export function isPreparedRouteExpired(route, now = Date.now(), minRemainingMs = 0) {
  const validUntil = Number(route?.tradeInfo?.validUntil);
  return (
    Number.isFinite(validUntil) &&
    validUntil > 0 &&
    now + Math.max(0, minRemainingMs) >= validUntil
  );
}

function collectErrorText(error) {
  return [
    error?.message,
    error?.shortMessage,
    error?.reason,
    error?.code,
    error?.info?.error?.message,
    error?.error?.message,
    error?.cause?.message,
  ]
    .filter((part) => part != null)
    .join(" ")
    .toLowerCase();
}

export function getSwapExecutionErrorMessage(error, { phase = "swap" } = {}) {
  const errorText = collectErrorText(error);
  const rejected =
    error?.code === 4001 ||
    error?.code === "ACTION_REJECTED" ||
    errorText.includes("user rejected") ||
    errorText.includes("user denied");

  if (rejected) {
    return phase === "approval"
      ? "Token approval rejected in wallet."
      : "Transaction rejected in wallet.";
  }

  if (
    error?.code === "QUOTE_EXPIRED" ||
    errorText.includes("quote expired") ||
    errorText.includes("quote is too close to expiry")
  ) {
    return "Quote expired. Refresh the quote and try again.";
  }

  if (
    errorText.includes("connected wallet account changed") ||
    errorText.includes("connected wallet network changed")
  ) {
    return "Wallet account or network changed. Review the swap and try again.";
  }

  if (errorText.includes("sdk route changed during preparation")) {
    return "Route changed while preparing the swap. Refresh and review it before continuing.";
  }

  if (
    errorText.includes("insufficient amountout") ||
    errorText.includes("empsealrouter: insufficient output amount")
  ) {
    return "Minimum output is no longer available. Refresh the quote or increase slippage, then retry.";
  }

  if (phase === "approval") {
    return "Token approval failed. Check wallet status and try again.";
  }

  if (
    errorText.includes("estimategas") ||
    errorText.includes("missing revert data") ||
    errorText.includes("call_exception")
  ) {
    return "Transaction simulation failed. Refresh the quote and try again.";
  }

  return "Swap failed. Check wallet status, quote freshness, and token approval, then retry.";
}

export async function submitPreparedSdkRoute({ route, signer, router, sender }) {
  if (route?.source !== "sdk" || !route.calldata) {
    throw new Error("SDK prepared calldata is unavailable");
  }
  if (route.routing === "split") {
    if (!router?.validateSplitSwap || !sender) {
      throw new Error("SDK split validation is unavailable");
    }
    await router.validateSplitSwap(route, sender);
  }
  const tx = await signer.sendTransaction({
    to: route.calldata.to,
    data: route.calldata.data,
    value: BigInt(route.calldata.value || "0"),
  });
  await tx.wait();
  return tx.hash;
}
