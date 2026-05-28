export function buildSubmittedMessage(input: {
  intentId: string;
  wallet: string;
  timestamp: number;
  srcTxHash: string;
}) {
  return [
    "EMPX-Cross-Chain intent submitted",
    `intentId:${input.intentId}`,
    `wallet:${input.wallet}`,
    `timestamp:${input.timestamp}`,
    `srcTxHash:${input.srcTxHash}`,
  ].join("\n");
}

export function buildRefundMessage(input: {
  intentId: string;
  wallet: string;
  timestamp: number;
  reason: string;
}) {
  return [
    "EMPX-Cross-Chain intent refund",
    `intentId:${input.intentId}`,
    `wallet:${input.wallet}`,
    `timestamp:${input.timestamp}`,
    `reason:${input.reason}`,
  ].join("\n");
}

export function buildCancelMessage(input: {
  intentId: string;
  wallet: string;
  timestamp: number;
  reason: string;
  replacementTxHash?: string;
}) {
  return [
    "EMPX-Cross-Chain intent cancel",
    `intentId:${input.intentId}`,
    `wallet:${input.wallet}`,
    `timestamp:${input.timestamp}`,
    `reason:${input.reason}`,
    `replacementTxHash:${input.replacementTxHash ?? ""}`,
  ].join("\n");
}
