// ─── DesignSystemPreview — v0.4 ──────────────────────────────────────────

import { useState } from "react";
import {
  AccountModal,
  Card,
  ChainBadge,
  ChainSwitcher,
  Collapsible,
  DappNavbar,
  LogoTile,
  NFTGalleryModal,
  NFTPanel,
  NetworkSelector,
  Pill,
  PrimaryButton,
  QuoteCountdown,
  RouteVisualization,
  SplitRouteVisualization,
  TokenSwitcher,
  TokenPicker,
  ChainPicker,
  WalletModal,
  WalletButton,
  ConfirmTradeModal,
  TradeSuccessModal,
  Toaster,
  toast,
  type AccountNetworkBalance,
  type AccountTokenBalance,
  type NFTItem,
  type PickerToken,
  type PickerChain,
  type RecentActivityItem,
  type TradeTimelineStep,
  type TxHashLink,
  type WalletOption,
  type RouteHop,
  type SplitBranch,
} from "./components";
import EmpxSwapWidget from "./EmpxSwapWidget";
import EmpxCrossWidget from "./EmpxCrossWidget";
import EmpxGasWidget from "./EmpxGasWidget";
import EmpxBridgeWidget from "./EmpxBridgeWidget";
import EmpxPortfolioPanel, { type PortfolioAsset, type MarketCard } from "./EmpxPortfolioPanel";

const ARB = { id: 42161, name: "Arbitrum", color: "#28A0F0" };
const BASE = { id: 8453, name: "Base", color: "#0052FF" };
const ETH_MAIN = { id: 1, name: "Ethereum", color: "#627EEA" };
const OP = { id: 10, name: "Optimism", color: "#FF0420" };
const POLY = { id: 137, name: "Polygon", color: "#7B3FE4" };
const BSC = { id: 56, name: "BSC", color: "#F0B90B" };
const AVAX = { id: 43114, name: "Avalanche", color: "#E84142" };
const SONIC = { id: 146, name: "Sonic", color: "#FE9A4D" };
const BTC = { id: 0, name: "Bitcoin", color: "#F7931A", kind: "BTC" as const };
const SOL = { id: 900, name: "Solana", color: "#9945FF", kind: "SOL" as const };

const ALL_CHAINS: PickerChain[] = [
  { ...ETH_MAIN, ticker: "ETH" },
  { ...ARB, ticker: "ETH" },
  { ...BASE, ticker: "ETH" },
  { ...OP, ticker: "ETH" },
  { ...POLY, ticker: "POL" },
  { ...BSC, ticker: "BNB" },
  { ...AVAX, ticker: "AVAX" },
  { ...SONIC, ticker: "S" },
  { ...BTC, ticker: "BTC" },
  { ...SOL, ticker: "SOL" },
];

const SAMPLE_TOKENS: PickerToken[] = [
  { ticker: "ETH", name: "Ether", chainName: "Arbitrum", chainColor: ARB.color, balance: "12.45", balanceUSD: 39625.2 },
  { ticker: "USDC", name: "USD Coin", chainName: "Arbitrum", chainColor: ARB.color, balance: "8,420.10", balanceUSD: 8420.1, badge: "VERIFIED" },
  { ticker: "USDT", name: "Tether", chainName: "Arbitrum", chainColor: ARB.color, balance: "1,250.00", balanceUSD: 1250.0 },
  { ticker: "ARB", name: "Arbitrum", chainName: "Arbitrum", chainColor: ARB.color, balance: "452.18", balanceUSD: 538.59, badge: "TRENDING" },
  { ticker: "WBTC", name: "Wrapped BTC", chainName: "Arbitrum", chainColor: ARB.color, balance: "0.0312", balanceUSD: 2120.4 },
  { ticker: "USDC", name: "USD Coin", chainName: "Base", chainColor: BASE.color, balance: "245.00", balanceUSD: 245.00 },
  { ticker: "AERO", name: "Aerodrome", chainName: "Base", chainColor: BASE.color, balance: "1200.50", balanceUSD: 612.50, badge: "TRENDING" },
  { ticker: "PEPE", name: "Pepe", chainName: "Ethereum", chainColor: ETH_MAIN.color, balance: "85000000", balanceUSD: 142.50, badge: "NEW" },
];

const WALLET_OPTIONS: WalletOption[] = [
  { id: "metamask", name: "MetaMask", description: "Most popular EVM wallet", installed: true },
  { id: "rabby", name: "Rabby", description: "Multi-chain native, security-first", recommended: true },
  { id: "walletconnect", name: "WalletConnect", description: "Connect any mobile wallet" },
  { id: "privy", name: "Privy", description: "Sign in with email or social" },
];

const SAMPLE_ASSETS: PortfolioAsset[] = [
  { ticker: "ETH", chainName: "Arbitrum", chainColor: ARB.color, balance: "12.45", balanceUSD: 39625.20, change24h: 2.84, change7d: -1.42, allocation: 76.8, spark: [3120,3110,3140,3155,3148,3162,3170,3184] },
  { ticker: "USDC", chainName: "Arbitrum", chainColor: ARB.color, balance: "8,420.10", balanceUSD: 8420.10, change24h: 0.01, change7d: 0.03, allocation: 16.3, spark: [0.9998,0.9999,1.0001,1.0000,0.9999,1.0001,1.0002,1.0001] },
  { ticker: "USDT", chainName: "Base", chainColor: BASE.color, balance: "1,250.00", balanceUSD: 1250.00, change24h: -0.02, change7d: 0.01, allocation: 2.4, spark: [1.0002,1.0001,1.0000,0.9999,0.9998,0.9999,1.0000,0.9999] },
  { ticker: "ARB", chainName: "Arbitrum", chainColor: ARB.color, balance: "452.18", balanceUSD: 538.59, change24h: 8.42, change7d: 12.50, allocation: 1.0, spark: [1.05,1.06,1.08,1.10,1.12,1.14,1.16,1.19] },
  { ticker: "WBTC", chainName: "Ethereum", chainColor: ETH_MAIN.color, balance: "0.0312", balanceUSD: 2120.40, change24h: 1.42, change7d: -2.15, allocation: 4.1, spark: [68500,68400,68200,68100,67900,67800,67852] },
  { ticker: "AERO", chainName: "Base", chainColor: BASE.color, balance: "245.00", balanceUSD: 612.50, change24h: 5.32, change7d: 18.40, allocation: 1.2, spark: [2.10,2.15,2.20,2.25,2.30,2.40,2.45,2.50] },
];

const SAMPLE_MARKETS: MarketCard[] = [
  { ticker: "ETH", name: "Ether", price: 3184.20, change24h: 2.84, chainColor: ETH_MAIN.color, spark: [3100, 3120, 3110, 3140, 3155, 3148, 3162, 3170, 3184] },
  { ticker: "BTC", name: "Bitcoin", price: 67852.40, change24h: 1.42, chainColor: BTC.color, spark: [67000, 67200, 67100, 67400, 67550, 67620, 67700, 67800, 67852] },
  { ticker: "SOL", name: "Solana", price: 158.30, change24h: -2.10, chainColor: SOL.color, spark: [165, 163, 161, 158, 156, 159, 157, 156, 158] },
  { ticker: "ARB", name: "Arbitrum", price: 1.19, change24h: 8.42, chainColor: ARB.color, spark: [1.05, 1.06, 1.08, 1.10, 1.12, 1.14, 1.16, 1.17, 1.19] },
];

const NFT_GALLERY: NFTItem[] = [
  { id: "1",  collection: "Pudgy Penguins",   name: "#4271",         chainName: "Ethereum", chainColor: ETH_MAIN.color, floorETH: 9.850, floorUSD: 31378, rarityRank: 421,  badge: "RARE", placeholder: "P" },
  { id: "2",  collection: "Mad Lads",          name: "#1138",         chainName: "Solana",   chainColor: SOL.color,      floorETH: 1.420, floorUSD: 4517,  rarityRank: 230,                  placeholder: "ML" },
  { id: "3",  collection: "Azuki Elementals", name: "#9882",         chainName: "Ethereum", chainColor: ETH_MAIN.color, floorETH: 0.580, floorUSD: 1846,  rarityRank: 1284,                 placeholder: "Az" },
  { id: "4",  collection: "Base Frens",        name: "Fren-0341",     chainName: "Base",     chainColor: BASE.color,     floorETH: 0.025, floorUSD: 79,                      badge: "NEW", placeholder: "BF" },
  { id: "5",  collection: "Pudgy Penguins",   name: "#7102",         chainName: "Ethereum", chainColor: ETH_MAIN.color, floorETH: 9.850, floorUSD: 31378, rarityRank: 1042,                 placeholder: "P" },
  { id: "6",  collection: "Doodles",           name: "#221",          chainName: "Ethereum", chainColor: ETH_MAIN.color, floorETH: 1.940, floorUSD: 6173,  rarityRank: 380,                  placeholder: "D" },
  { id: "7",  collection: "Mad Lads",          name: "#4452",         chainName: "Solana",   chainColor: SOL.color,      floorETH: 1.420, floorUSD: 4517,  rarityRank: 980,                  placeholder: "ML" },
  { id: "8",  collection: "Base Frens",        name: "Fren-1102",     chainName: "Base",     chainColor: BASE.color,     floorETH: 0.025, floorUSD: 79,                                       placeholder: "BF" },
  { id: "9",  collection: "Cyberkongz VX",    name: "VX #341",       chainName: "Ethereum", chainColor: ETH_MAIN.color, floorETH: 0.450, floorUSD: 1432,  rarityRank: 2200,                 placeholder: "CK" },
  { id: "10", collection: "Sproto Gremlins",  name: "Gremlin #882",  chainName: "Ethereum", chainColor: ETH_MAIN.color, floorETH: 0.082, floorUSD: 261,                                       placeholder: "SG" },
  { id: "11", collection: "Arbitrum Apes",     name: "Ape-228",       chainName: "Arbitrum", chainColor: ARB.color,      floorETH: 0.038, floorUSD: 121,                       badge: "NEW", placeholder: "AA" },
  { id: "12", collection: "Hyperliquid Founders", name: "Founder #018", chainName: "HyperEVM", chainColor: "#97FBE5",   floorETH: 4.200, floorUSD: 13373, rarityRank: 18,    badge: "RARE", placeholder: "HL" },
];

const PORTFOLIO_CHART = [
  48200, 48450, 48100, 48800, 49250, 49800, 50100, 49700, 50300, 50900, 51200, 51570,
];

const SPLIT_ROUTE: SplitBranch[] = [
  { via: "Uniswap V3", pct: 62, intermediateTickers: ["USDC", "WETH"] },
  { via: "Curve", pct: 23 },
  { via: "Velodrome", pct: 15 },
];

export default function DesignSystemPreview() {
  const [swapFrom, setSwapFrom] = useState("1000");
  const [swapTo, setSwapTo] = useState("3184200.00");
  const [crossFrom, setCrossFrom] = useState("0.5");
  const [crossTo, setCrossTo] = useState("1591.20");
  const [gasFrom, setGasFrom] = useState("0.05");
  const [gasTo, setGasTo] = useState("0.0492");
  const [bridgeAmount, setBridgeAmount] = useState("5000");
  const [bridgeReceive, setBridgeReceive] = useState("4998.85");

  const [showTokenPicker, setShowTokenPicker] = useState(false);
  const [swapChainPickerOpen, setSwapChainPickerOpen] = useState(false);
  const [crossChainPickerOpen, setCrossChainPickerOpen] = useState(false);
  const [showWalletModal, setShowWalletModal] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [showAccountModal, setShowAccountModal] = useState(false);
  const [showNftGallery, setShowNftGallery] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  // For QuoteCountdown demo
  const [quoteIssuedAt, setQuoteIssuedAt] = useState(Date.now());

  const sameChainRoute: RouteHop[] = [
    { ticker: "ETH", chainName: "Arbitrum", chainColor: ARB.color, via: "Uniswap V3" },
    { ticker: "USDC", chainName: "Arbitrum", chainColor: ARB.color },
  ];
  const crossChainRoute: RouteHop[] = [
    { ticker: "ETH", chainName: "Arbitrum", chainColor: ARB.color, via: "Uniswap V3" },
    { ticker: "USDC", chainName: "Arbitrum", chainColor: ARB.color, via: "CCTP Fast" },
    { ticker: "USDC", chainName: "Base", chainColor: BASE.color, via: "Aerodrome" },
    { ticker: "USDT", chainName: "Base", chainColor: BASE.color },
  ];

  return (
    <div style={{ minHeight: "100vh", background: "#05050c", color: "#fff", fontFamily: "Inter, sans-serif" }}>
      <DappNavbar
        links={[
          { label: "Swap", href: "/swap" },
          { label: "Cross", href: "/cross", active: true },
          { label: "Bridge", href: "/bridge" },
          { label: "Gas", href: "/gas" },
          { label: "Portfolio", href: "/portfolio" },
          { label: "Widget", href: "/widget", badge: "NEW" },
        ]}
        controls={
          <>
            <NetworkSelector name={ARB.name} color={ARB.color} onClick={() => setSwapChainPickerOpen(true)} />
            <WalletButton connected address="0x12345678abcdef" balanceUSD={51570} onClick={() => setShowAccountModal(true)} />
          </>
        }
      />

      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "48px 24px" }}>
        <p style={{ fontSize: 11, letterSpacing: "0.40em", color: "#FF8A00", textTransform: "uppercase", marginBottom: 12 }}>
          DESIGN SYSTEM · v0.4
        </p>
        <h1 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 56, fontWeight: 300, letterSpacing: "-0.03em", marginBottom: 12 }}>
          EmpX dApp primitives.
        </h1>
        <p style={{ color: "rgba(255,255,255,0.55)", fontSize: 16, maxWidth: 640, marginBottom: 48 }}>
          Split routing, creative modals with corner brackets, animated toasts with
          progress bars, quote countdown rings, and a full portfolio dashboard.
        </p>

        <Section title="01 · Portfolio dashboard (full)">
          <EmpxPortfolioPanel
            totalUSD={51570.49}
            change24hPct={2.34}
            change24hUSD={1180.24}
            change7dPct={5.18}
            chart={PORTFOLIO_CHART}
            assets={SAMPLE_ASSETS}
            marketCards={SAMPLE_MARKETS}
            walletAddress="0x1234…cdef"
            onCopyAddress={() => toast.success("Address copied")}
            onRefresh={() => toast.pending("Refreshing portfolio…")}
          />
        </Section>

        <Section title="01b · NFT panel (portfolio teaser → opens gallery)">
          <NFTPanel
            totalCount={NFT_GALLERY.length}
            onViewAll={() => setShowNftGallery(true)}
            items={NFT_GALLERY.slice(0, 4)}
          />
        </Section>

        <Section title="02 · Chain picker — separate logic per context">
          <Card>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginBottom: 14 }}>
              <PrimaryButton variant="secondary" onClick={() => setSwapChainPickerOpen(true)} fullWidth={false}>
                Swap context (network switch)
              </PrimaryButton>
              <PrimaryButton variant="secondary" onClick={() => setCrossChainPickerOpen(true)} fullWidth={false}>
                Cross-chain context (grouped)
              </PrimaryButton>
              <PrimaryButton variant="secondary" onClick={() => setShowAccountModal(true)} fullWidth={false}>
                Open account modal
              </PrimaryButton>
            </div>
            <p style={{ margin: 0, fontSize: 12, color: "rgba(255,255,255,0.55)", lineHeight: 1.6 }}>
              The swap picker is a <strong style={{ color: "#fff" }}>flat list</strong> sorted by balance (highest USD first) — the user picks which network the app should be on. The cross picker <strong style={{ color: "#fff" }}>groups by chain kind</strong> (EVM / BTC / SOL / Other) for source &amp; destination selection. Both include a search bar.
            </p>
          </Card>
        </Section>

        <Section title="03 · Split-route visualization (multi-DEX)">
          <Card style={{ maxWidth: 720 }}>
            <p style={{ fontSize: 10, letterSpacing: "0.35em", color: "rgba(255,255,255,0.40)", textTransform: "uppercase", marginBottom: 24, fontWeight: 600 }}>
              ETH (Arbitrum) → USDC (Arbitrum) <span style={{ opacity: 0.5, margin: "0 8px" }}>·</span> 3 PARALLEL ROUTES
            </p>
            <SplitRouteVisualization
              fromTicker="ETH"
              fromChainName="Arbitrum"
              fromChainColor={ARB.color}
              toTicker="USDC"
              toChainName="Arbitrum"
              toChainColor={ARB.color}
              branches={SPLIT_ROUTE}
              animated
            />
          </Card>
        </Section>

        <Section title="04 · Single-route visualization (linear)">
          <Card style={{ maxWidth: 720 }}>
            <p style={{ fontSize: 10, letterSpacing: "0.35em", color: "rgba(255,255,255,0.40)", textTransform: "uppercase", marginBottom: 24, fontWeight: 600 }}>
              ETH (Arbitrum) → USDT (Base) <span style={{ opacity: 0.5, margin: "0 8px" }}>·</span> 3 HOPS
            </p>
            <RouteVisualization hops={crossChainRoute} animated />
          </Card>
        </Section>

        <Section title="05 · Quote countdown (replaces ugly warnings)">
          <Card>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 24, alignItems: "center" }}>
              <QuoteCountdown totalMs={30000} issuedAt={quoteIssuedAt} onRefresh={() => setQuoteIssuedAt(Date.now())} />
              <QuoteCountdown totalMs={10000} issuedAt={Date.now() - 8500} onRefresh={() => {}} />
              <QuoteCountdown totalMs={10000} issuedAt={Date.now() - 12000} onRefresh={() => toast.info("Quote refreshed")} />
              <QuoteCountdown totalMs={45000} issuedAt={Date.now() - 30000} onRefresh={() => {}} compact />
            </div>
            <p style={{ marginTop: 16, fontSize: 12, color: "rgba(255,255,255,0.50)" }}>
              Ring fills clockwise, color shifts through orange → yellow → red as
              expiry approaches.  Expired state shows a clear refresh CTA.
            </p>
          </Card>
        </Section>

        <Section title="06 · Modals (open via these triggers)">
          <Card>
            <p style={{ color: "rgba(255,255,255,0.55)", fontSize: 13, marginBottom: 16 }}>
              All modals now have corner brackets, ambient orange gradient wash, slide-up entrance, and refined header layouts.
            </p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
              <PrimaryButton variant="secondary" onClick={() => setShowTokenPicker(true)} fullWidth={false}>
                Token picker
              </PrimaryButton>
              <PrimaryButton variant="secondary" onClick={() => setCrossChainPickerOpen(true)} fullWidth={false}>
                Chain picker
              </PrimaryButton>
              <PrimaryButton variant="secondary" onClick={() => setShowWalletModal(true)} fullWidth={false}>
                Wallet modal
              </PrimaryButton>
              <PrimaryButton variant="secondary" onClick={() => setShowAccountModal(true)} fullWidth={false}>
                Account modal
              </PrimaryButton>
              <PrimaryButton variant="secondary" onClick={() => { setQuoteIssuedAt(Date.now()); setShowConfirm(true); }} fullWidth={false}>
                Confirm trade
              </PrimaryButton>
              <PrimaryButton variant="secondary" onClick={() => setShowSuccessModal(true)} fullWidth={false}>
                Trade success
              </PrimaryButton>
              <PrimaryButton variant="secondary" onClick={() => setShowNftGallery(true)} fullWidth={false}>
                NFT gallery
              </PrimaryButton>
            </div>
          </Card>
        </Section>

        <Section title="07 · Toaster (creative entrance + side bar + progress)">
          <Card>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
              <PrimaryButton variant="secondary" fullWidth={false} onClick={() => toast.success("Trade confirmed", { description: "Your USDC arrived on Base" })}>
                Success
              </PrimaryButton>
              <PrimaryButton variant="secondary" fullWidth={false} onClick={() => toast.error("Transaction reverted", { description: "Slippage exceeded — try again" })}>
                Error
              </PrimaryButton>
              <PrimaryButton variant="secondary" fullWidth={false} onClick={() => toast.pending("Submitting…", { description: "Awaiting signature" })}>
                Pending (no auto-dismiss)
              </PrimaryButton>
              <PrimaryButton variant="secondary" fullWidth={false} onClick={() => toast.info("Network switched", { description: "Now on Arbitrum", action: { label: "Undo", onClick: () => toast.info("Reverted") } })}>
                Info + action
              </PrimaryButton>
            </div>
          </Card>
        </Section>

        <Section title="08 · Widgets (refined inputs from prior round)">
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(460px, 1fr))", gap: 24, paddingTop: 10 }}>
            <div>
              <p style={{ fontSize: 11, letterSpacing: "0.30em", color: "rgba(255,255,255,0.45)", textTransform: "uppercase", marginBottom: 12, fontWeight: 700 }}>SWAP</p>
              <EmpxSwapWidget
                chain={ARB}
                fromToken={{ ticker: "ETH" }}
                fromAmount={swapFrom}
                fromBalance="12.45"
                fromUsdValue={Number(swapFrom) * 3184}
                onFromAmountChange={setSwapFrom}
                onSelectFromToken={() => setShowTokenPicker(true)}
                onPercentClick={(pct) => setSwapFrom(String((12.45 * pct) / 100))}
                toToken={{ ticker: "USDC" }}
                toAmount={swapTo}
                toUsdValue={Number(swapTo)}
                onSelectToToken={() => setShowTokenPicker(true)}
                pairType="V/S"
                protocolFeeBps={15}
                protocolFeeUSD={4.78}
                minimumReceived="3,180,000.00 USDC"
                slippageBps={50}
                priceImpactBps={12}
                routeHops={sameChainRoute}
                onSwap={() => { setQuoteIssuedAt(Date.now()); setShowConfirm(true); }}
                onFlip={() => { const a = swapFrom; setSwapFrom(swapTo); setSwapTo(a); }}
              />
            </div>
            <div>
              <p style={{ fontSize: 11, letterSpacing: "0.30em", color: "rgba(255,255,255,0.45)", textTransform: "uppercase", marginBottom: 12, fontWeight: 700 }}>CROSS-CHAIN</p>
              <EmpxCrossWidget
                fromChain={ARB}
                fromToken={{ ticker: "ETH" }}
                fromAmount={crossFrom}
                fromBalance="12.45"
                fromUsdValue={Number(crossFrom) * 3184}
                onFromAmountChange={setCrossFrom}
                onSelectFromToken={() => setShowTokenPicker(true)}
                onSelectFromChain={() => setCrossChainPickerOpen(true)}
                onPercentClick={(pct) => setCrossFrom(String((12.45 * pct) / 100))}
                toChain={BASE}
                toToken={{ ticker: "USDT" }}
                toAmount={crossTo}
                toUsdValue={Number(crossTo)}
                onSelectToToken={() => setShowTokenPicker(true)}
                onSelectToChain={() => setCrossChainPickerOpen(true)}
                railName="CCTP Fast"
                railBadge="JIT"
                protocolFeeBps={5}
                protocolFeeUSD={0.79}
                bridgeFeeUSD={0.32}
                sourceGasUSD={0.04}
                destinationGasUSD={0.03}
                estimatedTime="~ 90 seconds"
                minimumReceived="1,588.00 USDT"
                slippageBps={30}
                routeHops={crossChainRoute}
                onSwap={() => { setQuoteIssuedAt(Date.now()); setShowConfirm(true); }}
                onFlip={() => { const a = crossFrom; setCrossFrom(crossTo); setCrossTo(a); }}
              />
            </div>
            <div>
              <p style={{ fontSize: 11, letterSpacing: "0.30em", color: "rgba(255,255,255,0.45)", textTransform: "uppercase", marginBottom: 12, fontWeight: 700 }}>BRIDGE</p>
              <EmpxBridgeWidget
                fromChain={ARB}
                toChain={BASE}
                token={{ ticker: "USDC" }}
                amount={bridgeAmount}
                balance="8,420.10"
                usdValue={Number(bridgeAmount)}
                receiveAmount={bridgeReceive}
                receiveUsdValue={Number(bridgeReceive)}
                onAmountChange={setBridgeAmount}
                onSelectToken={() => setShowTokenPicker(true)}
                onSelectFromChain={() => setCrossChainPickerOpen(true)}
                onSelectToChain={() => setCrossChainPickerOpen(true)}
                onPercentClick={(pct) => setBridgeAmount(String((8420.10 * pct) / 100))}
                onFlip={() => {}}
                railName="CCTP"
                railBadge="USDC NATIVE"
                protocolFeeUSD={0.45}
                bridgeFeeUSD={0.70}
                estimatedTime="~ 3 minutes"
                onSubmit={() => toast.pending("Bridge submitted", { description: "Tracking on Arbitrum → Base" })}
              />
            </div>
            <div>
              <p style={{ fontSize: 11, letterSpacing: "0.30em", color: "rgba(255,255,255,0.45)", textTransform: "uppercase", marginBottom: 12, fontWeight: 700 }}>GAS REFUEL</p>
              <EmpxGasWidget
                sourceChain={{ ...ARB, ticker: "ETH" }}
                sourceAmount={gasFrom}
                sourceBalance="12.45"
                sourceUsdValue={Number(gasFrom) * 3184}
                onSelectSourceChain={() => setCrossChainPickerOpen(true)}
                onSwitchChains={() => {}}
                destination={{
                  id: "base",
                  chain: { ...BASE, ticker: "ETH" },
                  usd: Number(gasTo) * 3184,
                  nativeOut: Number(gasTo),
                }}
                onSelectDestinationChain={() => setCrossChainPickerOpen(true)}
                onSetDestinationUsd={(usd) => setGasTo(String(usd / 3184))}
                presets={[5, 10, 20, 50]}
                bridgeFeeUSD={0.12}
                estimatedTime="~ 45 seconds"
                useDifferentRecipient={false}
                onToggleRecipient={() => {}}
                recipient=""
                onSetRecipient={() => {}}
                recipientValid
                canSubmit
                swapLabel="Send gas to Base"
                onSubmit={() => toast.success("Refuel submitted")}
                walletConnected
                onConnect={() => {}}
              />
            </div>
          </div>
        </Section>

        <p style={{ marginTop: 60, color: "rgba(255,255,255,0.30)", fontSize: 11, letterSpacing: "0.2em", textAlign: "center", textTransform: "uppercase" }}>
          EMPX DESIGN SYSTEM · v0.4 · 2026
        </p>
      </div>

      <TokenPicker
        open={showTokenPicker}
        onClose={() => setShowTokenPicker(false)}
        tokens={SAMPLE_TOKENS}
        recent={SAMPLE_TOKENS.slice(0, 4)}
        chains={[ARB, BASE, ETH_MAIN].map((c) => ({ name: c.name, color: c.color }))}
        onSelect={(t) => { setShowTokenPicker(false); toast.info(`Selected ${t.ticker}`); }}
      />

      {/* Swap context — flat list, eyebrow "NETWORK" */}
      <ChainPicker
        open={swapChainPickerOpen}
        onClose={() => setSwapChainPickerOpen(false)}
        chains={ALL_CHAINS.map((c) => ({
          ...c,
          hasBalance: [ARB.id, BASE.id].includes(c.id),
          balanceUSD: c.id === ARB.id ? 48583.89 : c.id === BASE.id ? 1862.50 : undefined,
        }))}
        selectedId={ARB.id}
        mode="swap"
        onSelect={(c) => { setSwapChainPickerOpen(false); toast.info(`Network switched to ${c.name}`); }}
      />

      {/* Cross context — grouped by kind */}
      <ChainPicker
        open={crossChainPickerOpen}
        onClose={() => setCrossChainPickerOpen(false)}
        chains={ALL_CHAINS}
        selectedId={ARB.id}
        mode="cross"
        onSelect={(c) => { setCrossChainPickerOpen(false); toast.info(`Selected ${c.name}`); }}
      />

      <AccountModal
        open={showAccountModal}
        onClose={() => setShowAccountModal(false)}
        address="0x1234567890abcdef1234567890abcdef12345678"
        providerName="MetaMask"
        chainName={ARB.name}
        chainColor={ARB.color}
        balanceUSD={51570.49}
        nativeBalance="12.45"
        nativeTicker="ETH"
        explorerUrl="https://arbiscan.io/address/0x1234567890abcdef1234567890abcdef12345678"
        activity={[
          { id: 1, kind: "SWAP",    summary: "0.5 ETH → 1,591 USDT",     status: "confirmed", timeLabel: "2m ago",  txHashShort: "0xab…3f9", onClick: () => {} },
          { id: 2, kind: "CROSS",   summary: "5,000 USDC Arb → Base",   status: "pending",   timeLabel: "5m ago",  txHashShort: "0x4e…c12", onClick: () => {} },
          { id: 3, kind: "APPROVE", summary: "USDC ↔ Router",            status: "confirmed", timeLabel: "1h ago",  txHashShort: "0xa1…b07", onClick: () => {} },
          { id: 4, kind: "GAS",     summary: "0.05 ETH refuel to Base",  status: "failed",    timeLabel: "yesterday", txHashShort: "0x55…d2a", onClick: () => {} },
        ]}
        tokens={[
          { ticker: "ETH",  chainName: ARB.name,      chainColor: ARB.color,      balance: "12.45",    balanceUSD: 39625.20 },
          { ticker: "USDC", chainName: ARB.name,      chainColor: ARB.color,      balance: "8,420.10", balanceUSD: 8420.10 },
          { ticker: "ARB",  chainName: ARB.name,      chainColor: ARB.color,      balance: "452.18",   balanceUSD: 538.59 },
          { ticker: "USDT", chainName: BASE.name,     chainColor: BASE.color,     balance: "1,250.00", balanceUSD: 1250.00 },
          { ticker: "AERO", chainName: BASE.name,     chainColor: BASE.color,     balance: "245.00",   balanceUSD: 612.50 },
          { ticker: "WBTC", chainName: ETH_MAIN.name, chainColor: ETH_MAIN.color, balance: "0.0312",   balanceUSD: 2120.40 },
        ]}
        networks={[
          { chainName: ARB.name,      chainColor: ARB.color,      balanceUSD: 48583.89, nativeBalance: "12.45 ETH" },
          { chainName: BASE.name,     chainColor: BASE.color,     balanceUSD: 1862.50,  nativeBalance: "0.04 ETH", lowGas: true },
          { chainName: ETH_MAIN.name, chainColor: ETH_MAIN.color, balanceUSD: 2120.40,  nativeBalance: "0.21 ETH" },
        ]}
        onCopy={() => toast.success("Address copied")}
        onReceive={() => toast.info("Receive flow")}
        onBuy={() => toast.info("Open buy provider")}
        onBridge={() => toast.info("Open bridge")}
        onSwitchNetwork={() => { setShowAccountModal(false); setSwapChainPickerOpen(true); }}
        onDisconnect={() => { setShowAccountModal(false); toast.info("Wallet disconnected"); }}
        onSwitchWallet={() => { setShowAccountModal(false); setShowWalletModal(true); }}
        onViewPortfolio={() => { setShowAccountModal(false); toast.info("Navigate to /portfolio"); }}
      />

      {/* NFT Gallery — large browse modal */}
      <NFTGalleryModal
        open={showNftGallery}
        onClose={() => setShowNftGallery(false)}
        items={NFT_GALLERY}
        totalFloorETH={NFT_GALLERY.reduce((s, n) => s + (n.floorETH || 0), 0)}
        totalFloorUSD={NFT_GALLERY.reduce((s, n) => s + (n.floorUSD || 0), 0)}
        onSelect={(n) => toast.info(`Opened ${n.collection} ${n.name}`)}
      />

      {/* Trade success — opens after confirm */}
      <TradeSuccessModal
        open={showSuccessModal}
        onClose={() => setShowSuccessModal(false)}
        kind="CROSS-CHAIN"
        fromTicker="ETH"
        fromAmount="0.5"
        fromChainName="Arbitrum"
        toTicker="USDT"
        toAmount="1,591.20"
        toChainName="Base"
        message="USDT arrived on Base"
        timeline={[
          { label: "Source confirmation",   description: "Arbitrum tx mined in block 24,158,914", state: "complete", timeLabel: "0:00" },
          { label: "Rail settlement",       description: "CCTP Fast burned + minted on Base",      state: "complete", timeLabel: "0:42" },
          { label: "Destination delivery",  description: "USDT arrived at recipient wallet",       state: "complete", timeLabel: "0:58" },
        ]}
        txHashes={[
          { label: "Source", chainName: "Arbitrum", chainColor: ARB.color,  hashShort: "0xab12…3f9d", url: "https://arbiscan.io" },
          { label: "Destination", chainName: "Base", chainColor: BASE.color, hashShort: "0x4e8a…c124", url: "https://basescan.org" },
        ]}
        onNewTrade={() => { setShowSuccessModal(false); toast.info("Reset for new trade"); }}
        onViewPortfolio={() => { setShowSuccessModal(false); toast.info("Navigate to /portfolio"); }}
      />

      <WalletModal
        open={showWalletModal}
        onClose={() => setShowWalletModal(false)}
        wallets={WALLET_OPTIONS}
        onSelect={(w) => { setShowWalletModal(false); toast.pending(`Connecting to ${w.name}…`); }}
      />

      <ConfirmTradeModal
        open={showConfirm}
        onClose={() => setShowConfirm(false)}
        onConfirm={() => { setShowConfirm(false); setShowSuccessModal(true); }}
        eyebrow="REVIEW · CROSS-CHAIN"
        title="Confirm trade"
        fromTicker="ETH"
        fromAmount="0.5"
        fromUsdValue={1592}
        fromChainName="Arbitrum"
        toTicker="USDT"
        toAmount="1,591.20"
        toUsdValue={1591.20}
        toChainName="Base"
        routeHops={crossChainRoute}
        feeRows={[
          { label: "Via rail", value: "CCTP Fast" },
          { label: "Protocol fee", value: "5 bps", sub: "· $0.79", accent: true },
          { label: "Bridge fee", value: "$0.32" },
          { label: "Est. time", value: "~ 90 seconds" },
          { label: "Min. received", value: "1,588.00 USDT", muted: true },
          { label: "Slippage", value: "0.30%", muted: true },
        ]}
        quoteIssuedAt={quoteIssuedAt}
        quoteValidMs={30000}
        onRefreshQuote={() => setQuoteIssuedAt(Date.now())}
        warning="Cross-chain trades settle asynchronously. Funds may take longer than estimated during rail congestion."
        confirmLabel="Confirm cross-chain"
      />

      <Toaster />
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section style={{ marginBottom: 56 }}>
      <h2
        style={{
          fontFamily: "'Space Grotesk', sans-serif",
          fontSize: 22,
          fontWeight: 300,
          letterSpacing: "-0.02em",
          marginBottom: 16,
          paddingBottom: 8,
          borderBottom: "1px solid rgba(255,255,255,0.08)",
        }}
      >
        {title}
      </h2>
      {children}
    </section>
  );
}
