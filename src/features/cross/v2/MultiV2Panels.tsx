// Styled pieces around the V2 Multi composer: basket review, leg rows (shared with progress), constraint chips, scan-chain chips,
// open baskets and inline notes. Visual language follows the V1 Multi page (widgetKit tokens, frameless rows, one hairline).
import { useEffect, useState, type ReactNode } from "react";
import { ChainLogo, TokenLogo } from "../../../design-system/components";
import { MicroLabel, WidgetCTA, wk, type CtaState } from "../../../design-system/widgetKit";
import { assetInfo, v2ChainById } from "./assets";
import type { BasketView, LegView } from "./basketTypes";
import { formatUnitsShort } from "./widgetView";

export const columnStyle = { width: "100%", maxWidth: 480, padding: "0 22px", boxSizing: "border-box" as const };

/** "1.25 USDC" when the asset is known to the pickers, else the raw base units (never a guessed decimal). */
export function formatAsset(asset: string | undefined, amount: string): string {
  const info = asset ? assetInfo(asset) : undefined;
  if (!info) return `${amount} base units`;
  const whole = BigInt(amount) >= 10n ** BigInt(info.decimals);
  return `${formatUnitsShort({ amount, decimals: info.decimals }, whole ? 4 : 6)} ${info.ticker}`;
}

export function AssetLogo({ asset, size = 22 }: { asset?: string; size?: number }) {
  const info = asset ? assetInfo(asset) : undefined;
  if (!info) return <span style={{ width: size, height: size, borderRadius: 4, background: "rgba(255,255,255,.05)", flexShrink: 0 }} />;
  return <TokenLogo ticker={info.ticker} chainId={info.chainId} address={info.address} isNative={info.isNative} size={size} />;
}

export function chainNameOf(asset?: string): string | undefined {
  const info = asset ? assetInfo(asset) : undefined;
  return info ? v2ChainById(info.chainId)?.name : undefined;
}

export function chainLogoNode(chainId: number, size = 17) {
  const c = v2ChainById(chainId);
  return <ChainLogo chainId={chainId} symbol={(c?.name ?? String(chainId)).slice(0, 3).toUpperCase()} bg={c?.color ?? "#888"} size={size} />;
}

export function Note({ tone = "info", children, role }: { tone?: "info" | "error" | "warn"; children: ReactNode; role?: string }) {
  const color = tone === "error" ? "#F87171" : tone === "warn" ? "#FBBF24" : wk.t3;
  return <p role={role} style={{ margin: "6px 0 0", fontSize: 10.5, color, lineHeight: 1.6 }}>{children}</p>;
}

export function ConstraintChip({ active, onClick, children, disabled }: { active: boolean; onClick: () => void; children: ReactNode; disabled?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      disabled={disabled}
      style={{
        padding: "5px 11px", borderRadius: 4, cursor: disabled ? "not-allowed" : "pointer", opacity: disabled ? 0.5 : 1,
        background: active ? "rgba(255,138,0,.12)" : "rgba(255,255,255,.035)",
        border: `1px solid ${active ? "rgba(255,138,0,.45)" : "transparent"}`,
        color: active ? wk.orange : wk.t2, fontFamily: "Inter, sans-serif", fontSize: 10.5, fontWeight: 600,
        fontVariantNumeric: "tabular-nums", display: "inline-flex", alignItems: "center", gap: 6,
      }}
    >
      {children}
    </button>
  );
}

export function SmallButton({ children, onClick, disabled, tone = "quiet" }: { children: ReactNode; onClick: () => void; disabled?: boolean; tone?: "quiet" | "accent" }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      style={{
        padding: "6px 10px", borderRadius: 3, background: tone === "accent" ? "rgba(255,138,0,.12)" : "transparent",
        border: `1px solid ${tone === "accent" ? "rgba(255,138,0,.45)" : wk.borderStrong}`, color: tone === "accent" ? wk.orange : wk.t2,
        fontFamily: "Inter, sans-serif", fontSize: 9.5, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase",
        cursor: disabled ? "not-allowed" : "pointer", opacity: disabled ? 0.4 : 1, flexShrink: 0,
      }}
    >
      {children}
    </button>
  );
}

const STATE_TONE: Record<string, string> = {
  planned: wk.t2, committed: wk.orange, skipped: "#FBBF24", cancelled: wk.t4,
  completed: wk.ok, delivered: wk.ok, failed: "#F87171", refunded: "#FBBF24",
};

function StateBadge({ label }: { label: string }) {
  const color = STATE_TONE[label.toLowerCase()] ?? wk.t2;
  return (
    <span style={{ fontSize: 8.5, fontWeight: 700, letterSpacing: "0.16em", textTransform: "uppercase", color, border: `1px solid ${color}55`, borderRadius: 3, padding: "3px 6px" }}>
      {label.replace(/_/g, " ")}
    </span>
  );
}

/** One basket leg: what goes in, what comes out, its terms and any action. */
export function LegRow({
  index, state, fromAsset, fromAmount, toAsset, toAmount, details, reason, actions,
}: {
  index: number;
  state: string;
  fromAsset?: string;
  fromAmount?: string;
  toAsset?: string;
  toAmount?: string;
  details?: string[];
  reason?: string | null;
  actions?: ReactNode;
}) {
  const side = (asset: string | undefined, amount: string | undefined, align: "left" | "right") => (
    <span style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0, flexDirection: align === "right" ? "row-reverse" : "row", textAlign: align }}>
      <AssetLogo asset={asset} />
      <span style={{ display: "flex", flexDirection: "column", gap: 2, minWidth: 0 }}>
        <span style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 13, color: wk.t1, fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
          {amount ? formatAsset(asset, amount) : "—"}
        </span>
        <span style={{ fontSize: 9.5, color: wk.t3 }}>{chainNameOf(asset) ?? ""}</span>
      </span>
    </span>
  );
  return (
    <div style={{ padding: "13px 0", borderTop: index === 0 ? "none" : `1px solid ${wk.border}` }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
        <span style={{ fontSize: 8.5, fontWeight: 600, letterSpacing: "0.24em", textTransform: "uppercase", color: wk.t4 }}>Leg · {index + 1}</span>
        <StateBadge label={state} />
      </div>
      {(fromAmount || toAmount) && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr auto 1fr", alignItems: "center", gap: 8 }}>
          {side(fromAsset, fromAmount, "left")}
          <span style={{ color: wk.t4, fontSize: 12 }}>→</span>
          {side(toAsset, toAmount, "right")}
        </div>
      )}
      {details && details.length > 0 && (
        <div style={{ marginTop: 8, fontSize: 10, color: wk.t3, lineHeight: 1.6, fontVariantNumeric: "tabular-nums" }}>{details.join(" · ")}</div>
      )}
      {reason && <Note tone="warn">{reason}</Note>}
      {actions && <div style={{ display: "flex", gap: 6, marginTop: 10, flexWrap: "wrap" }}>{actions}</div>}
    </div>
  );
}

function useCountdown(expiresAt: number) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  const left = Math.max(0, Math.floor(expiresAt - now / 1000));
  return { left, label: `${Math.floor(left / 60)}:${String(left % 60).padStart(2, "0")}` };
}

export function BasketV2Review({
  view, toAssetOf, busy, canBegin, onBegin, onCancel, onRequote,
}: {
  view: BasketView;
  /** Destination asset of a leg, from the request that planned it (LegView does not carry it). */
  toAssetOf: (legId: string) => string | undefined;
  busy: boolean;
  canBegin: boolean;
  onBegin: () => void;
  onCancel: () => void;
  onRequote: (legId: string) => void;
}) {
  const { left, label } = useCountdown(view.expiresAt);
  const legs = [...view.legs].sort((a, b) => Number(b.state === "skipped") - Number(a.state === "skipped"));
  const live = view.legs.filter((l) => l.state !== "skipped" && l.state !== "cancelled").length;
  const cta: CtaState = busy ? "working" : left === 0 ? "blocked" : canBegin ? "ready" : "idle";
  return (
    <section aria-label="Basket review" style={{ ...columnStyle, marginTop: 8 }}>
      <div style={{ height: 1, background: wk.border, margin: "8px 0 18px" }} />
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <MicroLabel>Review basket</MicroLabel>
        <span style={{ fontSize: 10, color: left < 30 ? "#F87171" : wk.t3, fontVariantNumeric: "tabular-nums" }}>
          v{view.version} · {left === 0 ? "Expired" : `Expires in ${label}`}
        </span>
      </div>
      <Note>Legs settle independently. Some may finish while others fail.</Note>
      <div style={{ marginTop: 10 }}>
        {legs.map((l, i) => (
          <div key={l.legId} data-testid="basket-review-leg">
            <LegRow
              index={i}
              state={l.state}
              fromAsset={l.input?.asset}
              fromAmount={l.input?.amount}
              toAsset={toAssetOf(l.legId)}
              toAmount={l.state === "skipped" ? undefined : l.quotedOut ?? undefined}
              details={l.state === "skipped" ? undefined : [
                `Min ${l.minimumOut ? formatAsset(toAssetOf(l.legId), l.minimumOut) : "not guaranteed"}`,
                `Max fee ${l.maxFeeBps != null ? `${(l.maxFeeBps / 100).toFixed(2)}%` : "unknown"}`,
              ]}
              reason={l.reason}
              actions={l.nextAction === "requote" ? <SmallButton disabled={busy} onClick={() => onRequote(l.legId)}>Re-quote</SmallButton> : undefined}
            />
          </div>
        ))}
      </div>
      <div style={{ marginTop: 14 }}>
        <WidgetCTA
          state={cta}
          label={cta === "blocked" ? "Quote expired · re-quote" : cta === "working" ? "Working" : `Begin basket · ${live} leg${live === 1 ? "" : "s"}`}
          onClick={onBegin}
        />
      </div>
      <div style={{ display: "flex", justifyContent: "center", marginTop: 10 }}>
        <SmallButton disabled={busy} onClick={onCancel}>Cancel</SmallButton>
      </div>
    </section>
  );
}

export function legDetails(l: LegView): string[] {
  const out: string[] = [];
  if (l.intentStatus) out.push(l.intentStatus.replace(/_/g, " "));
  if (l.intentId) out.push(l.intentId.length > 14 ? `${l.intentId.slice(0, 8)}…${l.intentId.slice(-4)}` : l.intentId);
  return out;
}
