// ─── GasPage — standalone native-gas top-up (Gas.zip direct integration) ──
//
// PURPOSE & HONEST SCOPE:
//   Send native gas from one source chain to 1–5 destination chains in a
//   SINGLE transaction.  Native → native only (no token swaps).
//
//   This page integrates with Gas.zip's public backend (https://backend.gas.zip/v2)
//   DIRECTLY — NOT through the empx-cross-bridge SDK.  That distinction matters:
//
//     • /cross-v2 uses Gas.zip as ONE OF 12 rails consumed by our SDK; gas
//       drops are an optional side-leg on top of a real cross-chain swap.
//     • /gas-v2 (this page) is a thin client over Gas.zip's own API for
//       pure native-only top-ups when there's no swap to bundle them with.
//
//   We surface this honestly to users via a disclosure pill in the header
//   so they understand why fees / coverage may differ from /cross-v2's
//   gas-drop toggle.
//
// EXISTING WIRING WE'D REUSE WHEN GOING LIVE:
//   • hooks/useGasBridgeAPI.js
//       - useGetChains()           — Gas.zip supported chains (cache: Infinity)
//       - useGetQuote({ fromChain, amount, toChains })       — multi-dest!
//       - useGetQuoteReverse({ fromChain, amountOut, toChain }) — reverse
//       - useGetCalldataQuote(...) — tx calldata for the bridge
//       - useGetUserHistory({ address })
//       - useSearchTransaction({ hash })
//   • hooks/useGasBridgeTx.js     — wagmi send + status polling
//   • redux/store/gasBridgeStore.js — zustand (fromChainId, toChainId, amount, recipient)
//
// THIS FILE IS A STYLED DEMO (per user direction 2026-06-07):
//   Quote + send are stubbed.  Chain list + history would be live in
//   production — easy switch to the React Query hooks above.

import { useMemo, useState } from "react";
import {
  AccountModal,
  BrandMark,
  Card,
  ChainPicker,
  ConfirmTradeModal,
  DappNavbar,
  FeeBreakdown,
  NetworkSelector,
  Pill,
  PrimaryButton,
  QuoteCountdown,
  SocialTray,
  Tabs,
  Toaster,
  TradeSuccessModal,
  WalletButton,
  WalletModal,
  useIsMobile,
  toast,
  type FeeRow,
  type NavLink,
  type PickerChain,
  type WalletOption,
} from "../components";
import { useWalletConnection } from "../hooks/useWalletConnection";
import EmpxGasWidget from "../EmpxGasWidget";
import { EMPX_SOCIALS } from "./SwapPage";
import {
  formatEtaSeconds,
  tierForChainId,
  tierLabel,
} from "../data/empxRegistry";

// ─── Constants ────────────────────────────────────────────────────────────

const MAX_DESTINATIONS = 5;
const PER_DEST_USD_PRESETS = [5, 10, 20, 50];

// Chain set Gas.zip supports — production sources this from
// useGetChains().  Demo seed is a representative subset.
const GAS_CHAINS: { id: number; name: string; color: string; ticker: string; nativeUsd: number; gasUsdPerSwap: number }[] = [
  { id: 1,     name: "Ethereum",   color: "#627EEA", ticker: "ETH",  nativeUsd: 3184,   gasUsdPerSwap: 8.20 },
  { id: 42161, name: "Arbitrum",   color: "#28A0F0", ticker: "ETH",  nativeUsd: 3184,   gasUsdPerSwap: 0.28 },
  { id: 8453,  name: "Base",       color: "#0052FF", ticker: "ETH",  nativeUsd: 3184,   gasUsdPerSwap: 0.18 },
  { id: 10,    name: "Optimism",   color: "#FF0420", ticker: "ETH",  nativeUsd: 3184,   gasUsdPerSwap: 0.22 },
  { id: 137,   name: "Polygon",    color: "#7B3FE4", ticker: "POL",  nativeUsd: 0.72,   gasUsdPerSwap: 0.04 },
  { id: 56,    name: "BSC",        color: "#F0B90B", ticker: "BNB",  nativeUsd: 612,    gasUsdPerSwap: 0.30 },
  { id: 43114, name: "Avalanche",  color: "#E84142", ticker: "AVAX", nativeUsd: 38,     gasUsdPerSwap: 0.16 },
  { id: 369,   name: "PulseChain", color: "#FF66C4", ticker: "PLS",  nativeUsd: 0.00007,gasUsdPerSwap: 0.001 },
  { id: 146,   name: "Sonic",      color: "#FE9A4D", ticker: "S",    nativeUsd: 0.42,   gasUsdPerSwap: 0.02 },
];

// ─── Page state ───────────────────────────────────────────────────────────

interface Destination {
  id: string;
  chainId: number;
  /** Target USD value of native gas on this destination */
  usd: number;
}

type ActiveTab = "send" | "history" | "lookup";

type ChainPickerTarget =
  | { kind: "source" }
  | { kind: "destination"; destId: string };

function nextId() { return Math.random().toString(36).slice(2, 9); }

export default function GasPage() {
  const isMobile = useIsMobile();
  const { walletState, walletOptions, onSelectWallet, disconnect, switchChain, currentChain } =
    useWalletConnection();
  const [showWalletModal, setShowWalletModal] = useState(false);
  const [showAccountModal, setShowAccountModal] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const [tab, setTab] = useState<ActiveTab>("send");

  // Source + destinations
  const [sourceChainId, setSourceChainId] = useState(42161); // Arbitrum default
  const [destinations, setDestinations] = useState<Destination[]>([
    { id: nextId(), chainId: 8453, usd: 10 },
  ]);

  // Recipient — defaults to connected wallet; expose only via toggle
  const [useDifferentRecipient, setUseDifferentRecipient] = useState(false);
  const [recipient, setRecipient] = useState("");

  // Chain picker state
  const [chainPickerTarget, setChainPickerTarget] = useState<ChainPickerTarget | null>(null);

  const [quoteIssuedAt, setQuoteIssuedAt] = useState(Date.now());

  // ── Derived ─────────────────────────────────────────────────────────────
  const sourceChain = useMemo(
    () => GAS_CHAINS.find((c) => c.id === sourceChainId) ?? GAS_CHAINS[1],
    [sourceChainId],
  );

  // Total USD across destinations
  const totalDestUSD = destinations.reduce((s, d) => s + (d.usd || 0), 0);
  // Bridge fee = 0.5% flat in Gas.zip's pricing (typical floor) — production
  // returns the real value via useGetQuote(...).fee.
  const bridgeFeeUSD = totalDestUSD * 0.005;
  const totalCostUSD = totalDestUSD + bridgeFeeUSD;
  const sourceAmountNative = totalCostUSD / sourceChain.nativeUsd;

  // Validity
  const destsValid = destinations.length > 0
    && destinations.every((d) => d.usd > 0 && d.chainId !== sourceChainId);
  const recipientValid = !useDifferentRecipient || /^0x[0-9a-fA-F]{40}$/.test(recipient.trim());
  const canSubmit = destsValid && recipientValid && walletState.status === "connected";

  // Chain picker list — apply tier badging
  const chainPickerList: PickerChain[] = useMemo(() => {
    return GAS_CHAINS.map((c) => {
      const tier = tierForChainId(c.id);
      return {
        id: c.id,
        name: c.name,
        ticker: c.ticker,
        color: c.color,
        tier,
        tierLabel: tierLabel(tier),
      };
    });
  }, []);

  // ── Mutators ────────────────────────────────────────────────────────────
  const addDestination = () => {
    if (destinations.length >= MAX_DESTINATIONS) return;
    // Pick a chain that's not source + not already a destination
    const usedIds = new Set([sourceChainId, ...destinations.map((d) => d.chainId)]);
    const available = GAS_CHAINS.find((c) => !usedIds.has(c.id)) ?? GAS_CHAINS[2];
    setDestinations([...destinations, { id: nextId(), chainId: available.id, usd: 10 }]);
  };
  const removeDestination = (id: string) => {
    setDestinations(destinations.filter((d) => d.id !== id));
  };
  const setDestUsd = (id: string, usd: number) => {
    setDestinations(destinations.map((d) => (d.id === id ? { ...d, usd } : d)));
  };
  const setDestChain = (id: string, chainId: number) => {
    setDestinations(destinations.map((d) => (d.id === id ? { ...d, chainId } : d)));
  };

  const onSubmit = () => {
    if (walletState.status !== "connected") { setShowWalletModal(true); return; }
    if (!canSubmit) return;
    setQuoteIssuedAt(Date.now());
    setShowConfirm(true);
  };

  const navLinks: NavLink[] = [
    { label: "Swap",      href: "/swap-v2" },
    { label: "Cross",     href: "/cross-v2" },
    { label: "Bridge",    href: "/bridge-v2" },
    { label: "Multi",     href: "/multi-v2", badge: "NEW" },
    { label: "Gas",       href: "/gas-v2", active: true },
    { label: "Widget",    href: "/widget-v2" },
    { label: "Portfolio", href: "/portfolio-v2" },
  ];

  // ─── Render ──────────────────────────────────────────────────────────────
  return (
    <div style={{ minHeight: "100vh", background: "#05050c", color: "#fff", fontFamily: "Inter, sans-serif" }}>
      <DappNavbar
        links={navLinks}
        socials={<SocialTray links={EMPX_SOCIALS} withSeparator />}
        controls={
          <>
            <NetworkSelector
              name={sourceChain.name}
              color={sourceChain.color}
              onClick={() => setChainPickerTarget({ kind: "source" })}
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
              GAS · MULTI-DESTINATION
            </p>
            <Pill variant="info">Direct Gas.zip · bypasses SDK rails</Pill>
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
            Gas.{" "}
            <span style={{ fontFamily: "'Instrument Serif', serif", fontStyle: "italic", color: "#FF8A00", letterSpacing: "-0.02em" }}>
              Wherever you're going next.
            </span>
          </h1>
          <p style={{ margin: "12px 0 0", fontSize: 13, color: "rgba(255,255,255,0.65)", lineHeight: 1.6, maxWidth: 720 }}>
            Top up native gas on 1–{MAX_DESTINATIONS} destination chains in a single source transaction.
            For gas drops bundled with a swap, use{" "}
            <a href="/cross-v2" style={{ color: "#FF8A00", textDecoration: "none", borderBottom: "1px solid rgba(255,138,0,0.40)" }}>
              cross-chain swap
            </a>{" "}with the gas-drop toggle.
          </p>
        </header>

        {/* Tabs */}
        <div style={{ marginBottom: 16 }}>
          <Tabs
            options={[
              { value: "send" as const,    label: "Send gas" },
              { value: "history" as const, label: "History" },
              { value: "lookup" as const,  label: "Tx lookup" },
            ]}
            active={tab}
            onChange={setTab}
            variant="underline"
          />
        </div>

        {tab === "send" && (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: isMobile ? "1fr" : "minmax(0, 1.3fr) minmax(0, 1fr)",
              gap: isMobile ? 18 : 28,
              alignItems: "start",
            }}
          >
            {/* LEFT — gas widget (same anatomy as swap/cross widgets) */}
            <div style={{ display: "flex", justifyContent: "center" }}>
              <EmpxGasWidget
                sourceChain={{ id: sourceChain.id, name: sourceChain.name, color: sourceChain.color, ticker: sourceChain.ticker }}
                sourceAmount={sourceAmountNative > 0 ? sourceAmountNative.toFixed(sourceAmountNative < 0.01 ? 6 : 4) : "0"}
                sourceUsdValue={totalCostUSD}
                sourceBalance={undefined}
                onSelectSourceChain={() => setChainPickerTarget({ kind: "source" })}
                destinations={destinations.map((d) => {
                  const c = GAS_CHAINS.find((g) => g.id === d.chainId) ?? GAS_CHAINS[2];
                  return {
                    id: d.id,
                    chain: { id: c.id, name: c.name, color: c.color, ticker: c.ticker },
                    usd: d.usd,
                    nativeOut: c.nativeUsd > 0 ? d.usd / c.nativeUsd : 0,
                    swapsBuyable: Math.floor(d.usd / c.gasUsdPerSwap),
                  };
                })}
                maxDestinations={MAX_DESTINATIONS}
                onSelectDestinationChain={(destId) => setChainPickerTarget({ kind: "destination", destId })}
                onSetDestinationUsd={setDestUsd}
                onRemoveDestination={removeDestination}
                onAddDestination={addDestination}
                presets={PER_DEST_USD_PRESETS}
                bridgeFeeUSD={bridgeFeeUSD}
                estimatedTime={formatEtaSeconds(75)}
                useDifferentRecipient={useDifferentRecipient}
                onToggleRecipient={() => setUseDifferentRecipient(!useDifferentRecipient)}
                recipient={recipient}
                onSetRecipient={setRecipient}
                recipientValid={recipientValid}
                canSubmit={destsValid && recipientValid}
                swapLabel={destinations.length === 1 ? `Send gas to ${GAS_CHAINS.find((c) => c.id === destinations[0].chainId)?.name ?? "destination"}` : `Send gas to ${destinations.length} chains`}
                onSubmit={onSubmit}
                walletConnected={walletState.status === "connected"}
                onConnect={() => setShowWalletModal(true)}
              />
            </div>


            {/* RIGHT — review + execute */}
            <aside style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <Card style={{ padding: 16, position: "relative", overflow: "hidden" }}>
                <div style={{ position: "absolute", top: -16, right: -16, opacity: 0.05, pointerEvents: "none" }}>
                  <BrandMark size={110} color="#FF8A00" />
                </div>

                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
                  <p style={{ margin: 0, fontSize: 10, letterSpacing: "0.40em", color: "rgba(255,255,255,0.50)", textTransform: "uppercase", fontWeight: 700 }}>
                    Review
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

                <FeeBreakdown
                  rows={(() => {
                    const rows: FeeRow[] = [
                      { label: "Destinations",     value: `${destinations.length} chain${destinations.length === 1 ? "" : "s"}` },
                      { label: "Total to deliver", value: `$${totalDestUSD.toFixed(2)}` },
                      { label: "Bridge fee",       value: `$${bridgeFeeUSD.toFixed(2)}`, sub: "0.5% demo", accent: true },
                      { label: `You send`,         value: `${sourceAmountNative.toFixed(6)} ${sourceChain.ticker}`, sub: `~$${totalCostUSD.toFixed(2)}` },
                      { label: "Est. delivery",    value: formatEtaSeconds(75), muted: true },
                    ];
                    return rows;
                  })()}
                  bordered
                />

                {!destsValid && (
                  <p style={{ margin: "12px 0 0", fontSize: 11, color: "#FFB347", lineHeight: 1.5 }}>
                    Set a USD amount &gt; 0 on each destination, and make sure none equal the source chain.
                  </p>
                )}
                {useDifferentRecipient && recipient.length > 0 && !recipientValid && (
                  <p style={{ margin: "6px 0 0", fontSize: 11, color: "#F87171", lineHeight: 1.5 }}>
                    Recipient must be a 0x… address.
                  </p>
                )}

                <div style={{ marginTop: 14 }}>
                  <PrimaryButton onClick={onSubmit} disabled={!destsValid || !recipientValid}>
                    {walletState.status !== "connected"
                      ? "Connect wallet"
                      : destinations.length === 1
                      ? `Send gas to ${GAS_CHAINS.find((c) => c.id === destinations[0].chainId)?.name ?? "destination"}`
                      : `Send gas to ${destinations.length} chains`}
                  </PrimaryButton>
                </div>
              </Card>

              {/* Honest disclosure */}
              <Card style={{ padding: 14 }}>
                <p style={{ margin: 0, fontSize: 10, letterSpacing: "0.40em", color: "rgba(255,255,255,0.50)", textTransform: "uppercase", fontWeight: 700 }}>
                  How this works
                </p>
                <ul style={{ margin: "8px 0 0", padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 6 }}>
                  {[
                    "Page integrates DIRECTLY with Gas.zip's public backend.",
                    "Does NOT route through the EmpX cross-chain rails / SDK.",
                    "For gas drops bundled with a swap, use /cross-v2.",
                    "One source tx fans out to all selected destinations.",
                  ].map((line, i) => (
                    <li key={i} style={{ display: "flex", gap: 10, fontSize: 11, color: "rgba(255,255,255,0.65)", lineHeight: 1.55 }}>
                      <span style={{ color: "#FF8A00", flexShrink: 0, marginTop: 1 }}>•</span>
                      <span>{line}</span>
                    </li>
                  ))}
                </ul>
              </Card>

              {/* SDK source */}
              <Card style={{ padding: 14 }}>
                <p style={{ margin: 0, fontSize: 10, letterSpacing: "0.40em", color: "rgba(255,255,255,0.50)", textTransform: "uppercase", fontWeight: 700 }}>
                  Backed by
                </p>
                <ul style={{ margin: "8px 0 0", padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 6 }}>
                  {[
                    ["hooks/useGasBridgeAPI.js", "Gas.zip /v2 endpoints"],
                    ["hooks/useGasBridgeTx.js",  "wagmi send + status poll"],
                    ["redux/store/gasBridgeStore.js", "form state (zustand)"],
                  ].map(([f, role]) => (
                    <li key={f} style={{ fontSize: 11, color: "rgba(255,255,255,0.60)", lineHeight: 1.5 }}>
                      <code style={{ color: "rgba(255,255,255,0.85)" }}>{f}</code>{" — "}{role}
                    </li>
                  ))}
                </ul>
              </Card>
            </aside>
          </div>
        )}

        {tab === "history" && <HistoryStub />}
        {tab === "lookup"  && <LookupStub />}
      </main>

      {/* Wallet modal */}
      <WalletModal
        open={showWalletModal}
        onClose={() => setShowWalletModal(false)}
        wallets={walletOptions}
        onSelect={(w) => {
          setShowWalletModal(false);
          onSelectWallet(w);
        }}
      />

      {/* Chain picker — both source and per-destination */}
      {chainPickerTarget && (
        <ChainPicker
          open={!!chainPickerTarget}
          onClose={() => setChainPickerTarget(null)}
          chains={chainPickerList}
          selectedId={
            chainPickerTarget.kind === "source"
              ? sourceChainId
              : destinations.find((d) => d.id === chainPickerTarget.destId)?.chainId
          }
          mode="swap"
          onSelect={(c) => {
            if (chainPickerTarget.kind === "source") {
              setSourceChainId(c.id);
              // If new source matches any destination, remove that destination
              setDestinations((cur) => cur.filter((d) => d.chainId !== c.id));
            } else {
              setDestChain(chainPickerTarget.destId, c.id);
            }
            setChainPickerTarget(null);
          }}
        />
      )}

      {/* Confirm before send */}
      <ConfirmTradeModal
        open={showConfirm}
        onClose={() => setShowConfirm(false)}
        onConfirm={() => { setShowConfirm(false); setShowSuccess(true); }}
        eyebrow="REVIEW · GAS BUNDLE"
        title="Confirm gas top-up"
        fromTicker={sourceChain.ticker}
        fromAmount={sourceAmountNative.toFixed(6)}
        fromChainName={sourceChain.name}
        toTicker={destinations.length === 1
          ? (GAS_CHAINS.find((c) => c.id === destinations[0].chainId)?.ticker ?? "GAS")
          : `${destinations.length} chains`}
        toAmount={`$${totalDestUSD.toFixed(2)}`}
        toChainName={destinations.length === 1
          ? (GAS_CHAINS.find((c) => c.id === destinations[0].chainId)?.name ?? "")
          : "multi-destination"}
        feeRows={[
          { label: "Destinations",     value: `${destinations.length} chain${destinations.length === 1 ? "" : "s"}` },
          { label: "Total to deliver", value: `$${totalDestUSD.toFixed(2)}` },
          { label: "Bridge fee",       value: `$${bridgeFeeUSD.toFixed(2)}`, sub: "0.5%", accent: true },
          { label: "Source amount",    value: `${sourceAmountNative.toFixed(6)} ${sourceChain.ticker}` },
          { label: "Est. delivery",    value: formatEtaSeconds(75), muted: true },
        ]}
        quoteIssuedAt={quoteIssuedAt}
        quoteValidMs={30000}
        onRefreshQuote={() => setQuoteIssuedAt(Date.now())}
        warning={destinations.length > 1
          ? "One source tx fans out to all destinations. Each landing is independent — partial fills possible if a rail stalls."
          : undefined}
      />

      {/* Success after send */}
      <TradeSuccessModal
        open={showSuccess}
        onClose={() => setShowSuccess(false)}
        kind="GAS BUNDLE"
        fromTicker={sourceChain.ticker}
        fromAmount={sourceAmountNative.toFixed(6)}
        fromChainName={sourceChain.name}
        toTicker={destinations.length === 1
          ? (GAS_CHAINS.find((c) => c.id === destinations[0].chainId)?.ticker ?? "GAS")
          : `${destinations.length} chains`}
        toAmount={`$${totalDestUSD.toFixed(2)}`}
        toChainName={destinations.length === 1
          ? (GAS_CHAINS.find((c) => c.id === destinations[0].chainId)?.name ?? "")
          : "multi-destination"}
        message={destinations.length === 1
          ? `Gas delivered on ${GAS_CHAINS.find((c) => c.id === destinations[0].chainId)?.name}`
          : `Gas delivered across ${destinations.length} chains`}
        timeline={[
          { label: "Source confirmation", description: `${sourceChain.name} tx mined`, state: "complete", timeLabel: "0:00" },
          { label: "Gas.zip relay",       description: "Bundle routed",                 state: "complete", timeLabel: "0:30" },
          { label: "Delivery",            description: `Native gas delivered`,          state: "complete", timeLabel: "1:15" },
        ]}
        txHashes={destinations.map((d) => {
          const c = GAS_CHAINS.find((g) => g.id === d.chainId) ?? GAS_CHAINS[2];
          return {
            label: c.name,
            chainName: c.name,
            chainColor: c.color,
            hashShort: "0x4e8a…c124",
            url: `https://blockscan.com/tx/0x…`,
          };
        })}
        onNewTrade={() => setShowSuccess(false)}
        onViewPortfolio={() => { setShowSuccess(false); toast.info("Navigate to /portfolio-v2"); }}
      />

      {walletState.status === "connected" && (
        <AccountModal
          open={showAccountModal}
          onClose={() => setShowAccountModal(false)}
          address={walletState.address}
          providerName={walletState.providerName}
          chainName={sourceChain.name}
          chainColor={sourceChain.color}
          balanceUSD={51570.49}
          nativeBalance="12.45"
          nativeTicker={sourceChain.ticker}
          explorerUrl={`https://arbiscan.io/address/${walletState.address}`}
          onCopy={() => toast.success("Address copied")}
          onSwitchNetwork={() => { setShowAccountModal(false); setChainPickerTarget({ kind: "source" }); }}
          onSwitchWallet={() => { setShowAccountModal(false); setShowWalletModal(true); }}
          onDisconnect={() => { setShowAccountModal(false); disconnect(); toast.info("Wallet disconnected"); }}
        />
      )}

      <Toaster />
    </div>
  );
}
// ─── History tab (stub) ──────────────────────────────────────────────────

function HistoryStub() {
  return (
    <Card style={{ padding: 22, position: "relative", overflow: "hidden" }}>
      <div style={{ position: "absolute", top: -16, right: -16, opacity: 0.05, pointerEvents: "none" }}>
        <BrandMark size={120} color="#FF8A00" />
      </div>
      <p style={{ margin: 0, fontSize: 10, letterSpacing: "0.40em", color: "rgba(255,255,255,0.50)", textTransform: "uppercase", fontWeight: 700 }}>
        Your gas history
      </p>
      <p style={{ margin: "8px 0 0", fontSize: 12.5, color: "rgba(255,255,255,0.65)", lineHeight: 1.6, maxWidth: 540 }}>
        Connect your wallet to load past gas-bridge transactions. Production wires to{" "}
        <code style={{ color: "rgba(255,255,255,0.85)" }}>useGetUserHistory(address)</code> — Gas.zip's{" "}
        <code style={{ color: "rgba(255,255,255,0.85)" }}>/v2/user/&lt;addr&gt;</code> endpoint.
      </p>
      <p style={{ margin: "10px 0 0", fontSize: 11, color: "rgba(255,255,255,0.45)", lineHeight: 1.55 }}>
        Each row will show source chain, destination chain(s), USD value delivered, status, and explorer links for both source and destination tx hashes.
      </p>
    </Card>
  );
}

function LookupStub() {
  const [hash, setHash] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<LookupResult | null>(null);

  const lookup = () => {
    if (hash.length < 10) return;
    setLoading(true);
    setResult(null);
    // Demo result — production wires to useSearchTransaction(hash) which
    // calls Gas.zip's /v2/tx/<hash> endpoint and returns the same shape.
    setTimeout(() => {
      setResult({
        sourceChain:   { name: "Arbitrum", color: "#28A0F0", ticker: "ETH" },
        sourceTxShort: "0xab12…3f9d",
        sourceTxFull:  "0xab12cd34ef567890abcdef0123456789abcdef01234567890abcdef0123f9d",
        sourceExplorer:"https://arbiscan.io/tx/0x…",
        sentAt:        "2026-06-07 14:32 UTC",
        sentUsd:       30.42,
        bridgeFeeUsd:  0.15,
        deliveries: [
          {
            chain:    { name: "Base",     color: "#0052FF", ticker: "ETH" },
            usdValue: 10.00,
            native:   "0.003142",
            status:   "delivered",
            txShort:  "0x4e8a…c124",
            txFull:   "0x4e8a99201bc20ed8401923cf72e16e3ab2390c91c124",
            explorer: "https://basescan.org/tx/0x…",
            etaSecondsToDelivery: 41,
          },
          {
            chain:    { name: "Polygon",  color: "#7B3FE4", ticker: "POL" },
            usdValue: 10.00,
            native:   "13.89",
            status:   "delivered",
            txShort:  "0x71c2…bd09",
            txFull:   "0x71c2e3ad9b5e108f02f3a781bc902bd09",
            explorer: "https://polygonscan.com/tx/0x…",
            etaSecondsToDelivery: 78,
          },
          {
            chain:    { name: "Avalanche",color: "#E84142", ticker: "AVAX" },
            usdValue: 10.00,
            native:   "0.2632",
            status:   "in_flight",
            txShort:  undefined,
            txFull:   undefined,
            explorer: undefined,
            etaSecondsToDelivery: null,
          },
        ],
      });
      setLoading(false);
    }, 900);
  };

  return (
    <div style={{ display: "grid", gridTemplateColumns: result ? "minmax(0, 1fr) minmax(0, 1.2fr)" : "1fr", gap: 18, alignItems: "start" }}>
      {/* LEFT — lookup form */}
      <Card style={{ padding: 18 }}>
        <p style={{ margin: 0, fontSize: 10, letterSpacing: "0.40em", color: "rgba(255,255,255,0.50)", textTransform: "uppercase", fontWeight: 700 }}>
          Find a transaction
        </p>
        <p style={{ margin: "8px 0 14px", fontSize: 12, color: "rgba(255,255,255,0.65)", lineHeight: 1.6 }}>
          Paste any source tx hash — we'll show where the gas landed on the destination chain(s).
        </p>
        <input
          type="text"
          value={hash}
          onChange={(e) => setHash(e.target.value)}
          placeholder="0x… transaction hash"
          spellCheck={false}
          style={{
            width: "100%",
            padding: "12px 14px",
            background: "rgba(255,255,255,0.03)",
            border: "1px solid rgba(255,255,255,0.10)",
            borderRadius: 4,
            color: "#fff",
            fontFamily: "'Space Grotesk', sans-serif",
            fontSize: 12.5,
            outline: "none",
            letterSpacing: "-0.005em",
          }}
        />
        <div style={{ marginTop: 12 }}>
          <PrimaryButton onClick={lookup} disabled={hash.length < 10 || loading}>
            {loading ? "Searching…" : "Look up"}
          </PrimaryButton>
        </div>
        <p style={{ margin: "10px 0 0", fontSize: 10.5, color: "rgba(255,255,255,0.45)", lineHeight: 1.5 }}>
          Mock result wires to <code style={{ color: "rgba(255,255,255,0.65)" }}>useSearchTransaction(hash)</code> in production.
        </p>
      </Card>

      {/* RIGHT — result */}
      {result && <LookupResultPanel result={result} />}
    </div>
  );
}

// ─── Lookup result types + panel ──────────────────────────────────────────

interface LookupChain { name: string; color: string; ticker: string }
interface LookupDelivery {
  chain: LookupChain;
  usdValue: number;
  native: string;
  status: "delivered" | "in_flight" | "stuck" | "failed";
  txShort?: string;
  txFull?: string;
  explorer?: string;
  etaSecondsToDelivery: number | null;
}
interface LookupResult {
  sourceChain: LookupChain;
  sourceTxShort: string;
  sourceTxFull: string;
  sourceExplorer: string;
  sentAt: string;
  sentUsd: number;
  bridgeFeeUsd: number;
  deliveries: LookupDelivery[];
}

const STATUS_COLOR: Record<LookupDelivery["status"], string> = {
  delivered:  "#34D399",
  in_flight:  "#FF8A00",
  stuck:      "#FBBF24",
  failed:     "#F87171",
};
const STATUS_LABEL: Record<LookupDelivery["status"], string> = {
  delivered:  "Delivered",
  in_flight:  "In flight",
  stuck:      "Stuck",
  failed:     "Failed",
};

function LookupResultPanel({ result }: { result: LookupResult }) {
  const deliveredCount = result.deliveries.filter((d) => d.status === "delivered").length;
  const allDelivered   = deliveredCount === result.deliveries.length;

  const summaryRows: FeeRow[] = [
    { label: "Source chain", value: result.sourceChain.name },
    { label: "Sent at",      value: result.sentAt, muted: true },
    { label: "Total sent",   value: `$${result.sentUsd.toFixed(2)}` },
    { label: "Bridge fee",   value: `$${result.bridgeFeeUsd.toFixed(2)}`, accent: true },
    { label: "Destinations", value: `${deliveredCount} / ${result.deliveries.length} delivered`, muted: !allDelivered },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <Card style={{ padding: 18, position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", top: -16, right: -16, opacity: 0.05, pointerEvents: "none" }}>
          <BrandMark size={110} color="#FF8A00" />
        </div>

        {/* Header w/ overall status pill */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
          <p style={{ margin: 0, fontSize: 10, letterSpacing: "0.40em", color: "rgba(255,255,255,0.50)", textTransform: "uppercase", fontWeight: 700 }}>
            Transaction
          </p>
          <Pill variant={allDelivered ? "success" : "info"}>
            {allDelivered ? "Settled" : `${deliveredCount}/${result.deliveries.length} settled`}
          </Pill>
        </div>

        {/* Source tx hash link — chip style */}
        <TxHashChip
          chain={result.sourceChain}
          hashShort={result.sourceTxShort}
          explorer={result.sourceExplorer}
          label="Source tx"
        />

        {/* Summary rows */}
        <div style={{ marginTop: 14 }}>
          <FeeBreakdown rows={summaryRows} bordered />
        </div>
      </Card>

      {/* Per-destination deliveries */}
      <Card style={{ padding: 18 }}>
        <p style={{ margin: 0, fontSize: 10, letterSpacing: "0.40em", color: "rgba(255,255,255,0.50)", textTransform: "uppercase", fontWeight: 700 }}>
          Deliveries · {result.deliveries.length} chain{result.deliveries.length === 1 ? "" : "s"}
        </p>
        <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 12 }}>
          {result.deliveries.map((d, i) => (
            <DeliveryRow key={i} delivery={d} />
          ))}
        </div>
      </Card>
    </div>
  );
}

function DeliveryRow({ delivery: d }: { delivery: LookupDelivery }) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 8,
        padding: "12px 12px",
        background: "rgba(255,255,255,0.02)",
        border: `1px solid ${d.status === "delivered" ? "rgba(52,211,153,0.20)" : d.status === "in_flight" ? "rgba(255,138,0,0.20)" : "rgba(255,255,255,0.06)"}`,
        borderRadius: 4,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
        <span
          style={{
            width: 24,
            height: 24,
            background: d.chain.color,
            borderRadius: 4,
            flexShrink: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 9,
            fontWeight: 700,
            color: "#fff",
          }}
        >
          {d.chain.ticker}
        </span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: "#fff" }}>{d.chain.name}</p>
          <p style={{ margin: "1px 0 0", fontSize: 10.5, color: "rgba(255,255,255,0.50)", fontFamily: "'Space Grotesk', sans-serif" }}>
            {d.native} {d.chain.ticker} · ${d.usdValue.toFixed(2)}
          </p>
        </div>
        <span
          style={{
            fontSize: 9,
            fontWeight: 700,
            letterSpacing: "0.18em",
            padding: "2px 7px",
            borderRadius: 2,
            color: STATUS_COLOR[d.status],
            background: `${STATUS_COLOR[d.status]}1A`,
            border: `1px solid ${STATUS_COLOR[d.status]}40`,
            textTransform: "uppercase",
            flexShrink: 0,
          }}
        >
          {STATUS_LABEL[d.status]}
        </span>
      </div>

      {/* Tx + ETA sub-row */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
        {d.txShort && d.explorer ? (
          <TxHashChip chain={d.chain} hashShort={d.txShort} explorer={d.explorer} compact />
        ) : (
          <span style={{ fontSize: 10.5, color: "rgba(255,255,255,0.45)" }}>Destination tx pending…</span>
        )}
        {d.etaSecondsToDelivery != null && (
          <span style={{ fontSize: 10.5, color: "rgba(255,255,255,0.45)", marginLeft: "auto", fontFamily: "'Space Grotesk', sans-serif" }}>
            Settled in {formatEtaSeconds(d.etaSecondsToDelivery)}
          </span>
        )}
      </div>
    </div>
  );
}

function TxHashChip({
  chain, hashShort, explorer, label, compact,
}: {
  chain: LookupChain;
  hashShort: string;
  explorer: string;
  label?: string;
  compact?: boolean;
}) {
  return (
    <a
      href={explorer}
      target="_blank"
      rel="noreferrer"
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 8,
        padding: compact ? "4px 8px 4px 5px" : "6px 11px 6px 6px",
        background: "rgba(255,255,255,0.04)",
        border: "1px solid rgba(255,255,255,0.10)",
        borderRadius: 4,
        color: "#fff",
        textDecoration: "none",
        fontSize: compact ? 10.5 : 11.5,
        transition: "all 140ms ease",
      }}
      onMouseEnter={(e) => { e.currentTarget.style.borderColor = "rgba(255,138,0,0.40)"; }}
      onMouseLeave={(e) => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.10)"; }}
    >
      <span
        style={{
          width: compact ? 14 : 18,
          height: compact ? 14 : 18,
          background: chain.color,
          borderRadius: 3,
          flexShrink: 0,
        }}
      />
      {label && (
        <span style={{ fontSize: 9, letterSpacing: "0.20em", color: "rgba(255,255,255,0.50)", fontWeight: 700, textTransform: "uppercase" }}>
          {label}
        </span>
      )}
      <code style={{ fontFamily: "'Space Grotesk', sans-serif", color: "rgba(255,255,255,0.85)", letterSpacing: "-0.005em" }}>
        {hashShort}
      </code>
      <span style={{ fontSize: 10, color: "rgba(255,255,255,0.40)" }}>↗</span>
    </a>
  );
}
