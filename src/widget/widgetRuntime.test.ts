import { describe, expect, it } from "vitest";

import {
  getWidgetExecutionMode,
  isValidWidgetIntegratorId,
} from "./widgetRuntime";

const validIntegratorId = "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";

describe("widgetRuntime", () => {
  it("uses SDK execution by default", () => {
    expect(getWidgetExecutionMode({ configuredMode: "auto", integratorId: null })).toBe("sdk");
    expect(getWidgetExecutionMode({ configuredMode: "sdk", integratorId: validIntegratorId })).toBe("sdk");
  });

  it("uses widget contract calls for valid integrator attribution in auto mode", () => {
    expect(getWidgetExecutionMode({ configuredMode: "auto", integratorId: validIntegratorId })).toBe("contract");
  });

  it("allows iframe integrations to force widget contract calls", () => {
    expect(getWidgetExecutionMode({ configuredMode: "contract", integratorId: "partner-abc" })).toBe("contract");
  });

  it("validates bytes32 integrator IDs", () => {
    expect(isValidWidgetIntegratorId(validIntegratorId)).toBe(true);
    expect(isValidWidgetIntegratorId("partner-abc")).toBe(false);
    expect(isValidWidgetIntegratorId(null)).toBe(false);
  });
});
