function readErrorMessage(error: unknown): string | null {
  if (!error || typeof error !== "object") {
    return typeof error === "string" && error.trim() ? error.trim() : null;
  }
  const record = error as Record<string, unknown>;
  const body = record.body as Record<string, unknown> | undefined;
  const candidates = [record.shortMessage, record.message, body?.message, body?.error];
  for (const candidate of candidates) {
    if (typeof candidate === "string" && candidate.trim()) return candidate.trim();
  }
  return null;
}

export function isUserRejectedError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const record = error as Record<string, unknown>;
  if (record.code === "USER_REJECTED" || record.code === 4001 || record.code === "4001") return true;
  return String(record.shortMessage ?? record.message ?? "").toLowerCase().includes("user rejected");
}

export function mapRampApiError(error: unknown): string {
  if (isUserRejectedError(error)) return "Wallet rejected the ramp signature.";
  const status = typeof error === "object" && error !== null
    ? (error as { status?: number }).status
    : undefined;
  const body = typeof error === "object" && error !== null
    ? (error as { body?: { error?: string; message?: string } }).body
    : undefined;
  const code = String(body?.error ?? "").toUpperCase();

  if (status === 503 || code === "RAMP_NOT_CONFIGURED") {
    return body?.message ?? "Ramp is unavailable. Actions are disabled until the backend is configured.";
  }
  if (code.includes("EXPIRED") || code === "RAMP_ACTION_EXPIRED") {
    return body?.message ?? "Ramp signature has expired. Sign again.";
  }
  if (status === 401 || code.includes("SIGNATURE")) {
    return body?.message ?? "Ramp signature is invalid.";
  }
  if (code.includes("KYC")) return body?.message ?? "Complete hosted KYC before continuing.";
  if (code.includes("CAPABILITY")) return body?.message ?? "This ramp action is disabled by backend capabilities.";
  return readErrorMessage(error) ?? "Ramp request failed.";
}

export function capabilityBlockReason(
  capabilities: { enabled: boolean; blockers: string[] } | null | undefined,
  feature?: { enabled: boolean; blockers: string[] },
): string | null {
  if (!capabilities) return "Ramp capabilities are unavailable.";
  if (!capabilities.enabled) {
    return capabilities.blockers[0] ?? "Ramp is disabled by backend capabilities.";
  }
  if (feature && !feature.enabled) {
    return feature.blockers[0] ?? "This ramp feature is disabled.";
  }
  return null;
}

export function onboardingBlockReason(capabilities: {
  enabled: boolean;
  blockers: string[];
  features: { kyc: { enabled: boolean; blockers: string[] } };
} | null | undefined): string | null {
  if (!capabilities) return "Ramp capabilities are unavailable.";
  if (capabilities.features.kyc.enabled) return null;
  if (!capabilities.enabled) {
    return capabilities.blockers[0] ?? "Ramp is disabled by backend capabilities.";
  }
  return capabilities.features.kyc.blockers[0] ?? "KYC is disabled.";
}
