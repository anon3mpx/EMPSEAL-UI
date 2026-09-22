// ─── EmpxRampWidget — fiat on/off-ramp, multi-vendor ──────────────────────
//
// Ported from public/ramp-drafts.html (owner-approved 2026-08-23) into the
// locked widgetKit language. Purely presentational — RampPage.tsx keeps the
// real multi-vendor logic (providersFor / demoQuoteFor / the
// pickSettlementChainId rule from SPEC-003 §3) untouched.
//
// The two-leg shape is the whole product, so the widget draws it:
//   fiat --[provider]--> settlement asset --[EmpX]--> what you actually wanted
// The provider owns fiat rails, KYC and licensing; EmpX owns everything
// on-chain after settlement. Naming both venues on the route is the honest
// version of that split — EmpX is additive past the provider's own chain and
// asset list, not a replacement for it.
//
// Shape, and why:
//   - Direction is WidgetTabs (underline), never a filled segmented control.
//   - BOTH sides use the locked two-line TokenIdentityRow; the fiat flag sits
//     inside a square 4px frame like every other logo container (rule 3).
//   - ONE "Total cost" stat in orange, not competing per-venue fee stats —
//     the split lives in the fee-breakdown disclosure.
//   - The orange OUTCOME numeral follows the direction: on SELL the fiat
//     figure is the outcome, on BUY the crypto figure is.

import { ReactNode } from "react";
import TouchTooltip from "../components/TouchTooltip";
import {
  ChainPill,
  Disclosure,
  LogoFrame,
  MicroLabel,
  RailCardStrip,
  TokenIdentityRow,
  WidgetCTA,
  WidgetShell,
  WidgetTabs,
  amountUsd,
  eyebrow,
  grid2,
  numeral,
  rule,
  unit,
  wk,
  type CtaState,
  type RailCardData,
} from "./widgetKit";
import { EmptyState } from "./components";

export type RampDirection = "BUY" | "SELL";

export interface RampWidgetChain {
  id: number;
  name: string;
  color?: string;
  logoUrl?: string;
}

export interface RampFeeLine {
  label: string;
  value: string;
  accent?: boolean;
}

export interface EmpxRampWidgetProps {
  direction: RampDirection;
  onDirectionChange: (d: RampDirection) => void;

  // ── Fiat side ────────────────────────────────────────────────────────────
  fiatCurrency: string;
  fiatCurrencyName?: string;
  /** Real payment rails for this currency, e.g. "ACH · Wire · FedNow". */
  fiatRailsLabel?: string;
  fiatFlag?: string;
  fiatAmount: string;
  onFiatAmountChange: (v: string) => void;
  onSelectCurrency: () => void;

  // ── Crypto side ──────────────────────────────────────────────────────────
  chain: RampWidgetChain;
  tokenTicker: string;
  tokenName?: string;
  tokenLogoUrl?: string;
  cryptoAmount: string;
  onCryptoAmountChange?: (v: string) => void;
  onSelectToken: () => void;
  onSelectChain: () => void;
  cryptoUsdValue?: number | null;
  /** SELL only. */
  balance?: string;
  onMax?: () => void;

  // ── Provider + route ─────────────────────────────────────────────────────
  providerName?: string;
  providerCount: number;
  /**
   * Every eligible provider, best first — rendered with the SAME RailCardStrip
   * cross uses for rails. A ramp provider is a venue like any other, so it gets
   * the locked venue device rather than a second one: output + ETA on the card,
   * fee only in the Total cost stat.
   */
  providers?: RailCardData[];
  onSelectProvider?: (name: string) => void;
  /** Where the provider actually settles, before EmpX's leg. */
  settlementTicker?: string;
  settlementChainName?: string;
  settlementLogoUrl?: string;

  totalCostUSD?: number;
  totalCostNote?: string;
  estimatedTime?: string;
  etaNote?: string;
  feeRows?: RampFeeLine[];

  /** Identity check still outstanding — gates the CTA before any amount does. */
  kycRequired?: boolean;
  onVerify?: () => void;
  /** No integrated provider serves this direction. */
  noProvider?: boolean;

  walletConnected?: boolean;
  onConnect?: () => void;
  onSubmit: () => void;
  submitLabel?: string;
  blockedReason?: string;
}

const DIRECTION_TABS: { value: RampDirection; label: string }[] = [
  // Sell leads: off-ramp carries no monthly account fee and is profitable at
  // small tickets, while on-ramp's virtual account loses money below roughly
  // $156/mo per user (BRIDGE-XYZ-CAPABILITY-BRIEF §9-10).
  { value: "SELL", label: "Sell crypto" },
  { value: "BUY", label: "Buy crypto" },
];

export default function EmpxRampWidget({
  direction, onDirectionChange,
  fiatCurrency, fiatCurrencyName, fiatRailsLabel, fiatFlag, fiatAmount, onFiatAmountChange, onSelectCurrency,
  chain, tokenTicker, tokenName, tokenLogoUrl, cryptoAmount, onCryptoAmountChange,
  onSelectToken, onSelectChain, cryptoUsdValue, balance, onMax,
  providerName, providerCount, providers, onSelectProvider,
  settlementTicker, settlementChainName, settlementLogoUrl,
  totalCostUSD, totalCostNote, estimatedTime, etaNote, feeRows,
  kycRequired, onVerify, noProvider,
  walletConnected = true, onConnect, onSubmit, submitLabel, blockedReason,
}: EmpxRampWidgetProps) {
  const isBuy = direction === "BUY";
  const amountEntered = Number((isBuy ? fiatAmount : cryptoAmount || "0").replace(/,/g, "")) > 0;

  const ctaState: CtaState = !walletConnected ? "connect"
    : noProvider || blockedReason ? "blocked"
    : !amountEntered ? "idle"
    : "ready";

  const ctaLabel = {
    connect: "Connect wallet",
    blocked: noProvider ? "No provider for this direction" : blockedReason ?? "Unavailable",
    idle: "Enter an amount",
    ready: submitLabel ?? (isBuy ? "Review purchase" : "Review sale"),
    working: "Working",
    done: "Done",
  }[ctaState];

  // Identity check outranks the amount: there is no point asking for a figure
  // the user cannot yet act on.
  const showVerify = walletConnected && kycRequired && !noProvider;

  const fiatSide = (
    <>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
        <MicroLabel>{isBuy ? "You pay" : "You receive"}</MicroLabel>
      </div>
      <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
        {isBuy ? (
          <input
            value={fiatAmount}
            onChange={(e) => onFiatAmountChange(e.target.value)}
            inputMode="decimal"
            autoComplete="off"
            placeholder="0.00"
            aria-label="Amount to pay"
            style={{ ...numeral(40), background: "transparent", border: "none", outline: "none", width: "100%", padding: 0 }}
          />
        ) : (
          <span style={numeral(40, true)}>{fiatAmount || "0.00"}</span>
        )}
        <span style={unit}>{fiatCurrency}</span>
      </div>
      <div style={amountUsd}>
        {isBuy ? " " : "after all fees"}
      </div>
      <TokenIdentityRow
        logo={undefined}
        name={fiatCurrencyName ?? fiatCurrency}
        sub={fiatRailsLabel}
        onClick={onSelectCurrency}
      />
    </>
  );

  const cryptoSide = (
    <>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
        <MicroLabel>{isBuy ? "You receive" : "You sell"}</MicroLabel>
        {!isBuy && balance && (
          <span style={{ fontSize: 10, color: wk.t3 }}>
            Balance {balance}
            {onMax && (
              <>
                {" · "}
                <button
                  type="button"
                  onClick={onMax}
                  style={{ background: "none", border: "none", color: wk.orange, fontWeight: 600, cursor: "pointer", padding: 0, fontSize: 10, fontFamily: "inherit" }}
                >
                  MAX
                </button>
              </>
            )}
          </span>
        )}
      </div>
      <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
        {isBuy ? (
          <span style={numeral(40, true)}>{cryptoAmount || "0"}</span>
        ) : (
          <input
            value={cryptoAmount}
            onChange={(e) => onCryptoAmountChange?.(e.target.value)}
            inputMode="decimal"
            autoComplete="off"
            placeholder="0"
            aria-label="Amount to sell"
            style={{ ...numeral(40), background: "transparent", border: "none", outline: "none", width: "100%", padding: 0 }}
          />
        )}
        <span style={unit}>{tokenTicker}</span>
      </div>
      <div style={amountUsd}>
        {cryptoUsdValue != null ? `≈ $${cryptoUsdValue.toLocaleString(undefined, { maximumFractionDigits: 2 })}` : " "}
      </div>
      <TokenIdentityRow
        logo={tokenLogoUrl}
        name={tokenName ?? tokenTicker}
        sub={balance && !isBuy ? `${balance} available · ${chain.name}` : `on ${chain.name}`}
        onClick={onSelectToken}
      />
    </>
  );

  return (
    <WidgetShell edge>
      {/* Header — eyebrow + which venue is quoting, stated once */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
        <span style={eyebrow}>Ramp</span>
        <span style={{ fontSize: 10, color: wk.t3 }}>
          {providerName ? `${providerName} · ` : ""}{providerCount} provider{providerCount === 1 ? "" : "s"}
        </span>
      </div>

      <WidgetTabs options={DIRECTION_TABS} active={direction} onChange={onDirectionChange} />

      <div style={{ marginTop: 20 }}>
        {isBuy ? fiatSide : cryptoSide}
      </div>

      <div style={{ display: "flex", justifyContent: "center", margin: "12px 0" }}>
        <TouchTooltip content="Switch direction">
          <button
            type="button"
            onClick={() => onDirectionChange(isBuy ? "SELL" : "BUY")}
            aria-label="Switch direction"
            style={{
              width: 44, height: 44, border: "none", background: "transparent", borderRadius: 4,
              display: "grid", placeItems: "center", cursor: "pointer", color: wk.t2, fontSize: 15, transition: ".2s",
            }}
            onMouseEnter={(e) => { e.currentTarget.style.color = wk.orange; e.currentTarget.style.background = "rgba(255,255,255,.035)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.color = wk.t2; e.currentTarget.style.background = "transparent"; }}
          >
            ↓
          </button>
        </TouchTooltip>
      </div>

      {isBuy ? cryptoSide : fiatSide}

      {/* ── Providers, below both amount rows — same placement rails get on
           cross, for the same reason: the venue choice follows the amounts. ── */}
      {noProvider ? (
        <div style={{ marginTop: 16 }}>
          <EmptyState
            surface="inline"
            compact
            headline="No provider for this direction"
            body="No integrated provider serves this direction yet. Try the other tab."
          />
        </div>
      ) : providers && providers.length > 0 ? (
        <RailCardStrip rails={providers} onSelect={(n) => onSelectProvider?.(n)} label="Provider" />
      ) : null}

      <div style={rule} />

      {/* ── Route — the locked node/line device, two legs, two venues ── */}
      {settlementTicker && (
        <>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
            <MicroLabel>Route</MicroLabel>
            <span style={{ fontSize: 9, color: wk.t3 }}>2 legs · 2 providers</span>
          </div>
          <div style={{ display: "flex", alignItems: "flex-start", marginBottom: 4 }}>
            {(isBuy
              ? [
                  { logo: undefined, flag: fiatFlag, t: fiatCurrency, s: "Your bank" },
                  { via: providerName ?? "Provider" },
                  { logo: settlementLogoUrl, t: settlementTicker, s: settlementChainName ?? "" },
                  { via: "EmpX" },
                  { logo: tokenLogoUrl, t: tokenTicker, s: chain.name },
                ]
              : [
                  { logo: tokenLogoUrl, t: tokenTicker, s: chain.name },
                  { via: "EmpX" },
                  { logo: settlementLogoUrl, t: settlementTicker, s: settlementChainName ?? "" },
                  { via: providerName ?? "Provider" },
                  { logo: undefined, flag: fiatFlag, t: fiatCurrency, s: "Your bank" },
                ]
            ).map((n, i) =>
              "via" in n ? (
                <span key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", padding: "0 4px", marginTop: 11 }}>
                  <span style={{ width: "100%", height: 1, background: "rgba(255,255,255,.13)" }} />
                  <span style={{ fontSize: 9.5, color: wk.orange, whiteSpace: "nowrap", marginTop: 7 }}>{n.via}</span>
                </span>
              ) : (
                <span key={i} style={{ display: "flex", flexDirection: "column", alignItems: "center", flexShrink: 0, width: 62 }}>
                  {n.flag ? (
                    <span style={{ width: 22, height: 22, borderRadius: 4, background: "rgba(255,255,255,.05)", display: "grid", placeItems: "center", fontSize: 12 }}>
                      {n.flag}
                    </span>
                  ) : (
                    <LogoFrame src={n.logo} size={22} />
                  )}
                  <span style={{ fontSize: 9, color: wk.t3, textAlign: "center", lineHeight: 1.35, marginTop: 7 }}>
                    <b style={{ display: "block", color: wk.t2, fontWeight: 500 }}>{n.t}</b>
                    {n.s}
                  </span>
                </span>
              ),
            )}
          </div>

          <div style={rule} />
        </>
      )}

      <div style={{ ...grid2, marginBottom: 20 }}>
        <div>
          <MicroLabel>Total cost</MicroLabel>
          <div style={{ fontSize: 12.5, fontWeight: 500, color: wk.orange, marginTop: 6, fontVariantNumeric: "tabular-nums" }}>
            {totalCostUSD != null ? `$${totalCostUSD.toFixed(2)}` : "—"}
          </div>
          {totalCostNote && <div style={{ fontSize: 9.5, color: wk.t3, marginTop: 4 }}>{totalCostNote}</div>}
        </div>
        <div>
          <MicroLabel>Arrives in</MicroLabel>
          <div style={{ fontSize: 12.5, fontWeight: 500, color: wk.t1, marginTop: 6, fontVariantNumeric: "tabular-nums" }}>
            {estimatedTime ?? "—"}
          </div>
          {etaNote && <div style={{ fontSize: 9.5, color: wk.t3, marginTop: 4 }}>{etaNote}</div>}
        </div>
      </div>

      {feeRows && feeRows.length > 0 && (
        <Disclosure label="Fee breakdown">
          {feeRows.map((r) => (
            <div key={r.label} style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", padding: "6px 0", fontSize: 10.5 }}>
              <span style={{ color: wk.t3 }}>{r.label}</span>
              <span style={{ color: r.accent ? wk.orange : wk.t2, fontVariantNumeric: "tabular-nums" }}>{r.value}</span>
            </div>
          ))}
        </Disclosure>
      )}

      {/* Identity notice — inset treatment (wash + accent bar), never a box */}
      {showVerify && (
        <div
          style={{
            position: "relative", overflow: "hidden", borderRadius: 4,
            background: "rgba(255,255,255,.03)", padding: "12px 13px 12px 15px",
            display: "flex", gap: 10, alignItems: "flex-start", marginTop: 14,
          }}
        >
          <span aria-hidden style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 2, background: "#93C5FD", opacity: 0.55 }} />
          <span style={{ fontSize: 11, color: "#93C5FD", flexShrink: 0, lineHeight: 1.55, fontWeight: 700 }}>i</span>
          <span style={{ fontSize: 10.5, color: wk.t2, lineHeight: 1.6 }}>
            <b style={{ color: "#93C5FD", fontWeight: 600 }}>One-time identity check</b> before your first order — it runs on
            {" "}{providerName ?? "the provider"}'s own hosted flow. EmpX never sees your ID or bank details.
          </span>
        </div>
      )}

      <div style={{ marginTop: 18 }}>
        {showVerify ? (
          <WidgetCTA state="ready" label={`Verify once with ${providerName ?? "provider"}`} onClick={onVerify} />
        ) : (
          <WidgetCTA
            state={ctaState}
            label={ctaLabel}
            onClick={ctaState === "connect" ? onConnect : ctaState === "ready" ? onSubmit : undefined}
          />
        )}
      </div>
    </WidgetShell>
  );
}
