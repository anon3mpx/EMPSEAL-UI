// ─── SwapPage — same-chain aggregator swap (drop-in /swap replacement) ─────
//
// Page structure:
//   • DappNavbar (responsive — drawer on mobile)
//   • Page header — title + chain context
//   • Two-column grid on desktop:
//       LEFT (8 col)   — EmpxSwapWidget (the core flow)
//       RIGHT (4 col)  — Live market snapshot + Recent trades + Settings card
//   • Mobile → single column stack
//
// Wallet connection wired through useWalletConnection() — bridges wagmi v2
// with the design-system WalletModal / WalletButton components.

import { useEffect, useMemo, useState } from "react";
import {
  AccountModal,
  Card,
  ChainPicker,
  ConfirmTradeModal,
  DappNavbar,
  EmptyState,
  LogoTile,
  NetworkSelector,
  Pill,
  PrimaryButton,
  QuoteCountdown,
  RouteVisualization,
  Skeleton,
  SocialTray,
  SplitRouteVisualization,
  Tabs,
  Toaster,
  TokenPicker,
  TradeSuccessModal,
  WalletButton,
  WalletModal,
  useIsMobile,
  toast,
  type NavLink,
  type PickerChain,
  type PickerToken,
  type RouteHop,
  type SplitBranch,
  type WalletOption,
} from "../components";

import { useWalletConnection } from "../hooks/useWalletConnection";

// Shared social link set — referenced from every page navbar
export const EMPX_SOCIALS = [
  { kind: "x" as const,        href: "https://x.com/empx" },
  { kind: "telegram" as const, href: "https://t.me/empx" },
  { kind: "docs" as const,     href: "https://docs.empx.network" },
  { kind: "github" as const,   href: "https://github.com/empx" },
];
import EmpxSwapWidget from "../EmpxSwapWidget";

// ─── Chain registry (sourced from SDK in production) ──────────────────────

const ARB      = { id: 42161, name: "Arbitrum",  color: "#28A0F0" };
const BASE     = { id: 8453,  name: "Base",       color: "#0052FF" };
const ETH_MAIN = { id: 1,     name: "Ethereum",  color: "#627EEA" };
const OP       = { id: 10,    name: "Optimism",  color: "#FF0420" };
const POLY     = { id: 137,   name: "Polygon",   color: "#7B3FE4" };
const BSC      = { id: 56,    name: "BSC",        color: "#F0B90B" };
const AVAX     = { id: 43114, name: "Avalanche", color: "#E84142" };
const SONIC    = { id: 146,   name: "Sonic",      color: "#FE9A4D" };
const BERA     = { id: 80094, name: "Berachain", color: "#814625" };
const SEI      = { id: 1329,  name: "Sei",        color: "#9D1F1F" };
const HYPE     = { id: 999,   name: "HyperEVM",  color: "#97FBE5" };
const PLS      = { id: 369,   name: "PulseChain",color: "#FF008F" };
const RSK      = { id: 30,    name: "Rootstock", color: "#FF9900" };
const MONAD    = { id: 143,   name: "Monad",      color: "#7C5CFC" };

const SWAP_CHAINS: PickerChain[] = [
  { ...ARB,      ticker: "ETH" },
  { ...BASE,     ticker: "ETH" },
  { ...ETH_MAIN, ticker: "ETH" },
  { ...OP,       ticker: "ETH" },
  { ...POLY,     ticker: "POL" },
  { ...BSC,      ticker: "BNB" },
  { ...AVAX,     ticker: "AVAX" },
  { ...SONIC,    ticker: "S" },
  { ...BERA,     ticker: "BERA" },
  { ...SEI,      ticker: "SEI" },
  { ...HYPE,     ticker: "HYPE" },
  { ...PLS,      ticker: "PLS" },
  { ...RSK,      ticker: "RBTC" },
  { ...MONAD,    ticker: "MON" },
];

// ─── Demo token book (sourced from SDK getChainConfig in production) ──────

const TOKENS_BY_CHAIN: Record<number, PickerToken[]> = {
  [ARB.id]: [
    { ticker: "ETH",  name: "Ether",            chainName: ARB.name, chainColor: ARB.color, balance: "12.45",    balanceUSD: 39625.20 },
    { ticker: "USDC", name: "USD Coin",         chainName: ARB.name, chainColor: ARB.color, balance: "8,420.10", balanceUSD: 8420.10, badge: "VERIFIED" },
    { ticker: "USDT", name: "Tether",           chainName: ARB.name, chainColor: ARB.color, balance: "1,250.00", balanceUSD: 1250.00 },
    { ticker: "ARB",  name: "Arbitrum",         chainName: ARB.name, chainColor: ARB.color, balance: "452.18",   balanceUSD: 538.59, badge: "TRENDING" },
    { ticker: "WBTC", name: "Wrapped BTC",      chainName: ARB.name, chainColor: ARB.color, balance: "0.0312",   balanceUSD: 2120.40 },
    { ticker: "DAI",  name: "Dai Stablecoin",   chainName: ARB.name, chainColor: ARB.color, balance: "0",        balanceUSD: 0 },
    { ticker: "LINK", name: "Chainlink",        chainName: ARB.name, chainColor: ARB.color, balance: "0",        balanceUSD: 0 },
  ],
  [BASE.id]: [
    { ticker: "ETH",  name: "Ether",            chainName: BASE.name, chainColor: BASE.color, balance: "0.42",     balanceUSD: 1337.30 },
    { ticker: "USDC", name: "USD Coin",         chainName: BASE.name, chainColor: BASE.color, balance: "245.00",   balanceUSD: 245.00, badge: "VERIFIED" },
    { ticker: "AERO", name: "Aerodrome",        chainName: BASE.name, chainColor: BASE.color, balance: "245.00",   balanceUSD: 612.50, badge: "TRENDING" },
    { ticker: "DEGEN",name: "Degen",            chainName: BASE.name, chainColor: BASE.color, balance: "12,000",   balanceUSD: 84.00 },
  ],
};

// Pair-type classification — would come from SDK enablePairTypeFees() in prod
function classifyPair(from: string, to: string): "V/V" | "V/S" | "S/S" {
  const STABLES = new Set(["USDC", "USDT", "DAI"]);
  const f = STABLES.has(from);
  const t = STABLES.has(to);
  if (f && t) return "S/S";
  if (f || t) return "V/S";
  return "V/V";
}

function feeForPair(pairType: "V/V" | "V/S" | "S/S"): number {
  return pairType === "S/S" ? 9 : pairType === "V/S" ? 15 : 28;
}

// ─── Page state ───────────────────────────────────────────────────────────

type SettingsTab = "slippage" | "route" | "mev";

// ─── Page component ──────────────────────────────────────────────────────

export default function SwapPage() {
  const isMobile = useIsMobile();

  // Wallet — uses wagmi v2 via the design-system bridge hook
  const { walletState, walletOptions, onSelectWallet, disconnect, switchChain, currentChain } =
    useWalletConnection();
  const [showWalletModal, setShowWalletModal] = useState(false);
  const [showChainPicker, setShowChainPicker] = useState(false);
  const [showAccountModal, setShowAccountModal] = useState(false);
  const [showTokenPicker, setShowTokenPicker] = useState<"from" | "to" | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [quoteIssuedAt, setQuoteIssuedAt] = useState(Date.now());

  // Active chain — driven by wallet connection
  const activeChain = walletState.status === "connected" ? walletState.chain : ARB;

  // Settings tab
  const [settingsTab, setSettingsTab] = useState<SettingsTab>("slippage");
  const [slippageBps, setSlippageBps] = useState(50);
  const [mevEnabled, setMevEnabled] = useState(true);

  // Swap state
  const tokensForChain = TOKENS_BY_CHAIN[activeChain.id] ?? [];
  const [fromToken, setFromToken] = useState<PickerToken | null>(tokensForChain[0] ?? null);
  const [toToken,   setToToken]   = useState<PickerToken | null>(tokensForChain[1] ?? null);
  const [fromAmount, setFromAmount] = useState("1");

  // Reset tokens when chain changes
  useEffect(() => {
    const toks = TOKENS_BY_CHAIN[activeChain.id] ?? [];
    setFromToken(toks[0] ?? null);
    setToToken(toks[1] ?? null);
    setFromAmount("1");
  }, [activeChain.id]);

  // Simulate quote calc — would be router.findBestPath() in prod
  const toAmount = useMemo(() => {
    if (!fromToken || !toToken) return "0";
    const fromUSDPrice = (fromToken.balanceUSD ?? 0) / Math.max(1e-9, Number(fromToken.balance?.replace(/,/g, "") || 1));
    const toUSDPrice = (toToken.balanceUSD ?? 0) / Math.max(1e-9, Number(toToken.balance?.replace(/,/g, "") || 1));
    if (!Number.isFinite(fromUSDPrice) || !Number.isFinite(toUSDPrice) || toUSDPrice <= 0) return "0";
    const rate = fromUSDPrice / toUSDPrice;
    const amt = Number(fromAmount.replace(/,/g, "")) * rate;
    if (!Number.isFinite(amt)) return "0";
    return amt.toFixed(toToken.ticker === "USDC" || toToken.ticker === "USDT" || toToken.ticker === "DAI" ? 2 : 6);
  }, [fromAmount, fromToken, toToken]);

  const pairType = fromToken && toToken ? classifyPair(fromToken.ticker, toToken.ticker) : "V/V";
  const feeBps = feeForPair(pairType);
  const fromUSDValue = useMemo(() => {
    const amt = Number(fromAmount.replace(/,/g, ""));
    if (!Number.isFinite(amt) || !fromToken) return 0;
    const price = (fromToken.balanceUSD ?? 0) / Math.max(1e-9, Number(fromToken.balance?.replace(/,/g, "") || 1));
    return amt * price;
  }, [fromAmount, fromToken]);
  const protocolFeeUSD = fromUSDValue * (feeBps / 10_000);

  // Demo route — would come from router.findBestPath() + splitSolver
  const routeHops: RouteHop[] | undefined = useMemo(() => {
    if (!fromToken || !toToken) return undefined;
    return [
      { ticker: fromToken.ticker, chainName: activeChain.name, chainColor: activeChain.color, via: "Uniswap V3" },
      { ticker: toToken.ticker,   chainName: activeChain.name, chainColor: activeChain.color },
    ];
  }, [activeChain.color, activeChain.name, fromToken, toToken]);

  const splitRoute: SplitBranch[] = useMemo(
    () => [
      { via: "Uniswap V3", pct: 62, intermediateTickers: fromToken?.ticker === toToken?.ticker ? undefined : ["WETH"] },
      { via: "Curve",      pct: 23 },
      { via: "Velodrome",  pct: 15 },
    ],
    [fromToken?.ticker, toToken?.ticker]
  );

  // Flip
  const flipTokens = () => {
    setFromToken(toToken);
    setToToken(fromToken);
    setFromAmount(toAmount);
  };

  // Submit flow
  const onSwap = () => {
    if (walletState.status !== "connected") {
      setShowWalletModal(true);
      return;
    }
    setQuoteIssuedAt(Date.now());
    setShowConfirm(true);
  };

  const navLinks: NavLink[] = [
    { label: "Swap",      href: "/swap-v2", active: true },
    { label: "Cross",     href: "/cross-v2" },
    { label: "Bridge",    href: "/bridge-v2" },
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
              name={activeChain.name}
              color={activeChain.color}
              onClick={() => setShowChainPicker(true)}
            />
            <WalletButton
              connected={walletState.status === "connected"}
              address={walletState.status === "connected" ? walletState.address : undefined}
              balanceUSD={undefined}
              onConnect={() => setShowWalletModal(true)}
              onClick={() => setShowAccountModal(true)}
            />
          </>
        }
      />

      <main
        style={{
          maxWidth: 1180,
          margin: "0 auto",
          padding: isMobile ? "24px 16px 56px" : "32px 24px 72px",
        }}
      >
        {/* Header */}
        <header style={{ marginBottom: isMobile ? 18 : 24 }}>
          <p
            style={{
              margin: 0,
              fontSize: 10,
              letterSpacing: "0.40em",
              color: "#FF8A00",
              textTransform: "uppercase",
              fontWeight: 700,
            }}
          >
            SAME-CHAIN AGGREGATION
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
            Swap.{" "}
            <span
              style={{
                fontFamily: "'Instrument Serif', serif",
                fontStyle: "italic",
                color: "#FF8A00",
                letterSpacing: "-0.02em",
              }}
            >
              Best price, every chain.
            </span>
          </h1>
        </header>

        {/* Body — responsive grid */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: isMobile ? "1fr" : "minmax(0, 1.4fr) minmax(0, 1fr)",
            gap: isMobile ? 18 : 28,
            alignItems: "start",
          }}
        >
          {/* LEFT — swap widget */}
          <div style={{ display: "flex", justifyContent: "center" }}>
            <EmpxSwapWidget
              chain={activeChain}
              fromToken={fromToken ? { ticker: fromToken.ticker, logo: fromToken.logo } : null}
              fromAmount={fromAmount}
              fromBalance={fromToken?.balance}
              fromUsdValue={fromUSDValue || null}
              onFromAmountChange={setFromAmount}
              onSelectFromToken={() => setShowTokenPicker("from")}
              onPercentClick={(pct) => {
                const bal = Number((fromToken?.balance || "0").replace(/,/g, ""));
                if (Number.isFinite(bal)) setFromAmount(String((bal * pct) / 100));
              }}
              toToken={toToken ? { ticker: toToken.ticker, logo: toToken.logo } : null}
              toAmount={toAmount}
              toUsdValue={Number(toAmount.replace(/,/g, "")) * ((toToken?.balanceUSD ?? 0) / Math.max(1e-9, Number((toToken?.balance || "1").replace(/,/g, ""))))}
              onSelectToToken={() => setShowTokenPicker("to")}
              pairType={pairType}
              protocolFeeBps={feeBps}
              protocolFeeUSD={protocolFeeUSD}
              minimumReceived={`${(Number(toAmount.replace(/,/g, "")) * (1 - slippageBps / 10_000)).toFixed(2)} ${toToken?.ticker || ""}`}
              slippageBps={slippageBps}
              priceImpactBps={12}
              routeHops={routeHops}
              walletConnected={walletState.status === "connected"}
              onConnect={() => setShowWalletModal(true)}
              onSwap={onSwap}
              onFlip={flipTokens}
              swapLabel={walletState.status === "connected" ? "Swap" : "Connect wallet"}
            />
          </div>

          {/* RIGHT — context panel */}
          <aside style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {/* Quote freshness */}
            {walletState.status === "connected" && (
              <Card style={{ padding: 16 }}>
                <p
                  style={{
                    margin: 0,
                    fontSize: 10,
                    letterSpacing: "0.40em",
                    color: "rgba(255,255,255,0.40)",
                    textTransform: "uppercase",
                    fontWeight: 700,
                  }}
                >
                  Quote freshness
                </p>
                <div style={{ marginTop: 12, display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                  <QuoteCountdown
                    totalMs={30000}
                    issuedAt={quoteIssuedAt}
                    onRefresh={() => { setQuoteIssuedAt(Date.now()); toast.info("Quote refreshed"); }}
                    compact
                  />
                  <Pill variant="info">Live RPC</Pill>
                </div>
              </Card>
            )}

            {/* Routing detail */}
            {walletState.status === "connected" && fromToken && toToken && (
              <Card style={{ padding: 18 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                  <p
                    style={{
                      margin: 0,
                      fontSize: 10,
                      letterSpacing: "0.40em",
                      color: "rgba(255,255,255,0.40)",
                      textTransform: "uppercase",
                      fontWeight: 700,
                    }}
                  >
                    Routing · Split across 3
                  </p>
                  <Pill variant="accent">{pairType}</Pill>
                </div>
                <SplitRouteVisualization
                  fromTicker={fromToken.ticker}
                  fromChainName={activeChain.name}
                  fromChainColor={activeChain.color}
                  toTicker={toToken.ticker}
                  toChainName={activeChain.name}
                  toChainColor={activeChain.color}
                  branches={splitRoute}
                  animated
                  compact
                />
              </Card>
            )}

            {/* Settings */}
            <Card style={{ padding: 18 }}>
              <p
                style={{
                  margin: "0 0 12px",
                  fontSize: 10,
                  letterSpacing: "0.40em",
                  color: "rgba(255,255,255,0.40)",
                  textTransform: "uppercase",
                  fontWeight: 700,
                }}
              >
                Trade settings
              </p>
              <Tabs
                options={[
                  { value: "slippage" as const, label: "Slippage" },
                  { value: "route" as const,    label: "Routing" },
                  { value: "mev" as const,      label: "MEV" },
                ]}
                active={settingsTab}
                onChange={setSettingsTab}
                variant="pill"
              />
              <div style={{ marginTop: 14 }}>
                {settingsTab === "slippage" && (
                  <SlippagePresets
                    valueBps={slippageBps}
                    onChange={(bps) => { setSlippageBps(bps); toast.info(`Slippage set to ${(bps / 100).toFixed(2)}%`); }}
                  />
                )}
                {settingsTab === "route" && (
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    <RouteToggle
                      label="Split routing"
                      hint="Route across multiple DEXes for better price"
                      enabled
                    />
                    <RouteToggle
                      label="Multi-hop"
                      hint="Allow up to 3 hops through intermediate tokens"
                      enabled
                    />
                    <p style={{ margin: "8px 4px 0", fontSize: 11, color: "rgba(255,255,255,0.45)", lineHeight: 1.5 }}>
                      EmpX&apos;s pathfinder enumerates every adapter on the chain and
                      picks by output. Stable-pair routes get -5 bps automatically via
                      the pair-type fee model — no toggle needed.
                    </p>
                  </div>
                )}
                {settingsTab === "mev" && (
                  <div>
                    <RouteToggle
                      label="MEV protection"
                      hint="Submit via private mempool. Adds 1-2 seconds."
                      enabled={false}
                      planned
                    />
                    <p style={{ margin: "12px 0 0", fontSize: 11, color: "rgba(255,255,255,0.45)", lineHeight: 1.55 }}>
                      Not active. When wired, routes signing via Flashbots Protect
                      on Ethereum and MEV-Share on supported L2s — a lightweight
                      RPC swap at submit time, no extra fees.
                    </p>
                  </div>
                )}
              </div>
            </Card>

            {/* Disconnected sidebar — show context */}
            {walletState.status === "disconnected" && (
              <Card style={{ padding: 22 }}>
                <p
                  style={{
                    margin: 0,
                    fontSize: 10,
                    letterSpacing: "0.40em",
                    color: "#FF8A00",
                    textTransform: "uppercase",
                    fontWeight: 700,
                  }}
                >
                  Before you trade
                </p>
                <p
                  style={{
                    margin: "10px 0 6px",
                    fontFamily: "'Space Grotesk', sans-serif",
                    fontSize: 18,
                    fontWeight: 400,
                    letterSpacing: "-0.015em",
                  }}
                >
                  Connect a wallet
                </p>
                <p style={{ margin: 0, fontSize: 12.5, color: "rgba(255,255,255,0.55)", lineHeight: 1.55 }}>
                  EmpX routes through every DEX on the chain you&apos;re connected to —
                  Uniswap, Curve, Velodrome, Aerodrome, and chain-native AMMs.
                  Pair-type pricing gives the cheapest stable-pair fees in DeFi.
                </p>
                <div style={{ marginTop: 12 }}>
                  <PrimaryButton onClick={() => setShowWalletModal(true)}>
                    Connect wallet
                  </PrimaryButton>
                </div>
              </Card>
            )}
          </aside>
        </div>
      </main>

      {/* ─── Overlays ─────────────────────────────────────────────────── */}

      <WalletModal
        open={showWalletModal}
        onClose={() => setShowWalletModal(false)}
        wallets={walletOptions}
        onSelect={(w) => {
          setShowWalletModal(false);
          onSelectWallet(w);
        }}
      />

      <ChainPicker
        open={showChainPicker}
        onClose={() => setShowChainPicker(false)}
        chains={SWAP_CHAINS.map((c) => ({
          ...c,
          balanceUSD: c.id === ARB.id ? 48583.89 : c.id === BASE.id ? 1862.50 : undefined,
        }))}
        selectedId={activeChain.id}
        mode="swap"
        onSelect={(c) => {
          setShowChainPicker(false);
          if (walletState.status === "connected") {
            switchChain({ chainId: c.id });
          }
        }}
      />

      {showTokenPicker && (
        <TokenPicker
          open={!!showTokenPicker}
          onClose={() => setShowTokenPicker(null)}
          tokens={tokensForChain}
          recent={tokensForChain.slice(0, 4)}
          chains={[{ name: activeChain.name, color: activeChain.color }]}
          selected={(showTokenPicker === "from" ? fromToken : toToken)?.address || ""}
          onSelect={(t) => {
            if (showTokenPicker === "from") setFromToken(t);
            else setToToken(t);
            setShowTokenPicker(null);
          }}
        />
      )}

      <ConfirmTradeModal
        open={showConfirm}
        onClose={() => setShowConfirm(false)}
        onConfirm={() => {
          setShowConfirm(false);
          setShowSuccess(true);
        }}
        eyebrow="REVIEW · SWAP"
        title="Confirm trade"
        fromTicker={fromToken?.ticker || ""}
        fromAmount={fromAmount}
        fromUsdValue={fromUSDValue}
        fromChainName={activeChain.name}
        toTicker={toToken?.ticker || ""}
        toAmount={toAmount}
        toUsdValue={Number(toAmount.replace(/,/g, ""))}
        toChainName={activeChain.name}
        routeHops={routeHops}
        feeRows={[
          { label: "Pair type",     value: pairType.replace("/", " / ") },
          { label: "Protocol fee",  value: `${feeBps} bps`, sub: `· $${protocolFeeUSD.toFixed(4)}`, accent: true },
          { label: "Best route",    value: "Uniswap V3 · 62% · Curve · 23% · Velodrome · 15%" },
          { label: "Min. received", value: `${(Number(toAmount.replace(/,/g, "")) * (1 - slippageBps / 10_000)).toFixed(2)} ${toToken?.ticker || ""}`, muted: true },
          { label: "Slippage",      value: `${(slippageBps / 100).toFixed(2)}%`, muted: true },
        ]}
        quoteIssuedAt={quoteIssuedAt}
        quoteValidMs={30000}
        onRefreshQuote={() => setQuoteIssuedAt(Date.now())}
      />

      <TradeSuccessModal
        open={showSuccess}
        onClose={() => setShowSuccess(false)}
        kind="SWAP"
        fromTicker={fromToken?.ticker || ""}
        fromAmount={fromAmount}
        fromChainName={activeChain.name}
        toTicker={toToken?.ticker || ""}
        toAmount={toAmount}
        toChainName={activeChain.name}
        message={`${toToken?.ticker || "Tokens"} arrived in your wallet`}
        timeline={[
          { label: "Source confirmation",  description: `${activeChain.name} tx mined`, state: "complete", timeLabel: "0:00" },
          { label: "DEX execution",        description: "Best route across 3 pools",     state: "complete", timeLabel: "0:04" },
          { label: "Tokens delivered",     description: "USDC in wallet, ready to use",  state: "complete", timeLabel: "0:08" },
        ]}
        txHashes={[
          { label: "Swap tx", chainName: activeChain.name, chainColor: activeChain.color, hashShort: "0xab12…3f9d", url: "https://arbiscan.io" },
        ]}
        onNewTrade={() => setShowSuccess(false)}
        onViewPortfolio={() => { setShowSuccess(false); toast.info("Navigate to /portfolio-v2"); }}
      />

      {walletState.status === "connected" && (
        <AccountModal
          open={showAccountModal}
          onClose={() => setShowAccountModal(false)}
          address={walletState.address}
          providerName={walletState.providerName}
          chainName={activeChain.name}
          chainColor={activeChain.color}
          balanceUSD={51570.49}
          nativeBalance="12.45"
          nativeTicker="ETH"
          explorerUrl={`https://arbiscan.io/address/${walletState.address}`}
          onCopy={() => toast.success("Address copied")}
          onSwitchNetwork={() => { setShowAccountModal(false); setShowChainPicker(true); }}
          onSwitchWallet={() => { setShowAccountModal(false); setShowWalletModal(true); }}
          onDisconnect={() => {
            setShowAccountModal(false);
            disconnect();
            toast.info("Wallet disconnected");
          }}
        />
      )}

      <Toaster />
    </div>
  );
}

// ─── Settings sub-components ──────────────────────────────────────────────

function SlippagePresets({ valueBps, onChange }: { valueBps: number; onChange: (bps: number) => void }) {
  const [custom, setCustom] = useState("");
  const presets = [10, 25, 50, 100];
  return (
    <div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 10 }}>
        {presets.map((bps) => {
          const active = valueBps === bps;
          return (
            <button
              key={bps}
              type="button"
              onClick={() => onChange(bps)}
              style={{
                padding: "6px 11px",
                background: active ? "rgba(255,138,0,0.10)" : "rgba(255,255,255,0.025)",
                border: `1px solid ${active ? "rgba(255,138,0,0.40)" : "rgba(255,255,255,0.08)"}`,
                borderRadius: 3,
                color: active ? "#FF8A00" : "rgba(255,255,255,0.78)",
                fontFamily: "Inter, sans-serif",
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: "0.20em",
                cursor: "pointer",
                transition: "all 160ms ease",
              }}
            >
              {(bps / 100).toFixed(2)}%
            </button>
          );
        })}
        <div style={{ position: "relative" }}>
          <input
            type="text"
            value={custom}
            placeholder="Custom"
            onChange={(e) => setCustom(e.target.value.replace(/[^0-9.]/g, ""))}
            onBlur={() => {
              const v = Number(custom);
              if (Number.isFinite(v) && v > 0) onChange(Math.round(v * 100));
            }}
            style={{
              width: 92,
              padding: "6px 22px 6px 10px",
              background: "rgba(255,255,255,0.025)",
              border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: 3,
              color: "#fff",
              fontFamily: "Inter, sans-serif",
              fontSize: 11,
              fontWeight: 600,
              outline: "none",
            }}
          />
          <span
            style={{
              position: "absolute",
              right: 8,
              top: "50%",
              transform: "translateY(-50%)",
              color: "rgba(255,255,255,0.40)",
              fontSize: 11,
            }}
          >
            %
          </span>
        </div>
      </div>
      <p style={{ margin: 0, fontSize: 11, color: "rgba(255,255,255,0.45)", lineHeight: 1.5 }}>
        Higher slippage tolerates volatile pools; lower protects price. EmpX warns
        on slippage above 1% for stable pairs.
      </p>
    </div>
  );
}

function RouteToggle({
  label,
  hint,
  enabled,
  onToggle,
  planned,
}: {
  label: string;
  hint: string;
  enabled: boolean;
  onToggle?: () => void;
  /** When true, renders dimmed with a "PLANNED" pill (no toggling) */
  planned?: boolean;
}) {
  const disabled = !onToggle || planned;
  return (
    <button
      type="button"
      onClick={disabled ? undefined : onToggle}
      disabled={disabled}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        padding: "10px 12px",
        background: enabled ? "rgba(255,138,0,0.04)" : "rgba(255,255,255,0.02)",
        border: `1px solid ${enabled ? "rgba(255,138,0,0.25)" : "rgba(255,255,255,0.06)"}`,
        borderRadius: 4,
        width: "100%",
        textAlign: "left",
        color: "#fff",
        cursor: disabled ? "default" : "pointer",
        opacity: planned ? 0.62 : 1,
        transition: "background 160ms ease, border-color 160ms ease, opacity 160ms ease",
        fontFamily: "Inter, sans-serif",
      }}
    >
      <span
        aria-hidden
        style={{
          width: 26,
          height: 14,
          borderRadius: 8,
          background: enabled ? "rgba(255,138,0,0.45)" : "rgba(255,255,255,0.10)",
          position: "relative",
          flexShrink: 0,
          transition: "background 200ms ease",
        }}
      >
        <span
          style={{
            position: "absolute",
            top: 1,
            left: enabled ? 13 : 1,
            width: 12,
            height: 12,
            borderRadius: "50%",
            background: enabled ? "#FF8A00" : "rgba(255,255,255,0.45)",
            transition: "left 220ms cubic-bezier(0.22,1,0.36,1)",
            boxShadow: enabled ? "0 0 6px rgba(255,138,0,0.50)" : "none",
          }}
        />
      </span>
      <span style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <p style={{ margin: 0, fontSize: 12.5, fontWeight: 600 }}>{label}</p>
          {planned && (
            <span
              style={{
                fontSize: 8,
                padding: "2px 6px",
                background: "rgba(96,165,250,0.12)",
                color: "#93C5FD",
                borderRadius: 2,
                letterSpacing: "0.20em",
                fontWeight: 700,
                textTransform: "uppercase",
              }}
            >
              Not active
            </span>
          )}
        </div>
        <p style={{ margin: "2px 0 0", fontSize: 11, color: "rgba(255,255,255,0.50)" }}>{hint}</p>
      </span>
    </button>
  );
}
