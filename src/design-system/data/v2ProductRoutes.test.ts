import { describe, expect, it } from "vitest";

import { NAV_DESTINATIONS, NAV_GROUPS } from "./navGroups";
import {
  V2_BRIDGE_ROUTE_STATUS,
  V2_MULTI_ROUTE_STATUS,
  buildUnavailableRouteRows,
  createV2NavLinks,
} from "./v2ProductRoutes";

describe("v2ProductRoutes", () => {
  it("marks Bridge as preview-only and Multi as a live basket route", () => {
    const links = createV2NavLinks("swap");

    expect(links.find((link) => link.href === "/bridge-v2")).toMatchObject({
      label: "Bridge",
      badge: "Preview",
    });
    expect(links.find((link) => link.href === "/multi-v2")).toMatchObject({
      label: "Multi",
    });
    expect(links.find((link) => link.href === "/multi-v2")?.badge).toBeUndefined();
  });

  it("keeps Bridge disabled and Multi execution enabled", () => {
    expect(V2_BRIDGE_ROUTE_STATUS.executionEnabled).toBe(false);
    expect(V2_BRIDGE_ROUTE_STATUS.primaryActionLabel).toBe("Bridge preview only");
    expect(V2_MULTI_ROUTE_STATUS.executionEnabled).toBe(true);
    expect(V2_MULTI_ROUTE_STATUS.primaryActionLabel).toBe("Quote basket");
  });

  it("does not expose fabricated fee or ETA rows for preview-only pages", () => {
    expect(buildUnavailableRouteRows("bridge")).toEqual([
      { label: "Status", value: "Preview only", accent: true },
      { label: "Quote", value: "Unavailable", sub: "Rail SDK required", muted: true },
      { label: "Execution", value: "Disabled", sub: "No production bridge call wired", muted: true },
    ]);
    expect(buildUnavailableRouteRows("multi")).toEqual([
      { label: "Status", value: "Live", accent: true },
      { label: "Quote", value: "/api/v1/basket/quote" },
      { label: "Execution", value: "Wallet-signed plan", sub: "POST /plan then /submitted" },
    ]);
  });
});

describe("navGroups", () => {
  it("exposes Trade, Fund, Portfolio, and Widget groups", () => {
    expect(NAV_GROUPS.map((g) => g.label)).toEqual(["Trade", "Fund", "Portfolio", "Widget"]);
  });

  it("includes Ramp, keeps Bridge as Preview, and leaves Multi unwired-badge-free", () => {
    const byHref = Object.fromEntries(NAV_DESTINATIONS.map((d) => [d.href, d]));
    expect(byHref["/ramp-v2"]).toMatchObject({ label: "Ramp", badge: "Demo" });
    expect(byHref["/bridge-v2"]).toMatchObject({ label: "Bridge", badge: "Preview" });
    expect(byHref["/multi-v2"]).toMatchObject({ label: "Multi" });
    expect(byHref["/multi-v2"].badge).toBeUndefined();
  });

  it("does not put fabricated rail counts in nav copy", () => {
    const copy = JSON.stringify(NAV_GROUPS);
    expect(copy).not.toMatch(/\d+\s+rails?/i);
  });
});
