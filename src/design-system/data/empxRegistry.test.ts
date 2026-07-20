import { describe, expect, it } from "vitest";
import { eligibleRailsFor } from "./empxRegistry";

describe("executable rail eligibility", () => {
  it("does not let inactive, restricted, or quote-only rails expand token eligibility", () => {
    const names = eligibleRailsFor(8453, 42161, "USDC").map((rail) => rail.name);

    expect(names).toContain("CCTP");
    expect(names).toContain("Hyperlane Nexus");
    expect(names).not.toContain("Axelar");
    expect(names).not.toContain("Wormhole");
    expect(names).not.toContain("Via Labs");
    expect(names).not.toContain("TeleSwap");
    expect(names).not.toContain("Chainflip");
    expect(names).not.toContain("Maya");
  });

  it("includes only the enabled Optimism native deposit direction", () => {
    expect(
      eligibleRailsFor(1, 10, "ETH").map((rail) => rail.name),
    ).toContain("Optimism Native Bridge");
    expect(
      eligibleRailsFor(10, 1, "ETH").map((rail) => rail.name),
    ).not.toContain("Optimism Native Bridge");
  });
});
