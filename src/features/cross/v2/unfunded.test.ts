import { describe, expect, it } from "vitest";
import { unfundedOf } from "./useV2Quote";

describe("unfundedOf: a wallet short of the input still shows the rail's price", () => {
  it("reads the price from a SOLANA_INSUFFICIENT_BALANCE refusal", () => {
    expect(unfundedOf({ plans: [], diagnostics: { bindFailures: [{ rail: "jupiter", code: "SOLANA_INSUFFICIENT_BALANCE", expected: "721372900" }] } })).toEqual({ rail: "jupiter", expected: "721372900" });
  });
  it("ignores other refusals and malformed prices", () => {
    expect(unfundedOf({ plans: [], diagnostics: { bindFailures: [{ rail: "jupiter", code: "NO_ROUTE" }] } })).toBeNull();
    expect(unfundedOf({ plans: [], diagnostics: { bindFailures: [{ rail: "jupiter", code: "SOLANA_INSUFFICIENT_BALANCE", expected: "1.5" }] } })).toBeNull();
    expect(unfundedOf({ plans: [] })).toBeNull();
  });
});
