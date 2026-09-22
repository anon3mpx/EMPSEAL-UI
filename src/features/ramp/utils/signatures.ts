import { sha256, stringToBytes } from "viem";
import type { RampSignedAction } from "../api/contracts";

export function canonicalize(value: unknown): unknown {
  if (value === null || typeof value === "boolean" || typeof value === "number") {
    if (typeof value === "number" && !Number.isFinite(value)) {
      throw new Error("RAMP_ACTION_INVALID: non-finite numbers are not canonical JSON");
    }
    return value;
  }
  if (typeof value === "string") {
    return /^0x[0-9a-f]{40}$/i.test(value) ? value.toLowerCase() : value;
  }
  if (Array.isArray(value)) {
    return value.map((entry) => (entry === undefined ? null : canonicalize(entry)));
  }
  if (typeof value === "object" && value !== null) {
    const output: Record<string, unknown> = {};
    for (const key of Object.keys(value as object).sort()) {
      const entry = (value as Record<string, unknown>)[key];
      if (entry !== undefined) output[key] = canonicalize(entry);
    }
    return output;
  }
  throw new Error("RAMP_ACTION_INVALID: request body is not canonical JSON");
}

export function hashRampPayload(normalized: unknown): string {
  const canonical = JSON.stringify(canonicalize(normalized));
  return sha256(stringToBytes(canonical));
}

export function rampActionMessage(action: Omit<RampSignedAction, "signature">): string {
  return [
    "EMPX Ramp v1",
    action.action,
    action.wallet.toLowerCase(),
    String(action.chainId),
    action.payloadHash,
    action.nonce,
    String(action.timestamp),
    String(action.expiresAt),
  ].join("\n");
}

export function unsignedRampAction(input: {
  action: string;
  wallet: string;
  chainId: number;
  payload: unknown;
  nonce: string;
  timestamp: number;
  expiresAt: number;
}): Omit<RampSignedAction, "signature"> {
  return {
    action: input.action,
    wallet: input.wallet,
    chainId: input.chainId,
    payloadHash: hashRampPayload(input.payload),
    nonce: input.nonce,
    timestamp: input.timestamp,
    expiresAt: input.expiresAt,
  };
}

export function payloadWithoutSignature(
  body: Record<string, unknown>,
  resourceId?: string,
): Record<string, unknown> {
  const payload: Record<string, unknown> = { ...body };
  delete payload.signedAction;
  if (resourceId) payload.resourceId = resourceId;
  return payload;
}
