import { describe, expect, it } from "vitest";
import { formatNativeAmount } from "./nativeBalanceDisplay";

describe("formatNativeAmount", () => {
  it("keeps a small nonzero gas balance visible", () => {
    expect(formatNativeAmount(0.000004)).toBe("0.000004");
  });

  it("keeps familiar four-decimal formatting for larger balances", () => {
    expect(formatNativeAmount(211358.7937)).toBe("211358.7937");
  });
});
