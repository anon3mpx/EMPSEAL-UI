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

export function isPreparedRouteExpired(route, now = Date.now()) {
  const validUntil = Number(route?.tradeInfo?.validUntil);
  return Number.isFinite(validUntil) && validUntil > 0 && now >= validUntil;
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

export async function submitPreparedSdkRoute({ route, signer }) {
  if (route?.source !== "sdk" || !route.calldata) {
    throw new Error("SDK prepared calldata is unavailable");
  }
  const tx = await signer.sendTransaction({
    to: route.calldata.to,
    data: route.calldata.data,
    value: BigInt(route.calldata.value || "0"),
  });
  await tx.wait();
  return tx.hash;
}
