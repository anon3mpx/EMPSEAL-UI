import { describe, expect, it } from "vitest";
import { mapCrossApiError } from "./errors";

describe("mapCrossApiError", () => {
  it.each([
    ["CHAINFLIP_BROKER_UNAVAILABLE", /private broker/i],
    ["NATIVE_DST_ADDRESS_REQUIRED", /destination address/i],
    ["UNSUPPORTED_SOURCE_WALLET", /source wallet/i],
    ["INVALID_NON_EVM_TRANSACTION", /non-EVM/i],
    ["PROVIDER_APPROVAL_FAILED", /approval/i],
    ["RAIL_DISABLED", /disabled/i],
    ["PROVIDER_QUOTE_EXPIRED", /expired/i],
    ["PROVIDER_CALLDATA_UNAVAILABLE", /calldata/i],
  ])("maps %s to actionable copy", (code, message) => {
    expect(mapCrossApiError({ body: { error: code } })).toMatch(message);
  });
});
