// ─── MultiPage — IntentBasket-backed multi-leg surface ─────────────────────
//
// Wires the four user-facing features that share ONE underlying SDK op
// (the IntentBasket abstraction in empx-cross-bridge):
//
//   1. Multiswap         (multi-to-one)    N tokens → 1 target
//   2. Split routes      (one-to-many)     1 token → N outputs (allocationBps)
//   3. Wallet Liquidator (wallet-liquidator) auto-scan → 1 target
//   4. Cross Rebalancer  (many-to-many)    N inputs ↔ M outputs
//
// SDK grounding (every UI decision maps to a real SDK file):
//   • empx-cross-bridge/src/vps/core/IntentBasket.ts      shape + validateBasket
//   • empx-cross-bridge/src/vps/services/BasketQuoteEngine.ts  quote per leg
//   • empx-cross-bridge/src/vps/services/BasketStatusEngine.ts rollup status
//   • empx-cross-bridge/src/vps/services/WalletScanner.ts      liquidator scan
//
// Hard limits honoured from BASKET_LIMITS:
//   maxInputs = 5, maxOutputs = 10, maxLegs = 25
//
// allocationBps MUST sum to 10_000 across outputs in one-to-many /
// many-to-many; the form enforces this before letting the user quote.
//
// Honest disclosures:
//   • Per-leg revenueTier surfaced ("agg-wired" / "api-direct" / "unknown")
//   • `skipped` legs from BasketQuote are explicit in the review panel
//   • Wallet-liquidator scan caps shown to the user (5 chains × 50 tokens)

import { useEffect, useMemo, useState } from "react";
import {
  AccountModal,
  BrandMark,
  Card,
  ChainPicker,
  ChainSwitcher,
  DappNavbar,
  FeeBreakdown,
  NetworkSelector,
  Pill,
  PrimaryButton,
  SocialTray,
  Tabs,
  Toaster,
  TokenPicker,
  TokenSwitcher,
  WalletButton,
  WalletModal,
  useIsMobile,
  toast,
  type FeeRow,
  type PickerChain,
  type PickerToken,
  type WalletOption,
} from "../components";
import { useWalletConnection } from "../hooks/useWalletConnection";
import { useV2Balances } from "../hooks/useV2Balances";
import { EMPX_SOCIALS } from "./SwapPage";
import { getExplorerAddressUrl } from "../data/explorers";
import {
  defaultSettlementTicker,
  RAILS,
  tierForChainId,
  tierLabel,
} from "../data/empxRegistry";
import {
  buildUnavailableRouteRows,
  createV2NavLinks,
  V2_MULTI_ROUTE_STATUS,
} from "../data/v2ProductRoutes";

// ─── Constants mirrored from IntentBasket.ts ──────────────────────────────

const BASKET_LIMITS = {
  maxInputs: 5,
  maxOutputs: 10,
  maxLegs: 25,
} as const;

const AUTO_FUND_MAX_TOPUP_USD = 10;

// Small chain catalog (subset — full catalog lives in CrossPage)
const CHAINS: { id: number; name: string; color: string; ticker: string }[] = [
  { id: 1,     name: "Ethereum",  color: "#627EEA", ticker: "ETH" },
  { id: 42161, name: "Arbitrum",  color: "#28A0F0", ticker: "ETH" },
  { id: 8453,  name: "Base",      color: "#0052FF", ticker: "ETH" },
  { id: 10,    name: "Optimism",  color: "#FF0420", ticker: "ETH" },
  { id: 137,   name: "Polygon",   color: "#7B3FE4", ticker: "POL" },
  { id: 56,    name: "BSC",       color: "#F0B90B", ticker: "BNB" },
  { id: 43114, name: "Avalanche", color: "#E84142", ticker: "AVAX" },
  { id: 369,   name: "PulseChain",color: "#FF66C4", ticker: "PLS" },
];

const chainName = (id: number) => CHAINS.find((c) => c.id === id)?.name ?? `Chain ${id}`;
const chainColor = (id: number) => CHAINS.find((c) => c.id === id)?.color ?? "#888";

// ─── Mode definitions ─────────────────────────────────────────────────────

type BasketMode = "multi-to-one" | "one-to-many" | "wallet-liquidator" | "many-to-many";

const MODE_LABEL: Record<BasketMode, string> = {
  "multi-to-one":     "Multiswap",
  "one-to-many":      "Split routes",
  "wallet-liquidator":"Liquidator",
  "many-to-many":     "Rebalancer",
};

const MODE_SUBTITLE: Record<BasketMode, string> = {
  "multi-to-one":     "N tokens → 1 target",
  "one-to-many":      "1 token → N outputs",
  "wallet-liquidator":"Auto-scan → 1 target",
  "many-to-many":     "N inputs ↔ M outputs",
};

const MODE_BLURB: Record<BasketMode, string> = {
  "multi-to-one":     "Pick multiple inputs across chains and converge them into one target asset. Each leg routes via the existing pipeline — same-chain via the aggregator, cross-chain via the best eligible rail.",
  "one-to-many":      "One source token, multiple outputs with percentage allocations. Allocations must sum to 100%. The SDK pre-splits the input amount and runs each output as a separate leg.",
  "wallet-liquidator":"Scan your wallet, then pick which tokens to liquidate into a single target. Preserve assets you want to keep — only checked ones get swept.",
  "many-to-many":     "Pair N inputs against M outputs by allocation. Today executes as a full N×M cross-product; smarter pairing is a Phase-3 optimisation.",
};

// Walked-through example per mode — uses generic Token A/B/C names.
const MODE_EXAMPLE: Record<BasketMode, { title: string; lines: string[] }> = {
  "multi-to-one": {
    title: "Example",
    lines: [
      "You hold Token A on Arbitrum, Token B on Polygon, Token C on Base.",
      "Set destination = Token D on Base.",
      "Result: 3 legs run in parallel — A→D, B→D, C→D. You end up holding only Token D on Base.",
    ],
  },
  "one-to-many": {
    title: "Example",
    lines: [
      "You hold 1000 of Token A on Arbitrum.",
      "Set outputs: 50% Token B (Arbitrum), 30% Token C (Base), 20% Token D (Polygon).",
      "Result: 500 A → B, 300 A → C, 200 A → D — one input, three settled outputs.",
    ],
  },
  "wallet-liquidator": {
    title: "Example",
    lines: [
      "Scan finds Token A, Token B, Token C in your wallet.",
      "Uncheck Token A (preserve it) — only B and C get liquidated.",
      "Result: 2 legs run, Token B + Token C → target (e.g. USDC on Arbitrum). Token A stays put.",
    ],
  },
  "many-to-many": {
    title: "Example",
    lines: [
      "You hold Token A (Arbitrum) + Token B (Base).",
      "Set outputs: 60% Token C (Polygon), 40% Token D (Optimism).",
      "Result: cross-product runs — A→C, A→D, B→C, B→D — 4 legs total. Allocations split each input by output %.",
    ],
  },
};

// User-friendly slippage presets — in percent.
const SLIPPAGE_PCT_PRESETS = [0.1, 0.5, 1.0, 3.0];

// Convert between UI percent and SDK bps
const pctToBps = (pct: number) => Math.round(pct * 100);
const bpsToPct = (bps: number) => bps / 100;

// ─── Page-level state shapes (UI-only mirror of IntentBasket) ─────────────

interface InputLeg {
  id: string;
  chainId: number;
  ticker: string;
  amount: string;
  /** Demo USD per token unit */
  usdPrice: number;
}

interface OutputLeg {
  id: string;
  chainId: number;
  ticker: string;
  allocationBps: number;
  gasTopUpUSD?: number;
}

// Cold-start price floor.  Live values fetched via DefiLlama (priceService)
// when the chain is covered.  Same pattern as CrossPage.
import { getCachedPrice, getTokenPrices } from "../data/priceService";

const PRICE_USD_FALLBACK: Record<string, number> = {
  ETH: 3184, WBTC: 67852, BTC: 67852, SOL: 158, USDC: 1, USDT: 1, DAI: 1,
  POL: 0.72, BNB: 612, AVAX: 38, ARB: 0.79, OP: 1.84, PLS: 0.00007,
};

function nextId() { return Math.random().toString(36).slice(2, 9); }

function priceOf(ticker: string, chainId?: number): number {
  if (chainId != null) {
    const live = getCachedPrice(chainId, ticker);
    if (live != null) return live;
  }
  return PRICE_USD_FALLBACK[ticker.toUpperCase()] ?? 1;
}

function _prefetchBasketPrices(pairs: { chainId: number; ticker: string }[]) {
  void getTokenPrices(pairs);
}

export default function MultiPage() {
  const isMobile = useIsMobile();
  const { walletState, walletOptions, onSelectWallet, disconnect, switchChain, currentChain } =
    useWalletConnection();
  const connectedBalance = useV2Balances();
  const [showWalletModal, setShowWalletModal] = useState(false);
  const [showAccountModal, setShowAccountModal] = useState(false);

  const [mode, setMode] = useState<BasketMode>("multi-to-one");
  const [slippageBps, setSlippageBps] = useState(50);
  const [deadlineSeconds, setDeadlineSeconds] = useState(600);

  // Chain picker — track which leg is currently picking, so onSelect knows
  // where to write the chainId back. Shape mirrors the cross / gas pages.
  const [chainPickerTarget, setChainPickerTarget] = useState<
    | { kind: "input"; id: string }
    | { kind: "output"; id: string }
    | null
  >(null);

  // Token picker — same shape as chain picker. Opens from the leg's TokenSwitcher.
  const [tokenPickerTarget, setTokenPickerTarget] = useState<
    | { kind: "input"; id: string }
    | { kind: "output"; id: string }
    | null
  >(null);

  // ── Inputs / outputs state ──────────────────────────────────────────────
  const [inputs, setInputs] = useState<InputLeg[]>(() => [
    { id: nextId(), chainId: 42161, ticker: "ETH", amount: "0.5", usdPrice: priceOf("ETH") },
  ]);
  const [outputs, setOutputs] = useState<OutputLeg[]>(() => [
    { id: nextId(), chainId: 8453, ticker: "USDC", allocationBps: 10_000 },
  ]);

  // Prefetch DefiLlama prices for every leg in the basket. Falls back
  // silently for chains/tokens DefiLlama doesn't cover.
  useEffect(() => {
    const pairs = [
      ...inputs.map((l) => ({ chainId: l.chainId, ticker: l.ticker })),
      ...outputs.map((l) => ({ chainId: l.chainId, ticker: l.ticker })),
    ];
    _prefetchBasketPrices(pairs);
  }, [inputs, outputs]);

  // ── Mode-driven structural rules ────────────────────────────────────────
  // multi-to-one: 1 output only.  one-to-many: 1 input only.
  // wallet-liquidator: inputs auto-scanned; outputs = 1.
  // many-to-many: 2+ inputs, 2+ outputs allowed.
  const switchMode = (next: BasketMode) => {
    setMode(next);
    if (next === "multi-to-one") {
      // Allow many inputs, exactly 1 output
      setOutputs((cur) => cur.slice(0, 1).map((o) => ({ ...o, allocationBps: 10_000 })));
    } else if (next === "one-to-many") {
      setInputs((cur) => cur.slice(0, 1));
      // Default outputs to 2-way 50/50 if currently single
      setOutputs((cur) => {
        if (cur.length >= 2) return cur;
        const a = cur[0] ?? { id: nextId(), chainId: 8453, ticker: "USDC", allocationBps: 5000 };
        return [
          { ...a, allocationBps: 5000 },
          { id: nextId(), chainId: 42161, ticker: "ETH", allocationBps: 5000 },
        ];
      });
    } else if (next === "wallet-liquidator") {
      // Inputs auto-scanned — UI shows scan card, outputs = 1
      setOutputs((cur) => cur.slice(0, 1).map((o) => ({ ...o, allocationBps: 10_000 })));
    }
    // many-to-many: leave both as-is
  };

  // ── Derived: leg count + cap checks ─────────────────────────────────────
  const legCount = useMemo(() => {
    if (mode === "multi-to-one")      return inputs.length;
    if (mode === "one-to-many")       return outputs.length;
    if (mode === "wallet-liquidator") return 0;
    return inputs.length * outputs.length; // many-to-many full cross-product
  }, [mode, inputs.length, outputs.length]);

  const totalBps = outputs.reduce((s, o) => s + o.allocationBps, 0);
  const allocOk = mode === "multi-to-one" || mode === "wallet-liquidator" || totalBps === 10_000;

  const inputsValid = mode === "wallet-liquidator" || (inputs.length > 0 && inputs.every((i) => Number(i.amount) > 0));
  const overCap = inputs.length > BASKET_LIMITS.maxInputs
               || outputs.length > BASKET_LIMITS.maxOutputs
               || legCount > BASKET_LIMITS.maxLegs;

  const totalInputUSD = inputs.reduce((s, i) => s + Number(i.amount) * i.usdPrice, 0);
  const navLinks = createV2NavLinks("multi");

  return (
    <div style={{ minHeight: "100vh", background: "#05050c", color: "#fff", fontFamily: "Inter, sans-serif" }}>
      <DappNavbar
        links={navLinks}
        socials={<SocialTray links={EMPX_SOCIALS} withSeparator />}
        controls={
          <>
            <NetworkSelector
              name="Arbitrum"
              color="#28A0F0"
              onClick={() => toast.info("Active chain controlled per-leg below")}
            />
            <WalletButton
              connected={walletState.status === "connected"}
              address={walletState.status === "connected" ? walletState.address : undefined}
              onConnect={() => setShowWalletModal(true)}
              onClick={() => setShowAccountModal(true)}
            />
          </>
        }
      />

      <main style={{ maxWidth: 1180, margin: "0 auto", padding: isMobile ? "24px 16px 56px" : "32px 24px 72px" }}>
        {/* Header */}
        <header style={{ marginBottom: isMobile ? 22 : 28 }}>
          <p style={{ margin: 0, fontSize: 10, letterSpacing: "0.40em", color: "#FF8A00", textTransform: "uppercase", fontWeight: 700 }}>
            INTENT BASKETS · 4 MODES · 1 PIPELINE
          </p>
          <h1
            style={{
              margin: "8px 0 0",
              fontFamily: "'Space Grotesk', sans-serif",
              fontSize: isMobile ? 32 : "clamp(34px, 4.5vw, 56px)",
              fontWeight: 300,
              letterSpacing: "-0.03em",
              lineHeight: 1,
              color: "#fff",
            }}
          >
            Multi.{" "}
            <span style={{ fontFamily: "'Instrument Serif', serif", fontStyle: "italic", color: "#FF8A00", letterSpacing: "-0.02em" }}>
              Many in, many out.
            </span>
          </h1>
          <p style={{ margin: "12px 0 0", fontSize: 13, color: "rgba(255,255,255,0.65)", lineHeight: 1.6, maxWidth: 720 }}>
            All four flows share the IntentBasket abstraction. Each leg becomes a regular Intent — same-chain via the aggregator, cross-chain via the best eligible rail.
          </p>
        </header>

        {/* Mode tabs */}
        <div style={{ marginBottom: 18, overflowX: "auto", paddingBottom: 2 }}>
          <Tabs
            options={(["multi-to-one", "one-to-many", "wallet-liquidator", "many-to-many"] as const).map((m) => ({
              value: m,
              label: MODE_LABEL[m],
            }))}
            active={mode}
            onChange={switchMode}
            variant="underline"
          />
          <div style={{ marginTop: 10, padding: "12px 14px", background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 4 }}>
            <p style={{ margin: 0, fontSize: 11.5, color: "rgba(255,255,255,0.70)", lineHeight: 1.55 }}>
              <strong style={{ color: "#fff" }}>{MODE_LABEL[mode]}</strong>{" "}
              <span style={{ color: "rgba(255,255,255,0.45)" }}>· {MODE_SUBTITLE[mode]}</span>
              <br />
              <span style={{ color: "rgba(255,255,255,0.60)" }}>{MODE_BLURB[mode]}</span>
            </p>
            <div
              style={{
                marginTop: 10,
                padding: "10px 12px",
                background: "rgba(255,138,0,0.05)",
                border: "1px solid rgba(255,138,0,0.18)",
                borderRadius: 4,
              }}
            >
              <p style={{ margin: 0, fontSize: 9.5, letterSpacing: "0.30em", color: "#FF8A00", textTransform: "uppercase", fontWeight: 700 }}>
                {MODE_EXAMPLE[mode].title}
              </p>
              <ul style={{ margin: "6px 0 0", padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 4 }}>
                {MODE_EXAMPLE[mode].lines.map((line, i) => (
                  <li key={i} style={{ display: "flex", gap: 8, fontSize: 11, color: "rgba(255,255,255,0.70)", lineHeight: 1.55 }}>
                    <span style={{ color: "rgba(255,138,0,0.70)", flexShrink: 0, fontWeight: 700, minWidth: 14, textAlign: "right" }}>{i + 1}.</span>
                    <span>{line}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        {/* Body grid */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: isMobile ? "1fr" : "minmax(0, 1.4fr) minmax(0, 1fr)",
            gap: isMobile ? 18 : 28,
            alignItems: "start",
          }}
        >
          {/* LEFT — inputs + outputs */}
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {/* Inputs panel */}
            {mode === "wallet-liquidator" ? (
              <LiquidatorScanCard />
            ) : (
              <LegsPanel
                kind="input"
                legs={inputs as any}
                setLegs={setInputs as any}
                mode={mode}
                disabled={mode === "one-to-many" && inputs.length >= 1}
                maxAdd={mode === "one-to-many" ? 1 : BASKET_LIMITS.maxInputs}
                onPickChain={(id) => setChainPickerTarget({ kind: "input", id })}
                onPickToken={(id) => setTokenPickerTarget({ kind: "input", id })}
              />
            )}

            {/* Outputs panel */}
            <LegsPanel
              kind="output"
              legs={outputs as any}
              setLegs={setOutputs as any}
              mode={mode}
              disabled={(mode === "multi-to-one" || mode === "wallet-liquidator") && outputs.length >= 1}
              maxAdd={(mode === "multi-to-one" || mode === "wallet-liquidator") ? 1 : BASKET_LIMITS.maxOutputs}
              onPickChain={(id) => setChainPickerTarget({ kind: "output", id })}
              onPickToken={(id) => setTokenPickerTarget({ kind: "output", id })}
            />
          </div>

          {/* RIGHT — review + execute */}
          <aside style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <Card style={{ padding: 16, position: "relative", overflow: "hidden" }}>
              <div style={{ position: "absolute", top: -16, right: -16, opacity: 0.05, pointerEvents: "none" }}>
                <BrandMark size={110} color="#FF8A00" />
              </div>
              <p style={{ margin: 0, fontSize: 10, letterSpacing: "0.40em", color: "rgba(255,255,255,0.50)", textTransform: "uppercase", fontWeight: 700 }}>
                Basket review
              </p>

              <div style={{ marginTop: 14 }}>
                <FeeBreakdown
                  rows={(() => {
                    const rows: FeeRow[] = [
                      { label: "Mode",          value: MODE_LABEL[mode] },
                      { label: "Legs",          value: `${legCount} configured · cap ${BASKET_LIMITS.maxLegs}` },
                      { label: "Input estimate", value: `$${totalInputUSD.toLocaleString("en-US", { maximumFractionDigits: 2 })}`, muted: true },
                      ...buildUnavailableRouteRows("multi"),
                    ];
                    return rows;
                  })()}
                  bordered
                />
              </div>

              {/* Allocation status */}
              {(mode === "one-to-many" || mode === "many-to-many") && (
                <div
                  style={{
                    marginTop: 12,
                    padding: "10px 12px",
                    background: allocOk ? "rgba(52,211,153,0.06)" : "rgba(248,113,113,0.08)",
                    border: `1px solid ${allocOk ? "rgba(52,211,153,0.25)" : "rgba(248,113,113,0.30)"}`,
                    borderRadius: 4,
                    fontSize: 11.5,
                    color: allocOk ? "#34D399" : "#F87171",
                    lineHeight: 1.5,
                  }}
                >
                  Allocations: {(totalBps / 100).toFixed(2)}% of 100% · {allocOk ? "balanced" : `off by ${(10_000 - totalBps) > 0 ? "+" : ""}${((10_000 - totalBps) / 100).toFixed(2)}%`}
                </div>
              )}

              {!inputsValid && mode !== "wallet-liquidator" && (
                <div
                  style={{
                    marginTop: 12,
                    padding: "10px 12px",
                    background: "rgba(255,138,0,0.06)",
                    border: "1px solid rgba(255,138,0,0.25)",
                    borderRadius: 4,
                    fontSize: 11.5,
                    color: "#FFB347",
                    lineHeight: 1.5,
                  }}
                >
                  Enter an amount &gt; 0 on every input leg to keep the preview valid.
                </div>
              )}

              <div style={{ marginTop: 14 }}>
                <PrimaryButton
                  disabled={!V2_MULTI_ROUTE_STATUS.executionEnabled}
                  onClick={() => toast.info("Basket preview only — backend basket API required")}
                >
                  {V2_MULTI_ROUTE_STATUS.primaryActionLabel}
                </PrimaryButton>
              </div>
            </Card>

            {/* Constraints */}
            <Card style={{ padding: 16 }}>
              <p style={{ margin: 0, fontSize: 10, letterSpacing: "0.40em", color: "rgba(255,255,255,0.50)", textTransform: "uppercase", fontWeight: 700 }}>
                Constraints
              </p>
              <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 12 }}>
                {/* Slippage — percent UI mapped to SDK bps */}
                <div>
                  <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 6 }}>
                    <span style={{ fontSize: 11.5, color: "rgba(255,255,255,0.65)" }}>Slippage tolerance</span>
                    <span style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 11, color: "rgba(255,255,255,0.45)", letterSpacing: "-0.005em" }}>
                      = {pctToBps(bpsToPct(slippageBps))} bps
                    </span>
                  </div>
                  <div style={{ display: "flex", gap: 5, flexWrap: "wrap", alignItems: "center" }}>
                    {SLIPPAGE_PCT_PRESETS.map((pct) => {
                      const active = slippageBps === pctToBps(pct);
                      return (
                        <button
                          key={pct}
                          type="button"
                          onClick={() => setSlippageBps(pctToBps(pct))}
                          style={{
                            padding: "5px 11px",
                            background: active ? "rgba(255,138,0,0.12)" : "transparent",
                            border: `1px solid ${active ? "rgba(255,138,0,0.45)" : "rgba(255,255,255,0.10)"}`,
                            borderRadius: 4,
                            color: active ? "#FF8A00" : "rgba(255,255,255,0.65)",
                            fontFamily: "Inter, sans-serif",
                            fontSize: 11,
                            fontWeight: 600,
                            cursor: "pointer",
                            letterSpacing: "0.02em",
                          }}
                        >
                          {pct}%
                        </button>
                      );
                    })}
                    <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                      <input
                        type="number"
                        step={0.1}
                        min={0.01}
                        max={10}
                        value={bpsToPct(slippageBps)}
                        onChange={(e) => setSlippageBps(pctToBps(Math.max(0.01, Math.min(10, Number(e.target.value)))))}
                        style={{
                          width: 56,
                          padding: "5px 7px",
                          background: "rgba(255,255,255,0.03)",
                          border: "1px solid rgba(255,255,255,0.10)",
                          borderRadius: 4,
                          color: "#fff",
                          fontFamily: "'Space Grotesk', sans-serif",
                          fontSize: 11,
                          textAlign: "right",
                          outline: "none",
                        }}
                      />
                      <span style={{ fontSize: 11, color: "rgba(255,255,255,0.50)" }}>%</span>
                    </div>
                  </div>
                  <p style={{ margin: "6px 0 0", fontSize: 10.5, color: "rgba(255,255,255,0.40)", lineHeight: 1.45 }}>
                    Applies per leg unless a leg overrides it. Lower = tighter price but higher revert chance.
                  </p>
                </div>

                {/* Deadline */}
                <div>
                  <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 6 }}>
                    <span style={{ fontSize: 11.5, color: "rgba(255,255,255,0.65)" }}>Quote deadline</span>
                    <span style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 11, color: "rgba(255,255,255,0.45)" }}>
                      {Math.round(deadlineSeconds / 60)} min
                    </span>
                  </div>
                  <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
                    {[300, 600, 1800].map((secs) => {
                      const active = deadlineSeconds === secs;
                      return (
                        <button
                          key={secs}
                          type="button"
                          onClick={() => setDeadlineSeconds(secs)}
                          style={{
                            padding: "5px 11px",
                            background: active ? "rgba(96,165,250,0.10)" : "transparent",
                            border: `1px solid ${active ? "rgba(96,165,250,0.35)" : "rgba(255,255,255,0.10)"}`,
                            borderRadius: 4,
                            color: active ? "#93C5FD" : "rgba(255,255,255,0.65)",
                            fontFamily: "Inter, sans-serif",
                            fontSize: 11,
                            fontWeight: 600,
                            cursor: "pointer",
                          }}
                        >
                          {secs / 60} min
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
              <p style={{ margin: "10px 0 0", fontSize: 10.5, color: "rgba(255,255,255,0.40)", lineHeight: 1.5 }}>
                BASKET_LIMITS: max {BASKET_LIMITS.maxInputs} inputs · max {BASKET_LIMITS.maxOutputs} outputs · max {BASKET_LIMITS.maxLegs} total legs.
              </p>
            </Card>

            {/* SDK source */}
            <Card style={{ padding: 14 }}>
              <p style={{ margin: 0, fontSize: 10, letterSpacing: "0.40em", color: "rgba(255,255,255,0.50)", textTransform: "uppercase", fontWeight: 700 }}>
                Backed by
              </p>
              <ul style={{ margin: "8px 0 0", padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 6 }}>
                {[
                  ["core/IntentBasket.ts", "validateBasket + 4 modes + caps"],
                  ["services/BasketQuoteEngine.ts", "per-leg quote orchestration"],
                  ["services/BasketStatusEngine.ts", "composite status rollup"],
                  ["services/WalletScanner.ts", "liquidator chain scan (5×50)"],
                ].map(([f, role]) => (
                  <li key={f} style={{ fontSize: 11, color: "rgba(255,255,255,0.60)", lineHeight: 1.5 }}>
                    <code style={{ color: "rgba(255,255,255,0.85)" }}>{f}</code>{" — "}{role}
                  </li>
                ))}
              </ul>
            </Card>
          </aside>
        </div>
      </main>

      <WalletModal
        open={showWalletModal}
        onClose={() => setShowWalletModal(false)}
        wallets={walletOptions}
        onSelect={(w) => {
          setShowWalletModal(false);
          onSelectWallet(w);
        }}
      />

      {/* Chain picker — opens on any leg's ChainSwitcher click */}
      {chainPickerTarget && (
        <ChainPicker
          open={!!chainPickerTarget}
          onClose={() => setChainPickerTarget(null)}
          mode="cross"
          chains={CHAINS.map<PickerChain>((c) => {
            const tier = tierForChainId(c.id);
            return {
              id: c.id,
              name: c.name,
              ticker: c.ticker,
              color: c.color,
              tier,
              tierLabel: tierLabel(tier),
            };
          })}
          selectedId={
            chainPickerTarget.kind === "input"
              ? inputs.find((l) => l.id === chainPickerTarget.id)?.chainId
              : outputs.find((l) => l.id === chainPickerTarget.id)?.chainId
          }
          onSelect={(c) => {
            if (chainPickerTarget.kind === "input") {
              setInputs(inputs.map((l) => (l.id === chainPickerTarget.id ? { ...l, chainId: c.id } : l)));
            } else {
              setOutputs(outputs.map((l) => (l.id === chainPickerTarget.id ? { ...l, chainId: c.id } : l)));
            }
            setChainPickerTarget(null);
          }}
        />
      )}

      {/* Token picker — opens on any leg's TokenSwitcher click */}
      {tokenPickerTarget && (() => {
        const targetLeg = tokenPickerTarget.kind === "input"
          ? inputs.find((l) => l.id === tokenPickerTarget.id)
          : outputs.find((l) => l.id === tokenPickerTarget.id);
        if (!targetLeg) return null;
        const targetChain = CHAINS.find((c) => c.id === targetLeg.chainId) ?? CHAINS[1];
        // Common tokens — production wires this to the chain's aggregator token registry.
        const sampleTokens: PickerToken[] = [
          { ticker: "USDC", name: "USD Coin",        chainName: targetChain.name, chainColor: targetChain.color, badge: "VERIFIED" },
          { ticker: "USDT", name: "Tether",          chainName: targetChain.name, chainColor: targetChain.color, badge: "VERIFIED" },
          { ticker: "ETH",  name: "Ether",           chainName: targetChain.name, chainColor: targetChain.color },
          { ticker: "WBTC", name: "Wrapped BTC",     chainName: targetChain.name, chainColor: targetChain.color },
          { ticker: "DAI",  name: "Dai",             chainName: targetChain.name, chainColor: targetChain.color },
          { ticker: "ARB",  name: "Arbitrum",        chainName: targetChain.name, chainColor: targetChain.color },
          { ticker: "OP",   name: "Optimism",        chainName: targetChain.name, chainColor: targetChain.color },
          { ticker: "PEPE", name: "Pepe",            chainName: targetChain.name, chainColor: targetChain.color },
        ];
        return (
          <TokenPicker
            open={!!tokenPickerTarget}
            onClose={() => setTokenPickerTarget(null)}
            tokens={sampleTokens}
            recent={sampleTokens.slice(0, 4)}
            selected={targetLeg.ticker}
            onSelect={(t) => {
              const patch = { ticker: t.ticker, usdPrice: priceOf(t.ticker, targetLeg.chainId) };
              if (tokenPickerTarget.kind === "input") {
                setInputs(inputs.map((l) => (l.id === tokenPickerTarget.id ? { ...l, ...patch } : l)));
              } else {
                setOutputs(outputs.map((l) => (l.id === tokenPickerTarget.id ? { ...l, ...patch } : l)));
              }
              setTokenPickerTarget(null);
              toast.info(`${tokenPickerTarget.kind === "input" ? "Input" : "Output"} → ${t.ticker}`);
            }}
          />
        );
      })()}

      {walletState.status === "connected" && (
        <AccountModal
          open={showAccountModal}
          onClose={() => setShowAccountModal(false)}
          address={walletState.address}
          providerName={walletState.providerName}
          chainName={walletState.chain.name}
          chainColor={walletState.chain.color}
          balanceUSD={connectedBalance.nativeBalanceUSD ?? undefined}
          nativeBalance={connectedBalance.nativeBalance}
          nativeTicker={connectedBalance.nativeTicker}
          explorerUrl={getExplorerAddressUrl(walletState.chain.id, walletState.address) ?? undefined}
          onCopy={() => toast.success("Address copied")}
          onSwitchNetwork={() => toast.info("Per-leg chain control in panels below")}
          onSwitchWallet={() => { setShowAccountModal(false); setShowWalletModal(true); }}
          onDisconnect={() => { setShowAccountModal(false); disconnect(); toast.info("Wallet disconnected"); }}
        />
      )}

      <Toaster />
    </div>
  );
}

// ─── Sub-component: input/output legs panel ───────────────────────────────

interface AnyLeg {
  id: string;
  chainId: number;
  ticker: string;
  amount?: string;
  usdPrice?: number;
  allocationBps?: number;
  gasTopUpUSD?: number;
}

function LegsPanel({
  kind, legs, setLegs, mode, disabled, maxAdd, onPickChain, onPickToken,
}: {
  kind: "input" | "output";
  legs: AnyLeg[];
  setLegs: (next: AnyLeg[]) => void;
  mode: BasketMode;
  disabled?: boolean;
  maxAdd: number;
  onPickChain: (legId: string) => void;
  onPickToken: (legId: string) => void;
}) {
  const isInput = kind === "input";
  const title = isInput ? "Inputs" : "Outputs";
  const helpHint = isInput
    ? "Source chains, tokens, and amounts you're putting in."
    : (mode === "one-to-many" || mode === "many-to-many")
        ? "Destination tokens + percentage allocations. Allocations must sum to 100%."
        : "Destination token for the converged basket.";

  const setLeg = (id: string, patch: Partial<AnyLeg>) =>
    setLegs(legs.map((l) => (l.id === id ? { ...l, ...patch } : l)));
  const removeLeg = (id: string) => setLegs(legs.filter((l) => l.id !== id));
  const addLeg = () => {
    if (legs.length >= maxAdd) return;
    const next: AnyLeg = isInput
      ? { id: nextId(), chainId: 42161, ticker: "ETH", amount: "0", usdPrice: priceOf("ETH", 42161) }
      : { id: nextId(), chainId: 8453, ticker: "USDC", allocationBps: 0 };
    setLegs([...legs, next]);
  };

  // Distribute allocations evenly across outputs
  const distributeEvenly = () => {
    if (isInput || legs.length === 0) return;
    const each = Math.floor(10_000 / legs.length);
    const remainder = 10_000 - each * legs.length;
    setLegs(legs.map((l, i) => ({ ...l, allocationBps: each + (i === 0 ? remainder : 0) })));
  };

  return (
    <Card style={{ width: "100%", maxWidth: 480, padding: 22 }}>
      {/* Header — matches swap/cross widget anatomy */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span
            style={{
              fontFamily: "Inter, sans-serif",
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: "0.40em",
              color: "rgba(255,255,255,0.92)",
              textTransform: "uppercase",
            }}
          >
            {title}
          </span>
          <Pill variant="ghost">{legs.length} / {maxAdd}</Pill>
        </div>
      </div>

      <p style={{ margin: "0 0 4px", fontSize: 11, color: "rgba(255,255,255,0.50)", lineHeight: 1.5 }}>
        {helpHint}
      </p>

      <div style={{ display: "flex", flexDirection: "column" }}>
        {legs.map((leg, i) => (
          <LegRow
            key={leg.id}
            index={i + 1}
            kind={kind}
            mode={mode}
            leg={leg}
            onChange={(patch) => setLeg(leg.id, patch)}
            onRemove={() => removeLeg(leg.id)}
            canRemove={legs.length > 1}
            onPickChain={() => onPickChain(leg.id)}
            onPickToken={() => onPickToken(leg.id)}
          />
        ))}
      </div>

      <div style={{ display: "flex", gap: 8, marginTop: 14, flexWrap: "wrap" }}>
        <button
          type="button"
          onClick={addLeg}
          disabled={disabled || legs.length >= maxAdd}
          style={addBtn(disabled || legs.length >= maxAdd)}
        >
          + Add {kind}
        </button>
        {!isInput && (mode === "one-to-many" || mode === "many-to-many") && legs.length > 1 && (
          <button
            type="button"
            onClick={distributeEvenly}
            style={{
              ...addBtn(false),
              background: "transparent",
              border: "1px solid rgba(255,255,255,0.15)",
              color: "rgba(255,255,255,0.70)",
            }}
          >
            Distribute evenly
          </button>
        )}
      </div>
    </Card>
  );
}

const addBtn = (disabled: boolean): React.CSSProperties => ({
  padding: "8px 14px",
  background: disabled ? "rgba(255,255,255,0.04)" : "rgba(255,138,0,0.08)",
  border: `1px solid ${disabled ? "rgba(255,255,255,0.08)" : "rgba(255,138,0,0.30)"}`,
  borderRadius: 4,
  color: disabled ? "rgba(255,255,255,0.30)" : "#FF8A00",
  fontFamily: "Inter, sans-serif",
  fontSize: 11.5,
  fontWeight: 600,
  letterSpacing: "0.10em",
  textTransform: "uppercase",
  cursor: disabled ? "not-allowed" : "pointer",
  transition: "all 160ms ease",
});

// ─── Sub-component: a single leg row ──────────────────────────────────────

// Leg row built on AmountInput anatomy — matches swap/cross widget pattern.
// Top row: index pill + ChainSwitcher (right-aligned, mirroring topMeta).
// Big amount row: token + amount input OR allocation % input.
// Bottom row: gas top-up toggle (output legs only) + remove button.
function LegRow({
  kind, mode, leg, onChange, onRemove, canRemove, index, onPickChain, onPickToken,
}: {
  kind: "input" | "output";
  mode: BasketMode;
  leg: AnyLeg;
  onChange: (patch: Partial<AnyLeg>) => void;
  onRemove: () => void;
  canRemove: boolean;
  index: number;
  onPickChain: () => void;
  onPickToken: () => void;
}) {
  const showAlloc = kind === "output" && (mode === "one-to-many" || mode === "many-to-many");
  const showGasTopUp = kind === "output";
  const chain = CHAINS.find((c) => c.id === leg.chainId) ?? CHAINS[1];

  return (
    <div style={{ padding: "12px 0", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
      {/* Top row — label + ChainSwitcher (mirrors AmountInput topMeta) */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
        <span
          style={{
            fontSize: 10,
            fontWeight: 700,
            letterSpacing: "0.30em",
            color: "rgba(255,255,255,0.55)",
            textTransform: "uppercase",
          }}
        >
          {kind === "input" ? `In · ${index}` : `Out · ${index}`}
        </span>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <ChainSwitcher
            name={chain.name}
            color={chain.color}
            onClick={onPickChain}
            size="md"
          />
          {canRemove && (
            <button
              type="button"
              onClick={onRemove}
              aria-label="Remove leg"
              style={{
                width: 22,
                height: 22,
                background: "transparent",
                border: "1px solid rgba(255,255,255,0.10)",
                borderRadius: 4,
                color: "rgba(255,255,255,0.55)",
                cursor: "pointer",
                padding: 0,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 13,
                lineHeight: 1,
              }}
            >
              ×
            </button>
          )}
        </div>
      </div>

      {/* Big amount row (mirrors AmountInput's large numerals) */}
      <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 10 }}>
        {/* TOKEN selector — opens TokenPicker modal */}
        <TokenSwitcher
          ticker={leg.ticker}
          onClick={onPickToken}
          size="md"
        />

        {/* AMOUNT or ALLOCATION — big right-aligned number */}
        {kind === "input" ? (
          <div style={{ display: "flex", alignItems: "baseline", gap: 4, flex: 1, minWidth: 0, justifyContent: "flex-end" }}>
            <input
              type="text"
              inputMode="decimal"
              value={leg.amount ?? ""}
              onChange={(e) => onChange({ amount: e.target.value })}
              placeholder="0"
              style={{
                width: "100%",
                maxWidth: 180,
                padding: 0,
                background: "transparent",
                border: "none",
                color: "#fff",
                fontFamily: "'Space Grotesk', sans-serif",
                fontSize: 30,
                fontWeight: 500,
                letterSpacing: "-0.02em",
                outline: "none",
                lineHeight: 1,
                textAlign: "right",
              }}
            />
          </div>
        ) : showAlloc ? (
          <div style={{ display: "flex", alignItems: "baseline", gap: 4 }}>
            <input
              type="number"
              min={0}
              max={100}
              step={0.01}
              value={leg.allocationBps != null ? leg.allocationBps / 100 : 0}
              onChange={(e) => onChange({ allocationBps: Math.round(Math.max(0, Math.min(100, Number(e.target.value))) * 100) })}
              style={{
                width: 100,
                padding: 0,
                background: "transparent",
                border: "none",
                color: "#FF8A00",
                fontFamily: "'Space Grotesk', sans-serif",
                fontSize: 30,
                fontWeight: 500,
                letterSpacing: "-0.02em",
                outline: "none",
                lineHeight: 1,
                textAlign: "right",
              }}
            />
            <span style={{ fontSize: 22, color: "rgba(255,255,255,0.50)", fontFamily: "'Space Grotesk', sans-serif", fontWeight: 500, lineHeight: 1 }}>
              %
            </span>
          </div>
        ) : (
          <span style={{ fontSize: 13, color: "rgba(255,255,255,0.45)", fontStyle: "italic", paddingBottom: 4 }}>
            Auto · converged
          </span>
        )}
      </div>

      {/* USD value sub-row (mirrors AmountInput's usdValue line) + optional gas top-up */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, marginTop: 6 }}>
        <span style={{ fontSize: 10.5, color: "rgba(255,255,255,0.45)", fontFamily: "'Space Grotesk', sans-serif" }}>
          {kind === "input" && leg.amount
            ? `≈ $${(Number(leg.amount) * (leg.usdPrice ?? priceOf(leg.ticker, leg.chainId))).toLocaleString("en-US", { maximumFractionDigits: 2 })}`
            : showAlloc && leg.allocationBps
            ? `${(leg.allocationBps / 100).toFixed(2)}% allocation`
            : ""}
        </span>
        {showGasTopUp && <GasTopUpToggle leg={leg} onChange={onChange} />}
      </div>
    </div>
  );
}

function GasTopUpToggle({ leg, onChange }: { leg: AnyLeg; onChange: (p: Partial<AnyLeg>) => void }) {
  const enabled = (leg.gasTopUpUSD ?? 0) > 0;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6, minWidth: 0 }}>
      <button
        type="button"
        onClick={() => onChange({ gasTopUpUSD: enabled ? 0 : 2.5 })}
        style={{
          width: 28,
          height: 16,
          padding: 0,
          background: enabled ? "#FF8A00" : "rgba(255,255,255,0.10)",
          border: "1px solid " + (enabled ? "rgba(255,138,0,0.60)" : "rgba(255,255,255,0.15)"),
          borderRadius: 999,
          cursor: "pointer",
          position: "relative",
          flexShrink: 0,
        }}
        aria-pressed={enabled}
        title="Drop native gas on this destination chain"
      >
        <span
          style={{
            position: "absolute",
            top: 1,
            left: enabled ? 13 : 1,
            width: 12,
            height: 12,
            background: "#fff",
            borderRadius: "50%",
            transition: "left 180ms ease",
          }}
        />
      </button>
      {enabled ? (
        <input
          type="number"
          min={0}
          max={AUTO_FUND_MAX_TOPUP_USD}
          step={0.5}
          value={leg.gasTopUpUSD ?? 0}
          onChange={(e) => onChange({ gasTopUpUSD: Math.max(0, Math.min(AUTO_FUND_MAX_TOPUP_USD, Number(e.target.value))) })}
          style={{ ...inputStyle(), width: 60, fontSize: 11 }}
          title={`Cap ${AUTO_FUND_MAX_TOPUP_USD} USD per leg`}
        />
      ) : (
        <span style={{ fontSize: 10.5, color: "rgba(255,255,255,0.45)" }}>gas drop</span>
      )}
    </div>
  );
}

function selectStyle(): React.CSSProperties {
  return {
    width: "100%",
    padding: "7px 8px",
    background: "rgba(255,255,255,0.03)",
    border: "1px solid rgba(255,255,255,0.10)",
    borderRadius: 4,
    color: "#fff",
    fontFamily: "Inter, sans-serif",
    fontSize: 11.5,
    outline: "none",
    cursor: "pointer",
  };
}

function inputStyle(): React.CSSProperties {
  return {
    width: "100%",
    padding: "7px 9px",
    background: "rgba(255,255,255,0.03)",
    border: "1px solid rgba(255,255,255,0.10)",
    borderRadius: 4,
    color: "#fff",
    fontFamily: "'Space Grotesk', sans-serif",
    fontSize: 12,
    outline: "none",
  };
}

// ─── Liquidator scan card ─────────────────────────────────────────────────

interface ScannedAsset {
  id: string;
  chain: string;
  chainColor: string;
  ticker: string;
  balance: string;
  usd: number;
  selected: boolean;
}

function LiquidatorScanCard() {
  const [scanning, setScanning] = useState(false);
  const [assets, setAssets] = useState<ScannedAsset[] | null>(null);

  const scan = () => {
    setScanning(true);
    setAssets(null);
    setTimeout(() => {
      setAssets([]);
      setScanning(false);
      toast.info("Wallet scanner is preview-only until the basket backend is wired");
    }, 1400);
  };

  const toggleAsset = (id: string) =>
    setAssets((cur) => cur?.map((a) => (a.id === id ? { ...a, selected: !a.selected } : a)) ?? null);
  const setAll = (selected: boolean) =>
    setAssets((cur) => cur?.map((a) => ({ ...a, selected })) ?? null);

  const selectedAssets = (assets ?? []).filter((a) => a.selected);
  const totalSelectedUSD = selectedAssets.reduce((s, a) => s + a.usd, 0);
  const totalAllUSD = (assets ?? []).reduce((s, a) => s + a.usd, 0);
  const preservedUSD = totalAllUSD - totalSelectedUSD;

  return (
    <Card style={{ padding: 16 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6, flexWrap: "wrap", gap: 8 }}>
        <div style={{ minWidth: 0 }}>
          <p style={{ margin: 0, fontSize: 10, letterSpacing: "0.40em", color: "rgba(255,255,255,0.50)", textTransform: "uppercase", fontWeight: 700 }}>
            Wallet scan + asset selection
          </p>
          <p style={{ margin: "4px 0 0", fontSize: 11.5, color: "rgba(255,255,255,0.55)", lineHeight: 1.5 }}>
            Check the tokens to liquidate. Uncheck any you want to preserve. Scan caps: 5 chains × 50 tokens.
          </p>
        </div>
        <Pill variant={assets ? "success" : "ghost"}>
          {assets ? "provider required" : "preview"}
        </Pill>
      </div>

      <div style={{ marginTop: 12 }}>
        <PrimaryButton onClick={scan} disabled={scanning}>
          {scanning ? "Scanning…" : assets ? "Re-scan wallet" : "Scan my wallet"}
        </PrimaryButton>
      </div>

      {assets && (
        <div style={{ marginTop: 14 }}>
          {assets.length === 0 && (
            <div
              style={{
                padding: "11px 12px",
                background: "rgba(255,138,0,0.06)",
                border: "1px solid rgba(255,138,0,0.20)",
                borderRadius: 4,
                fontSize: 11.5,
                color: "rgba(255,255,255,0.70)",
                lineHeight: 1.5,
                marginBottom: 10,
              }}
            >
              WalletScanner is not connected in this UI yet, so no balances are fabricated. This section will populate only after the backend scanner API is available.
            </div>
          )}
          {/* Totals + controls */}
          {assets.length > 0 && <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, flexWrap: "wrap", marginBottom: 10 }}>
            <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
              <Totals label="Liquidating" value={`$${totalSelectedUSD.toLocaleString("en-US", { maximumFractionDigits: 2 })}`} accent />
              <Totals label="Preserving" value={`$${preservedUSD.toLocaleString("en-US", { maximumFractionDigits: 2 })}`} muted />
            </div>
            <div style={{ display: "flex", gap: 6 }}>
              <button
                type="button"
                onClick={() => setAll(true)}
                style={selBtnStyle()}
              >
                Select all
              </button>
              <button
                type="button"
                onClick={() => setAll(false)}
                style={selBtnStyle()}
              >
                None
              </button>
            </div>
          </div>}

          {/* Asset rows with checkboxes */}
          {assets.length > 0 && <div style={{ display: "flex", flexDirection: "column", gap: 4, maxHeight: 280, overflowY: "auto" }}>
            {assets.map((a) => (
              <button
                type="button"
                key={a.id}
                onClick={() => toggleAsset(a.id)}
                style={{
                  display: "grid",
                  gridTemplateColumns: "auto 1fr 1fr 1fr auto",
                  alignItems: "center",
                  gap: 10,
                  padding: "9px 10px",
                  background: a.selected ? "rgba(255,138,0,0.05)" : "rgba(255,255,255,0.02)",
                  border: `1px solid ${a.selected ? "rgba(255,138,0,0.25)" : "rgba(255,255,255,0.05)"}`,
                  borderRadius: 4,
                  fontSize: 11.5,
                  textAlign: "left",
                  cursor: "pointer",
                  color: "#fff",
                  width: "100%",
                  transition: "all 140ms ease",
                }}
              >
                <span
                  aria-hidden
                  style={{
                    width: 16,
                    height: 16,
                    flexShrink: 0,
                    background: a.selected ? "#FF8A00" : "transparent",
                    border: `1.5px solid ${a.selected ? "#FF8A00" : "rgba(255,255,255,0.30)"}`,
                    borderRadius: 3,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "#05050c",
                    fontSize: 11,
                    fontWeight: 800,
                    lineHeight: 1,
                  }}
                >
                  {a.selected ? "✓" : ""}
                </span>
                <span style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
                  <span
                    style={{
                      width: 18,
                      height: 18,
                      background: a.chainColor,
                      borderRadius: 3,
                      flexShrink: 0,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 7,
                      fontWeight: 700,
                    }}
                  />
                  <span style={{ color: a.selected ? "rgba(255,255,255,0.95)" : "rgba(255,255,255,0.55)", fontWeight: 600 }}>{a.ticker}</span>
                </span>
                <span style={{ color: a.selected ? "rgba(255,255,255,0.65)" : "rgba(255,255,255,0.40)" }}>{a.chain}</span>
                <span style={{ color: a.selected ? "rgba(255,255,255,0.75)" : "rgba(255,255,255,0.40)", fontFamily: "'Space Grotesk', sans-serif" }}>{a.balance}</span>
                <span style={{ color: a.selected ? "#fff" : "rgba(255,255,255,0.40)", fontFamily: "'Space Grotesk', sans-serif", textAlign: "right", fontWeight: a.selected ? 600 : 400 }}>
                  ${a.usd.toLocaleString("en-US", { maximumFractionDigits: 2 })}
                </span>
              </button>
            ))}
          </div>}

          {assets.length > 0 && selectedAssets.length === 0 && (
            <p style={{ margin: "10px 0 0", fontSize: 11, color: "#FFB347", lineHeight: 1.45 }}>
              Select at least one asset to liquidate.
            </p>
          )}
        </div>
      )}
    </Card>
  );
}

function Totals({ label, value, accent, muted }: { label: string; value: string; accent?: boolean; muted?: boolean }) {
  return (
    <div>
      <p style={{ margin: 0, fontSize: 9, letterSpacing: "0.30em", color: "rgba(255,255,255,0.45)", textTransform: "uppercase", fontWeight: 700 }}>
        {label}
      </p>
      <p
        style={{
          margin: "2px 0 0",
          fontFamily: "'Space Grotesk', sans-serif",
          fontSize: 16,
          fontWeight: 500,
          color: accent ? "#FF8A00" : muted ? "rgba(255,255,255,0.45)" : "#fff",
          letterSpacing: "-0.01em",
          lineHeight: 1.1,
        }}
      >
        {value}
      </p>
    </div>
  );
}

function selBtnStyle(): React.CSSProperties {
  return {
    padding: "5px 11px",
    background: "transparent",
    border: "1px solid rgba(255,255,255,0.12)",
    borderRadius: 4,
    color: "rgba(255,255,255,0.70)",
    fontFamily: "Inter, sans-serif",
    fontSize: 10.5,
    fontWeight: 600,
    letterSpacing: "0.10em",
    textTransform: "uppercase",
    cursor: "pointer",
  };
}

// ─── Review row primitive ─────────────────────────────────────────────────

function ReviewRow({
  label, value, sub, accent, highlight, warning,
}: {
  label: string;
  value: string | number;
  sub?: string;
  accent?: boolean;
  highlight?: boolean;
  warning?: boolean;
}) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10 }}>
      <span style={{ fontSize: 11.5, color: warning ? "#F87171" : "rgba(255,255,255,0.55)", lineHeight: 1.5 }}>
        {label}
      </span>
      <div style={{ textAlign: "right", maxWidth: "60%" }}>
        <p
          style={{
            margin: 0,
            fontSize: highlight ? 14 : 12.5,
            fontWeight: highlight ? 600 : 500,
            fontFamily: highlight ? "'Space Grotesk', sans-serif" : "Inter, sans-serif",
            letterSpacing: highlight ? "-0.01em" : "normal",
            color: warning ? "#F87171" : accent ? "#FF8A00" : highlight ? "#fff" : "rgba(255,255,255,0.90)",
          }}
        >
          {value}
        </p>
        {sub && (
          <p style={{ margin: "2px 0 0", fontSize: 10.5, color: "rgba(255,255,255,0.40)", lineHeight: 1.45 }}>
            {sub}
          </p>
        )}
      </div>
    </div>
  );
}

// ─── Number input primitive ───────────────────────────────────────────────

function NumInput({
  label, hint, value, setValue,
}: {
  label: string;
  hint?: string;
  value: number;
  setValue: (v: number) => void;
}) {
  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
        <span style={{ fontSize: 11.5, color: "rgba(255,255,255,0.65)" }}>{label}</span>
        <input
          type="number"
          value={value}
          onChange={(e) => setValue(Number(e.target.value))}
          style={{ ...inputStyle(), width: 90, textAlign: "right" }}
        />
      </div>
      {hint && (
        <p style={{ margin: "4px 0 0", fontSize: 10.5, color: "rgba(255,255,255,0.40)", lineHeight: 1.45 }}>
          {hint}
        </p>
      )}
    </div>
  );
}
