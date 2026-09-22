import { crossApiFetch } from "../../cross/api/client";
import type {
  RampBankLinkExchangeCommand,
  RampBankLinkHandoff,
  RampCreateDelegationCommand,
  RampDelegation,
  RampExternalAccount,
  RampKycHandoff,
  RampKycLinkCommand,
  RampPreview,
  RampProfile,
  RampCapabilities,
  RampSignedCommand,
  RampTransfer,
  RampTransferCommand,
} from "./contracts";

function post<T>(path: string, body: unknown, idempotencyKey?: string): Promise<T> {
  return crossApiFetch<T>(path, {
    method: "POST",
    ...(idempotencyKey ? { headers: { "Idempotency-Key": idempotencyKey } } : {}),
    body: JSON.stringify(body),
  });
}

export const rampApi = {
  getCapabilities: () => crossApiFetch<RampCapabilities>("/api/v1/ramp/capabilities"),
  registerWallet: (payload: RampSignedCommand, idempotencyKey: string) =>
    post("/api/v1/ramp/wallets/register", payload, idempotencyKey),
  getProfile: (payload: RampSignedCommand) =>
    post<RampProfile>("/api/v1/ramp/profile", payload),
  createKycLink: (payload: RampKycLinkCommand, idempotencyKey: string) =>
    post<RampKycHandoff>("/api/v1/ramp/kyc-link", payload, idempotencyKey),
  refreshKyc: (payload: RampSignedCommand) =>
    post<RampProfile>("/api/v1/ramp/kyc/refresh", payload),
  createBankLink: (payload: RampSignedCommand, idempotencyKey: string) =>
    post<RampBankLinkHandoff>("/api/v1/ramp/bank-link", payload, idempotencyKey),
  exchangeBankLink: (payload: RampBankLinkExchangeCommand) =>
    post<RampExternalAccount[]>("/api/v1/ramp/bank-link/exchange", payload),
  syncExternalAccounts: (payload: RampSignedCommand) =>
    post<RampExternalAccount[]>("/api/v1/ramp/external-accounts", payload),
  preview: (payload: RampTransferCommand) =>
    post<RampPreview>("/api/v1/ramp/preview", payload),
  createTransfer: (payload: RampTransferCommand, idempotencyKey: string) =>
    post<RampTransfer>("/api/v1/ramp/transfers", payload, idempotencyKey),
  getTransferStatus: (transferId: string, payload: RampSignedCommand) =>
    post<RampTransfer>(`/api/v1/ramp/transfers/${encodeURIComponent(transferId)}/status`, payload),
  cancelTransfer: (transferId: string, payload: RampSignedCommand, idempotencyKey: string) =>
    post<RampTransfer>(
      `/api/v1/ramp/transfers/${encodeURIComponent(transferId)}/cancel`,
      payload,
      idempotencyKey,
    ),
  createDelegation: (payload: RampCreateDelegationCommand, idempotencyKey: string) =>
    post<RampDelegation>("/api/v1/ramp/delegations", payload, idempotencyKey),
  revokeDelegation: (delegationId: string, payload: RampSignedCommand) =>
    post<{ revoked: true }>(
      `/api/v1/ramp/delegations/${encodeURIComponent(delegationId)}/revoke`,
      payload,
    ),
};
