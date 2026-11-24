import { describe, expect, it } from "vitest";
import { assetIdOf, defaultToken, outputTokenOf, v2Tokens } from "./assets";

describe("outputTokenOf", () => {
  const usdc = defaultToken(42161, "USDC")!;
  const other = v2Tokens(42161).find((t) => t.ticker !== "USDC" && !t.isNative)!;

  it("is the requested token until a route that delivers something else is chosen", () => {
    expect(outputTokenOf(42161, usdc, undefined)).toBe(usdc);
    expect(outputTokenOf(42161, usdc, assetIdOf(usdc))).toBe(usdc);
  });
  it("is the token the chosen route really delivers: its ticker and logo, not the requested one", () => {
    const t = outputTokenOf(42161, usdc, assetIdOf(other))!;
    expect([t.ticker, t.address]).toEqual([other.ticker, other.address]);
  });
  it("a delivered token the app does not know is named by its address, never by the requested ticker", () => {
    const t = outputTokenOf(42161, usdc, "eip155:42161/erc20:0x1234567890abcdef1234567890abcdef12345678")!;
    expect(t.ticker).toBe("0x1234…5678");
    expect(t.address).toBe("0x1234567890abcdef1234567890abcdef12345678");
  });
});
