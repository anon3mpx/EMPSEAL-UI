import { describe, expect, it } from "vitest";
import { createRouter } from "empx-swap-sdk";

describe("empx-swap-sdk split surface", () => {
  it("exposes split preparation and allowance methods", () => {
    const router = createRouter(42161);

    expect(typeof router.splitSwap).toBe("function");
    expect(typeof router.checkSplitAllowance).toBe("function");
    expect(typeof router.getSplitApprovalCalldataForAmount).toBe("function");
  });
});
