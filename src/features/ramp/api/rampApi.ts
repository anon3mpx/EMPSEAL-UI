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
const BASE = "/api/cross-v2/v2/ramp";
async function rampFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${BASE}${path}`, {...init, headers: {"Content-Type":"application/json",...init?.headers}, credentials:"same-origin"});
  const body:unknown = await response.json();
  if (!response.ok) {
    let message=`Ramp request failed (HTTP ${response.status})`;
    if(body && typeof body==='object' && 'error' in body && body.error && typeof body.error==='object') {
      const error=body.error;
      if('message' in error && typeof error.message==='string')message=error.message;
      else if('code' in error && typeof error.code==='string')message=error.code;
      if('code' in error && error.code==='RAMP_SIGNATURE_UNSUPPORTED_WALLET')message='RAMP_SIGNATURE_UNSUPPORTED_WALLET: Safe, contract and 7702 wallets are not supported. Connect an EOA.';
    }
    throw {status:response.status,body,message};
  }
  return body as T;
}

function post<T>(path: string, body: unknown, idempotencyKey?: string): Promise<T> {
  return rampFetch<T>(path, {
    method: "POST",
    ...(idempotencyKey ? { headers: { "Idempotency-Key": idempotencyKey } } : {}),
    body: JSON.stringify(body),
  });
}

export const rampApi = {
  getCapabilities: () => rampFetch<RampCapabilities>("/capabilities"),
  registerWallet: (payload: RampSignedCommand, idempotencyKey: string) =>
    post("/wallets/register", payload, idempotencyKey),
  getProfile: (payload: RampSignedCommand) =>
    post<RampProfile>("/profile", payload),
  createKycLink: (payload: RampKycLinkCommand, idempotencyKey: string) =>
    post<RampKycHandoff>("/kyc-link", payload, idempotencyKey),
  refreshKyc: (payload: RampSignedCommand) =>
    post<RampProfile>("/kyc/refresh", payload),
  createBankLink: (payload: RampSignedCommand, idempotencyKey: string) =>
    post<RampBankLinkHandoff>("/bank-link", payload, idempotencyKey),
  exchangeBankLink: (payload: RampBankLinkExchangeCommand) =>
    post<RampExternalAccount[]>("/bank-link/exchange", payload),
  syncExternalAccounts: (payload: RampSignedCommand) =>
    post<RampExternalAccount[]>("/external-accounts", payload),
  preview: (payload: RampTransferCommand) =>
    post<RampPreview>("/preview", payload),
  createTransfer: (payload: RampTransferCommand, idempotencyKey: string) =>
    post<RampTransfer>("/transfers", payload, idempotencyKey),
  getTransferStatus: (transferId: string, payload: RampSignedCommand) =>
    post<RampTransfer>(`/transfers/${encodeURIComponent(transferId)}/status`, payload),
  cancelTransfer: (transferId: string, payload: RampSignedCommand, idempotencyKey: string) =>
    post<RampTransfer>(
      `/transfers/${encodeURIComponent(transferId)}/cancel`,
      payload,
      idempotencyKey,
    ),
  createDelegation: (payload: RampCreateDelegationCommand, idempotencyKey: string) =>
    post<RampDelegation>("/delegations", payload, idempotencyKey),
  revokeDelegation: (delegationId: string, payload: RampSignedCommand) =>
    post<{ revoked: true }>(
      `/delegations/${encodeURIComponent(delegationId)}/revoke`,
      payload,
    ),
  reportLeg2: (transferId: string, intentId: string, payload: RampSignedCommand) =>
    post<RampTransfer>(`/transfers/${encodeURIComponent(transferId)}/leg2`, {...payload,intentId}),
  listDelegations: (payload: RampSignedCommand, agent = false) =>
    rampFetch<RampDelegation[]>(`/${agent?"agent-grants":"delegations"}?${new URLSearchParams({payload:JSON.stringify(payload)})}`),
  createAgentGrant: (payload: RampCreateDelegationCommand, idempotencyKey: string) =>
    post<RampDelegation>("/agent-grants",payload,idempotencyKey),
  revokeAgentGrant: (id: string, payload: RampSignedCommand) =>
    post<{revoked:true}>(`/agent-grants/${encodeURIComponent(id)}/revoke`,payload),
};
