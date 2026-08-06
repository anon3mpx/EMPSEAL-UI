import { useDeferredValue, useEffect, useMemo, useState } from "react";
import {
  AccountModal,
  ConfirmTradeModal,
  QuoteCountdown,
  TokenPicker,
  TradeSuccessModal,
  WalletModal,
} from "../../design-system/components";
import EmpxSwapWidget from "../../design-system/EmpxSwapWidget";
import { useWalletConnection } from "../../design-system/hooks/useWalletConnection";
import { useV2Balances } from "../../design-system/hooks/useV2Balances";
import { getExplorerAddressUrl, getExplorerTxUrl } from "../../design-system/data/explorers";
import { classifyPair, modeAFeeBps } from "../../design-system/data/empxRegistry";
import { calculatePriceImpactBps } from "../../design-system/data/tradeMetrics";
import { getV2Chain } from "../../design-system/data/v2ChainView";
import { getTokensForChain } from "../../design-system/data/v2TokenView";
import { useUnifiedPrice } from "../../design-system/hooks/useUnifiedPrice";
import {
  buildDirectSwapTradeInfo,
  buildSwapRouteHops,
  buildSwapSplitBranches,
  buildSwapTradeInfo,
  EMPTY_SWAP_TOKEN_ADDRESS,
  formatPreparedSwapOutput,
  formatSwapQuoteOutput,
  getSwapQuoteFreshness,
  getSwapRouteLabel,
  normalizeSdkPreparedRoute,
  toSwapHookToken,
} from "../../design-system/data/swapV2Adapters";
import { useSwapBalances } from "../../hooks/swap/useSwapBalances";
import { useSwapExecution } from "../../hooks/swap/useSwapExecution";
import { useSwapQuoteFetch } from "../../hooks/swap/useSwapQuoteFetch";
import {
  checkAllowance as legacyCheckAllowance,
  callApprove as legacyCallApprove,
  swapTokens as legacySwapTokens,
} from "../../utils/contractCalls";
import { SUPPORTED_CHAINS } from "../../config/chains";
import { useSetSelectedChainId } from "../../hooks/ChainContext";
import { getWidgetExecutionMode } from "../../widget/widgetRuntime";
import { useWidgetConfig } from "../../widget/useWidgetConfig";
import { WIDGET_CHAIN_BY_KEY } from "../../widget/chains";
import { createWidgetContractApi } from "../../widget/widgetContractCalls";

const SWAP_EMBED_FALLBACK_API = {
  checkAllowance: legacyCheckAllowance,
  callApprove: legacyCallApprove,
  swapTokens: legacySwapTokens,
};

const parseHexToRgb = (value) => {
  if (!value) return null;
  const normalized = value.trim().replace("#", "");
  if (normalized.length < 6) return null;
  const hex = normalized.slice(0, 6);
  if (!/^[0-9a-fA-F]{6}$/.test(hex)) return null;
  const r = Number.parseInt(hex.slice(0, 2), 16);
  const g = Number.parseInt(hex.slice(2, 4), 16);
  const b = Number.parseInt(hex.slice(4, 6), 16);
  return `${r}, ${g}, ${b}`;
};

const shortHash = (hash) => {
  if (!hash || hash.length < 12) return hash;
  return `${hash.slice(0, 6)}...${hash.slice(-4)}`;
};

const truncateAddress = (address) => {
  if (!address || address.length < 10) return address || "";
  return `${address.slice(0, 5)}...${address.slice(-4)}`;
};

const tokenMatchesDefault = (token, rawDefault) => {
  const normalized = rawDefault?.trim().toLowerCase();
  if (!normalized) return false;
  return (
    token.ticker?.toLowerCase() === normalized ||
    token.symbol?.toLowerCase?.() === normalized ||
    token.address?.toLowerCase() === normalized
  );
};

const resolveInitialToken = (tokens, rawDefault, fallbackIndex) =>
  tokens.find((token) => tokenMatchesDefault(token, rawDefault)) ??
  tokens[fallbackIndex] ??
  null;

const calculateUSDValue = (amount, price) => {
  const numericAmount = Number(String(amount || "").replace(/,/g, ""));
  if (price == null || !Number.isFinite(numericAmount)) return null;
  return numericAmount * price;
};

function WidgetStatusBadge({ children, tone = "neutral" }) {
  const palette = {
    accent: {
      color: "#FF8A00",
      background: "rgba(255,138,0,0.11)",
      border: "rgba(255,138,0,0.28)",
    },
    info: {
      color: "#93C5FD",
      background: "rgba(96,165,250,0.12)",
      border: "rgba(96,165,250,0.24)",
    },
    neutral: {
      color: "rgba(255,255,255,0.62)",
      background: "rgba(255,255,255,0.045)",
      border: "rgba(255,255,255,0.08)",
    },
  }[tone];

  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        whiteSpace: "nowrap",
        padding: "5px 8px",
        borderRadius: 3,
        border: `1px solid ${palette.border}`,
        background: palette.background,
        color: palette.color,
        fontSize: 9,
        fontWeight: 800,
        letterSpacing: "0.24em",
        textTransform: "uppercase",
        lineHeight: 1,
      }}
    >
      {children}
    </span>
  );
}

function WidgetWalletButton({ connected, address, onConnect, onClick }) {
  return (
    <button
      type="button"
      onClick={connected ? onClick : onConnect}
      style={{
        flexShrink: 0,
        display: "inline-flex",
        alignItems: "center",
        gap: 7,
        minHeight: 34,
        padding: connected ? "7px 10px" : "8px 12px",
        background: connected ? "rgba(255,255,255,0.045)" : "#FF8A00",
        border: connected ? "1px solid rgba(255,255,255,0.10)" : "none",
        borderRadius: 4,
        color: connected ? "#fff" : "#05050c",
        cursor: "pointer",
        fontFamily: "Inter, sans-serif",
        fontSize: 10,
        fontWeight: 800,
        letterSpacing: connected ? "0.04em" : "0.18em",
        textTransform: connected ? "none" : "uppercase",
        whiteSpace: "nowrap",
      }}
    >
      {connected && (
        <span
          aria-hidden
          style={{
            width: 7,
            height: 7,
            borderRadius: "50%",
            background: "#34D399",
            boxShadow: "0 0 7px #34D399",
            flexShrink: 0,
          }}
        />
      )}
      <span style={{ fontFamily: connected ? "ui-monospace, Menlo, monospace" : "Inter, sans-serif" }}>
        {connected ? truncateAddress(address) : "Connect"}
      </span>
    </button>
  );
}

export default function WidgetSwapPage() {
  const config = useWidgetConfig();
  const configuredRuntime = WIDGET_CHAIN_BY_KEY[config.chain];
  const chainId = configuredRuntime.chainId;
  const activeV2Chain = getV2Chain(chainId) ?? {
    id: chainId,
    name: config.chain,
    ticker: "ETH",
    color: config.primaryColor,
    kind: "EVM",
    tier: 1,
    supportsAggregator: true,
    supportsPaymaster: false,
  };
  const activeChain = {
    id: activeV2Chain.id,
    name: activeV2Chain.name,
    color: activeV2Chain.color,
  };
  const activeChainConfig = SUPPORTED_CHAINS[chainId];
  const primaryRgb = parseHexToRgb(config.primaryColor) || "255, 138, 0";

  const {
    walletState,
    walletOptions,
    onSelectWallet,
    disconnect,
    switchChain,
  } = useWalletConnection();
  const { nativeBalance, nativeTicker, nativeBalanceUSD } = useV2Balances();
  const setSelectedChainId = useSetSelectedChainId();

  const [showWalletModal, setShowWalletModal] = useState(false);
  const [showAccountModal, setShowAccountModal] = useState(false);
  const [showTokenPicker, setShowTokenPicker] = useState(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [executionError, setExecutionError] = useState(null);
  const [slippageBps, setSlippageBps] = useState(50);

  const tokensForChain = useMemo(
    () => getTokensForChain(chainId).map((token) => toSwapHookToken(token, activeV2Chain)),
    [activeV2Chain, chainId],
  );
  const [fromToken, setFromToken] = useState(null);
  const [toToken, setToToken] = useState(null);
  const [fromAmount, setFromAmount] = useState(config.defaultAmountIn || "1");
  const deferredFromAmount = useDeferredValue(fromAmount);

  useEffect(() => {
    setSelectedChainId(chainId);
    if (walletState.status === "connected" && walletState.chain.id !== chainId) {
      switchChain?.({ chainId });
    }
  }, [chainId, setSelectedChainId, switchChain, walletState]);

  useEffect(() => {
    setFromToken(resolveInitialToken(tokensForChain, config.defaultTokenIn, 0));
    setToToken(resolveInitialToken(tokensForChain, config.defaultTokenOut, 1));
    setFromAmount(config.defaultAmountIn || "1");
  }, [config.defaultAmountIn, config.defaultTokenIn, config.defaultTokenOut, tokensForChain]);

  useEffect(() => {
    document.documentElement.classList.toggle(
      "widget-runtime-no-background",
      !config.showBackground,
    );
    document.body.classList.toggle(
      "widget-runtime-no-background",
      !config.showBackground,
    );

    return () => {
      document.documentElement.classList.remove("widget-runtime-no-background");
      document.body.classList.remove("widget-runtime-no-background");
    };
  }, [config.showBackground]);

  const connectedAddress =
    walletState.status === "connected" ? walletState.address : undefined;
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
    if (walletState.status !== "connected" || !fromToken) return undefined;
    return fromToken.address === EMPTY_SWAP_TOKEN_ADDRESS
      ? formattedBalance
      : formattedChainBalance;
  }, [formattedBalance, formattedChainBalance, fromToken, walletState.status]);
  const selectedFromToken = fromToken ? { ...fromToken, balance: fromBalance } : null;
  const pairType = fromToken && toToken ? classifyPair(fromToken.ticker, toToken.ticker) : "V/V";
  const feeBps = modeAFeeBps(pairType);
  const fromPriceAddress = fromToken?.address === EMPTY_SWAP_TOKEN_ADDRESS
    ? activeChainConfig?.wethAddress ?? configuredRuntime.wethAddress
    : fromToken?.address;
  const toPriceAddress = toToken?.address === EMPTY_SWAP_TOKEN_ADDRESS
    ? activeChainConfig?.wethAddress ?? configuredRuntime.wethAddress
    : toToken?.address;
  const fromTokenPriceUSD = useUnifiedPrice(chainId, fromToken?.ticker, fromPriceAddress);
  const toTokenPriceUSD = useUnifiedPrice(chainId, toToken?.ticker, toPriceAddress);

  const {
    data: quoteData,
    preparedRoute: rawPreparedRoute,
    quoteLoading,
    splitQuoteLoading,
    quoteFallbackActive,
    quoteError,
    isDirectRoute,
    refreshQuotes,
  } = useSwapQuoteFetch({
    chainId,
    routerAddress: activeChainConfig?.routerAddress ?? configuredRuntime.routerAddress,
    wethAddress: activeChainConfig?.wethAddress ?? configuredRuntime.wethAddress,
    maxHops: activeChainConfig?.maxHops ?? 3,
    selectedTokenA: fromToken,
    selectedTokenB: toToken,
    debouncedAmountIn: deferredFromAmount,
    recipient: connectedAddress,
    slippageBps,
    pairType,
  });

  const preparedRoute = useMemo(() => {
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
  const fromUSDValue = calculateUSDValue(fromAmount, fromTokenPriceUSD);
  const toUSDValue = calculateUSDValue(toAmount, toTokenPriceUSD);
  const priceImpactBps = calculatePriceImpactBps(fromUSDValue, toUSDValue);
  const minimumReceived = useMemo(
    () =>
      formatSwapQuoteOutput(
        quoteTradeInfo
          ? {
              amounts: [quoteTradeInfo.amountIn, quoteTradeInfo.amountOut],
              path: quoteTradeInfo.path,
              adapters: quoteTradeInfo.adapters,
            }
          : null,
        toToken?.decimal ?? 18,
      ),
    [quoteTradeInfo, toToken?.decimal],
  );
  const quoteFreshness = useMemo(
    () => getSwapQuoteFreshness(quoteTradeInfo),
    [quoteTradeInfo],
  );
  const routeHops = useMemo(
    () => preparedRoute?.routing === "single"
      ? buildSwapRouteHops(quoteTradeInfo, activeV2Chain)
      : undefined,
    [activeV2Chain, preparedRoute?.routing, quoteTradeInfo],
  );
  const splitBranches = useMemo(
    () => buildSwapSplitBranches(preparedRoute, chainId),
    [chainId, preparedRoute],
  );
  const routeLabel = getSwapRouteLabel(preparedRoute);
  const bestRoute = useMemo(
    () => preparedRoute?.routing === "split"
      ? `${preparedRoute.splits?.length ?? 0} route SDK split`
      : quoteTradeInfo?.pathTokens?.length
        ? `${Math.max(quoteTradeInfo.pathTokens.length - 1, 1)} hop ${preparedRoute?.source === "local" ? "local fallback" : "SDK route"}`
        : isDirectRoute
          ? "Native wrap"
          : undefined,
    [isDirectRoute, preparedRoute?.routing, preparedRoute?.source, preparedRoute?.splits?.length, quoteTradeInfo?.pathTokens],
  );

  const executionMode = useMemo(
    () =>
      getWidgetExecutionMode({
        configuredMode: config.executionMode,
        integratorId: config.integratorId,
      }),
    [config.executionMode, config.integratorId],
  );
  const swapContractApi = useMemo(
    () =>
      executionMode === "contract"
        ? createWidgetContractApi(config.integratorId)
        : SWAP_EMBED_FALLBACK_API,
    [config.integratorId, executionMode],
  );
  const executionLabel = preparedRoute?.source === "local"
    ? "Contract fallback"
    : "SDK exec";

  const isRefreshingQuote = deferredFromAmount !== fromAmount || quoteLoading;
  const {
    swapStatus,
    swapHash,
    needsApproval,
    executionError: swapExecutionError,
    handleApprove,
    confirmSwap,
  } = useSwapExecution({
    chainId,
    address: connectedAddress,
    selectedTokenA: fromToken,
    selectedTokenB: toToken,
    amountIn: fromAmount,
    debouncedAmountIn: deferredFromAmount,
    tradeInfo: quoteTradeInfo,
    preparedRoute,
    protocolFee: feeBps,
    isRefreshingQuote,
    swapContractApi,
    executionMode: "auto",
    onSwapSubmitted: () => {
      setShowConfirm(false);
      setShowSuccess(true);
      setExecutionError(null);
    },
  });

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

  const isExecuting = ["APPROVING", "WAITING_FOR_CONFIRMATION", "SWAPPING"].includes(swapStatus);
  const canOpenConfirm = !!preparedRoute && !!quoteTradeInfo && Number(fromAmount) > 0;

  const onSwap = () => {
    if (walletState.status !== "connected") {
      setShowWalletModal(true);
      return;
    }
    if (walletState.chain.id !== chainId) {
      switchChain?.({ chainId });
      return;
    }
    if (!canOpenConfirm) {
      setExecutionError(quoteLoading ? "Quote is still loading." : "No executable quote is available.");
      return;
    }
    setExecutionError(null);
    setShowConfirm(true);
  };

  const flipTokens = () => {
    setFromToken(toToken);
    setToToken(fromToken);
    setFromAmount(toAmount);
  };

  return (
    <div
      className={`widget-embed-mode widget-theme-${config.theme} ${
        config.showBackground ? "" : "widget-no-background"
      }`}
      style={{
        "--primary": config.primaryColor,
        "--widget-primary": config.primaryColor,
        "--widget-primary-rgb": primaryRgb,
        "--bg-color": config.showBackground ? config.background : "transparent",
        "--border-color": config.borderColor,
        minHeight: "100vh",
        background: config.showBackground ? config.background : "transparent",
        color: "#fff",
        fontFamily: "Inter, sans-serif",
      }}
    >
      <main
        style={{
          width: "100%",
          maxWidth: 480,
          margin: "0 auto",
          padding: 14,
          boxSizing: "border-box",
        }}
      >
        <header
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "stretch",
            gap: 9,
            marginBottom: 12,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 10,
            }}
          >
            <p
              style={{
                margin: 0,
                fontSize: 9,
                letterSpacing: "0.34em",
                color: config.primaryColor,
                textTransform: "uppercase",
                fontWeight: 800,
              }}
            >
              EmpX widget
            </p>
            <WidgetWalletButton
              connected={walletState.status === "connected"}
              address={walletState.status === "connected" ? walletState.address : undefined}
              onConnect={() => setShowWalletModal(true)}
              onClick={() => setShowAccountModal(true)}
            />
          </div>
          <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap", minWidth: 0 }}>
            <WidgetStatusBadge tone="info">{activeChain.name}</WidgetStatusBadge>
            <WidgetStatusBadge tone={preparedRoute?.source === "local" ? "accent" : "neutral"}>
              {executionLabel}
            </WidgetStatusBadge>
            <WidgetStatusBadge tone={quoteLoading || splitQuoteLoading ? "accent" : quoteFallbackActive ? "neutral" : "info"}>
              {quoteLoading
                ? "Fetching single route"
                : splitQuoteLoading
                  ? "Optimizing for split trade"
                  : quoteFallbackActive
                    ? "Local fallback"
                    : "SDK quote"}
            </WidgetStatusBadge>
          </div>
        </header>

        <EmpxSwapWidget
          chain={activeChain}
          fromToken={fromToken ? { ticker: fromToken.ticker, address: fromToken.address, decimals: fromToken.decimal } : null}
          fromAmount={fromAmount}
          fromBalance={isTokenBalanceLoading ? "Loading..." : selectedFromToken?.balance}
          fromUsdValue={fromUSDValue}
          onFromAmountChange={setFromAmount}
          onSelectFromToken={() => setShowTokenPicker("from")}
          onPercentClick={(pct) => {
            const bal = Number((selectedFromToken?.balance || "0").replace(/,/g, ""));
            if (Number.isFinite(bal)) setFromAmount(String((bal * pct) / 100));
          }}
          toToken={toToken ? { ticker: toToken.ticker, address: toToken.address, decimals: toToken.decimal } : null}
          toAmount={toAmount}
          toUsdValue={toUSDValue}
          onSelectToToken={() => setShowTokenPicker("to")}
          pairType={pairType}
          protocolFeeBps={feeBps}
          bestRoute={bestRoute}
          routeLabel={routeLabel}
          minimumReceived={`${minimumReceived} ${toToken?.ticker || ""}`}
          slippageBps={config.showSlippage ? slippageBps : undefined}
          priceImpactBps={priceImpactBps}
          routeHops={routeHops}
          splitBranches={splitBranches}
          swapDisabled={!canOpenConfirm || isRefreshingQuote}
          swapLoading={quoteLoading}
          walletConnected={walletState.status === "connected"}
          onConnect={() => setShowWalletModal(true)}
          onSwap={onSwap}
          onFlip={flipTokens}
          swapLabel={
            walletState.status === "connected"
              ? quoteLoading
                ? "Fetching quote..."
                : needsApproval
                  ? `Approve ${fromToken?.ticker ?? "token"}`
                  : "Swap"
              : "Connect wallet"
          }
        />

        <div
          style={{
            marginTop: 10,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 10,
            flexWrap: "wrap",
          }}
        >
          {quoteFreshness && (
            <QuoteCountdown
              totalMs={quoteFreshness.validMs}
              issuedAt={quoteFreshness.issuedAt}
              onRefresh={() => {
                void refreshQuotes();
              }}
              compact
            />
          )}
          {config.showPoweredBy && (
            <span style={{ fontSize: 10, color: "rgba(255,255,255,0.45)", letterSpacing: "0.12em", textTransform: "uppercase" }}>
              Powered by EmpX
            </span>
          )}
        </div>

        {executionError && (
          <p style={{ margin: "10px 0 0", fontSize: 11, color: "#F87171", lineHeight: 1.45 }}>
            {executionError}
          </p>
        )}
        {quoteError && !quoteLoading && (
          <p style={{ margin: "10px 0 0", fontSize: 11, color: "#F87171", lineHeight: 1.45 }}>
            SDK and local route preparation failed. Refresh the quote or try a different amount.
          </p>
        )}
      </main>

      <WalletModal
        open={showWalletModal}
        onClose={() => setShowWalletModal(false)}
        wallets={walletOptions}
        onSelect={(wallet) => {
          setShowWalletModal(false);
          onSelectWallet(wallet);
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
          onSelect={(token) => {
            const nextToken = tokensForChain.find(
              (candidate) =>
                candidate.address === token.address ||
                candidate.ticker === token.ticker,
            );
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
        eyebrow="REVIEW · WIDGET SWAP"
        title="Confirm trade"
        confirmLabel={needsApproval ? "Approve and swap" : "Confirm swap"}
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
          { label: "Quote path", value: routeLabel ?? "Route unavailable" },
          { label: "Execution", value: preparedRoute?.source === "local" ? "Contract fallback" : "EmpX SDK" },
          { label: "Protocol fee", value: `${feeBps} bps`, accent: true },
          { label: "Best route", value: bestRoute ?? "SDK route unavailable" },
          ...(routeLabel ? [{ label: "Route type", value: routeLabel, accent: true }] : []),
          { label: "Min. received", value: `${minimumReceived} ${toToken?.ticker || ""}`, muted: true },
          ...(config.showSlippage ? [{ label: "Slippage", value: `${(slippageBps / 100).toFixed(2)}%`, muted: true }] : []),
          ...(priceImpactBps !== undefined
            ? [{ label: "Price impact", value: `${(priceImpactBps / 100).toFixed(2)}%`, muted: true, accent: priceImpactBps > 100 }]
            : []),
          ...(needsApproval ? [{ label: "Approval", value: `${fromToken?.ticker ?? "Token"} approval required`, accent: true }] : []),
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
          { label: "Widget quote", description: "EmpX SDK route selected", state: "complete" },
          { label: "Execution", description: preparedRoute?.source === "local" ? "Fallback contract call submitted" : "SDK calldata submitted", state: "complete" },
          { label: "Tokens delivered", description: `${toToken?.ticker || "Tokens"} in wallet`, state: "complete" },
        ]}
        txHashes={swapHash ? [
          {
            label: "Swap tx",
            chainName: activeChain.name,
            chainColor: activeChain.color,
            hashShort: shortHash(swapHash),
            url: getExplorerTxUrl(chainId, swapHash) ?? undefined,
          },
        ] : []}
        onNewTrade={() => setShowSuccess(false)}
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
          explorerUrl={getExplorerAddressUrl(chainId, walletState.address) ?? undefined}
          onCopy={() => undefined}
          onSwitchNetwork={() => switchChain?.({ chainId })}
          onSwitchWallet={() => {
            setShowAccountModal(false);
            setShowWalletModal(true);
          }}
          onDisconnect={() => {
            setShowAccountModal(false);
            disconnect();
          }}
        />
      )}
    </div>
  );
}
