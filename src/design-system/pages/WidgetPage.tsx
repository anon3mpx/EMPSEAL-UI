// ─── WidgetPage — v2 iframe configurator ──────────────────────────────────
//
// This is the CONFIGURATOR surface where partner devs pick chain / theme /
// colors / defaults and copy a snippet to embed the EmpX swap widget on
// their site.
//
// IMPORTANT: this page does NOT change the embed page itself.  The actual
// iframe content is served at /widget/swap (file: pages/widget/SwapEmbed.jsx)
// which reads URL params via widget/useWidgetConfig.ts.  That file MUST stay
// backward-compatible with partners who already embedded the legacy widget.
//
// This v2 page ONLY:
//   1. Generates URL params that match the existing WIDGET_PARAM_KEYS contract
//   2. Renders the iframe live preview against /widget/swap
//   3. Emits copy-paste snippets in three formats (iframe, React, URL)
//
// SDK / source-of-truth files this page mirrors:
//   • src/widget/chains.ts           — WIDGET_CHAIN_BY_KEY (4 supported chains)
//   • src/widget/useWidgetConfig.ts  — WIDGET_PARAM_KEYS + defaults
//   • src/pages/widget/SwapEmbed.jsx — the iframe content
//
// Honest disclosure surfaced in UI: widget executes via the SAME swap SDK
// as /swap-v2 — embedded swaps are real swaps, with integrator-ID
// attribution for revenue share.

import { useEffect, useMemo, useState } from "react";
import {
  AccountModal,
  BrandMark,
  Card,
  ChainPicker,
  DappNavbar,
  NetworkSelector,
  Pill,
  PrimaryButton,
  SocialTray,
  Tabs,
  Toaster,
  WalletButton,
  WalletModal,
  useIsMobile,
  toast,
  type NavLink,
  type PickerChain,
  type WalletOption,
} from "../components";
import { useWalletConnection } from "../hooks/useWalletConnection";
import { useV2Balances } from "../hooks/useV2Balances";
import { EMPX_SOCIALS } from "./SwapPage";
import { tierForChainId, tierLabel } from "../data/empxRegistry";
import { getExplorerAddressUrl } from "../data/explorers";
import { getV2Chain } from "../data/v2ChainView";
import { WIDGET_CHAIN_BY_KEY, type WidgetChainKey } from "../../widget/chains";

// ─── Widget chain registry — mirrors src/widget/chains.ts ──────────────────

const WIDGET_CHAINS = Object.values(WIDGET_CHAIN_BY_KEY).map((runtime) => {
  const chain = getV2Chain(runtime.chainId);
  return {
    key: runtime.key,
    chainId: runtime.chainId,
    name: chain?.name ?? runtime.key,
    color: chain?.color ?? "#888888",
    ticker: chain?.ticker ?? "ETH",
  };
});

// ─── Form state ────────────────────────────────────────────────────────────

interface WidgetForm {
  chainKey: WidgetChainKey;
  theme: "dark" | "darker" | "midnight";
  primaryColor: string;
  background: string;
  borderColor: string;
  defaultFrom: string;
  defaultTo: string;
  defaultAmount: string;
  integratorId: string;
  showBackground: boolean;
  showSlippage: boolean;
  showPoweredBy: boolean;
  width: number;
  height: number;
}

const FORM_DEFAULTS: WidgetForm = {
  chainKey: "pulsechain",
  theme: "dark",
  primaryColor: "#FF8A00",
  background: "#05050c",
  borderColor: "#15151f",
  defaultFrom: "",
  defaultTo: "",
  defaultAmount: "",
  integratorId: "",
  showBackground: true,
  showSlippage: true,
  showPoweredBy: true,
  width: 440,
  height: 720,
};

const ACCENT_PRESETS = ["#FF8A00", "#4ade80", "#60a5fa", "#e879f9", "#f87171", "#facc15"];

type ConfigTab = "branding" | "defaults" | "behavior" | "embed";

type SnippetFormat = "iframe" | "react" | "url";

// ─── URL builder — mirrors WIDGET_PARAM_KEYS contract ─────────────────────

function buildWidgetUrl(form: WidgetForm, origin: string = ""): string {
  const params = new URLSearchParams();
  params.set("chain", form.chainKey);
  params.set("theme", form.theme);
  params.set("primaryColor", form.primaryColor);
  params.set("background", form.background);
  params.set("borderColor", form.borderColor);
  if (form.defaultFrom)    params.set("defaultTokenIn", form.defaultFrom);
  if (form.defaultTo)      params.set("defaultTokenOut", form.defaultTo);
  if (form.defaultAmount)  params.set("defaultAmountIn", form.defaultAmount);
  if (form.integratorId)   params.set("integratorId", form.integratorId);
  params.set("showBackground", String(form.showBackground));
  params.set("showSlippage", String(form.showSlippage));
  params.set("showPoweredBy", String(form.showPoweredBy));
  return `${origin}/widget/swap?${params.toString()}`;
}

function buildSnippet(format: SnippetFormat, form: WidgetForm): string {
  const url = buildWidgetUrl(form, "https://empx.network");
  if (format === "url") return url;
  if (format === "iframe") {
    return `<iframe
  src="${url}"
  width="${form.width}"
  height="${form.height}"
  frameBorder="0"
  allow="clipboard-write"
  title="EmpX Swap Widget"
></iframe>`;
  }
  // React
  return `import { useMemo } from "react";

export function EmpxSwapWidget() {
  const src = "${url}";
  return (
    <iframe
      src={src}
      width={${form.width}}
      height={${form.height}}
      frameBorder={0}
      allow="clipboard-write"
      title="EmpX Swap Widget"
      style={{ border: "1px solid ${form.borderColor}", borderRadius: 8 }}
    />
  );
}`;
}

// ─── Page ──────────────────────────────────────────────────────────────────


export default function WidgetPage() {
  const isMobile = useIsMobile();
  const { walletState, walletOptions, onSelectWallet, disconnect, switchChain, currentChain } =
    useWalletConnection();
  const connectedBalance = useV2Balances();
  const [showWalletModal, setShowWalletModal] = useState(false);
  const [showAccountModal, setShowAccountModal] = useState(false);

  const [form, setForm] = useState<WidgetForm>(FORM_DEFAULTS);
  const [tab, setTab] = useState<ConfigTab>("branding");
  const [snippetFormat, setSnippetFormat] = useState<SnippetFormat>("iframe");
  const [chainPickerOpen, setChainPickerOpen] = useState(false);
  const [previewReloadKey, setPreviewReloadKey] = useState(0);
  const [previewStatus, setPreviewStatus] = useState<"loading" | "ok" | "error">("loading");

  const set = <K extends keyof WidgetForm>(key: K, value: WidgetForm[K]) =>
    setForm((cur) => ({ ...cur, [key]: value }));

  const chain = useMemo(
    () => WIDGET_CHAINS.find((c) => c.key === form.chainKey) ?? WIDGET_CHAINS[0],
    [form.chainKey],
  );

  // Live URL — uses relative path so the iframe loads from the same dev server.
  // Reset preview-status to "loading" whenever the form or reload-key changes
  // so the onLoad/onError handlers re-run for the new src.
  const previewUrl = useMemo(() => buildWidgetUrl(form, ""), [form]);
  useEffect(() => {
    setPreviewStatus("loading");
  }, [previewUrl, previewReloadKey]);
  const snippet = useMemo(() => buildSnippet(snippetFormat, form), [snippetFormat, form]);

  const chainPickerList: PickerChain[] = useMemo(
    () =>
      WIDGET_CHAINS.map((c) => {
        const tier = tierForChainId(c.chainId);
        return {
          id: c.chainId,
          name: c.name,
          ticker: c.ticker,
          color: c.color,
          tier,
          tierLabel: tierLabel(tier),
        };
      }),
    [],
  );

  const copyToClipboard = async (value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      toast.success(`Copied ${snippetFormat} snippet`);
    } catch {
      toast.error("Clipboard blocked — select + copy manually");
    }
  };

  const navLinks: NavLink[] = [
    { label: "Swap",      href: "/swap-v2" },
    { label: "Cross",     href: "/cross-v2" },
    { label: "Bridge",    href: "/bridge-v2" },
    { label: "Multi",     href: "/multi-v2", badge: "NEW" },
    { label: "Gas",       href: "/gas-v2" },
    { label: "Widget",    href: "/widget-v2", active: true },
    { label: "Portfolio", href: "/portfolio-v2" },
  ];

  return (
    <div style={{ minHeight: "100vh", background: "#05050c", color: "#fff", fontFamily: "Inter, sans-serif" }}>
      <DappNavbar
        links={navLinks}
        socials={<SocialTray links={EMPX_SOCIALS} withSeparator />}
        controls={
          <>
            <NetworkSelector name={chain.name} color={chain.color} onClick={() => setChainPickerOpen(true)} />
            <WalletButton
              connected={walletState.status === "connected"}
              address={walletState.status === "connected" ? walletState.address : undefined}
              onConnect={() => setShowWalletModal(true)}
              onClick={() => setShowAccountModal(true)}
            />
          </>
        }
      />

      <main style={{ maxWidth: 1280, margin: "0 auto", padding: isMobile ? "24px 16px 56px" : "32px 24px 72px" }}>
        {/* Header */}
        <header style={{ marginBottom: isMobile ? 20 : 26 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8, flexWrap: "wrap" }}>
            <p style={{ margin: 0, fontSize: 10, letterSpacing: "0.40em", color: "#FF8A00", textTransform: "uppercase", fontWeight: 700 }}>
              WIDGET · INTEGRATOR PROGRAM
            </p>
            <Pill variant="info">Real swaps · integrator revenue share</Pill>
          </div>
          <h1
            style={{
              margin: "4px 0 0",
              fontFamily: "'Space Grotesk', sans-serif",
              fontSize: isMobile ? 32 : "clamp(34px, 4.5vw, 56px)",
              fontWeight: 300,
              letterSpacing: "-0.03em",
              lineHeight: 1,
              color: "#fff",
            }}
          >
            Widget.{" "}
            <span style={{ fontFamily: "'Instrument Serif', serif", fontStyle: "italic", color: "#FF8A00", letterSpacing: "-0.02em" }}>
              Embed swaps. Earn fees.
            </span>
          </h1>
          <p style={{ margin: "12px 0 0", fontSize: 13, color: "rgba(255,255,255,0.65)", lineHeight: 1.6, maxWidth: 760 }}>
            Drop the EmpX swap widget into any site with one iframe. Configure chain, theme, defaults, and integrator ID — copy the snippet. Embedded swaps execute via the same SDK as <a href="/swap-v2" style={{ color: "#FF8A00", textDecoration: "none", borderBottom: "1px solid rgba(255,138,0,0.40)" }}>/swap-v2</a>. With an integrator ID set you earn a revenue share on every swap.
          </p>
        </header>

        {/* Body grid — config left, preview right */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: isMobile ? "1fr" : "minmax(0, 1.2fr) minmax(0, 1fr)",
            gap: isMobile ? 18 : 28,
            alignItems: "start",
          }}
        >
          {/* LEFT — config */}
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <Card style={{ padding: 18 }}>
              <Tabs
                options={[
                  { value: "branding" as const, label: "Branding" },
                  { value: "defaults" as const, label: "Defaults" },
                  { value: "behavior" as const, label: "Behavior" },
                  { value: "embed"    as const, label: "Embed code" },
                ]}
                active={tab}
                onChange={setTab}
                variant="underline"
              />

              <div style={{ marginTop: 16 }}>
                {tab === "branding" && (
                  <BrandingTab form={form} set={set} chain={chain} onPickChain={() => setChainPickerOpen(true)} />
                )}
                {tab === "defaults" && <DefaultsTab form={form} set={set} chain={chain} />}
                {tab === "behavior" && <BehaviorTab form={form} set={set} />}
                {tab === "embed" && (
                  <EmbedTab
                    form={form}
                    snippet={snippet}
                    snippetFormat={snippetFormat}
                    setSnippetFormat={setSnippetFormat}
                    onCopy={copyToClipboard}
                  />
                )}
              </div>
            </Card>

            {/* Integrator-revenue card */}
            <Card style={{ padding: 16, position: "relative", overflow: "hidden" }}>
              <div style={{ position: "absolute", top: -16, right: -16, opacity: 0.05, pointerEvents: "none" }}>
                <BrandMark size={110} color="#FF8A00" />
              </div>
              <p style={{ margin: 0, fontSize: 10, letterSpacing: "0.40em", color: "rgba(255,255,255,0.50)", textTransform: "uppercase", fontWeight: 700 }}>
                Integrator program
              </p>
              <p style={{ margin: "8px 0 0", fontSize: 12.5, color: "rgba(255,255,255,0.70)", lineHeight: 1.6 }}>
                Set an <code style={{ color: "rgba(255,255,255,0.85)" }}>integratorId</code> in the embed snippet to attribute swaps to your account.  Every embedded swap routes attribution data through the affiliate tier system — bps share depends on tier.
              </p>
              <p style={{ margin: "10px 0 0", fontSize: 11.5, color: "rgba(255,255,255,0.55)", lineHeight: 1.55 }}>
                Don't have one yet?{" "}
                <a
                  href="https://docs.empx.network/integrators"
                  target="_blank"
                  rel="noreferrer"
                  style={{ color: "#FF8A00", textDecoration: "none", borderBottom: "1px solid rgba(255,138,0,0.40)" }}
                >
                  Request an integrator ID
                </a>{" "}
                · review tiers + revenue share.
              </p>
            </Card>
          </div>

          {/* RIGHT — live preview */}
          <aside style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <Card style={{ padding: 14 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10, flexWrap: "wrap", gap: 6 }}>
                <p style={{ margin: 0, fontSize: 10, letterSpacing: "0.40em", color: "rgba(255,255,255,0.50)", textTransform: "uppercase", fontWeight: 700 }}>
                  Live preview
                </p>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={{ fontSize: 10.5, color: "rgba(255,255,255,0.40)", fontFamily: "'Space Grotesk', sans-serif" }}>
                    {form.width} × {form.height}
                  </span>
                  <button
                    type="button"
                    onClick={() => setPreviewReloadKey((k) => k + 1)}
                    style={{
                      padding: "4px 9px",
                      background: "transparent",
                      border: "1px solid rgba(255,255,255,0.15)",
                      borderRadius: 3,
                      color: "rgba(255,255,255,0.70)",
                      fontSize: 10,
                      letterSpacing: "0.18em",
                      cursor: "pointer",
                      textTransform: "uppercase",
                      fontWeight: 600,
                    }}
                    title="Reload preview"
                  >
                    Reload
                  </button>
                </div>
              </div>

              <div
                style={{
                  width: "100%",
                  position: "relative",
                  display: "flex",
                  justifyContent: "center",
                  padding: 12,
                  minHeight: 360,
                  background: "rgba(255,255,255,0.015)",
                  border: "1px solid rgba(255,255,255,0.05)",
                  borderRadius: 4,
                  overflow: "auto",
                }}
              >
                {/* Iframe — mounted regardless of status; onLoad/onError
                     transition status.  Hidden behind overlays until ok. */}
                <iframe
                  key={previewReloadKey}
                  src={previewUrl}
                  width={Math.min(form.width, 440)}
                  height={Math.min(form.height, 720)}
                  frameBorder={0}
                  title="EmpX Widget preview"
                  onLoad={() => setPreviewStatus("ok")}
                  onError={() => setPreviewStatus("error")}
                  style={{
                    border: `1px solid ${form.borderColor}`,
                    borderRadius: 6,
                    background: form.background,
                    maxWidth: "100%",
                    opacity: previewStatus === "ok" ? 1 : 0,
                    transition: "opacity 220ms ease",
                  }}
                />

                {/* Loading overlay */}
                {previewStatus === "loading" && (
                  <div
                    style={{
                      position: "absolute",
                      inset: 0,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 10,
                      color: "rgba(255,255,255,0.50)",
                      fontFamily: "Inter, sans-serif",
                      fontSize: 11,
                      letterSpacing: "0.30em",
                      textTransform: "uppercase",
                      fontWeight: 700,
                    }}
                  >
                    <span
                      aria-hidden
                      style={{
                        width: 6, height: 6, borderRadius: "50%",
                        background: "#FF8A00",
                        boxShadow: "0 0 8px #FF8A00",
                        animation: "empx-blink 1.2s ease-in-out infinite",
                      }}
                    />
                    Loading preview
                  </div>
                )}

                {/* Error fallback */}
                {previewStatus === "error" && (
                  <div
                    style={{
                      position: "absolute",
                      inset: 12,
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 12,
                      padding: 18,
                      textAlign: "center",
                      background: "rgba(248,113,113,0.04)",
                      border: "1px solid rgba(248,113,113,0.25)",
                      borderRadius: 4,
                    }}
                  >
                    <p
                      style={{
                        margin: 0,
                        fontSize: 10,
                        letterSpacing: "0.35em",
                        color: "#F87171",
                        textTransform: "uppercase",
                        fontWeight: 700,
                      }}
                    >
                      Preview unavailable
                    </p>
                    <p
                      style={{
                        margin: 0,
                        fontSize: 12,
                        color: "rgba(255,255,255,0.70)",
                        lineHeight: 1.55,
                        maxWidth: 320,
                      }}
                    >
                      The embed page at <code style={{ color: "rgba(255,255,255,0.85)" }}>/widget/swap</code> failed to render. The snippet output is unaffected — partners receive a working iframe URL on their site.
                    </p>
                    <a
                      href={previewUrl}
                      target="_blank"
                      rel="noreferrer"
                      style={{
                        padding: "6px 12px",
                        background: "rgba(255,138,0,0.10)",
                        border: "1px solid rgba(255,138,0,0.35)",
                        borderRadius: 4,
                        color: "#FF8A00",
                        fontSize: 10.5,
                        letterSpacing: "0.20em",
                        textTransform: "uppercase",
                        fontWeight: 600,
                        textDecoration: "none",
                      }}
                    >
                      Open in new tab ↗
                    </a>
                  </div>
                )}
              </div>

              <p style={{ margin: "10px 0 0", fontSize: 10.5, color: "rgba(255,255,255,0.40)", lineHeight: 1.5 }}>
                Preview loads <code style={{ color: "rgba(255,255,255,0.65)" }}>/widget/swap</code> (the embed page, unchanged). Use the Embed tab to copy the snippet for partner sites.
              </p>

              {/* Keyframes for the loading-dot pulse */}
              <style>{`@keyframes empx-blink { 0%,100% { opacity: 1 } 50% { opacity: 0.3 } }`}</style>
            </Card>

            {/* Quick stats */}
            <Card style={{ padding: 14 }}>
              <p style={{ margin: 0, fontSize: 10, letterSpacing: "0.40em", color: "rgba(255,255,255,0.50)", textTransform: "uppercase", fontWeight: 700 }}>
                Config summary
              </p>
              <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 6 }}>
                <SummaryRow label="Chain"   value={`${chain.name} · T${tierForChainId(chain.chainId)}`} />
                <SummaryRow label="Theme"   value={form.theme} />
                <SummaryRow label="Accent"  value={form.primaryColor} swatch={form.primaryColor} />
                <SummaryRow label="Size"    value={`${form.width} × ${form.height}`} />
                <SummaryRow label="Integrator" value={form.integratorId || "— not set —"} muted={!form.integratorId} />
              </div>
            </Card>
          </aside>
        </div>
      </main>

      {/* Modals */}
      <WalletModal
        open={showWalletModal}
        onClose={() => setShowWalletModal(false)}
        wallets={walletOptions}
        onSelect={(w) => {
          setShowWalletModal(false);
          onSelectWallet(w);
        }}
      />

      {chainPickerOpen && (
        <ChainPicker
          open={chainPickerOpen}
          onClose={() => setChainPickerOpen(false)}
          chains={chainPickerList}
          selectedId={chain.chainId}
          mode="swap"
          onSelect={(c) => {
            const next = WIDGET_CHAINS.find((w) => w.chainId === c.id);
            if (next) set("chainKey", next.key);
            setChainPickerOpen(false);
          }}
        />
      )}

      {walletState.status === "connected" && (
        <AccountModal
          open={showAccountModal}
          onClose={() => setShowAccountModal(false)}
          address={walletState.address}
          providerName={walletState.providerName}
          chainName={chain.name}
          chainColor={chain.color}
          balanceUSD={connectedBalance.nativeBalanceUSD ?? undefined}
          nativeBalance={connectedBalance.nativeBalance}
          nativeTicker={connectedBalance.nativeTicker}
          explorerUrl={getExplorerAddressUrl(chain.chainId, walletState.address) ?? undefined}
          onCopy={() => toast.success("Address copied")}
          onSwitchNetwork={() => { setShowAccountModal(false); setChainPickerOpen(true); }}
          onSwitchWallet={() => { setShowAccountModal(false); setShowWalletModal(true); }}
          onDisconnect={() => { setShowAccountModal(false); disconnect(); toast.info("Wallet disconnected"); }}
        />
      )}

      <Toaster />
    </div>
  );
}

// ─── Tabs ──────────────────────────────────────────────────────────────────

function BrandingTab({
  form, set, chain, onPickChain,
}: {
  form: WidgetForm;
  set: <K extends keyof WidgetForm>(k: K, v: WidgetForm[K]) => void;
  chain: typeof WIDGET_CHAINS[number];
  onPickChain: () => void;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <Field label="Chain" hint="Widget runs single-chain inside the iframe. For cross-chain, partners can iframe /cross-v2 instead.">
        <button
          type="button"
          onClick={onPickChain}
          style={{
            width: "100%",
            display: "flex",
            alignItems: "center",
            gap: 10,
            padding: "10px 12px",
            background: "rgba(255,255,255,0.03)",
            border: "1px solid rgba(255,255,255,0.10)",
            borderRadius: 4,
            color: "#fff",
            cursor: "pointer",
            textAlign: "left",
          }}
        >
          <span style={{ width: 22, height: 22, background: chain.color, borderRadius: 4, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, fontWeight: 700, color: "#fff" }}>
            {chain.ticker}
          </span>
          <span style={{ flex: 1, fontSize: 12.5, fontWeight: 600 }}>{chain.name}</span>
          <Pill variant="ghost">T{tierForChainId(chain.chainId)}</Pill>
          <span style={{ fontSize: 9, color: "rgba(255,255,255,0.40)", letterSpacing: "0.20em" }}>CHANGE</span>
        </button>
      </Field>

      <Field label="Theme">
        <div style={{ display: "flex", gap: 6 }}>
          {(["dark", "darker", "midnight"] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => set("theme", t)}
              style={chipStyle(form.theme === t)}
            >
              {t}
            </button>
          ))}
        </div>
      </Field>

      <Field label="Accent color">
        <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
          {ACCENT_PRESETS.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => set("primaryColor", c)}
              title={c}
              style={{
                width: 26,
                height: 26,
                background: c,
                border: `2px solid ${form.primaryColor.toLowerCase() === c.toLowerCase() ? "#fff" : "rgba(255,255,255,0.10)"}`,
                borderRadius: 4,
                cursor: "pointer",
                padding: 0,
              }}
            />
          ))}
          <input
            type="color"
            value={form.primaryColor}
            onChange={(e) => set("primaryColor", e.target.value)}
            style={{ width: 32, height: 26, border: "1px solid rgba(255,255,255,0.10)", borderRadius: 4, background: "transparent", padding: 0, cursor: "pointer" }}
            title="Custom color"
          />
          <code style={{ marginLeft: 4, fontSize: 11, color: "rgba(255,255,255,0.55)" }}>{form.primaryColor}</code>
        </div>
      </Field>

      <Field label="Background">
        <ColorWithText value={form.background} onChange={(v) => set("background", v)} />
      </Field>
      <Field label="Border">
        <ColorWithText value={form.borderColor} onChange={(v) => set("borderColor", v)} />
      </Field>

      <Field label="Dimensions" hint="Iframe pixel size. Most embeds use 440 × 720.">
        <div style={{ display: "flex", gap: 8 }}>
          <NumField label="Width"  value={form.width}  setValue={(v) => set("width",  Math.max(300, Math.min(800, v)))} />
          <NumField label="Height" value={form.height} setValue={(v) => set("height", Math.max(400, Math.min(1200, v)))} />
        </div>
      </Field>
    </div>
  );
}

function DefaultsTab({
  form, set, chain,
}: {
  form: WidgetForm;
  set: <K extends keyof WidgetForm>(k: K, v: WidgetForm[K]) => void;
  chain: typeof WIDGET_CHAINS[number];
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <p style={{ margin: 0, fontSize: 11.5, color: "rgba(255,255,255,0.55)", lineHeight: 1.55 }}>
        Pre-select tokens + amount so users land on a ready-to-swap state. All optional — leave blank for the default flow on {chain.name}.
      </p>
      <Field label="Default 'From' token" hint="Symbol (USDC) or address (0x…)">
        <TextField value={form.defaultFrom} onChange={(v) => set("defaultFrom", v)} placeholder="e.g. USDC or 0xA0b8…" />
      </Field>
      <Field label="Default 'To' token" hint="Symbol (PLS) or address (0x…)">
        <TextField value={form.defaultTo} onChange={(v) => set("defaultTo", v)} placeholder={`e.g. ${chain.ticker}`} />
      </Field>
      <Field label="Default amount" hint="Human-readable, e.g. 100">
        <TextField value={form.defaultAmount} onChange={(v) => set("defaultAmount", v)} placeholder="100" />
      </Field>
      <Field label="Integrator ID" hint="Set this to earn revenue share on every embedded swap.">
        <TextField value={form.integratorId} onChange={(v) => set("integratorId", v)} placeholder="empx-partner-abc123" />
      </Field>
    </div>
  );
}

function BehaviorTab({
  form, set,
}: {
  form: WidgetForm;
  set: <K extends keyof WidgetForm>(k: K, v: WidgetForm[K]) => void;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <Toggle
        title="Background gradient"
        hint="Render the EmpX ambient background behind the widget."
        enabled={form.showBackground}
        onToggle={() => set("showBackground", !form.showBackground)}
      />
      <Toggle
        title="Show slippage"
        hint="Expose the slippage control to users."
        enabled={form.showSlippage}
        onToggle={() => set("showSlippage", !form.showSlippage)}
      />
      <Toggle
        title='"Powered by EmpX" footer'
        hint="Required on the free tier — toggle off only on revenue-share tiers."
        enabled={form.showPoweredBy}
        onToggle={() => set("showPoweredBy", !form.showPoweredBy)}
      />
    </div>
  );
}

function EmbedTab({
  form, snippet, snippetFormat, setSnippetFormat, onCopy,
}: {
  form: WidgetForm;
  snippet: string;
  snippetFormat: SnippetFormat;
  setSnippetFormat: (f: SnippetFormat) => void;
  onCopy: (v: string) => void;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <Tabs
        options={[
          { value: "iframe" as const, label: "iframe" },
          { value: "react"  as const, label: "React" },
          { value: "url"    as const, label: "URL only" },
        ]}
        active={snippetFormat}
        onChange={setSnippetFormat}
        variant="pill"
      />

      <pre
        style={{
          margin: 0,
          padding: "14px 16px",
          background: "rgba(0,0,0,0.40)",
          border: "1px solid rgba(255,255,255,0.08)",
          borderRadius: 4,
          fontFamily: "'JetBrains Mono', 'Fira Code', Menlo, monospace",
          fontSize: 11.5,
          color: "rgba(255,255,255,0.85)",
          lineHeight: 1.55,
          overflow: "auto",
          maxHeight: 320,
          whiteSpace: "pre-wrap",
          wordBreak: "break-all",
        }}
      >
        {snippet}
      </pre>

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <PrimaryButton onClick={() => onCopy(snippet)}>
          Copy {snippetFormat} snippet
        </PrimaryButton>
        {form.integratorId === "" && (
          <span style={{ alignSelf: "center", fontSize: 11, color: "#FFB347" }}>
            Tip: set integratorId in the Defaults tab to claim revenue share.
          </span>
        )}
      </div>
    </div>
  );
}

// ─── Primitives ───────────────────────────────────────────────────────────

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <p style={{ margin: 0, fontSize: 10.5, color: "rgba(255,255,255,0.55)", fontWeight: 600, letterSpacing: "0.10em", textTransform: "uppercase" }}>
        {label}
      </p>
      {hint && (
        <p style={{ margin: "3px 0 8px", fontSize: 10.5, color: "rgba(255,255,255,0.40)", lineHeight: 1.5 }}>
          {hint}
        </p>
      )}
      {!hint && <div style={{ height: 6 }} />}
      {children}
    </div>
  );
}

function Toggle({ title, hint, enabled, onToggle }: { title: string; hint: string; enabled: boolean; onToggle: () => void }) {
  return (
    <div
      style={{
        display: "flex",
        gap: 12,
        padding: "10px 12px",
        background: "rgba(255,255,255,0.03)",
        border: `1px solid ${enabled ? "rgba(255,138,0,0.30)" : "rgba(255,255,255,0.06)"}`,
        borderRadius: 4,
        alignItems: "flex-start",
      }}
    >
      <div style={{ flex: 1 }}>
        <p style={{ margin: 0, fontSize: 12.5, fontWeight: 600, color: "#fff" }}>{title}</p>
        <p style={{ margin: "3px 0 0", fontSize: 11, color: "rgba(255,255,255,0.55)", lineHeight: 1.5 }}>{hint}</p>
      </div>
      <button
        type="button"
        onClick={onToggle}
        aria-pressed={enabled}
        style={{
          width: 32,
          height: 18,
          padding: 0,
          background: enabled ? "#FF8A00" : "rgba(255,255,255,0.10)",
          border: "1px solid " + (enabled ? "rgba(255,138,0,0.60)" : "rgba(255,255,255,0.15)"),
          borderRadius: 999,
          cursor: "pointer",
          position: "relative",
          flexShrink: 0,
          alignSelf: "center",
        }}
      >
        <span
          style={{
            position: "absolute",
            top: 1,
            left: enabled ? 14 : 1,
            width: 14,
            height: 14,
            background: "#fff",
            borderRadius: "50%",
            transition: "left 180ms ease",
          }}
        />
      </button>
    </div>
  );
}

function ColorWithText({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
      <input
        type="color"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{ width: 36, height: 28, border: "1px solid rgba(255,255,255,0.10)", borderRadius: 4, background: "transparent", padding: 0, cursor: "pointer" }}
      />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        spellCheck={false}
        style={textInputStyle(true)}
      />
    </div>
  );
}

function TextField({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      spellCheck={false}
      style={textInputStyle()}
    />
  );
}

function NumField({ label, value, setValue }: { label: string; value: number; setValue: (v: number) => void }) {
  return (
    <div style={{ flex: 1 }}>
      <p style={{ margin: "0 0 4px", fontSize: 10, color: "rgba(255,255,255,0.45)", textTransform: "uppercase", letterSpacing: "0.10em" }}>{label}</p>
      <input
        type="number"
        value={value}
        onChange={(e) => setValue(Number(e.target.value))}
        style={textInputStyle()}
      />
    </div>
  );
}

function SummaryRow({ label, value, muted, swatch }: { label: string; value: string; muted?: boolean; swatch?: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
      <span style={{ fontSize: 11, color: "rgba(255,255,255,0.50)" }}>{label}</span>
      <span style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11.5, color: muted ? "rgba(255,255,255,0.40)" : "rgba(255,255,255,0.85)", fontFamily: "'Space Grotesk', sans-serif", letterSpacing: "-0.005em" }}>
        {swatch && (
          <span style={{ width: 12, height: 12, background: swatch, border: "1px solid rgba(255,255,255,0.15)", borderRadius: 2, display: "inline-block" }} />
        )}
        {value}
      </span>
    </div>
  );
}

function chipStyle(active: boolean): React.CSSProperties {
  return {
    padding: "6px 12px",
    background: active ? "rgba(255,138,0,0.10)" : "rgba(255,255,255,0.03)",
    border: `1px solid ${active ? "rgba(255,138,0,0.40)" : "rgba(255,255,255,0.10)"}`,
    borderRadius: 4,
    color: active ? "#FF8A00" : "rgba(255,255,255,0.75)",
    fontSize: 11,
    fontWeight: 600,
    letterSpacing: "0.06em",
    textTransform: "uppercase",
    cursor: "pointer",
    fontFamily: "Inter, sans-serif",
  };
}

function textInputStyle(small?: boolean): React.CSSProperties {
  return {
    flex: 1,
    width: "100%",
    padding: small ? "6px 8px" : "9px 11px",
    background: "rgba(255,255,255,0.03)",
    border: "1px solid rgba(255,255,255,0.10)",
    borderRadius: 4,
    color: "#fff",
    fontFamily: "'Space Grotesk', sans-serif",
    fontSize: small ? 11 : 12,
    outline: "none",
    letterSpacing: "-0.005em",
  };
}
