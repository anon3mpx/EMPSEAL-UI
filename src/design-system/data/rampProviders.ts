// ─── Fiat ramp providers — UI-side registry ───────────────────────────────
//
// ⚠ ALL ECONOMICS IN THIS FILE ARE DEMO PLACEHOLDERS.
//
// Unlike `empxRegistry.ts`, whose constants each carry a SOURCE: pointer to a
// real SDK file, NOTHING here is sourced yet — there is no ramp backend. The
// EmpX-side design is docs/SPEC-003-fiat-ramp-wrapper.md and the scaffolding
// is empx-cross-bridge/src/vps/services/ramp/, whose methods are unimplemented
// pending SPEC-003 §7 Q1.
//
// Provider fee rates, rate spreads, ETAs, payment methods and coverage below
// have NOT been verified against any provider's published terms or API. They
// exist so the page has a realistic shape. Every figure is labelled "demo" in
// the UI. Do NOT quote these anywhere real, and do NOT let them harden into
// assumed fact — replace each one with a live provider quote at wiring time.
//
// PRODUCT MODEL (owner direction, 2026-08-04)
// ───────────────────────────────────────────
// v1 is MULTI-VENDOR: EmpX surfaces several licensed ramp providers side by
// side and the user picks, exactly like the rail offer list on /cross-v2.
// Providers own fiat rails + KYC + licensing; EmpX owns the last mile —
// delivering to any chain and any asset via the aggregator + cross-chain mesh,
// which is the thing single-provider ramps cannot do.
//
// A later phase may add an EmpX-operated wrapper over a settlement partner
// (Fasset track). That becomes one more entry in this list, not a rewrite —
// which is exactly why the provider list is data, not branching logic.

export type RampDirection = "BUY" | "SELL";

/** How real the integration is. Drives the honest badge in the offers list. */
export type RampProviderStatus =
  | "planned"        // named target, no integration work started
  | "in-progress"    // integration underway
  | "live";          // wired to a real provider API

export interface RampProviderEntry {
  id: string;
  name: string;
  /** Directions the provider can serve. */
  directions: RampDirection[];
  /**
   * What the provider actually settles in. This is the handoff point: EmpX
   * routes onward FROM these assets/chains, so the intersection with EmpX's
   * own reach determines how far a user can get in one flow.
   */
  settlementAssets: string[];
  settlementChainIds: number[];
  /** Shown as context on the offer row. */
  paymentMethods: string[];
  /** ⚠ demo — provider's all-in take, as a percentage of notional. */
  feePctDemo: number;
  /** ⚠ demo — fiat-leg completion estimate in seconds (excludes EmpX leg). */
  etaSecondsDemo: number;
  status: RampProviderStatus;
  /** One-line differentiator for the offer row. */
  note: string;
}

// Named because the owner is in conversation with them or they are obvious
// comparables. Presence here is NOT a claim of any commercial relationship.
export const RAMP_PROVIDERS: RampProviderEntry[] = [
  {
    id: "wert",
    name: "Wert",
    directions: ["BUY"],
    settlementAssets: ["USDC", "ETH"],
    settlementChainIds: [1, 8453, 137, 42161],
    paymentMethods: ["Card", "Apple Pay", "Google Pay"],
    feePctDemo: 1.9,
    etaSecondsDemo: 120,
    status: "planned",
    note: "Card-first checkout; strong conversion on small tickets",
  },
  {
    id: "ramp-network",
    name: "Ramp Network",
    directions: ["BUY", "SELL"],
    settlementAssets: ["USDC", "USDT", "ETH"],
    settlementChainIds: [1, 8453, 137, 42161, 10],
    paymentMethods: ["Card", "Bank transfer", "Open Banking"],
    feePctDemo: 1.5,
    etaSecondsDemo: 180,
    status: "planned",
    note: "Two-way; bank rails keep fees down on larger tickets",
  },
  {
    id: "transak",
    name: "Transak",
    directions: ["BUY", "SELL"],
    settlementAssets: ["USDC", "USDT", "ETH", "WBTC"],
    settlementChainIds: [1, 8453, 137, 42161, 10, 56, 43114],
    paymentMethods: ["Card", "Bank transfer", "SEPA"],
    feePctDemo: 2.1,
    etaSecondsDemo: 240,
    status: "planned",
    note: "Broadest country coverage of the comparables",
  },
  {
    id: "banxa",
    name: "Banxa",
    directions: ["BUY", "SELL"],
    settlementAssets: ["USDC", "USDT"],
    settlementChainIds: [1, 137, 56],
    paymentMethods: ["Bank transfer", "Card", "PayID"],
    feePctDemo: 1.7,
    etaSecondsDemo: 300,
    status: "planned",
    note: "Bank-transfer specialist; APAC coverage",
  },
  {
    // Added 2026-08-11 — found while comparing fiat-ramp options for the
    // Bisunees/Fasset thread (Projects/EmpX/Handoff-Ramp-RFQ in the vault).
    // Confirmed [PRIMARY]: Circle holds an ADGM FSRA Money Services Provider
    // license, and USDC/EURC are recognized under DIFC/DFSA's crypto-token
    // regime — the only provider in this list with a confirmed UAE license
    // (Ramp Network and Transak were directly checked and have none found;
    // Wert/Banxa were not checked). Institutional/KYB-gated, not a consumer
    // card checkout — EmpX itself would need to be the KYB'd counterparty
    // (Circle Mint), or integrate via CPN Managed Payments (launched April
    // 2026) for a more hands-off managed settlement path. Real fee schedule
    // and minimum-volume threshold are gated behind a Circle sales contact —
    // feePctDemo below is a placeholder like every other row, not a quote.
    id: "circle",
    name: "Circle (Mint / CPN)",
    directions: ["BUY", "SELL"],
    settlementAssets: ["USDC", "EURC"],
    settlementChainIds: [1, 8453, 137, 42161, 10],
    paymentMethods: ["Bank wire", "SEPA", "Fedwire"],
    feePctDemo: 0.1,
    etaSecondsDemo: 3600,
    status: "planned",
    note: "UAE-licensed (ADGM FSRA); institutional KYB mint/redeem, not card checkout",
  },
];

/** Providers that can serve a direction. */
export function providersFor(direction: RampDirection): RampProviderEntry[] {
  return RAMP_PROVIDERS.filter((p) => p.directions.includes(direction));
}

/**
 * ⚠ DEMO MATH ONLY — a placeholder stand-in for a real provider quote.
 *
 * A live integration replaces this entirely with the provider's own quote
 * endpoint. It exists so offer rows differ from each other in a plausible way;
 * it is not a model of anybody's real pricing.
 */
export function demoQuoteFor(
  provider: RampProviderEntry,
  fiatAmount: number,
  assetUsdPrice: number,
): { settlementAmount: number; feeUsd: number } {
  const feeUsd = (fiatAmount * provider.feePctDemo) / 100;
  const net = Math.max(0, fiatAmount - feeUsd);
  return { settlementAmount: assetUsdPrice > 0 ? net / assetUsdPrice : 0, feeUsd };
}
