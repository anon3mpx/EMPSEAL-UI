export interface ExecutionPlanStepSubmittedMessageInput {
  planId: string;
  stepId: string;
  wallet: string;
  txHash: string;
  expectedVersion: number;
  idempotencyKey: string;
  timestamp: number;
}

export function buildExecutionPlanStepSubmittedMessage(
  input: ExecutionPlanStepSubmittedMessageInput,
): string {
  return [
    "EMPX-Cross-Chain execution plan step submitted",
    `planId:${input.planId}`,
    `stepId:${input.stepId}`,
    `wallet:${input.wallet}`,
    `txHash:${input.txHash}`,
    `expectedVersion:${input.expectedVersion}`,
    `idempotencyKey:${input.idempotencyKey}`,
    `timestamp:${input.timestamp}`,
  ].join("\n");
}
