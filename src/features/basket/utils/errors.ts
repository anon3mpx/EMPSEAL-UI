function readErrorMessage(error: unknown): string | null {
  if (!error || typeof error !== "object") {
    return typeof error === "string" && error.trim() ? error.trim() : null;
  }
  const record = error as Record<string, unknown>;
  const body = record.body as Record<string, unknown> | undefined;
  const candidates = [
    record.shortMessage,
    record.message,
    body?.message,
    body?.error,
    record.code,
  ];
  for (const candidate of candidates) {
    if (typeof candidate === "string" && candidate.trim()) return candidate.trim();
  }
  return null;
}

export function isUserRejectedError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const record = error as Record<string, unknown>;
  const code = record.code;
  if (code === "USER_REJECTED" || code === 4001 || code === "4001") return true;
  const message = String(record.shortMessage ?? record.message ?? "").toLowerCase();
  return message.includes("user rejected") || message.includes("rejected the request");
}

export function mapBasketApiError(error: unknown): string {
  if (isUserRejectedError(error)) {
    return "Wallet rejected the signature or transaction.";
  }

  const status = typeof error === "object" && error !== null
    ? (error as { status?: number }).status
    : undefined;
  const body = typeof error === "object" && error !== null
    ? (error as { body?: { error?: string; message?: string } }).body
    : undefined;
  const code = String(body?.error ?? "").toUpperCase();

  if (status === 410 || code.includes("QUOTE_EXPIRED") || code.includes("EXPIRED")) {
    return body?.message ?? "Basket quote or plan has expired. Request a new quote.";
  }
  if (status === 422 || code.includes("CAPABILITY_UNAVAILABLE")) {
    return body?.message ?? "Basket execution is disabled by backend capabilities.";
  }
  if (status === 401 || code.includes("SIGNATURE_INVALID")) {
    return body?.message ?? "Basket signature is invalid or does not match the connected wallet.";
  }
  if (status === 409 && code.includes("LEG_NOT_RETRYABLE")) {
    return body?.message ?? "Only failed legs can be retried.";
  }
  if (status === 409) {
    return body?.message ?? "Basket state conflict. Reload status before continuing.";
  }
  if (status === 503) {
    return body?.message ?? "Basket service is unavailable.";
  }
  if (code.includes("TX_HASH") || String(readErrorMessage(error) ?? "").includes("WALLET_TX_HASH_MISSING")) {
    return "Transaction was not acknowledged because the wallet did not return a hash.";
  }
  if (code.includes("ACCOUNT_MISMATCH") || code.includes("CHAIN_MISMATCH")) {
    return readErrorMessage(error) ?? "Connected wallet or chain does not match the required account.";
  }

  return readErrorMessage(error) ?? "Basket request failed.";
}
