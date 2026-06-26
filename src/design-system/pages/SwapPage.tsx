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

import { useDeferredValue, useEffect, useMemo, useState } from "react";
import {
  AccountModal,
  Card,
  ChainPicker,
  ConfirmTradeModal,
  DappNavbar,
  NetworkSelector,
  Pill,
  PrimaryButton,
  QuoteCountdown,
  RouteVisualization,
  SocialTray,
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
  type RouteHop,
} from "../components";

import { useWalletConnection } from "../hooks/useWalletConnection";
import { useV2Balances } from "../hooks/useV2Balances";
import { V2_AGGREGATOR_CHAINS, getV2Chain } from "../data/v2ChainView";
import { getTokensForChain } from "../data/v2TokenView";
import { getExplorerAddressUrl, getExplorerTxUrl } from "../data/explorers";
import { formatUSD } from "../hooks/useUnifiedPrice";
import { classifyPair, modeAFeeBps } from "../data/empxRegistry";
import { SUPPORTED_CHAINS } from "../../config/chains";
import { useSwapBalances } from "../../hooks/swap/useSwapBalances";
import { useSwapExecution } from "../../hooks/swap/useSwapExecution";
import { useSwapQuoteFetch } from "../../hooks/swap/useSwapQuoteFetch";
import {
  EMPTY_SWAP_TOKEN_ADDRESS,
  buildDirectSwapTradeInfo,
  buildSwapRouteHops,
  buildSwapTradeInfo,
  formatSwapQuoteOutput,
  toSwapHookToken,
  type SwapHookToken,
} from "../data/swapV2Adapters";

// Shared social link set — referenced from every page navbar
export const EMPX_SOCIALS = [
  { kind: "x" as const,        href: "https://x.com/empx" },
  { kind: "telegram" as const, href: "https://t.me/empx" },
  { kind: "docs" as const,     href: "https://docs.empx.network" },
  { kind: "github" as const,   href: "https://github.com/empx" },
];
import EmpxSwapWidget from "../EmpxSwapWidget";

const SWAP_CHAINS: PickerChain[] = V2_AGGREGATOR_CHAINS.map((c) => ({
  id: c.id,
  name: c.name,
  color: c.color,
  ticker: c.ticker,
}));

// ─── Page state ───────────────────────────────────────────────────────────

type SettingsTab = "slippage" | "route" | "mev";

function shortHash(hash: string): string {
  if (!hash || hash.length < 12) return hash;
  return `${hash.slice(0, 6)}…${hash.slice(-4)}`;
}

// ─── Page component ──────────────────────────────────────────────────────

export default function SwapPage() {
  const isMobile = useIsMobile();

  // Wallet — uses wagmi v2 via the design-system bridge hook
  const { walletState, walletOptions, onSelectWallet, disconnect, switchChain } =
    useWalletConnection();
  const { nativeBalance, nativeTicker, nativeBalanceUSD } = useV2Balances();
  const [showWalletModal, setShowWalletModal] = useState(false);
  const [showChainPicker, setShowChainPicker] = useState(false);
  const [showAccountModal, setShowAccountModal] = useState(false);
  const [showTokenPicker, setShowTokenPicker] = useState<"from" | "to" | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [quoteIssuedAt, setQuoteIssuedAt] = useState(Date.now());
  const [executionError, setExecutionError] = useState<string | null>(null);

  // Active chain — driven by wallet connection, defaults to Arbitrum
  const defaultChain = SWAP_CHAINS[0]; // Arbitrum (42161) — first in V2_AGGREGATOR_CHAINS
  const activeChain = walletState.status === "connected" ? walletState.chain : defaultChain;
  const activeV2Chain = getV2Chain(activeChain.id) ?? V2_AGGREGATOR_CHAINS.find((chain) => chain.id === activeChain.id) ?? V2_AGGREGATOR_CHAINS[0];
  const activeChainConfig = SUPPORTED_CHAINS[activeChain.id];

  // Settings tab
  const [settingsTab, setSettingsTab] = useState<SettingsTab>("slippage");
  const [slippageBps, setSlippageBps] = useState(50);
  const [mevEnabled, setMevEnabled] = useState(true);

  // Swap state — tokens sourced from shared V2 registry.
  const tokensForChain: SwapHookToken[] = useMemo(() => {
    const configs = getTokensForChain(activeChain.id);
    return configs.map((token) => toSwapHookToken(token, activeV2Chain));
  }, [activeChain.id, activeV2Chain]);
  const [fromToken, setFromToken] = useState<SwapHookToken | null>(null);
  const [toToken,   setToToken]   = useState<SwapHookToken | null>(null);
  const [fromAmount, setFromAmount] = useState("1");
  const deferredFromAmount = useDeferredValue(fromAmount);

  // Reset tokens when chain changes
  useEffect(() => {
    const toks = tokensForChain;
    setFromToken(toks[0] ?? null);
    setToToken(toks[1] ?? null);
    setFromAmount("1");
  }, [activeChain.id, tokensForChain]);

  const connectedAddress = walletState.status === "connected" ? walletState.address : undefined;
  const {
    formattedBalance,
    formattedChainBalance,
    formattedChainBalanceTokenB,
    isTokenBalanceLoading,
  } = useSwapBalances({
    address: connectedAddress,
    selectedTokenA: fromToken,
    selectedTokenB: toToken,
  });

  const fromBalance = useMemo(() => {
    if (!walletState.status || walletState.status !== "connected" || !fromToken) return undefined;
    return fromToken.address === EMPTY_SWAP_TOKEN_ADDRESS ? formattedBalance : formattedChainBalance;
  }, [formattedBalance, formattedChainBalance, fromToken, walletState.status]);
  const toBalance = useMemo(() => {
    if (!walletState.status || walletState.status !== "connected" || !toToken) return undefined;
    return toToken.address === EMPTY_SWAP_TOKEN_ADDRESS ? formattedBalance : formattedChainBalanceTokenB;
  }, [formattedBalance, formattedChainBalanceTokenB, toToken, walletState.status]);

  const selectedFromToken = fromToken ? { ...fromToken, balance: fromBalance } : null;
  const selectedToToken = toToken ? { ...toToken, balance: toBalance } : null;

  const {
    data: quoteData,
    quoteLoading,
    isQuoteEnabled,
    isDirectRoute,
    refreshQuotes,
  } = useSwapQuoteFetch({
    chainId: activeChain.id,
    routerAddress: activeChainConfig?.routerAddress,
    wethAddress: activeChainConfig?.wethAddress,
    maxHops: activeChainConfig?.maxHops ?? 3,
    selectedTokenA: fromToken,
    selectedTokenB: toToken,
    debouncedAmountIn: deferredFromAmount,
  });

  const pairType = fromToken && toToken ? classifyPair(fromToken.ticker, toToken.ticker) : "V/V";
  const feeBps = modeAFeeBps(pairType);
  const fromUSDValue = null;
  const protocolFeeUSD = null;
  const quoteTradeInfo = useMemo(
    () =>
      isDirectRoute
        ? buildDirectSwapTradeInfo({
            amountIn: deferredFromAmount,
            selectedTokenA: fromToken,
            selectedTokenB: toToken,
          })
        : buildSwapTradeInfo({
            quote: quoteData,
            selectedTokenA: fromToken,
            selectedTokenB: toToken,
            tokenOptions: tokensForChain,
            slippageBps,
            protocolFeeBps: feeBps,
          }),
    [deferredFromAmount, feeBps, fromToken, isDirectRoute, quoteData, slippageBps, toToken, tokensForChain],
  );
  const toAmount = useMemo(
    () => (isDirectRoute ? fromAmount : formatSwapQuoteOutput(quoteData, toToken?.decimal ?? 18)),
    [fromAmount, isDirectRoute, quoteData, toToken?.decimal],
  );
  const minimumReceived = useMemo(
    () => formatSwapQuoteOutput(
      quoteTradeInfo
        ? { amounts: [quoteTradeInfo.amountIn, quoteTradeInfo.amountOut], path: quoteTradeInfo.path, adapters: quoteTradeInfo.adapters }
        : null,
      toToken?.decimal ?? 18,
    ),
    [quoteTradeInfo, toToken?.decimal],
  );
  const routeHops: RouteHop[] | undefined = useMemo(
    () => buildSwapRouteHops(quoteTradeInfo, activeV2Chain),
    [activeV2Chain, quoteTradeInfo],
  );
  const bestRoute = useMemo(
    () => quoteTradeInfo?.adapters?.length ? quoteTradeInfo.adapters.join(" · ") : isDirectRoute ? "Native wrap" : undefined,
    [isDirectRoute, quoteTradeInfo?.adapters],
  );

  const isRefreshingQuote = deferredFromAmount !== fromAmount || quoteLoading;
  const {
    swapStatus,
    swapHash,
    needsApproval,
    handleApprove,
    confirmSwap,
  } = useSwapExecution({
    chainId: activeChain.id,
    address: connectedAddress,
    selectedTokenA: fromToken,
    selectedTokenB: toToken,
    amountIn: fromAmount,
    debouncedAmountIn: deferredFromAmount,
    tradeInfo: quoteTradeInfo,
    protocolFee: feeBps,
    isRefreshingQuote,
    onSwapSubmitted: () => {
      setShowConfirm(false);
      setShowSuccess(true);
      setExecutionError(null);
    },
  });
  const isExecuting = ["APPROVING", "WAITING_FOR_CONFIRMATION", "SWAPPING"].includes(swapStatus);
  const canOpenConfirm = !!quoteTradeInfo && Number(fromAmount) > 0 && (isDirectRoute || !!quoteData);

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
    if (!canOpenConfirm) {
      toast.error(quoteLoading ? "Quote is still loading" : "No executable quote available");
      return;
    }
    setQuoteIssuedAt(Date.now());
    setExecutionError(null);
    setShowConfirm(true);
  };

  useEffect(() => {
    if (swapStatus === "ERROR") {
      setExecutionError("Swap failed. Check wallet status, quote freshness, and token approval, then retry.");
    }
  }, [swapStatus]);

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
              balanceUSD={nativeBalanceUSD ?? undefined}
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
              fromToken={fromToken ? { ticker: fromToken.ticker, address: fromToken.address, decimals: fromToken.decimal } : null}
              fromAmount={fromAmount}
              fromBalance={isTokenBalanceLoading ? "Loading..." : selectedFromToken?.balance}
              fromUsdValue={fromUSDValue || null}
              onFromAmountChange={setFromAmount}
              onSelectFromToken={() => setShowTokenPicker("from")}
              onPercentClick={(pct) => {
                const bal = Number((selectedFromToken?.balance || "0").replace(/,/g, ""));
                if (Number.isFinite(bal)) setFromAmount(String((bal * pct) / 100));
              }}
              toToken={toToken ? { ticker: toToken.ticker, address: toToken.address, decimals: toToken.decimal } : null}
              toAmount={toAmount}
              toUsdValue={null}
              onSelectToToken={() => setShowTokenPicker("to")}
              pairType={pairType}
              protocolFeeBps={feeBps}
              protocolFeeUSD={protocolFeeUSD ?? undefined}
              bestRoute={bestRoute}
              minimumReceived={`${minimumReceived} ${toToken?.ticker || ""}`}
              slippageBps={slippageBps}
              routeHops={routeHops}
              swapDisabled={!canOpenConfirm || isRefreshingQuote}
              swapLoading={quoteLoading}
              walletConnected={walletState.status === "connected"}
              onConnect={() => setShowWalletModal(true)}
              onSwap={onSwap}
              onFlip={flipTokens}
              swapLabel={walletState.status === "connected" ? quoteLoading ? "Fetching quote..." : "Swap" : "Connect wallet"}
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
                    onRefresh={() => {
                      setQuoteIssuedAt(Date.now());
                      void refreshQuotes();
                      toast.info("Quote refreshed");
                    }}
                    compact
                  />
                  <Pill variant={quoteLoading ? "accent" : isQuoteEnabled ? "info" : "ghost"}>
                    {quoteLoading ? "Quoting" : isQuoteEnabled ? "SDK quote" : "Quote idle"}
                  </Pill>
                  {executionError && <Pill variant="danger">Execution error</Pill>}
                </div>
                {executionError && (
                  <p style={{ margin: "10px 0 0", fontSize: 11, color: "#F87171", lineHeight: 1.45 }}>
                    {executionError}
                  </p>
                )}
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
                    Routing
                  </p>
                  <Pill variant="accent">{pairType}</Pill>
                </div>
                {routeHops && routeHops.length > 1 ? (
                  <RouteVisualization hops={routeHops} animated compact />
                ) : (
                  <p style={{ margin: 0, fontSize: 12, color: "rgba(255,255,255,0.55)", lineHeight: 1.55 }}>
                    {quoteLoading ? "Finding the best SDK route..." : "No route available for the current pair and amount."}
                  </p>
                )}
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
            const nextToken = tokensForChain.find((token) => token.address === t.address || token.ticker === t.ticker);
            if (showTokenPicker === "from") setFromToken(nextToken ?? null);
            else setToToken(nextToken ?? null);
            setShowTokenPicker(null);
          }}
        />
      )}

      <ConfirmTradeModal
        open={showConfirm}
        onClose={() => setShowConfirm(false)}
        onConfirm={() => {
          setExecutionError(null);
          void (needsApproval ? handleApprove() : confirmSwap());
        }}
        confirming={isExecuting}
        eyebrow="REVIEW · SWAP"
        title="Confirm trade"
        confirmLabel={needsApproval ? "Approve and swap" : "Confirm swap"}
        fromTicker={fromToken?.ticker || ""}
        fromAmount={fromAmount}
        fromUsdValue={fromUSDValue ?? undefined}
        fromChainName={activeChain.name}
        toTicker={toToken?.ticker || ""}
        toAmount={toAmount}
        toUsdValue={undefined}
        toChainName={activeChain.name}
        routeHops={routeHops}
        feeRows={[
          { label: "Pair type",     value: pairType.replace("/", " / ") },
          { label: "Protocol fee",  value: `${feeBps} bps`, sub: protocolFeeUSD == null ? undefined : `· ${formatUSD(protocolFeeUSD)}`, accent: true },
          { label: "Best route",    value: bestRoute ?? "SDK route unavailable" },
          { label: "Min. received", value: `${minimumReceived} ${toToken?.ticker || ""}`, muted: true },
          { label: "Slippage",      value: `${(slippageBps / 100).toFixed(2)}%`, muted: true },
          ...(needsApproval ? [{ label: "Approval", value: `${fromToken?.ticker ?? "Token"} approval required`, accent: true as const }] : []),
        ]}
        quoteIssuedAt={quoteIssuedAt}
        quoteValidMs={30000}
        onRefreshQuote={() => {
          setQuoteIssuedAt(Date.now());
          void refreshQuotes();
        }}
        warning={executionError ?? undefined}
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
          { label: "Wallet confirmation", description: `${activeChain.name} transaction submitted`, state: "complete" },
          { label: "DEX execution",       description: bestRoute ?? "SDK route executed",             state: "complete" },
          { label: "Tokens delivered",    description: `${toToken?.ticker || "Tokens"} in wallet`,   state: "complete" },
        ]}
        txHashes={swapHash ? [
          {
            label: "Swap tx",
            chainName: activeChain.name,
            chainColor: activeChain.color,
            hashShort: shortHash(swapHash),
            url: getExplorerTxUrl(activeChain.id, swapHash) ?? undefined,
          },
        ] : []}
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
          balanceUSD={nativeBalanceUSD ?? undefined}
          nativeBalance={nativeBalance}
          nativeTicker={nativeTicker}
          explorerUrl={getExplorerAddressUrl(activeChain.id, walletState.address) ?? undefined}
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
