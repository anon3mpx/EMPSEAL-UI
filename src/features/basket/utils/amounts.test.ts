import { describe, expect, it } from "vitest";
import {
  canonicalNativeTokenAddress,
  fromBaseUnitAmount,
  isNativeTokenAddress,
  toBaseUnitAmount,
} from "./amounts";

describe("basket amounts", () => {
  it("converts decimal strings to integer base units without floating-point math", () => {
    expect(toBaseUnitAmount("0.5", 18)).toBe("500000000000000000");
    expect(toBaseUnitAmount("1.25", 6)).toBe("1250000");
  });

  it("converts integer base units back to decimal strings", () => {
    expect(fromBaseUnitAmount("500000000000000000", 18)).toBe("0.5");
    expect(fromBaseUnitAmount("1250000", 6)).toBe("1.25");
  });

  it("treats zero and 0xeee native sentinels as the same quote address", () => {
    expect(isNativeTokenAddress("0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE")).toBe(true);
    expect(canonicalNativeTokenAddress("0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee"))
      .toBe("0x0000000000000000000000000000000000000000");
  });

  it("rejects non-decimal and zero amounts for API payloads", () => {
    expect(() => toBaseUnitAmount("0", 18)).toThrow(/positive/i);
    expect(() => toBaseUnitAmount("1e18", 18)).toThrow(/decimal string/i);
    expect(() => toBaseUnitAmount("abc", 18)).toThrow(/decimal string/i);
  });
});
