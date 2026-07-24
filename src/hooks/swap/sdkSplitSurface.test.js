import { describe, expect, it } from "vitest";
import { createRouter, getChainConfig } from "empx-swap-sdk";

describe("empx-swap-sdk split surface", () => {
  it("exposes the 2.4 split lifecycle and optimized chain registry", () => {
    const router = createRouter(42161);
    const config = getChainConfig(42161);

    expect(typeof router.splitSwap).toBe("function");
    expect(typeof router.quoteSplitSwap).toBe("function");
    expect(typeof router.validateSplitSwap).toBe("function");
    expect(typeof router.checkSplitAllowance).toBe("function");
    expect(typeof router.getSplitApprovalCalldataForAmount).toBe("function");
    expect(config.SPLIT_BRIDGE_TOKENS).toEqual(expect.arrayContaining([
      config.WRAPPED_NATIVE,
      config.USD_STABLE,
    ]));
  });
});
