import { describe, expect, it } from "vitest";
import { chains } from "./chains";

describe("wallet chain catalog", () => {
  it("includes the expanded Hyperlane EVM family and Ethereum", () => {
    const ids = new Set(chains.map((chain) => chain.id));
    for (const chainId of [1, 130, 480, 57073, 59144, 98866]) {
      expect(ids.has(chainId)).toBe(true);
    }
  });
});
