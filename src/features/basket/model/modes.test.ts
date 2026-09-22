import { describe, expect, it } from "vitest";
import { basketLimits, paddedBasketLegId, skippedLegIds } from "./modes";

describe("basket skipped leg ids", () => {
  it("prefers explicit ids and falls back to the backend padded legIndex", () => {
    expect(skippedLegIds([
      { legIndex: 0 },
      { legIndex: 1, legId: "leg_custom" },
    ])).toEqual(["leg_000", "leg_custom"]);
    expect(paddedBasketLegId(12)).toBe("leg_012");
  });

  it("falls back to the published default caps", () => {
    expect(basketLimits(undefined)).toEqual({
      maxInputs: 5,
      maxOutputs: 10,
      maxLegs: 25,
    });
    expect(basketLimits({ maxInputs: 2 })).toMatchObject({ maxInputs: 2, maxOutputs: 10 });
  });
});
