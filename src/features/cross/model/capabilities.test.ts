import { describe, expect, it } from "vitest";
import { getChainCapability } from "./capabilities";

describe("getChainCapability", () => {
  it("marks Base as full-swap supported", () => {
    expect(getChainCapability(8453).fullSwapSupported).toBe(true);
  });

  it("leaves BSC quoteable but not full-swap enabled", () => {
    expect(getChainCapability(56)).toEqual({
      fullSwapSupported: false,
      sourceExecution: "evm",
    });
  });
});
