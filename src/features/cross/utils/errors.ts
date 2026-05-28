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

  return readErrorMessage(error) ?? "Cross-chain request failed.";
}
