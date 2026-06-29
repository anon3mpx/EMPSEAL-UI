import { describe, expect, it } from "vitest";

import {
  V2_BRIDGE_ROUTE_STATUS,
  V2_MULTI_ROUTE_STATUS,
  buildUnavailableRouteRows,
  createV2NavLinks,
} from "./v2ProductRoutes";

describe("v2ProductRoutes", () => {
  it("marks Bridge and Multi as preview-only routes across V2 navigation", () => {
    const links = createV2NavLinks("swap");

    expect(links.find((link) => link.href === "/bridge-v2")).toMatchObject({
      label: "Bridge",
      badge: "Preview",
    });
    expect(links.find((link) => link.href === "/multi-v2")).toMatchObject({
      label: "Multi",
      badge: "Preview",
    });
  });

  it("keeps Bridge and Multi disabled until real backend support exists", () => {
    expect(V2_BRIDGE_ROUTE_STATUS.executionEnabled).toBe(false);
    expect(V2_BRIDGE_ROUTE_STATUS.primaryActionLabel).toBe("Bridge preview only");
    expect(V2_MULTI_ROUTE_STATUS.executionEnabled).toBe(false);
    expect(V2_MULTI_ROUTE_STATUS.primaryActionLabel).toBe("Basket preview only");
  });

  it("does not expose fabricated fee or ETA rows for preview-only pages", () => {
    expect(buildUnavailableRouteRows("bridge")).toEqual([
      { label: "Status", value: "Preview only", accent: true },
      { label: "Quote", value: "Unavailable", sub: "Rail SDK required", muted: true },
      { label: "Execution", value: "Disabled", sub: "No production bridge call wired", muted: true },
    ]);
    expect(buildUnavailableRouteRows("multi")).toEqual([
      { label: "Status", value: "Preview only", accent: true },
      { label: "Quote", value: "Unavailable", sub: "Basket API required", muted: true },
      { label: "Execution", value: "Disabled", sub: "No production basket call wired", muted: true },
    ]);
  });
});
