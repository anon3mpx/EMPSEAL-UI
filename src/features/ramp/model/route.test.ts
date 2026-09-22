import { describe, expect, it } from "vitest";
import {
  buildRampTransferFields,
  canPreviewRampRoute,
  coerceFiatRail,
  isRampTokenAllowed,
  railsForDirection,
  RAMP_CHAIN_IDS,
  RAMP_TOKEN_TICKER,
} from "./route";

const WALLET = "0x1111111111111111111111111111111111111111";
const ACCOUNT = "acct_1";

describe("ramp route catalog", () => {
  it("restricts executable picks to USDC on Ethereum, Polygon, and Base", () => {
    expect([...RAMP_CHAIN_IDS]).toEqual([1, 137, 8453]);
    expect(RAMP_TOKEN_TICKER).toBe("USDC");
    expect(isRampTokenAllowed(1, "USDC")).toBe(true);
    expect(isRampTokenAllowed(8453, "eth")).toBe(false);
    expect(isRampTokenAllowed(42161, "USDC")).toBe(false);
  });

  it("uses direction-specific rails and never sends the opposite ACH variant", () => {
    expect(railsForDirection("BUY")).toEqual(["ACH_PUSH", "WIRE"]);
    expect(railsForDirection("SELL")).toEqual(["ACH", "WIRE"]);
    expect(coerceFiatRail("BUY", "ACH")).toBe("ACH_PUSH");
    expect(coerceFiatRail("SELL", "ACH_PUSH")).toBe("ACH");
    expect(buildRampTransferFields({
      wallet: WALLET, chainId: 8453, direction: "BUY", tokenAddress: WALLET, fiatRail: "ACH", amount: "100",
    }).fiatRail).toBe("ACH_PUSH");
    expect(buildRampTransferFields({
      wallet: WALLET, chainId: 8453, direction: "SELL", tokenAddress: WALLET, fiatRail: "ACH_PUSH", amount: "100",
      externalAccountId: ACCOUNT,
    }).fiatRail).toBe("ACH");
  });

  it("includes externalAccountId on OFF_RAMP and omits it on ON_RAMP", () => {
    const off = buildRampTransferFields({
      wallet: WALLET, chainId: 8453, direction: "SELL", tokenAddress: WALLET, fiatRail: "ACH", amount: "100",
      externalAccountId: ACCOUNT,
    });
    const on = buildRampTransferFields({
      wallet: WALLET, chainId: 8453, direction: "BUY", tokenAddress: WALLET, fiatRail: "WIRE", amount: "100",
      externalAccountId: ACCOUNT,
    });
    expect(off.direction).toBe("OFF_RAMP");
    expect(off.externalAccountId).toBe(ACCOUNT);
    expect(on.direction).toBe("ON_RAMP");
    expect(on.externalAccountId).toBeUndefined();
    expect(canPreviewRampRoute({ direction: "SELL" })).toBe(false);
    expect(canPreviewRampRoute({ direction: "SELL", externalAccountId: ACCOUNT })).toBe(true);
    expect(canPreviewRampRoute({ direction: "BUY" })).toBe(true);
  });
});
