import type { LayerZeroQuoteDiagnostic } from "../api/contracts";

export const NO_ROUTES_MESSAGE = "No routes available for this pair and amount.";
const NO_ROUTES_RETRY_MESSAGE = "No routes available right now. Please retry in a moment.";
const TRANSIENT_DIAGNOSTIC_CODES = new Set([
  "authentication_failed",
  "rate_limited",
  "timeout",
  "unavailable",
  "invalid_response",
]);

/**
 * Rail-agnostic copy for an empty quote. Provider diagnostics only decide
 * whether retrying could help; they never name a rail to the user.
 */
export function noRoutesMessage(diagnostics?: LayerZeroQuoteDiagnostic[]): string {
  return diagnostics?.some(item => TRANSIENT_DIAGNOSTIC_CODES.has(item.code))
    ? NO_ROUTES_RETRY_MESSAGE
    : NO_ROUTES_MESSAGE;
}

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
  if (error?.body?.error === "No route available for this pair") {
    return noRoutesMessage(error.body.providerDiagnostics);
  }
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
  if (code.includes("SELECTED_CARRIER_ACTION_UNAVAILABLE")) {
    return "This route could not be prepared. Refresh offers and choose another route.";
  }
  if (code.includes("SELECTED_CARRIER_ACTION_UNSUPPORTED")) {
    return "This provider requires an execution flow that is not supported in the wallet yet.";
  }
  if (code.includes("SELECTED_CARRIER_TRANSACTION_INVALID")) {
    return "The provider returned an invalid transaction. No transaction was sent.";
  }
  if (code.includes("EXECUTION_SELECTION_CONFLICT")) {
    return "This offer selection changed while it was being prepared. Refresh the quote and try again.";
  }
  if (code.includes("EXECUTION_PLAN_STOPPED")) {
    return "This route has stopped. No transaction was sent. Get a new quote to continue.";
  }
  if (code.includes("EXECUTION_STEP_NOT_READY")) {
    return "This route is already in progress. Do not send another transaction.";
  }
  if (code.includes("INVALID_SELECTION_RESPONSE")) {
    return "The route response was incomplete. No transaction was sent.";
  }
  if (code.includes("SEQUENTIAL_PRIMARY_NOT_COMPOSABLE")) {
    return "Multi-step routes cannot be combined with Gas Drop. Turn off Gas Drop or choose a one-step route.";
  }
  if (code.includes("GARDEN_NATIVE_SOURCE_NOT_COMPOSABLE")) {
    return "Garden native routes cannot be combined with Gas Drop. Turn off Gas Drop or choose another route.";
  }
  if (code.includes("GARDEN_SOLANA_TRANSACTION_EXPIRED")) {
    return "Garden Solana transaction expired. Request a new quote and try again.";
  }

  return readErrorMessage(error) ?? "Cross-chain request failed.";
}
