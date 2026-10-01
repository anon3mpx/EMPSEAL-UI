// ─── SwapPage — same-chain aggregator swap (drop-in /swap replacement) ─────
//
// Page structure:
//   • DappNavbar (responsive — drawer on mobile)
//   • One centred 480px column holding EmpxSwapWidget — identical on desktop
//     and mobile. No page header (the widget carries its own "Swap"
//     eyebrow) and no side panel: quote freshness, route, slippage settings
//     and quote/execution status all live in the widget now.
//
// Wallet connection wired through useWalletConnection() — bridges wagmi v2
// with the design-system WalletModal / WalletButton components.

import { useDeferredValue, useEffect, useMemo, useState } from "react";
import {
  AccountModal,
  ChainLogo,
  ChainPicker,
  ConfirmTradeModal,
  DappFooter,
  DappNavbar,
  NetworkSelector,
  Toaster,
  TokenLogo,
  TokenPicker,
  TradeSuccessModal,
  WalletButton,
  WalletModal,
  useIsMobile,
  toast,
  type PickerChain,
  type RouteHop,
} from "../components";

import { useWalletConnection } from "../hooks/useWalletConnection";
import { useV2Balances } from "../hooks/useV2Balances";
import { useAccountSnapshot } from "../hooks/useAccountSnapshot";
import { V2_AGGREGATOR_CHAINS, getV2Chain } from "../data/v2ChainView";
import { getTokensForChain } from "../data/v2TokenView";
import { getExplorerAddressUrl, getExplorerTxUrl } from "../data/explorers";
import { formatUSD, useUnifiedPrice } from "../hooks/useUnifiedPrice";
import { classifyPair, modeAFeeBps } from "../data/empxRegistry";

import { resolveSwapPageChain } from "../data/swapPageChainState";
import { calculatePriceImpactBps } from "../data/tradeMetrics";
import { SUPPORTED_CHAINS } from "../../config/chains";
import { useSwapBalances } from "../../hooks/swap/useSwapBalances";
import { useSwapExecution } from "../../hooks/swap/useSwapExecution";
import { useSwapQuoteFetch } from "../../hooks/swap/useSwapQuoteFetch";
import {
  checkAllowance as legacyCheckAllowance,
  callApprove as legacyCallApprove,
  swapTokens as legacySwapTokens,
} from "../../utils/contractCalls";
import {
  EMPTY_SWAP_TOKEN_ADDRESS,
  buildDirectSwapTradeInfo,
  buildSwapRouteHops,
  buildSwapSplitBranches,
  buildSwapTradeInfo,
  formatPreparedSwapOutput,
  formatSwapQuoteOutput,
  getSwapQuoteFreshness,
  getSwapRouteLabel,
  normalizeSdkPreparedRoute,
  toSwapHookToken,
  type PreparedSwapRoute,
  type SwapHookToken,
} from "../data/swapV2Adapters";

import EmpxSwapWidget, { type SwapNotice } from "../EmpxSwapWidget";
import { WidgetKitKeyframes } from "../widgetKit";

const SWAP_CHAINS: PickerChain[] = V2_AGGREGATOR_CHAINS.map((c) => ({
  id: c.id,
  name: c.name,
  color: c.color,
  ticker: c.ticker,
}));

const SWAP_V2_EXECUTION_MODE = "auto";
const SWAP_V2_CONTRACT_API = {
  checkAllowance: legacyCheckAllowance,
  callApprove: legacyCallApprove,
  swapTokens: legacySwapTokens,
};

// ─── Page state ───────────────────────────────────────────────────────────

type SwapAction = "swap" | "wrap" | "unwrap";

function shortHash(hash: string): string {
  if (!hash || hash.length < 12) return hash;
  return `${hash.slice(0, 6)}…${hash.slice(-4)}`;
}

function calculateUSDValue(amount: string, price: number | null): number | null {
  const numericAmount = Number(amount.replace(/,/g, ""));
  if (price == null || !Number.isFinite(numericAmount)) return null;
  return numericAmount * price;
}

function getSwapAction(isDirectRoute: boolean, fromToken: SwapHookToken | null): SwapAction {
  if (!isDirectRoute) return "swap";
  return fromToken?.address.toLowerCase() === EMPTY_SWAP_TOKEN_ADDRESS.toLowerCase()
    ? "wrap"
    : "unwrap";
}

// ─── Page component ──────────────────────────────────────────────────────

export default function SwapPage() {
  const isMobile = useIsMobile();

  // Wallet — uses wagmi v2 via the design-system bridge hook
  const { walletState, walletOptions, onSelectWallet, disconnect, switchChain } =
    useWalletConnection();
  const { nativeBalance, nativeTicker } = useV2Balances();
  const accountSnapshot = useAccountSnapshot(walletState.status === "connected" ? walletState.address : null);
  const [showWalletModal, setShowWalletModal] = useState(false);
  const [showChainPicker, setShowChainPicker] = useState(false);
  const [showAccountModal, setShowAccountModal] = useState(false);
  const [showTokenPicker, setShowTokenPicker] = useState<"from" | "to" | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [executionError, setExecutionError] = useState<string | null>(null);

  // Active chain — driven by wallet connection, defaults to Arbitrum
  const defaultChain = SWAP_CHAINS[0]; // Arbitrum (42161) — first in V2_AGGREGATOR_CHAINS
  const [selectedChainId, setSelectedChainId] = useState(defaultChain.id);
  const activeChain = resolveSwapPageChain({
    walletState,
    selectedChainId,
    chains: SWAP_CHAINS,
    defaultChain,
  });
  const activeV2Chain = getV2Chain(activeChain.id) ?? V2_AGGREGATOR_CHAINS.find((chain) => chain.id === activeChain.id) ?? V2_AGGREGATOR_CHAINS[0];
  const activeChainConfig = SUPPORTED_CHAINS[activeChain.id];

  // Trade settings
  const [slippageBps, setSlippageBps] = useState(50);

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

  const pairType = fromToken && toToken ? classifyPair(fromToken.ticker, toToken.ticker) : "V/V";
  const feeBps = modeAFeeBps(pairType);

  const {
    data: quoteData,
    preparedRoute: rawPreparedRoute,
    quoteLoading,
    splitQuoteLoading,
    quoteFallbackActive,
    quoteError,
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
    recipient: connectedAddress,
    slippageBps,
    pairType,
  });

  const fromPriceAddress = fromToken?.address === EMPTY_SWAP_TOKEN_ADDRESS
    ? activeChainConfig?.wethAddress
    : fromToken?.address;
  const toPriceAddress = toToken?.address === EMPTY_SWAP_TOKEN_ADDRESS
    ? activeChainConfig?.wethAddress
    : toToken?.address;
  const fromTokenPriceUSD = useUnifiedPrice(activeChain.id, fromToken?.ticker, fromPriceAddress);
  const toTokenPriceUSD = useUnifiedPrice(activeChain.id, toToken?.ticker, toPriceAddress);
  const fromUSDValue = calculateUSDValue(fromAmount, fromTokenPriceUSD);
  const protocolFeeUSD = null;
  const preparedRoute: PreparedSwapRoute | null = useMemo(() => {
    if (!rawPreparedRoute || !fromToken || !toToken) return null;
    if (rawPreparedRoute.source === "sdk" && rawPreparedRoute.sdkResult) {
      const normalized = normalizeSdkPreparedRoute({
        prepared: rawPreparedRoute.sdkResult,
        selectedTokenA: fromToken,
        selectedTokenB: toToken,
        tokenOptions: tokensForChain,
        recipient: connectedAddress,
      });
      return {
        ...normalized,
        executionRequest: rawPreparedRoute.executionRequest,
      };
    }

    const tradeInfo = isDirectRoute
      ? buildDirectSwapTradeInfo({
          amountIn: deferredFromAmount,
          selectedTokenA: fromToken,
          selectedTokenB: toToken,
        })
      : buildSwapTradeInfo({
          quote: rawPreparedRoute.quote,
          selectedTokenA: fromToken,
          selectedTokenB: toToken,
          tokenOptions: tokensForChain,
          slippageBps,
          protocolFeeBps: feeBps,
        });
    return tradeInfo
      ? {
          source: "local",
          routing: "single",
          tradeInfo,
          recipient: connectedAddress,
          sdkError: rawPreparedRoute.sdkError,
        }
      : null;
  }, [
    connectedAddress,
    deferredFromAmount,
    feeBps,
    fromToken,
    isDirectRoute,
    rawPreparedRoute,
    slippageBps,
    toToken,
    tokensForChain,
  ]);
  const quoteTradeInfo = preparedRoute?.tradeInfo ?? null;
  const toAmount = useMemo(
    () => (isDirectRoute
      ? fromAmount
      : formatPreparedSwapOutput(preparedRoute, quoteData, toToken?.decimal ?? 18)),
    [fromAmount, isDirectRoute, preparedRoute, quoteData, toToken?.decimal],
  );
  const toUSDValue = calculateUSDValue(toAmount, toTokenPriceUSD);
  const priceImpactBps = calculatePriceImpactBps(fromUSDValue, toUSDValue);
  const minimumReceived = useMemo(
    () => formatSwapQuoteOutput(
      quoteTradeInfo
        ? { amounts: [quoteTradeInfo.amountIn, quoteTradeInfo.amountOut], path: quoteTradeInfo.path, adapters: quoteTradeInfo.adapters }
        : null,
      toToken?.decimal ?? 18,
    ),
    [quoteTradeInfo, toToken?.decimal],
  );
  const quoteFreshness = useMemo(
    () => getSwapQuoteFreshness(quoteTradeInfo),
    [quoteTradeInfo],
  );
  const routeHops: RouteHop[] | undefined = useMemo(
    () => preparedRoute?.routing === "single"
      ? buildSwapRouteHops(quoteTradeInfo, activeV2Chain)
      : undefined,
    [activeV2Chain, preparedRoute?.routing, quoteTradeInfo],
  );
  const splitBranches = useMemo(
    () => buildSwapSplitBranches(preparedRoute, activeChain.id),
    [activeChain.id, preparedRoute],
  );
  const routeLabel = getSwapRouteLabel(preparedRoute);
  const swapAction = getSwapAction(isDirectRoute, fromToken);
  const swapActionLabel = swapAction === "swap"
    ? "Swap"
    : `${swapAction === "wrap" ? "Wrap" : "Unwrap"} ${fromToken?.ticker ?? "token"}`;
  const bestRoute = useMemo(() => {
    if (preparedRoute?.routing === "split") {
      return `${preparedRoute.splits?.length ?? 0} route SDK split`;
    }
    if (isDirectRoute) return `Native ${swapAction}`;
    if (quoteTradeInfo?.pathTokens?.length) {
      return `${Math.max(quoteTradeInfo.pathTokens.length - 1, 1)} hop ${preparedRoute?.source === "local" ? "local fallback" : "SDK route"}`;
    }
    return undefined;
  }, [isDirectRoute, preparedRoute?.routing, preparedRoute?.source, preparedRoute?.splits?.length, quoteTradeInfo?.pathTokens, swapAction]);

  const isRefreshingQuote = deferredFromAmount !== fromAmount || quoteLoading;
  const {
    swapStatus,
    swapHash,
    needsApproval,
    executionError: swapExecutionError,
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
    preparedRoute,
    protocolFee: feeBps,
    isRefreshingQuote,
    swapContractApi: SWAP_V2_CONTRACT_API,
    executionMode: SWAP_V2_EXECUTION_MODE,
    onSwapSubmitted: () => {
      setShowConfirm(false);
      setShowSuccess(true);
      setExecutionError(null);
    },
  });
  const isExecuting = ["APPROVING", "WAITING_FOR_CONFIRMATION", "SWAPPING"].includes(swapStatus);
  const canOpenConfirm = !!preparedRoute && !!quoteTradeInfo && Number(fromAmount) > 0;

  // One status line under the quote row — replaces the old side panel's
  // quote-source pill and error text.
  const quoteNotice: SwapNotice | undefined = executionError
    ? { tone: "error", text: executionError }
    : quoteError && !quoteLoading
      ? { tone: "error", text: "SDK and local route preparation failed. Refresh the quote or try a different amount." }
      : splitQuoteLoading
        ? { tone: "info", text: "Optimizing for a split route…" }
        : quoteFallbackActive
          ? { tone: "info", text: "Quoted via the local fallback router — SDK route unavailable." }
          : undefined;

  const numericFromAmount = Number(fromAmount.replace(/,/g, ""));
  const numericToAmount = Number(toAmount.replace(/,/g, ""));
  const rate = fromToken && toToken && numericFromAmount > 0 && numericToAmount > 0
    ? `1 ${fromToken.ticker} = ${(numericToAmount / numericFromAmount).toLocaleString(undefined, { maximumFractionDigits: 6 })} ${toToken.ticker}`
    : undefined;

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
    setExecutionError(null);
    setShowConfirm(true);
  };

  useEffect(() => {
    if (swapStatus === "ERROR") {
      setExecutionError(
        swapExecutionError ??
          "Swap failed. Check wallet status, quote freshness, and token approval, then retry.",
      );
    }
  }, [swapExecutionError, swapStatus]);

  useEffect(() => {
    if (quoteTradeInfo?.quoteId) setExecutionError(null);
  }, [quoteTradeInfo?.quoteId]);

  return (
    <div style={{ minHeight: "100vh", background: "#05050c", color: "#fff", fontFamily: "Inter, sans-serif" }}>
      <DappNavbar
        activeHref="/swap-v2"
        controls={
          <>
            <NetworkSelector
              name={activeChain.name}
              color={activeChain.color}
              logo={(
                <ChainLogo
                  chainId={activeChain.id}
                  symbol={activeChain.name.slice(0, 3).toUpperCase()}
                  bg={activeChain.color}
                  size={14}
                />
              )}
              onClick={() => setShowChainPicker(true)}
            />
            <WalletButton
              connected={walletState.status === "connected"}
              address={walletState.status === "connected" ? walletState.address : undefined}
              balanceUSD={accountSnapshot.balanceUSD}
              onConnect={() => setShowWalletModal(true)}
              onClick={() => setShowAccountModal(true)}
            />
          </>
        }
      />

      <WidgetKitKeyframes />

      {/* Single centred 480px column — identical desktop and mobile. 480 is
          the widget's measure, so the column is 480 + its own padding. */}
      <main
        style={{
          maxWidth: 480 + (isMobile ? 32 : 40),
          margin: "0 auto",
          padding: isMobile ? "24px 16px 40px" : "38px 20px 48px",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
        }}
      >
        <EmpxSwapWidget
          chain={{
            ...activeChain,
            logo: (
              <ChainLogo
                chainId={activeChain.id}
                symbol={activeChain.name.slice(0, 3).toUpperCase()}
                bg={activeChain.color}
                size={17}
              />
            ),
          }}
          onSelectChain={() => setShowChainPicker(true)}
          fromToken={fromToken ? {
            ticker: fromToken.ticker,
            address: fromToken.address,
            decimals: fromToken.decimal,
            logo: (
              <TokenLogo
                ticker={fromToken.ticker}
                chainId={fromToken.chainId}
                address={fromToken.address}
                logoUrl={fromToken.logoUrl}
                isNative={fromToken.isNative}
                size={30}
              />
            ),
          } : null}
          fromAmount={fromAmount}
          fromBalance={isTokenBalanceLoading ? "Loading..." : selectedFromToken?.balance}
          fromUsdValue={fromUSDValue}
          onFromAmountChange={setFromAmount}
          onSelectFromToken={() => setShowTokenPicker("from")}
          onPercentClick={(pct) => {
            const bal = Number((selectedFromToken?.balance || "0").replace(/,/g, ""));
            if (Number.isFinite(bal)) setFromAmount(String((bal * pct) / 100));
          }}
          toToken={toToken ? {
            ticker: toToken.ticker,
            address: toToken.address,
            decimals: toToken.decimal,
            logo: (
              <TokenLogo
                ticker={toToken.ticker}
                chainId={toToken.chainId}
                address={toToken.address}
                logoUrl={toToken.logoUrl}
                isNative={toToken.isNative}
                size={30}
              />
            ),
          } : null}
          toAmount={toAmount}
          toUsdValue={toUSDValue}
          onSelectToToken={() => setShowTokenPicker("to")}
          rate={rate}
          pairType={pairType}
          protocolFeeBps={feeBps}
          protocolFeeUSD={protocolFeeUSD ?? undefined}
          bestRoute={bestRoute}
          routeLabel={routeLabel}
          minimumReceived={`${minimumReceived} ${toToken?.ticker || ""}`}
          slippageBps={slippageBps}
          priceImpactBps={priceImpactBps}
          routeHops={routeHops}
          splitBranches={splitBranches}
          onSlippageChange={(bps) => {
            setSlippageBps(bps);
            toast.info(`Slippage set to ${(bps / 100).toFixed(2)}%`);
          }}
          quote={walletState.status === "connected" && quoteFreshness ? {
            issuedAt: quoteFreshness.issuedAt,
            validMs: quoteFreshness.validMs,
            onRefresh: () => {
              void refreshQuotes();
            },
            // Never swap the route out from under an open review or a tx in flight.
            paused: showConfirm || isExecuting,
          } : undefined}
          notice={walletState.status === "connected" ? quoteNotice : undefined}
          swapDisabled={!canOpenConfirm || isRefreshingQuote}
          swapLoading={quoteLoading}
          walletConnected={walletState.status === "connected"}
          onConnect={() => setShowWalletModal(true)}
          onSwap={onSwap}
          onFlip={flipTokens}
          swapLabel={walletState.status === "connected" ? quoteLoading ? "Fetching quote..." : swapActionLabel : "Connect wallet"}
        />
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
          setSelectedChainId(c.id);
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
          showBalances={false}
          showBadges={false}
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
        eyebrow={`REVIEW · ${swapAction.toUpperCase()}`}
        title={`Confirm ${swapAction}`}
        confirmLabel={needsApproval ? `Approve and ${swapAction}` : `Confirm ${swapAction}`}
        fromTicker={fromToken?.ticker || ""}
        fromAmount={fromAmount}
        fromUsdValue={fromUSDValue ?? undefined}
        fromChainName={activeChain.name}
        toTicker={toToken?.ticker || ""}
        toAmount={toAmount}
        toUsdValue={toUSDValue ?? undefined}
        toChainName={activeChain.name}
        routeHops={routeHops}
        routeLabel={routeLabel}
        splitBranches={splitBranches}
        feeRows={[
          { label: "Pair type",     value: pairType.replace("/", " / ") },
          { label: "Protocol fee",  value: `${feeBps} bps`, sub: protocolFeeUSD == null ? undefined : `· ${formatUSD(protocolFeeUSD)}`, accent: true },
          { label: "Best route",    value: bestRoute ?? "SDK route unavailable" },
          ...(routeLabel ? [{ label: "Route type", value: routeLabel, accent: true as const }] : []),
          { label: "Min. received", value: `${minimumReceived} ${toToken?.ticker || ""}`, muted: true },
          { label: "Slippage",      value: `${(slippageBps / 100).toFixed(2)}%`, muted: true },
          ...(priceImpactBps !== undefined
            ? [{ label: "Price impact", value: `${(priceImpactBps / 100).toFixed(2)}%`, muted: true, accent: priceImpactBps > 100 }]
            : []),
          ...(needsApproval ? [{ label: "Approval", value: `${fromToken?.ticker ?? "Token"} approval required`, accent: true as const }] : []),
        ]}
        quoteIssuedAt={quoteFreshness?.issuedAt}
        quoteValidMs={quoteFreshness?.validMs}
        onRefreshQuote={() => {
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
          chainName={walletState.chain.name}
          chainColor={walletState.chain.color}
          balanceUSD={accountSnapshot.balanceUSD}
          portfolioStatus={accountSnapshot.status}
          activityAvailable={false}
          tokens={accountSnapshot.tokens}
          networks={accountSnapshot.networks}
          nativeBalance={nativeBalance}
          nativeTicker={nativeTicker}
          explorerUrl={getExplorerAddressUrl(walletState.chain.id, walletState.address) ?? undefined}
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

      <DappFooter />
      <Toaster />
    </div>
  );
}
