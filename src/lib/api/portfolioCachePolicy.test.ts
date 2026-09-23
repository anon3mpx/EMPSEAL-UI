import { describe, expect, it } from "vitest";
import { shouldUseCachedPortfolio } from "./portfolioCachePolicy";

describe("portfolio cache policy", () => {
  const fetchedAt = 1_000_000;
  const expiry = fetchedAt + 15 * 60_000;

  it("reuses a fresh ordinary result", () => {
    expect(shouldUseCachedPortfolio({ fetchedAt, expiry }, fetchedAt + 5 * 60_000, false)).toBe(true);
  });

  it("refetches an expired ordinary result", () => {
    expect(shouldUseCachedPortfolio({ fetchedAt, expiry }, expiry + 1, false)).toBe(false);
  });

  it("respects the short refresh cooldown but permits a later forced refresh", () => {
    expect(shouldUseCachedPortfolio({ fetchedAt, expiry }, fetchedAt + 30_000, true)).toBe(true);
    expect(shouldUseCachedPortfolio({ fetchedAt, expiry }, fetchedAt + 61_000, true)).toBe(false);
  });
});
