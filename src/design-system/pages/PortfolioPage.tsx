// ─── PortfolioPage — landing destination from "Enter dApp" on landing ──────
//
// First page the user sees after entering the dApp.  Handles three states:
//   1) WALLET NOT CONNECTED → EmptyState with Connect CTA
//   2) LOADING               → Skeleton hero + skeleton list
//   3) LOADED                → EmpxPortfolioPanel + NFTPanel + activity feed
//
// Composed entirely from design-system primitives.  Drop-in replacement for
// the existing src/pages/portfolio/Portfolio.tsx (2,036 lines → ~400 lines).

import { useEffect, useMemo, useState } from "react";
import {
  AccountModal,
  Card,
  ChainPicker,
  DappNavbar,
  EmptyState,
  NetworkSelector,
  NFTGalleryModal,
  NFTPanel,
  Pill,
  Skeleton,
  SocialTray,
  Tabs,
  Toaster,
  toast,
  useIsMobile,
  WalletButton,
  WalletModal,
  type NavLink,
  type PickerChain,
} from "../components";
import { useWalletConnection } from "../hooks/useWalletConnection";
import { useV2Balances } from "../hooks/useV2Balances";
import { getExplorerAddressUrl } from "../data/explorers";
import { fetchPortfolio } from "../data/portfolioApiRuntime";
import {
  buildPortfolioV2ViewModel,
  type PortfolioV2Data,
} from "../data/portfolioV2Adapters";
import { EMPX_SOCIALS } from "../data/socials";
import { V2_ALL_CHAINS } from "../data/v2ChainView";
import EmpxPortfolioPanel from "../EmpxPortfolioPanel";

const ALL_CHAINS: PickerChain[] = V2_ALL_CHAINS.map((chain) => ({
  id: chain.id,
  name: chain.name,
  color: chain.color,
  ticker: chain.ticker,
  kind: chain.kind,
}));

const DEFAULT_CHAIN = ALL_CHAINS[0] ?? {
  id: 42161,
  name: "Arbitrum",
  color: "#28A0F0",
  ticker: "ETH",
  kind: "EVM" as const,
};

// ─── Page state model ─────────────────────────────────────────────────────

type PageTab = "overview" | "assets" | "nfts" | "activity";

// ─── Page component ──────────────────────────────────────────────────────

export default function PortfolioPage() {
  const isMobile = useIsMobile();
  const { walletState, walletOptions, onSelectWallet, disconnect, switchChain } =
    useWalletConnection();
  const connectedBalance = useV2Balances();
  const [tab, setTab] = useState<PageTab>("overview");
  const [showWalletModal, setShowWalletModal] = useState(false);
  const [showChainPicker, setShowChainPicker] = useState(false);
  const [showAccountModal, setShowAccountModal] = useState(false);
  const [showNftGallery, setShowNftGallery] = useState(false);
  const [portfolio, setPortfolio] = useState<PortfolioV2Data | null>(null);
  const [portfolioLoading, setPortfolioLoading] = useState(false);
  const [portfolioError, setPortfolioError] = useState<string | null>(null);
  const connectedWalletAddress = walletState.status === "connected" ? walletState.address : null;

  const portfolioView = useMemo(() => buildPortfolioV2ViewModel(portfolio), [portfolio]);
  const canRenderPortfolio =
    walletState.status === "connected" &&
    !portfolioLoading &&
    !portfolioError &&
    portfolioView.assets.length > 0;

  useEffect(() => {
    if (!connectedWalletAddress) {
      setPortfolio(null);
      setPortfolioLoading(false);
      setPortfolioError(null);
      return;
    }

    let cancelled = false;

    // Real portfolio fetches can fan out across many RPCs; cancel stale responses
    // when the wallet changes so an old address cannot overwrite the new view.
    setPortfolioLoading(true);
    setPortfolioError(null);

    fetchPortfolio(connectedWalletAddress)
      .then((data) => {
        if (cancelled) return;
        setPortfolio(data);
      })
      .catch((error) => {
        if (cancelled) return;
        console.error("Failed to fetch V2 portfolio:", error);
        setPortfolio(null);
        setPortfolioError("Failed to fetch on-chain portfolio");
      })
      .finally(() => {
        if (!cancelled) setPortfolioLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [connectedWalletAddress]);

  const refreshPortfolio = () => {
    if (walletState.status !== "connected" || portfolioLoading) return;

    setPortfolioLoading(true);
    setPortfolioError(null);

    fetchPortfolio(walletState.address, { forceRefresh: true })
      .then((data) => {
        setPortfolio(data);
        toast.success("Portfolio refreshed");
      })
      .catch((error) => {
        console.error("Failed to refresh V2 portfolio:", error);
        setPortfolioError("Failed to refresh on-chain portfolio");
      })
      .finally(() => setPortfolioLoading(false));
  };

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
              name={walletState.status === "connected" ? walletState.chain.name : DEFAULT_CHAIN.name}
              color={walletState.status === "connected" ? walletState.chain.color : DEFAULT_CHAIN.color}
              onClick={() => setShowChainPicker(true)}
            />
            <WalletButton
              connected={walletState.status === "connected"}
              address={walletState.status === "connected" ? walletState.address : undefined}
              balanceUSD={walletState.status === "connected" ? portfolioView.totalUSD : undefined}
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
                  { value: "assets",   label: "Assets",   count: portfolioView.assets.length },
                  { value: "nfts",     label: "NFTs",     count: portfolioView.nfts.length },
                  { value: "activity", label: "Activity", count: portfolioView.activity.length },
                ]}
              />
            </div>

            {portfolioLoading && <LoadingState />}

            {!portfolioLoading && portfolioError && (
              <EmptyState
                headline="Portfolio fetch failed"
                body={portfolioError}
                action={{ label: "Retry", onClick: refreshPortfolio }}
                surface="inline"
              />
            )}

            {!portfolioLoading && !portfolioError && portfolioView.assets.length === 0 && (tab === "overview" || tab === "assets") && (
              <EmptyState
                headline="No supported balances detected"
                body="EmpX scanned the configured V2 chains and token registry for this wallet. Assets appear here when a supported native or whitelisted token balance is found."
                action={{ label: "Refresh", onClick: refreshPortfolio }}
                surface="inline"
              />
            )}

            {canRenderPortfolio && tab === "overview" && (
              <EmpxPortfolioPanel
                totalUSD={portfolioView.totalUSD}
                change24hPct={portfolioView.change24hPct}
                change24hUSD={portfolioView.change24hUSD}
                change7dPct={portfolioView.change7dPct}
                chart={portfolioView.chart}
                assets={portfolioView.assets}
                marketCards={portfolioView.markets}
                walletAddress={`${walletState.address.slice(0, 6)}…${walletState.address.slice(-4)}`}
                onCopyAddress={() => toast.success("Address copied")}
                onRefresh={refreshPortfolio}
              />
            )}

            {canRenderPortfolio && tab === "assets" && (
              <EmpxPortfolioPanel
                totalUSD={portfolioView.totalUSD}
                change24hPct={portfolioView.change24hPct}
                change24hUSD={portfolioView.change24hUSD}
                change7dPct={portfolioView.change7dPct}
                assets={portfolioView.assets}
              />
            )}

            {!portfolioLoading && !portfolioError && tab === "nfts" && (
              <NFTPanel
                items={portfolioView.nfts.slice(0, 8)}
                totalCount={portfolioView.nfts.length}
                walletConnected
                providerAvailable={portfolioView.availability.nfts === "available"}
                onViewAll={() => setShowNftGallery(true)}
              />
            )}

            {!portfolioLoading && !portfolioError && tab === "activity" && (
              <ActivityFeed items={portfolioView.activity} />
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
            walletState.status === "connected" && c.id === walletState.chain.id ? portfolioView.totalUSD : undefined,
        }))}
        selectedId={walletState.status === "connected" ? walletState.chain.id : DEFAULT_CHAIN.id}
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
          balanceUSD={portfolioView.totalUSD || connectedBalance.nativeBalanceUSD || undefined}
          nativeBalance={connectedBalance.nativeBalance}
          nativeTicker={connectedBalance.nativeTicker}
          explorerUrl={getExplorerAddressUrl(walletState.chain.id, walletState.address) ?? undefined}
          tokens={portfolioView.assets.map((asset) => ({
            ticker: asset.ticker,
            chainName: asset.chainName,
            chainColor: asset.chainColor,
            balance: asset.balance,
            balanceUSD: asset.balanceUSD,
          }))}
          networks={portfolio?.chains.map((chain) => ({
            chainName: chain.chainName,
            chainColor: chain.color,
            balanceUSD: chain.value,
            nativeBalance: `${chain.tokens} token${chain.tokens === 1 ? "" : "s"}`,
          })) ?? []}
          activity={portfolioView.activity}
          onCopy={() => toast.success("Address copied")}
          onSwitchNetwork={() => { setShowAccountModal(false); setShowChainPicker(true); }}
          onSwitchWallet={() => { setShowAccountModal(false); setShowWalletModal(true); }}
          onDisconnect={() => { setShowAccountModal(false); disconnect(); toast.info("Wallet disconnected"); }}
        />
      )}

      {walletState.status === "connected" && (
        <NFTGalleryModal
          open={showNftGallery}
          onClose={() => setShowNftGallery(false)}
          items={portfolioView.nfts}
          totalFloorETH={portfolioView.nfts.reduce((s, n) => s + (n.floorETH || 0), 0)}
          totalFloorUSD={portfolioView.nfts.reduce((s, n) => s + (n.floorUSD || 0), 0)}
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
          title="Provider-gated metadata"
          body="NFTs stay empty until a configured metadata provider is connected. The V2 page no longer falls back to mock collections."
        />
        <PreviewCard
          eyebrow="ACTIVITY"
          title="Indexer-backed history"
          body="Swap, bridge, gas refuel and approval rows require a real activity source. Fake transaction hashes are not rendered."
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
          headline="Activity provider not connected"
          body="Portfolio activity needs a configured transaction indexer. V2 does not render placeholder swaps, approvals, or fake hashes."
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
