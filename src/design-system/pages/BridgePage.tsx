// ─── BridgePage — bridge UI shell (Via Labs rebuild plugs in here) ────────
//
// The Via Labs bridge is queued per D:/empx/ROADMAP-via-labs-bridge.md.
// This page exists as the production UX SHELL so when the SDK work lands,
// engineers swap a few function calls and the page goes live — no UI
// restructure needed.
//
// What works today (UI only — disconnected from any rail):
//   • Source chain → destination chain picker
//   • Amount input with USD preview
//   • Recipient toggle
//   • Route hop visualization
//   • Fee + ETA preview slots
//   • Quote countdown placeholder
//   • Roadmap status panel on the right
//
// What WILL plug in when Via Labs rebuild lands:
//   • Chain set sourced from ViaLabsRailPlugin.supportsRoute()
//   • Quote slot → ViaLabsSolver.quote()
//   • Execute slot → buildExecution() + wallet send
//   • Status slot → AsyncIterable<IntentEvent> stream
//
// The "Bridge" action is disabled with a clear label so users understand
// the page is functional UX but not yet executing real transactions.

import { useMemo, useState } from "react";
import {
  AccountModal,
  BrandMark,
  Card,
  ChainPicker,
  DappNavbar,
  NetworkSelector,
  Pill,
  PrimaryButton,
  QuoteCountdown,
  RouteVisualization,
  SocialTray,
  Toaster,
  TokenPicker,
  WalletButton,
  WalletModal,
  useIsMobile,
  toast,
  type NavLink,
  type PickerChain,
  type PickerToken,
  type RouteHop,
  type WalletOption,
} from "../components";
import { useWalletConnection } from "../hooks/useWalletConnection";
import EmpxBridgeWidget from "../EmpxBridgeWidget";
import { EMPX_SOCIALS } from "./SwapPage";
import {
  formatEtaSeconds,
  tierForChainId,
  tierLabel,
} from "../data/empxRegistry";

// ─── Bridge chain catalog ─────────────────────────────────────────────────
// Reflects the chains the OLD Via Labs bridge served (per
// ROADMAP-via-labs-bridge.md reference material).  When the new SDK lands
// this will be sourced from ViaLabsRailPlugin.supportsRoute().

const BRIDGE_CHAINS: { id: number; name: string; color: string; ticker: string }[] = [
  { id: 369,   name: "PulseChain", color: "#FF66C4", ticker: "PLS" },
  { id: 1,     name: "Ethereum",   color: "#627EEA", ticker: "ETH" },
  { id: 42161, name: "Arbitrum",   color: "#28A0F0", ticker: "ETH" },
  { id: 8453,  name: "Base",       color: "#0052FF", ticker: "ETH" },
  { id: 10,    name: "Optimism",   color: "#FF0420", ticker: "ETH" },
  { id: 137,   name: "Polygon",    color: "#7B3FE4", ticker: "POL" },
  { id: 56,    name: "BSC",        color: "#F0B90B", ticker: "BNB" },
  { id: 43114, name: "Avalanche",  color: "#E84142", ticker: "AVAX" },
];

const TIER_STATUS: { tier: number; title: string; status: "queued" | "in_progress" | "done"; oneLine: string }[] = [
  { tier: 1, title: "Feasibility",     status: "queued", oneLine: "Read Via Labs docs, map onto IRailPlugin" },
  { tier: 2, title: "Implementation",  status: "queued", oneLine: "ViaLabsRailPlugin.sol + ViaLabsSolver.ts" },
  { tier: 3, title: "UI",              status: "in_progress", oneLine: "This page — shell ready, awaiting SDK" },
  { tier: 4, title: "Tokens",          status: "queued", oneLine: "Migrate tokens originally minted via legacy rails" },
];

type ChainPickerTarget = "from" | "to";

export default function BridgePage() {
  const isMobile = useIsMobile();
  const { walletState, walletOptions, onSelectWallet, disconnect, switchChain, currentChain } =
    useWalletConnection();
  const [showWalletModal, setShowWalletModal] = useState(false);
  const [showAccountModal, setShowAccountModal] = useState(false);

  const [fromChainId, setFromChainId] = useState(369);
  const [toChainId, setToChainId] = useState(42161);
  const [token, setToken] = useState("USDC");
  const [amount, setAmount] = useState("100");

  const [useDifferentRecipient, setUseDifferentRecipient] = useState(false);
  const [recipient, setRecipient] = useState("");

  const [chainPickerTarget, setChainPickerTarget] = useState<ChainPickerTarget | null>(null);
  const [tokenPickerOpen, setTokenPickerOpen] = useState(false);
  const [quoteIssuedAt, setQuoteIssuedAt] = useState(Date.now());

  const fromChain = useMemo(() => BRIDGE_CHAINS.find((c) => c.id === fromChainId) ?? BRIDGE_CHAINS[0], [fromChainId]);
  const toChain   = useMemo(() => BRIDGE_CHAINS.find((c) => c.id === toChainId) ?? BRIDGE_CHAINS[1], [toChainId]);

  const amountNum = Number(amount.replace(/,/g, "")) || 0;
  // Demo fee/eta — production sources from ViaLabsSolver.quote()
  const protocolFeeUSD = amountNum * 0.0025; // 25 bps placeholder
  const railFeeUSD = 0.40;
  const totalFeeUSD = protocolFeeUSD + railFeeUSD;
  const outAmount = Math.max(0, amountNum - totalFeeUSD);
  const recipientValid = !useDifferentRecipient || /^0x[0-9a-fA-F]{40}$/.test(recipient.trim());

  const chainPickerList: PickerChain[] = useMemo(
    () =>
      BRIDGE_CHAINS.map((c) => {
        const tier = tierForChainId(c.id);
        return {
          id: c.id,
          name: c.name,
          ticker: c.ticker,
          color: c.color,
          tier,
          tierLabel: tierLabel(tier),
        };
      }),
    [],
  );

  const routeHops: RouteHop[] = useMemo(
    () => [
      { ticker: token, chainName: fromChain.name, chainColor: fromChain.color, via: "Lock on source" },
      { ticker: token, chainName: toChain.name,   chainColor: toChain.color,   via: "Mint on destination" },
    ],
    [fromChain, toChain, token],
  );

  const flip = () => {
    const fc = fromChainId;
    setFromChainId(toChainId);
    setToChainId(fc);
  };

  const navLinks: NavLink[] = [
    { label: "Swap",      href: "/swap-v2" },
    { label: "Cross",     href: "/cross-v2" },
    { label: "Bridge",    href: "/bridge-v2", active: true },
    { label: "Multi",     href: "/multi-v2", badge: "NEW" },
    { label: "Gas",       href: "/gas-v2" },
    { label: "Widget",    href: "/widget-v2" },
    { label: "Portfolio", href: "/portfolio-v2" },
  ];

  return (
    <div style={{ minHeight: "100vh", background: "#05050c", color: "#fff", fontFamily: "Inter, sans-serif" }}>
      <DappNavbar
        links={navLinks}
        socials={<SocialTray links={EMPX_SOCIALS} withSeparator />}
        controls={
          <>
            <NetworkSelector
              name={fromChain.name}
              color={fromChain.color}
              onClick={() => setChainPickerTarget("from")}
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
        <header style={{ marginBottom: isMobile ? 20 : 26 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8, flexWrap: "wrap" }}>
            <p style={{ margin: 0, fontSize: 10, letterSpacing: "0.40em", color: "#FF8A00", textTransform: "uppercase", fontWeight: 700 }}>
              BRIDGE · MULTI-RAIL
            </p>
            <Pill variant="info">Shell ready · awaiting rail SDK</Pill>
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
            Bridge.{" "}
            <span style={{ fontFamily: "'Instrument Serif', serif", fontStyle: "italic", color: "#FF8A00", letterSpacing: "-0.02em" }}>
              Any chain. Any pair.
            </span>
          </h1>
          <p style={{ margin: "12px 0 0", fontSize: 13, color: "rgba(255,255,255,0.65)", lineHeight: 1.6, maxWidth: 720 }}>
            Lock-and-mint bridge for any-asset, any-chain pairs. EmpX is multi-chain by design — bridge rails compose into the routing engine and surface here as standalone entries. The UI is final; the underlying SDK is being rebuilt against updated rail architectures. For multi-rail cross-chain swaps today, use{" "}
            <a href="/cross-v2" style={{ color: "#FF8A00", textDecoration: "none", borderBottom: "1px solid rgba(255,138,0,0.40)" }}>
              cross-chain
            </a>.
          </p>
        </header>

        {/* Body */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: isMobile ? "1fr" : "minmax(0, 1.3fr) minmax(0, 1fr)",
            gap: isMobile ? 18 : 28,
            alignItems: "start",
          }}
        >
          {/* LEFT — bridge widget (same anatomy as swap/cross widgets) */}
          <div style={{ display: "flex", justifyContent: "center" }}>
            <EmpxBridgeWidget
              fromChain={{ id: fromChain.id, name: fromChain.name, color: fromChain.color }}
              fromToken={{ ticker: token }}
              fromAmount={amount}
              fromBalance={undefined}
              fromUsdValue={amountNum}
              onFromAmountChange={setAmount}
              onSelectFromToken={() => setTokenPickerOpen(true)}
              onSelectFromChain={() => setChainPickerTarget("from")}
              onPercentClick={undefined}

              toChain={{ id: toChain.id, name: toChain.name, color: toChain.color }}
              toToken={{ ticker: token }}
              toAmount={outAmount > 0 ? outAmount.toLocaleString("en-US", { maximumFractionDigits: 4 }) : "0"}
              toUsdValue={outAmount}
              onSelectToToken={() => setTokenPickerOpen(true)}
              onSelectToChain={() => setChainPickerTarget("to")}

              protocolFeeBps={25}
              protocolFeeUSD={protocolFeeUSD}
              bridgeFeeUSD={railFeeUSD}
              estimatedTime={formatEtaSeconds(180)}
              minimumReceived={`${(outAmount * 0.997).toFixed(4)} ${token}`}
              slippageBps={30}
              routeHops={routeHops}

              swapDisabled
              swapLabel="Bridge — not active"
              comingSoonHint="Bridge surface is built. Execution is gated on the rail SDK landing."
              onSwap={() => toast.info("Bridge not active yet")}
              onFlip={flip}

              walletConnected={walletState.status === "connected"}
              onConnect={() => setShowWalletModal(true)}
            />
          </div>

          {/* RIGHT — review + roadmap status */}
          <aside style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <Card style={{ padding: 16, position: "relative", overflow: "hidden" }}>
              <div style={{ position: "absolute", top: -16, right: -16, opacity: 0.05, pointerEvents: "none" }}>
                <BrandMark size={110} color="#FF8A00" />
              </div>

              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
                <p style={{ margin: 0, fontSize: 10, letterSpacing: "0.40em", color: "rgba(255,255,255,0.50)", textTransform: "uppercase", fontWeight: 700 }}>
                  Route preview
                </p>
                {walletState.status === "connected" && (
                  <QuoteCountdown
                    totalMs={30000}
                    issuedAt={quoteIssuedAt}
                    onRefresh={() => { setQuoteIssuedAt(Date.now()); toast.info("Quote refreshed"); }}
                    compact
                  />
                )}
              </div>

              <RouteVisualization hops={routeHops} />

              <div style={{ marginTop: 14, display: "flex", flexDirection: "column", gap: 8 }}>
                <ReviewRow label="Bridge model" value="Lock & mint" />
                <ReviewRow label="Protocol fee" value={`${(0.0025 * 10_000).toFixed(0)} bps`} sub={`· $${protocolFeeUSD.toFixed(2)}`} accent />
                <ReviewRow label="Rail fee"     value={`$${railFeeUSD.toFixed(2)}`} />
                <ReviewRow label="Total fee"    value={`$${totalFeeUSD.toFixed(2)}`} />
                <ReviewRow label="You receive"  value={`${outAmount.toLocaleString("en-US", { maximumFractionDigits: 4 })} ${token}`} highlight />
                <ReviewRow label="Est. delivery" value={formatEtaSeconds(180)} sub="baseline · live ETA on quote" />
              </div>
            </Card>

            {/* Roadmap status — compact */}
            <Card style={{ padding: 14 }}>
              <p style={{ margin: 0, fontSize: 10, letterSpacing: "0.40em", color: "rgba(255,255,255,0.50)", textTransform: "uppercase", fontWeight: 700 }}>
                Rebuild status
              </p>
              <p style={{ margin: "6px 0 12px", fontSize: 10.5, color: "rgba(255,255,255,0.55)", lineHeight: 1.5 }}>
                Mirrors <code style={{ color: "rgba(255,255,255,0.85)" }}>ROADMAP-via-labs-bridge.md</code>. UI tier already done — engineers just swap the SDK calls.
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {TIER_STATUS.map((t) => (
                  <TierRow key={t.tier} tier={t} />
                ))}
              </div>
            </Card>

            <Card style={{ padding: 14 }}>
              <p style={{ margin: 0, fontSize: 10, letterSpacing: "0.40em", color: "rgba(255,255,255,0.50)", textTransform: "uppercase", fontWeight: 700 }}>
                Plug-in points
              </p>
              <ul style={{ margin: "8px 0 0", padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 6 }}>
                {[
                  ["Chain list",  "ViaLabsRailPlugin.supportsRoute()"],
                  ["Quote",       "ViaLabsSolver.quote()"],
                  ["Execute",     "buildExecution() + wallet.send()"],
                  ["Status",      "AsyncIterable<IntentEvent>"],
                ].map(([label, target]) => (
                  <li key={label} style={{ display: "flex", justifyContent: "space-between", gap: 10, fontSize: 11, color: "rgba(255,255,255,0.65)", lineHeight: 1.5 }}>
                    <span>{label}</span>
                    <code style={{ color: "rgba(255,255,255,0.55)", fontSize: 10 }}>{target}</code>
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

      {chainPickerTarget && (
        <ChainPicker
          open={!!chainPickerTarget}
          onClose={() => setChainPickerTarget(null)}
          chains={chainPickerList}
          selectedId={chainPickerTarget === "from" ? fromChainId : toChainId}
          mode="swap"
          onSelect={(c) => {
            if (chainPickerTarget === "from") setFromChainId(c.id);
            else setToChainId(c.id);
            setChainPickerTarget(null);
          }}
        />
      )}

      {/* Token picker — same token list on both source + destination (lock-and-mint) */}
      <TokenPicker
        open={tokenPickerOpen}
        onClose={() => setTokenPickerOpen(false)}
        tokens={[
          { ticker: "USDC", name: "USD Coin",       chainName: fromChain.name, chainColor: fromChain.color, badge: "VERIFIED" },
          { ticker: "USDT", name: "Tether",         chainName: fromChain.name, chainColor: fromChain.color, badge: "VERIFIED" },
          { ticker: "WETH", name: "Wrapped Ether",  chainName: fromChain.name, chainColor: fromChain.color },
          { ticker: "PLS",  name: "Pulse",          chainName: fromChain.name, chainColor: fromChain.color },
          { ticker: "HEX",  name: "HEX",            chainName: fromChain.name, chainColor: fromChain.color },
          { ticker: "PLSX", name: "PulseX",         chainName: fromChain.name, chainColor: fromChain.color },
        ]}
        recent={[
          { ticker: "USDC", name: "USD Coin", chainName: fromChain.name, chainColor: fromChain.color },
          { ticker: "PLS",  name: "Pulse",    chainName: fromChain.name, chainColor: fromChain.color },
        ]}
        selected={token}
        onSelect={(t) => { setToken(t.ticker); setTokenPickerOpen(false); toast.info(`Token → ${t.ticker}`); }}
      />

      {walletState.status === "connected" && (
        <AccountModal
          open={showAccountModal}
          onClose={() => setShowAccountModal(false)}
          address={walletState.address}
          providerName={walletState.providerName}
          chainName={fromChain.name}
          chainColor={fromChain.color}
          balanceUSD={51570.49}
          nativeBalance="12.45"
          nativeTicker={fromChain.ticker}
          explorerUrl={`https://etherscan.io/address/${walletState.address}`}
          onCopy={() => toast.success("Address copied")}
          onSwitchNetwork={() => { setShowAccountModal(false); setChainPickerTarget("from"); }}
          onSwitchWallet={() => { setShowAccountModal(false); setShowWalletModal(true); }}
          onDisconnect={() => { setShowAccountModal(false); disconnect(); toast.info("Wallet disconnected"); }}
        />
      )}

      <Toaster />
    </div>
  );
}

// ─── Sub-components ──────────────────────────────────────────────────────

function ReviewRow({
  label, value, sub, accent, highlight,
}: {
  label: string;
  value: string | number;
  sub?: string;
  accent?: boolean;
  highlight?: boolean;
}) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10 }}>
      <span style={{ fontSize: 11.5, color: "rgba(255,255,255,0.55)", lineHeight: 1.5 }}>{label}</span>
      <div style={{ textAlign: "right", maxWidth: "65%" }}>
        <p
          style={{
            margin: 0,
            fontSize: highlight ? 14 : 12.5,
            fontWeight: highlight ? 600 : 500,
            fontFamily: highlight ? "'Space Grotesk', sans-serif" : "Inter, sans-serif",
            letterSpacing: highlight ? "-0.01em" : "normal",
            color: accent ? "#FF8A00" : highlight ? "#fff" : "rgba(255,255,255,0.90)",
          }}
        >
          {value}
          {sub && <span style={{ fontSize: 10.5, color: "rgba(255,255,255,0.45)", fontWeight: 400, marginLeft: 4 }}>{sub}</span>}
        </p>
      </div>
    </div>
  );
}

function TierRow({ tier }: { tier: typeof TIER_STATUS[number] }) {
  const color =
    tier.status === "done"        ? "#34D399"
    : tier.status === "in_progress" ? "#FF8A00"
    : "rgba(255,255,255,0.30)";
  const label =
    tier.status === "done" ? "Done"
    : tier.status === "in_progress" ? "Active"
    : "Queued";
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "8px 10px",
        background: tier.status === "in_progress" ? "rgba(255,138,0,0.04)" : "rgba(255,255,255,0.02)",
        border: `1px solid ${tier.status === "in_progress" ? "rgba(255,138,0,0.25)" : "rgba(255,255,255,0.05)"}`,
        borderRadius: 4,
      }}
    >
      <span
        style={{
          fontFamily: "'Space Grotesk', sans-serif",
          fontSize: 13,
          color,
          fontWeight: 500,
          letterSpacing: "-0.02em",
          minWidth: 22,
        }}
      >
        T{tier.tier}
      </span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ margin: 0, fontSize: 11.5, color: "#fff", fontWeight: 600 }}>{tier.title}</p>
        <p style={{ margin: "1px 0 0", fontSize: 10.5, color: "rgba(255,255,255,0.50)", lineHeight: 1.4 }}>
          {tier.oneLine}
        </p>
      </div>
      <span
        style={{
          fontSize: 9,
          fontWeight: 700,
          letterSpacing: "0.18em",
          color,
          textTransform: "uppercase",
          padding: "2px 6px",
          borderRadius: 2,
          border: `1px solid ${tier.status === "in_progress" ? "rgba(255,138,0,0.30)" : tier.status === "done" ? "rgba(52,211,153,0.30)" : "rgba(255,255,255,0.10)"}`,
          background: tier.status === "in_progress" ? "rgba(255,138,0,0.10)" : tier.status === "done" ? "rgba(52,211,153,0.10)" : "rgba(255,255,255,0.03)",
        }}
      >
        {label}
      </span>
    </div>
  );
}
