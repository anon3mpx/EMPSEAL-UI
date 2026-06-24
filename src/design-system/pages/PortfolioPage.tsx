// ─── PortfolioPage — landing destination from "Enter dApp" on landing ──────
//
// First page the user sees after entering the dApp.  Handles three states:
//   1) WALLET NOT CONNECTED → EmptyState with Connect CTA
//   2) LOADING               → Skeleton hero + skeleton list
//   3) LOADED                → EmpxPortfolioPanel + NFTPanel + activity feed
//
// Composed entirely from design-system primitives.  Drop-in replacement for
// the existing src/pages/portfolio/Portfolio.tsx (2,036 lines → ~400 lines).

import { useEffect, useState } from "react";
import {
  AccountModal,
  BrandMark,
  Card,
  ChainPicker,
  DappNavbar,
  EmptyState,
  NetworkSelector,
  NFTGalleryModal,
  NFTPanel,
  Pill,
  PrimaryButton,
  Skeleton,
  SocialTray,
  Tabs,
  Toaster,
  toast,
  useIsMobile,
  WalletButton,
  WalletModal,
  type NFTItem,
  type NavLink,
  type PickerChain,
  type WalletOption,
} from "../components";
import { useWalletConnection } from "../hooks/useWalletConnection";
import { useV2Balances } from "../hooks/useV2Balances";
import { EMPX_SOCIALS } from "./SwapPage";
import { getExplorerAddressUrl } from "../data/explorers";
import { V2_ALL_CHAINS } from "../data/v2ChainView";
import EmpxPortfolioPanel, {
  type PortfolioAsset,
  type MarketCard,
} from "../EmpxPortfolioPanel";

// ─── Shared chain references (would come from SDK / chain registry) ───────

const ARB = { id: 42161, name: "Arbitrum",  color: "#28A0F0" };
const BASE = { id: 8453, name: "Base",      color: "#0052FF" };
const ETH_MAIN = { id: 1, name: "Ethereum", color: "#627EEA" };
const OP = { id: 10, name: "Optimism",      color: "#FF0420" };
const POLY = { id: 137, name: "Polygon",    color: "#7B3FE4" };
const BSC = { id: 56, name: "BSC",          color: "#F0B90B" };
const SONIC = { id: 146, name: "Sonic",     color: "#FE9A4D" };
const BTC = { id: 0, name: "Bitcoin",       color: "#F7931A", kind: "BTC" as const };
const SOL = { id: 900, name: "Solana",      color: "#9945FF", kind: "SOL" as const };

const ALL_CHAINS: PickerChain[] = V2_ALL_CHAINS.map((chain) => ({
  id: chain.id,
  name: chain.name,
  color: chain.color,
  ticker: chain.ticker,
  kind: chain.kind,
}));


// ─── Demo data (will be swapped for real SDK / VPS fetch) ─────────────────

const DEMO_ASSETS: PortfolioAsset[] = [
  { ticker: "ETH",  chainName: "Arbitrum", chainColor: ARB.color, balance: "12.45",    balanceUSD: 39625.20, change24h: 2.84,  change7d: -1.42, allocation: 76.8, spark: [3120,3110,3140,3155,3148,3162,3170,3184] },
  { ticker: "USDC", chainName: "Arbitrum", chainColor: ARB.color, balance: "8,420.10", balanceUSD: 8420.10,  change24h: 0.01,  change7d: 0.03,  allocation: 16.3, spark: [0.9998,0.9999,1.0001,1.0000,0.9999,1.0001,1.0002,1.0001] },
  { ticker: "USDT", chainName: "Base",     chainColor: BASE.color, balance: "1,250.00", balanceUSD: 1250.00,  change24h: -0.02, change7d: 0.01,  allocation: 2.4,  spark: [1.0002,1.0001,1.0000,0.9999,0.9998,0.9999,1.0000,0.9999] },
  { ticker: "ARB",  chainName: "Arbitrum", chainColor: ARB.color, balance: "452.18",   balanceUSD: 538.59,   change24h: 8.42,  change7d: 12.50, allocation: 1.0,  spark: [1.05,1.06,1.08,1.10,1.12,1.14,1.16,1.19] },
  { ticker: "WBTC", chainName: "Ethereum", chainColor: ETH_MAIN.color, balance: "0.0312", balanceUSD: 2120.40, change24h: 1.42, change7d: -2.15, allocation: 4.1, spark: [68500,68400,68200,68100,67900,67800,67852] },
  { ticker: "AERO", chainName: "Base",     chainColor: BASE.color, balance: "245.00",   balanceUSD: 612.50,   change24h: 5.32,  change7d: 18.40, allocation: 1.2,  spark: [2.10,2.15,2.20,2.25,2.30,2.40,2.45,2.50] },
];

const DEMO_MARKETS: MarketCard[] = [
  { ticker: "ETH",  name: "Ether",     price: 3184.20,  change24h: 2.84,  chainColor: ETH_MAIN.color, spark: [3100,3120,3110,3140,3155,3148,3162,3170,3184] },
  { ticker: "BTC",  name: "Bitcoin",   price: 67852.40, change24h: 1.42,  chainColor: BTC.color,      spark: [67000,67200,67100,67400,67550,67620,67700,67800,67852] },
  { ticker: "SOL",  name: "Solana",    price: 158.30,   change24h: -2.10, chainColor: SOL.color,      spark: [165,163,161,158,156,159,157,156,158] },
  { ticker: "ARB",  name: "Arbitrum",  price: 1.19,     change24h: 8.42,  chainColor: ARB.color,      spark: [1.05,1.06,1.08,1.10,1.12,1.14,1.16,1.17,1.19] },
];

const DEMO_CHART = [48200, 48450, 48100, 48800, 49250, 49800, 50100, 49700, 50300, 50900, 51200, 51570];

const DEMO_NFTS: NFTItem[] = [
  { id: "1", collection: "Pudgy Penguins",   name: "#4271",     chainName: "Ethereum", chainColor: ETH_MAIN.color, floorETH: 9.85,  floorUSD: 31378, rarityRank: 421, badge: "RARE", placeholder: "P" },
  { id: "2", collection: "Mad Lads",         name: "#1138",     chainName: "Solana",   chainColor: SOL.color,      floorETH: 1.42,  floorUSD: 4517,  rarityRank: 230, placeholder: "ML" },
  { id: "3", collection: "Azuki Elementals", name: "#9882",     chainName: "Ethereum", chainColor: ETH_MAIN.color, floorETH: 0.58,  floorUSD: 1846,  placeholder: "Az" },
  { id: "4", collection: "Base Frens",       name: "Fren-0341", chainName: "Base",     chainColor: BASE.color,     floorETH: 0.025, floorUSD: 79,    badge: "NEW", placeholder: "BF" },
  { id: "5", collection: "Pudgy Penguins",   name: "#7102",     chainName: "Ethereum", chainColor: ETH_MAIN.color, floorETH: 9.85,  floorUSD: 31378, rarityRank: 1042, placeholder: "P" },
  { id: "6", collection: "Doodles",          name: "#221",      chainName: "Ethereum", chainColor: ETH_MAIN.color, floorETH: 1.94,  floorUSD: 6173,  rarityRank: 380, placeholder: "D" },
];

// ─── Page state model ─────────────────────────────────────────────────────

type PageTab = "overview" | "assets" | "nfts" | "activity";

// ─── Page component ──────────────────────────────────────────────────────

export default function PortfolioPage() {
  const isMobile = useIsMobile();
  const { walletState, walletOptions, onSelectWallet, disconnect, switchChain, currentChain } =
    useWalletConnection();
  const connectedBalance = useV2Balances();
  const [tab, setTab] = useState<PageTab>("overview");
  const [showWalletModal, setShowWalletModal] = useState(false);
  const [showChainPicker, setShowChainPicker] = useState(false);
  const [showAccountModal, setShowAccountModal] = useState(false);
  const [showNftGallery, setShowNftGallery] = useState(false);

  const [portfolioData, setPortfolioData] = useState<{
    totalUSD: number;
    change24hPct: number;
    change24hUSD: number;
    change7dPct: number;
    chart: number[];
    assets: PortfolioAsset[];
    markets: MarketCard[];
    nfts: NFTItem[];
  } | null>(null);

  useEffect(() => {
    if (walletState.status === "connected" && !portfolioData) {
      setPortfolioData({
        totalUSD: 51570.49,
        change24hPct: 2.34,
        change24hUSD: 1180.24,
        change7dPct: 5.18,
        chart: DEMO_CHART,
        assets: DEMO_ASSETS,
        markets: DEMO_MARKETS,
        nfts: DEMO_NFTS,
      });
      toast.success("Portfolio loaded", { description: "Synced across 3 chains" });
    }
  }, [walletState.status, portfolioData]);


  const navLinks: NavLink[] = [
    { label: "Swap",      href: "/swap-v2" },
    { label: "Cross",     href: "/cross-v2" },
    { label: "Bridge",    href: "/bridge-v2" },
    { label: "Multi",     href: "/multi-v2", badge: "NEW" },
    { label: "Gas",       href: "/gas-v2" },
    { label: "Widget",    href: "/widget-v2" },
    { label: "Portfolio", href: "/portfolio-v2", active: true },
  ];

  return (
    <div style={{ minHeight: "100vh", background: "#05050c", color: "#fff", fontFamily: "Inter, sans-serif" }}>
      {/* Navbar */}
      <DappNavbar
        links={navLinks}
        socials={<SocialTray links={EMPX_SOCIALS} withSeparator />}
        controls={
          <>
            <NetworkSelector
              name={walletState.status === "connected" ? walletState.chain.name : ARB.name}
              color={walletState.status === "connected" ? walletState.chain.color : ARB.color}
              onClick={() => setShowChainPicker(true)}
            />
            <WalletButton
              connected={walletState.status === "connected"}
              address={walletState.status === "connected" ? walletState.address : undefined}
              balanceUSD={walletState.status === "connected" ? portfolioData?.totalUSD ?? 0 : undefined}
              onConnect={() => setShowWalletModal(true)}
              onClick={() => setShowAccountModal(true)}
            />
          </>
        }
      />

      {/* Page body */}
      <main style={{ maxWidth: 1180, margin: "0 auto", padding: isMobile ? "24px 16px 56px" : "32px 24px 72px" }}>
        {/* Hero header — title + delta */}
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
            DASHBOARD · WALLET
          </p>
          <h1
            style={{
              margin: "8px 0 0",
              fontFamily: "'Space Grotesk', sans-serif",
              fontSize: "clamp(34px, 4.5vw, 56px)",
              fontWeight: 300,
              letterSpacing: "-0.03em",
              lineHeight: 1,
              color: "#fff",
            }}
          >
            Your portfolio.{" "}
            <span
              style={{
                fontFamily: "'Instrument Serif', serif",
                fontStyle: "italic",
                color: "#FF8A00",
                letterSpacing: "-0.02em",
              }}
            >
              One profile, every position.
            </span>
          </h1>
        </header>

        {/* State router */}
        {walletState.status === "disconnected" && (
          <DisconnectedState onConnect={() => setShowWalletModal(true)} />
        )}

        {walletState.status === "loading" && <LoadingState />}

        {walletState.status === "connected" && (
          <>
            {/* Sub-nav tabs */}
            <div style={{ marginBottom: 20 }}>
              <Tabs
                active={tab}
                onChange={(v) => setTab(v)}
                options={[
                  { value: "overview", label: "Overview" },
                  { value: "assets",   label: "Assets",   count: portfolioData?.assets?.length ?? 0 },
                  { value: "nfts",     label: "NFTs",     count: portfolioData?.nfts?.length ?? 0 },
                  { value: "activity", label: "Activity", count: 4 },
                ]}
              />
            </div>

            {tab === "overview" && (
              <EmpxPortfolioPanel
                totalUSD={portfolioData?.totalUSD ?? 0}
                change24hPct={portfolioData?.change24hPct ?? 0}
                change24hUSD={portfolioData?.change24hUSD ?? 0}
                change7dPct={portfolioData?.change7dPct ?? 0}
                chart={portfolioData?.chart ?? []}
                assets={portfolioData?.assets ?? []}
                marketCards={portfolioData?.markets ?? []}
                walletAddress={`${walletState.address.slice(0, 6)}…${walletState.address.slice(-4)}`}
                onCopyAddress={() => toast.success("Address copied")}
                onRefresh={() => toast.pending("Refreshing portfolio…")}
              />
            )}

            {tab === "assets" && (
              <EmpxPortfolioPanel
                totalUSD={portfolioData?.totalUSD ?? 0}
                change24hPct={portfolioData?.change24hPct ?? 0}
                change24hUSD={portfolioData?.change24hUSD ?? 0}
                change7dPct={portfolioData?.change7dPct ?? 0}
                assets={portfolioData?.assets ?? []}
              />
            )}

            {tab === "nfts" && (
              <NFTPanel
                items={(portfolioData?.nfts ?? []).slice(0, 8)}
                totalCount={portfolioData?.nfts?.length ?? 0}
                onViewAll={() => setShowNftGallery(true)}
              />
            )}

            {tab === "activity" && (
              <ActivityFeed
                items={[
                  { id: 1, kind: "SWAP",    summary: "0.5 ETH → 1,591 USDT",     status: "confirmed", timeLabel: "2m ago",  txHashShort: "0xab…3f9", chainName: "Arbitrum", chainColor: ARB.color },
                  { id: 2, kind: "CROSS",   summary: "5,000 USDC Arb → Base",   status: "pending",   timeLabel: "5m ago",  txHashShort: "0x4e…c12", chainName: "Arbitrum", chainColor: ARB.color },
                  { id: 3, kind: "APPROVE", summary: "USDC ↔ Router",            status: "confirmed", timeLabel: "1h ago",  txHashShort: "0xa1…b07", chainName: "Arbitrum", chainColor: ARB.color },
                  { id: 4, kind: "GAS",     summary: "0.05 ETH refuel to Base",  status: "failed",    timeLabel: "yesterday", txHashShort: "0x55…d2a", chainName: "Base", chainColor: BASE.color },
                ]}
              />
            )}
          </>
        )}
      </main>

      {/* Overlays */}
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
        chains={ALL_CHAINS.map((c) => ({
          ...c,
          balanceUSD:
            walletState.status === "connected" && c.id === walletState.chain.id ? portfolioData?.totalUSD ?? 0 : undefined,
        }))}
        selectedId={walletState.status === "connected" ? walletState.chain.id : ARB.id}
        mode="swap"
        onSelect={(c) => {
          setShowChainPicker(false);
          if (walletState.status === "connected") {
            switchChain({ chainId: c.id });
          }
          toast.info(`Network switched to ${c.name}`);
        }}
      />

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
          tokens={[
            {
              ticker: connectedBalance.nativeTicker,
              chainName: walletState.chain.name,
              chainColor: walletState.chain.color,
              balance: connectedBalance.nativeBalance,
              balanceUSD: connectedBalance.nativeBalanceUSD ?? undefined,
            },
          ]}
          networks={[
            {
              chainName: walletState.chain.name,
              chainColor: walletState.chain.color,
              balanceUSD: connectedBalance.nativeBalanceUSD ?? 0,
              nativeBalance: `${connectedBalance.nativeBalance} ${connectedBalance.nativeTicker}`,
            },
          ]}
          onCopy={() => toast.success("Address copied")}
          onReceive={() => toast.info("Receive flow")}
          onBuy={() => toast.info("Open buy provider")}
          onBridge={() => toast.info("Open bridge")}
          onSwitchNetwork={() => { setShowAccountModal(false); setShowChainPicker(true); }}
          onSwitchWallet={() => { setShowAccountModal(false); setShowWalletModal(true); }}
          onDisconnect={() => { setShowAccountModal(false); disconnect(); toast.info("Wallet disconnected"); }}
        />
      )}

      {walletState.status === "connected" && (
        <NFTGalleryModal
          open={showNftGallery}
          onClose={() => setShowNftGallery(false)}
          items={portfolioData?.nfts ?? []}
          totalFloorETH={(portfolioData?.nfts ?? []).reduce((s, n) => s + (n.floorETH || 0), 0)}
          totalFloorUSD={(portfolioData?.nfts ?? []).reduce((s, n) => s + (n.floorUSD || 0), 0)}
          onSelect={(n) => toast.info(`Opened ${n.collection} ${n.name}`)}
        />
      )}

      <Toaster />
    </div>
  );
}

// ─── State sub-components ─────────────────────────────────────────────────

function DisconnectedState({ onConnect }: { onConnect: () => void }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24, marginTop: 24 }}>
      <EmptyState
        headline="Connect a wallet to load your portfolio"
        body="EmpX reads your balances across 15+ EVM chains plus native Bitcoin and Solana via the cross-bridge SDK. Nothing is custodial — your keys stay where they are."
        action={{ label: "Connect wallet", onClick: onConnect }}
        secondaryAction={{ label: "Try demo data", onClick: onConnect }}
      />

      {/* Preview cards even when disconnected */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 12 }}>
        <PreviewCard
          eyebrow="PROFILE TRACKER"
          title="Connected-wallet view"
          body="EmpsealRouter chains, plus native BTC/SOL when those wallets connect. Aggregated USD value, 24h and 7d deltas, allocation breakdown."
        />
        <PreviewCard
          eyebrow="NFT TRACKING"
          title="Collections + floor"
          body="NFTs across Ethereum, Solana, Base, Arbitrum. Group by collection, sort by floor or rarity, jump to marketplace."
        />
        <PreviewCard
          eyebrow="ACTIVITY"
          title="Cross-chain history"
          body="Every swap, bridge, gas refuel and approval — flagged with status. Tap to view on chain explorer."
        />
      </div>
    </div>
  );
}

function PreviewCard({ eyebrow, title, body }: { eyebrow: string; title: string; body: string }) {
  return (
    <Card>
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
        {eyebrow}
      </p>
      <p
        style={{
          margin: "10px 0 6px",
          fontFamily: "'Space Grotesk', sans-serif",
          fontSize: 18,
          fontWeight: 400,
          letterSpacing: "-0.015em",
          color: "#fff",
        }}
      >
        {title}
      </p>
      <p style={{ margin: 0, fontSize: 12.5, color: "rgba(255,255,255,0.55)", lineHeight: 1.55 }}>
        {body}
      </p>
    </Card>
  );
}

function LoadingState() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      <Card style={{ padding: 26 }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 28 }}>
          <div>
            <Skeleton variant="text" width={120} height={11} />
            <div style={{ marginTop: 14 }}>
              <Skeleton variant="rect" width={260} height={48} />
            </div>
            <div style={{ marginTop: 14, display: "flex", gap: 10 }}>
              <Skeleton variant="rect" width={120} height={28} radius={3} />
              <Skeleton variant="rect" width={92} height={28} radius={3} />
            </div>
          </div>
          <Skeleton variant="rect" width="100%" height={130} />
        </div>
        <div style={{ marginTop: 24 }}>
          <Skeleton variant="rect" width="100%" height={6} />
        </div>
      </Card>

      <Card style={{ padding: 0 }}>
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 14,
              padding: "14px 16px",
              borderBottom: i < 3 ? "1px solid rgba(255,255,255,0.04)" : "none",
            }}
          >
            <Skeleton variant="rect" width={34} height={34} radius={4} />
            <div style={{ flex: 1 }}>
              <Skeleton variant="text" width={72} height={12} />
              <div style={{ marginTop: 6 }}>
                <Skeleton variant="text" width={140} height={10} />
              </div>
            </div>
            <Skeleton variant="text" width={48} height={14} />
            <Skeleton variant="text" width={48} height={14} />
            <Skeleton variant="text" width={80} height={16} />
          </div>
        ))}
      </Card>
    </div>
  );
}

interface ActivityRow {
  id: number;
  kind: string;
  summary: string;
  status: "confirmed" | "pending" | "failed";
  timeLabel: string;
  txHashShort: string;
  chainName: string;
  chainColor?: string;
}

function ActivityFeed({ items }: { items: ActivityRow[] }) {
  return (
    <Card style={{ padding: 0, overflow: "hidden" }}>
      {items.length === 0 ? (
        <EmptyState
          headline="No transactions yet"
          body="Swap, bridge, or refuel from any EmpX surface to populate your history."
          surface="inline"
        />
      ) : (
        items.map((a, i) => (
          <div
            key={a.id}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 14,
              padding: "14px 18px",
              borderBottom: i < items.length - 1 ? "1px solid rgba(255,255,255,0.04)" : "none",
              cursor: "pointer",
              transition: "background 140ms ease",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.02)")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
          >
            <span
              style={{
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: "0.30em",
                color: "rgba(255,255,255,0.55)",
                minWidth: 78,
                textTransform: "uppercase",
              }}
            >
              {a.kind}
            </span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ margin: 0, fontSize: 13.5, color: "#fff", fontWeight: 500 }}>
                {a.summary}
              </p>
              <p
                style={{
                  margin: "3px 0 0",
                  fontSize: 11,
                  color: "rgba(255,255,255,0.40)",
                  fontFamily: "ui-monospace, Menlo, monospace",
                }}
              >
                {a.txHashShort}
              </p>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              {a.chainColor && (
                <span
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: 2,
                    background: a.chainColor,
                    boxShadow: `0 0 5px ${a.chainColor}`,
                  }}
                />
              )}
              <span
                style={{
                  fontSize: 10,
                  fontWeight: 600,
                  letterSpacing: "0.25em",
                  color: "rgba(255,255,255,0.55)",
                  textTransform: "uppercase",
                }}
              >
                {a.chainName}
              </span>
            </div>
            <Pill
              variant={
                a.status === "confirmed" ? "success" : a.status === "failed" ? "danger" : "accent"
              }
            >
              {a.status === "confirmed" ? "Done" : a.status === "failed" ? "Failed" : "Pending"}
            </Pill>
            <span
              style={{
                fontSize: 11,
                color: "rgba(255,255,255,0.40)",
                whiteSpace: "nowrap",
                minWidth: 72,
                textAlign: "right",
              }}
            >
              {a.timeLabel}
            </span>
          </div>
        ))
      )}
    </Card>
  );
}
