import { describe, expect, it } from "vitest";
import { RAILS, eligibleRailsFor } from "./empxRegistry";

describe("executable rail eligibility", () => {
  it("does not let inactive, restricted, or quote-only rails expand token eligibility", () => {
    const names = eligibleRailsFor(8453, 42161, "USDC").map((rail) => rail.name);

    expect(names).toContain("CCTP");
    expect(names).toContain("Hyperlane Nexus");
    expect(names).not.toContain("Axelar");
    expect(names).toContain("deBridge DLN");
    expect(names).toContain("Garden");
    expect(eligibleRailsFor(1, 42161, "USDC").map((rail) => rail.name)).toContain("Wormhole");
    expect(names).not.toContain("Via Labs");
    expect(names).not.toContain("TeleSwap");
    expect(names).not.toContain("Chainflip");
    expect(names).not.toContain("Maya");
  });

  it("keeps deferred rails out of the user-facing guide", () => {
    const names = RAILS.map((rail) => rail.name);
    expect(names).not.toContain("Chainflip");
    expect(names).not.toContain("Maya");
    expect(names).not.toContain("TeleSwap");
  });

  it("reflects the expanded CCTP and Hyperlane chain catalogs", () => {
    expect(eligibleRailsFor(143, 1329, "USDC").map((rail) => rail.name)).toContain("CCTP");
    expect(eligibleRailsFor(57073, 480, "USDC").map((rail) => rail.name)).toContain("Hyperlane Nexus");
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
