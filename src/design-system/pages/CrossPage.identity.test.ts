import { describe, expect, it } from "vitest";
import { resolveCrossNavbarChainId } from "../data/crossPageIdentity";

describe("CrossPage navbar identity", () => {
  it("uses the active wallet chain ID when the wallet supplies the displayed chain", () => {
    expect(resolveCrossNavbarChainId(8453, 42161)).toBe(42161);
    expect(resolveCrossNavbarChainId(8453)).toBe(8453);
  });
});
