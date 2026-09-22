export interface NavItem {
  label: string;
  href: string;
  sub: string;
  badge?: string;
}

export interface NavGroup {
  label: string;
  items?: NavItem[];
  href?: string;
  sub?: string;
}

export const NAV_GROUPS: NavGroup[] = [
  {
    label: "Trade",
    items: [
      { label: "Swap", href: "/swap-v2", sub: "Same-chain, best execution" },
      { label: "Cross", href: "/cross-v2", sub: "Any chain to any chain" },
      { label: "Bridge", href: "/bridge-v2", sub: "Move one asset, one hop", badge: "Preview" },
      { label: "Multi", href: "/multi-v2", sub: "One basket, many recipients" },
    ],
  },
  {
    label: "Fund",
    items: [
      { label: "Ramp", href: "/ramp-v2", sub: "Card and bank to on-chain", badge: "Demo" },
      { label: "Gas", href: "/gas-v2", sub: "Top up native gas anywhere" },
    ],
  },
  { label: "Portfolio", href: "/portfolio-v2", sub: "Positions across every chain" },
  { label: "Widget", href: "/widget-v2", sub: "Embed EmpX in your app" },
];

export function groupContains(group: NavGroup, href: string): boolean {
  if (group.href) return group.href === href;
  return !!group.items?.some((i) => i.href === href);
}

export const NAV_DESTINATIONS: NavItem[] = NAV_GROUPS.flatMap((g) =>
  g.items ?? [{ label: g.label, href: g.href!, sub: g.sub ?? "" }],
);
