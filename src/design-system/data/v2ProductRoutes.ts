import type { FeeRow, NavLink } from "../components";

export type V2RouteKey =
  | "swap"
  | "cross"
  | "bridge"
  | "multi"
  | "gas"
  | "widget"
  | "portfolio";

interface RouteAvailability {
  executionEnabled: false;
  primaryActionLabel: string;
  unavailableReason: string;
}

export const V2_BRIDGE_ROUTE_STATUS: RouteAvailability = {
  executionEnabled: false,
  primaryActionLabel: "Bridge preview only",
  unavailableReason: "Rail SDK required",
};

export const V2_MULTI_ROUTE_STATUS: RouteAvailability = {
  executionEnabled: false,
  primaryActionLabel: "Basket preview only",
  unavailableReason: "Basket API required",
};

const V2_NAV_LINKS: Array<NavLink & { route: V2RouteKey }> = [
  { route: "swap", label: "Swap", href: "/swap-v2" },
  { route: "cross", label: "Cross", href: "/cross-v2" },
  { route: "bridge", label: "Bridge", href: "/bridge-v2", badge: "Preview" },
  { route: "multi", label: "Multi", href: "/multi-v2", badge: "Preview" },
  { route: "gas", label: "Gas", href: "/gas-v2" },
  { route: "widget", label: "Widget", href: "/widget-v2" },
  { route: "portfolio", label: "Portfolio", href: "/portfolio-v2" },
];

export function createV2NavLinks(activeRoute: V2RouteKey): NavLink[] {
  return V2_NAV_LINKS.map(({ route, ...link }) => ({
    ...link,
    active: route === activeRoute,
  }));
}

export function buildUnavailableRouteRows(kind: "bridge" | "multi"): FeeRow[] {
  const isBridge = kind === "bridge";
  return [
    { label: "Status", value: "Preview only", accent: true },
    {
      label: "Quote",
      value: "Unavailable",
      sub: isBridge ? V2_BRIDGE_ROUTE_STATUS.unavailableReason : V2_MULTI_ROUTE_STATUS.unavailableReason,
      muted: true,
    },
    {
      label: "Execution",
      value: "Disabled",
      sub: isBridge ? "No production bridge call wired" : "No production basket call wired",
      muted: true,
    },
  ];
}
