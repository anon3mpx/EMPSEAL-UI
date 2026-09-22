import type {
  BasketExecutionPlan,
  BasketStatus,
  BasketSubmittedResponse,
  BasketTransactionRequest,
} from "../api/contracts";

const TX_HASH = /^0x[0-9a-fA-F]{64}$/;

export const EXECUTION_TX_KINDS = new Set<BasketTransactionRequest["kind"]>([
  "same-chain-swap",
  "cross-chain-intent",
  "multicall",
]);

const TERMINAL_COMPOSITES = new Set([
  "SETTLED",
  "FAILED",
  "CANCELLED",
  "CANCELED",
  "STUCK",
  "EXPIRED",
]);

export function isTxHash(value: string | null | undefined): value is string {
  return typeof value === "string" && TX_HASH.test(value);
}

export function failedLegs(status: BasketStatus): BasketStatus["legs"] {
  return status.legs.filter((leg) => leg.state === "FAILED");
}

export function isTerminalBasketStatus(composite?: string | null): boolean {
  return composite != null && TERMINAL_COMPOSITES.has(composite);
}

export function approvalTransactions(plan: BasketExecutionPlan): BasketTransactionRequest[] {
  return plan.transactions.filter((tx) => tx.kind === "approval");
}

export function executableTransactions(
  plan: BasketExecutionPlan,
  skipTransactionIds?: Iterable<string>,
): BasketTransactionRequest[] {
  const skip = new Set(skipTransactionIds);
  return plan.transactions.filter(
    (tx) => EXECUTION_TX_KINDS.has(tx.kind) && !skip.has(tx.transactionId),
  );
}

export function allExecutionTransactionsAcknowledged(
  plan: BasketExecutionPlan,
  acknowledgedTransactionIds: Iterable<string>,
): boolean {
  const acknowledged = new Set(acknowledgedTransactionIds);
  const execution = plan.transactions.filter((tx) => EXECUTION_TX_KINDS.has(tx.kind));
  return execution.length > 0 && execution.every((tx) => acknowledged.has(tx.transactionId));
}

export interface BasketExecutionDependencies {
  ensureWallet: (chainId: number) => Promise<string>;
  sendTransaction: (tx: {
    to: string;
    data: string;
    value: string;
    chainId: number;
  }) => Promise<string>;
  approveToken?: (approval: {
    token: string;
    spender: string;
    amount: string;
    chainId: number;
  }) => Promise<string>;
  acknowledgeSubmitted: (input: {
    legId: string;
    transactionId: string;
    txHash: string;
    chainId: number;
    sender: string;
  }) => Promise<BasketSubmittedResponse>;
}

export interface ExecuteBasketPlanOptions {
  skipTransactionIds?: Iterable<string>;
}

async function sendWalletTx(
  dependencies: BasketExecutionDependencies,
  transaction: BasketTransactionRequest,
): Promise<{ sender: string; txHash: string }> {
  const sender = await dependencies.ensureWallet(transaction.chainId);
  const txHash = await dependencies.sendTransaction({
    to: transaction.to,
    data: transaction.data,
    value: transaction.value,
    chainId: transaction.chainId,
  });
  if (!isTxHash(txHash)) {
    throw new Error("WALLET_TX_HASH_MISSING: wallet did not return a transaction hash");
  }
  return { sender, txHash };
}

export async function executeBasketPlan(
  plan: BasketExecutionPlan,
  dependencies: BasketExecutionDependencies,
  options: ExecuteBasketPlanOptions = {},
): Promise<string[]> {
  if (plan.expiresAt > 0 && plan.expiresAt < Date.now()) {
    throw new Error("Basket plan has expired. Request a new plan.");
  }

  const hashes: string[] = [];
  const approvalCalldata = approvalTransactions(plan);
  if (approvalCalldata.length > 0) {
    for (const transaction of approvalCalldata) {
      const { txHash } = await sendWalletTx(dependencies, transaction);
      hashes.push(txHash);
    }
  } else if (plan.approvals.length > 0) {
    if (!dependencies.approveToken) {
      throw new Error("Basket approvals are required before execution.");
    }
    for (const approval of plan.approvals) {
      await dependencies.ensureWallet(approval.chainId);
      const hash = await dependencies.approveToken(approval);
      if (!isTxHash(hash)) {
        throw new Error("WALLET_TX_HASH_MISSING: wallet did not return a transaction hash");
      }
    }
  }

  for (const transaction of executableTransactions(plan, options.skipTransactionIds)) {
    const { sender, txHash } = await sendWalletTx(dependencies, transaction);
    hashes.push(txHash);
    const legId = transaction.coveredLegIds[0];
    if (!legId) {
      throw new Error("Basket transaction is missing covered leg ids.");
    }
    await dependencies.acknowledgeSubmitted({
      legId,
      transactionId: transaction.transactionId,
      txHash,
      chainId: transaction.chainId,
      sender,
    });
  }

  return hashes;
}
