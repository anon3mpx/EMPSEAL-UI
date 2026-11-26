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

/** The server sends `{ error: { code, message } }`; older paths send `{ error: "CODE", message }`. */
function readErrorBody(error: unknown): { status?: number; code: string; message?: string } {
  if (!error || typeof error !== "object") return { code: "" };
  const record = error as { status?: number; body?: Record<string, unknown> };
  const raw = record.body?.error;
  const nested = raw && typeof raw === "object" ? raw as { code?: unknown; message?: unknown } : undefined;
  const code = String(nested?.code ?? (typeof raw === "string" ? raw : "")).toUpperCase();
  const message = [nested?.message, record.body?.message].find((v): v is string => typeof v === "string" && v.trim().length > 0);
  return { status: record.status, code, message };
}

export function mapRampApiError(error: unknown): string {
  if (isUserRejectedError(error)) return "You declined the signature in your wallet.";
  const { status, code, message } = readErrorBody(error);
  const text = `${code} ${message ?? ""}`.toLowerCase();

  if (code === "RAMP_SIGNATURE_UNSUPPORTED_WALLET") {
    return "This wallet is a smart account. Switch to a regular wallet account to use the ramp.";
  }
  if (text.includes("unsupported state or region")) {
    return "Bridge can't serve your state or region yet.";
  }
  if (status === 503 || code === "RAMP_NOT_CONFIGURED") return "The ramp is offline right now. Try again later.";
  if (code.includes("EXPIRED")) return "Your signature expired. Try again and sign once more.";
  if (code === "RAMP_PAYLOAD_MISMATCH") return "The request changed after you signed it. Try again.";
  if (status === 401 || code.includes("SIGNATURE")) return "Your wallet signature couldn't be checked. Try again.";
  if (code.includes("KYC")) return "Finish identity verification first.";
  if (code.includes("CAPABILITY")) return "This ramp action is turned off right now.";
  if (status === 502 || code.includes("PROVIDER")) return "Bridge couldn't process this request. Try again in a minute.";
  return message ?? readErrorMessage(error) ?? "Something went wrong. Try again.";
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
