import { describe, expect, it } from "vitest";

import { resolveSwapExecutionMode } from "./swapExecutionMode";

const legacyApi = {
  checkAllowance: () => {},
  callApprove: () => {},
  swapTokens: () => {},
};

describe("resolveSwapExecutionMode", () => {
  it("uses SDK execution by default when SDK is ready", () => {
    expect(
      resolveSwapExecutionMode({
        executionMode: undefined,
        hasLegacyApi: true,
        hasRouter: true,
        hasSigner: true,
      }),
    ).toMatchObject({
      mode: "sdk",
      canUseLegacy: true,
      canUseSdk: true,
    });
  });

  it("uses the legacy contract API when legacy mode is explicitly requested", () => {
    expect(
      resolveSwapExecutionMode({
        executionMode: "legacy",
        hasLegacyApi: true,
        hasRouter: true,
        hasSigner: true,
      }).mode,
    ).toBe("legacy");
  });

  it("keeps auto mode on the SDK path when the SDK write surface is ready", () => {
    expect(
      resolveSwapExecutionMode({
        executionMode: "auto",
        hasLegacyApi: true,
        hasRouter: true,
        hasSigner: true,
      }).mode,
    ).toBe("sdk");
  });

  it("falls back to the legacy contract API in auto mode when SDK execution is unavailable", () => {
    expect(
      resolveSwapExecutionMode({
        executionMode: "auto",
        hasLegacyApi: true,
        hasRouter: true,
        hasSigner: false,
      }).mode,
    ).toBe("legacy");
  });

  it("validates the legacy API shape before selecting it", () => {
    expect(
      resolveSwapExecutionMode({
        executionMode: "legacy",
        hasLegacyApi: false,
        hasRouter: true,
        hasSigner: true,
      }).mode,
    ).toBe("sdk");

    expect(
      resolveSwapExecutionMode({
        executionMode: "auto",
        hasLegacyApi: Boolean(legacyApi.checkAllowance && legacyApi.callApprove && legacyApi.swapTokens),
        hasRouter: false,
        hasSigner: false,
      }).mode,
    ).toBe("legacy");
  });
});
