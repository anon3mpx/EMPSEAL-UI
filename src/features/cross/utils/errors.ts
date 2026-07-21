function readErrorMessage(error: any): string | null {
  if (!error) return null;

  const candidates = [
    error.shortMessage,
    error.details,
    error.message,
    error.body?.message,
    error.cause?.shortMessage,
    error.cause?.details,
    error.cause?.message,
    error.walk?.((node: any) => node?.shortMessage)?.shortMessage,
    error.walk?.((node: any) => node?.details)?.details,
    error.walk?.((node: any) => node?.message)?.message,
  ];

  for (const candidate of candidates) {
    if (typeof candidate === "string" && candidate.trim()) {
      return candidate.trim();
    }
  }

  return null;
}

export function mapCrossApiError(error: any): string {
  if (error?.status === 409 && error?.body?.fallbackOfferSet) {
    return "Selected route expired. Please choose an updated route.";
  }

  if (error?.status === 429) {
    return "Rate limited. Please wait a moment and try again.";
  }

  if (error?.status === 503) {
    return "Cross-chain service temporarily unavailable. Retrying is safe.";
  }

  const code = String(
    error?.body?.error ??
      error?.body?.code ??
      error?.code ??
      error?.message ??
      "",
  ).toUpperCase();

  if (code.includes("CHAINFLIP_BROKER_UNAVAILABLE")) {
    return "Chainflip is quote only. Private broker-backed deposit-channel creation is not enabled.";
  }
  if (
    code.includes("NATIVE_DST_ADDRESS_REQUIRED") ||
    code.includes("MISSING_NATIVE_DESTINATION")
  ) {
    return "Enter a valid native destination address before requesting this route.";
  }
  if (code.includes("UNSUPPORTED_SOURCE_WALLET")) {
    return "This route requires a source wallet that is not connected or supported by this UI.";
  }
  if (code.includes("INVALID_NON_EVM_TRANSACTION")) {
    return "The provider returned a non-EVM transaction that cannot be sent through the connected EVM wallet.";
  }
  if (code.includes("PROVIDER_APPROVAL_FAILED")) {
    return "Provider token approval failed or is still incomplete. The transfer was not submitted.";
  }
  if (
    code.includes("RAIL_DISABLED") ||
    code.includes("DIRECTION_DISABLED")
  ) {
    return "This rail or direction is disabled for the current rollout.";
  }
  if (
    code.includes("PROVIDER_QUOTE_EXPIRED") ||
    code.includes("QUOTE_EXPIRED")
  ) {
    return "The provider quote expired. Refresh the route before continuing.";
  }
  if (
    code.includes("PROVIDER_CALLDATA_UNAVAILABLE") ||
    code.includes("CALLDATA_UNAVAILABLE")
  ) {
    return "Provider calldata is temporarily unavailable. Refresh the quote and try again.";
  }

  return readErrorMessage(error) ?? "Cross-chain request failed.";
}
