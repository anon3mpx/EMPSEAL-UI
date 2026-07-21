import { isAddress } from "viem";
import type {
  ProviderDirectIntegration,
  ProviderApprovalRequest,
} from "../api/contracts";
import { getProviderDirectTx } from "./providerDirect";

export interface ApprovalRequest {
  tokenAddress: string;
  spender: string;
  amount: bigint;
  chainId: number;
}

function parseApproval(
  approval: ProviderApprovalRequest,
  chainId: number,
): ApprovalRequest {
  if (!isAddress(approval.token)) {
    throw new Error("Invalid provider approval token address.");
  }
  if (!isAddress(approval.spender)) {
    throw new Error("Invalid provider approval spender address.");
  }
  if (!/^\d+$/.test(approval.amount) || BigInt(approval.amount) <= 0n) {
    throw new Error("Invalid provider approval amount.");
  }
  if (!Number.isSafeInteger(chainId) || chainId <= 0) {
    throw new Error("Invalid provider approval source chain.");
  }

  return {
    tokenAddress: approval.token,
    spender: approval.spender,
    amount: BigInt(approval.amount),
    chainId,
  };
}

export function readProviderApprovalRequests(
  integration: Partial<ProviderDirectIntegration> | null | undefined,
  fallbackChainId: number,
): ApprovalRequest[] {
  if (!Array.isArray(integration?.approvals)) return [];
  const directTx = getProviderDirectTx(integration);
  const txChainId = Number(directTx?.chainId ?? fallbackChainId);
  return integration.approvals.map((approval) =>
    parseApproval(approval, txChainId),
  );
}

export async function findMissingProviderApprovals(
  requests: ApprovalRequest[],
  owner: string,
  readAllowance: (
    request: ApprovalRequest,
    owner: string,
  ) => Promise<bigint>,
): Promise<ApprovalRequest[]> {
  const allowances = await Promise.all(
    requests.map((request) => readAllowance(request, owner)),
  );
  return requests.filter((request, index) => allowances[index] < request.amount);
}

export async function executeProviderApprovals(
  requests: ApprovalRequest[],
  actions: {
    ensureChain: (chainId: number) => Promise<unknown>;
    approve: (request: ApprovalRequest) => Promise<string>;
    waitForConfirmation: (
      txHash: string,
      request: ApprovalRequest,
    ) => Promise<unknown>;
  },
): Promise<void> {
  for (const request of requests) {
    await actions.ensureChain(request.chainId);
    const hash = await actions.approve(request);
    await actions.waitForConfirmation(hash, request);
  }
}
