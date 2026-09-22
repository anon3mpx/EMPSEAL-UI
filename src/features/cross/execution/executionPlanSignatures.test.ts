import { describe, expect, it } from "vitest";
import { buildExecutionPlanStepSubmittedMessage } from "./executionPlanSignatures";

describe("buildExecutionPlanStepSubmittedMessage", () => {
  it("matches the Status API wallet-signature protocol", () => {
    expect(buildExecutionPlanStepSubmittedMessage({
      planId: "plan-1",
      stepId: "step-1",
      wallet: "0x1111111111111111111111111111111111111111",
      txHash: `0x${"a".repeat(64)}`,
      expectedVersion: 3,
      idempotencyKey: "ui-step-1",
      timestamp: 123456,
    })).toBe([
      "EMPX-Cross-Chain execution plan step submitted",
      "planId:plan-1",
      "stepId:step-1",
      "wallet:0x1111111111111111111111111111111111111111",
      `txHash:0x${"a".repeat(64)}`,
      "expectedVersion:3",
      "idempotencyKey:ui-step-1",
      "timestamp:123456",
    ].join("\n"));
  });
});
