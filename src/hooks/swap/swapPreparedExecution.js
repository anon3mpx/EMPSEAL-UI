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
