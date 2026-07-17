// ─── CrossPage — cross-chain swap (drop-in /cross replacement) ─────────────
//
// Wiring sources of truth (no phantom UI — every behavior maps to SDK code):
//
//   • Rail list / mode / token-support flags
//       → empx-cross-bridge/src/vps/rails/registry.ts
//       (mirrored in src/design-system/data/empxRegistry.ts)
//
//   • Aggregator-deployed chains (T1)
//       → empx-cross-bridge/src/vps/config/chains.ts AGG_CHAIN_IDS
//
//   • Destination gas drop (Gas.zip rail)
//       → empx-cross-bridge/src/vps/rails/solvers/GasZipSolver.ts +
//         vps/services/DestinationGasAutoFund.ts
//
//   • Pair-type fees (Mode A: 28/15/9 bps; Mode B: 5 bps flat)
//       → empx-cross-bridge/src/vps/services/_pairTypeFees.ts
//
// User-flagged corrections wired in v14:
//   1. Rail selection is USER-DRIVEN. Click an offer → pinned. Quote follows.
//   2. Token list filtering by chain tier + rail settlement support.
//   3. Three-tier chain badge (T1 / T2 / T3) in ChainPicker.
//   4. Gas-on-destination toggle (Gas.zip side-leg).
//   5. Gasless-source Paymaster remains visible but disabled until re-enabled.

import {
  readContract,
  sendTransaction,
  waitForTransactionReceipt,
  writeContract,
} from "@wagmi/core";
import { useCallback, useDeferredValue, useEffect, useMemo, useState } from "react";
import { erc20Abi, formatUnits, type Address } from "viem";
import { useBalance, useChainId, useSignMessage, useSwitchChain } from "wagmi";
import { config } from "../../Wagmi/config";
import {
  AccountModal,
  Card,
  ChainPicker,
  ConfirmTradeModal,
  DappNavbar,
  NetworkSelector,
  Pill,
  QuoteCountdown,
  SocialTray,
  Tabs,
  Toaster,
  TokenPicker,
  TradeSuccessModal,
  WalletButton,
  WalletModal,
  useIsMobile,
  toast,
  type PickerChain,
  type PickerToken,
  type RouteHop,
  type TradeTimelineStep,
} from "../components";
import { crossApi } from "../../features/cross/api/crossApi";
import { CrossExecutionPanel } from "../../features/cross/components/CrossExecutionPanel";
import { CrossTrackingPanel } from "../../features/cross/components/CrossTrackingPanel";
import {
  classifyProviderDirectAction,
  getLayerZeroStepMessage,
  getLayerZeroStepTx,
  mergeLayerZeroUserSteps,
} from "../../features/cross/execution/providerDirect";
import {
  getRequiredRouterIntentApproval,
  isRouterIntentExpired,
  toSendTransactionArgs,
} from "../../features/cross/execution/routerIntent";
import { useCrossExecutionSession } from "../../features/cross/hooks/useCrossExecutionSession";
import { useCrossIntentTracking } from "../../features/cross/hooks/useCrossIntentTracking";
import { useCrossQuote } from "../../features/cross/hooks/useCrossQuote";
import { useCrossRecovery } from "../../features/cross/hooks/useCrossRecovery";
import {
  findMatchingRefreshedOffer,
  getPrimaryOffers,
  normalizeOfferSet,
} from "../../features/cross/model/quotes";
import { mapCrossApiError } from "../../features/cross/utils/errors";
import {
  clearCrossSession,
  loadCrossSession,
  saveCrossSession,
} from "../../features/cross/utils/session";
import {
  buildCancelMessage,
  buildRefundMessage,
  buildSubmittedMessage,
} from "../../features/cross/utils/signatures";
import { useWalletConnection } from "../hooks/useWalletConnection";
import { useV2Balances } from "../hooks/useV2Balances";
import EmpxCrossWidget from "../EmpxCrossWidget";
import { getExplorerAddressUrl, getExplorerTxUrl } from "../data/explorers";
import { V2_ALL_CHAINS, getV2Chain } from "../data/v2ChainView";
import { getTokensForChain, type V2TokenConfig } from "../data/v2TokenView";
import { createV2NavLinks } from "../data/v2ProductRoutes";
import {
  CROSS_V2_DEFAULT_SELECTION,
  buildCrossQuoteRequest,
  buildCrossRouteHops,
  buildCrossTimeline,
  formatCrossOffer,
  getCrossQuoteUiState,
  shortHash,
  type CrossV2OfferDisplay,
} from "../data/crossV2Adapters";
import {
  RAILS,
  defaultSettlementTicker,
  eligibleRailsFor,
  formatEtaSeconds,
  tierForChainId,
  tierLabel,
  type RailEntry,
} from "../data/empxRegistry";

// ─── Chain catalog for the picker ──────────────────────────────────────────
// Mirrors empx-cross-bridge/src/vps/config/chains.ts CHAIN_CONFIGS entries
// that we surface to users. Non-EVM IDs match the registry.

interface ChainDef {
  id: number;
  name: string;
  color: string;
  ticker: string;
  kind?: "EVM" | "BTC" | "SOL" | "OTHER";
}

const V2_CHAIN_OPTIONS: ChainDef[] = V2_ALL_CHAINS;

// ─── Token catalog — per-chain ────────────────────────────────────────────
// On T1 chains we'd hydrate from the aggregator (full token list with search).
// On T2/T3 chains we restrict to tokens the eligible rail set supports.

type ChainTier = 1 | 2 | 3;

interface Token {
  ticker: string;
  name: string;
  category: "stable" | "native" | "wrapped" | "oft" | "other";
  badge?: PickerToken["badge"];
}

function tokenCategory(token: V2TokenConfig): Token["category"] {
  const ticker = token.ticker.toUpperCase();
  if (token.isNative) return "native";
  if (["USDC", "USDT", "DAI", "HONEY"].includes(ticker)) return "stable";
  if (ticker.startsWith("W")) return "wrapped";
  return "other";
}

function configTokensForChain(chainId: number): Token[] {
  const configured = getTokensForChain(chainId).map<Token>((t) => ({
    ticker: t.ticker,
    name: t.name,
    category: tokenCategory(t),
    badge: t.badge,
  }));
  if (configured.length > 0) return configured;

  const chain = getV2Chain(chainId);
  return chain
    ? [{ ticker: chain.ticker, name: chain.name, category: "native" }]
    : [];
}

// Token list for a given (chain, role, eligibleRails).
// SOURCE→FROM rules:
//   T1: full aggregator list (any input token, source-side aggregator swaps to settlement).
//   T2: only tokens at least one source-eligible rail accepts (USDC / USDT / native).
//   T3: only the chain's native L1 asset (BTC, SOL, DOGE, ...).
// DESTINATION→TO rules:
//   T1: full aggregator list (rail delivers settlement asset, aggregator swaps to user's pick).
//   T2: only tokens the eligible rail set can settle into (USDC / USDT / OFT / native).
//   T3: only the chain's native L1 asset.
function tokensFor(
  chainId: number,
  role: "from" | "to",
  eligibleRails: RailEntry[],
): { tokens: Token[]; restrictedReason?: string } {
  const tier = tierForChainId(chainId);
  const full = configTokensForChain(chainId);

  if (tier === 1) {
    // Full token list (any token; aggregator handles input/output legs).
    return { tokens: full };
  }

  if (tier === 3) {
    // Non-EVM: only the chain's native asset, regardless of role.
    return {
      tokens: full.filter((t) => t.category === "native"),
      restrictedReason: `${tierLabel(3)} chain — only the native L1 asset is supported here. Routes go via Mode B rails (THORChain / Chainflip / Maya / TeleSwap).`,
    };
  }

  // T2: rail-only EVM. Filter to tickers ≥1 eligible rail accepts.
  const railSupportsTicker = (ticker: string): boolean => {
    const upper = ticker.toUpperCase();
    return eligibleRails.some((r) => {
      if (upper === "USDC") return r.supportsUSDC;
      if (upper === "USDT") return r.supportsUSDT;
      if (["BTC", "ETH", "SOL", "DOGE", "LTC", "BCH"].includes(upper)) return r.supportsNativeL1;
      return r.supportsOFT;
    });
  };
  const filtered = full.filter((t) => railSupportsTicker(t.ticker));
  return {
    tokens: filtered.length > 0 ? filtered : full.filter((t) => t.category === "stable"),
    restrictedReason: `${tierLabel(2)} chain — token list limited to assets the ${eligibleRails.length} eligible rail${eligibleRails.length === 1 ? "" : "s"} can ${role === "from" ? "source from" : "settle into"} on this chain.`,
  };
}

// Token USD-price source — DefiLlama prices via priceService.
// `priceOf(ticker)` returns the cached live price when available; falls
// back to the static seed table for chains/tokens DefiLlama doesn't cover
// (PulseChain, Sonic, Sei, Bera, Monad, HyperEVM, EthPoW, Rootstock).
// The static table also serves as the cold-start floor while async fetches
// resolve — same pattern as NativeUsdOracle.STATIC_NATIVE_USD.
import { getCachedPrice, getTokenPrices } from "../data/priceService";

const PRICE_USD_FALLBACK: Record<string, number> = {
  ETH: 3184, WETH: 3184, BTC: 67852, WBTC: 67852, SOL: 158,
  USDC: 1, USDT: 1, DAI: 1, HONEY: 1,
  POL: 0.72, BNB: 612, AVAX: 38, ARB: 0.79, OP: 1.84, PLS: 0.00007, SEI: 0.51, BERA: 6.2,
  RBTC: 67852, MON: 1, HYPE: 23, ETHW: 2.1, S: 0.42, CAKE: 2.4, JOE: 0.43, GMX: 24,
  PEPE: 0.0000091, DEGEN: 0.0098, AERO: 1.1, HEX: 0.0042, PLSX: 0.00004, RIF: 0.082, DOGE: 0.16, LTC: 71, BCH: 462,
};

/**
 * Lookup live price for (chainId, ticker).  Returns the cached DefiLlama
 * price when available, else the fallback seed.  Async fetches are kicked
 * off by useEffect in the page below so subsequent renders pick up live data.
 */
function priceOf(ticker: string, chainId?: number): number {
  if (chainId != null) {
    const live = getCachedPrice(chainId, ticker);
    if (live != null) return live;
  }
  return PRICE_USD_FALLBACK[ticker.toUpperCase()] ?? 1;
}

/** Trigger an async DefiLlama fetch for the (chainId, ticker) pairs in view. */
function _prefetchPrices(pairs: { chainId: number; ticker: string }[]) {
  void getTokenPrices(pairs); // fire-and-forget; cache picks up the result
}

const getProviderDirectTx = (integration: any) => {
  const action = integration?.action ?? integration;
  return (
    action?.tx ??
    integration?.tx ??
    integration?.integration?.tx ??
    action?.transaction ??
    null
  );
};

// ─── Page-level constants ─────────────────────────────────────────────────

type ChainPickerTarget = "from" | "to";
type TokenPickerTarget = "from" | "to";
type SidePanelTab = "offers" | "settings" | "rails" | "lifecycle";

// Gas-drop typical USD value per destination chain (rough — production reads
// from DestinationGasAutoFund.ts policy).
const GAS_DROP_USD = 2.5;

const EMPX_SOCIALS = [
  { kind: "x" as const,        href: "https://x.com/empx" },
  { kind: "telegram" as const, href: "https://t.me/empx" },
  { kind: "docs" as const,     href: "https://docs.empx.network" },
  { kind: "github" as const,   href: "https://github.com/empx" },
];

export default function CrossPage() {
  const isMobile = useIsMobile();

  const { walletState, walletOptions, onSelectWallet, disconnect } = useWalletConnection();
  const currentChainId = useChainId();
  const { switchChainAsync } = useSwitchChain();
  const { signMessageAsync } = useSignMessage();
  const connectedAddress =
    walletState.status === "connected" ? (walletState.address as Address) : undefined;
  const connectedBalance = useV2Balances();
  const [showWalletModal, setShowWalletModal] = useState(false);
  const [chainPickerTarget, setChainPickerTarget] = useState<ChainPickerTarget | null>(null);
  const [tokenPickerTarget, setTokenPickerTarget] = useState<TokenPickerTarget | null>(null);
  const [showAccountModal, setShowAccountModal] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [shownSuccessIntentId, setShownSuccessIntentId] = useState<string | null>(null);
  const [quoteIssuedAt, setQuoteIssuedAt] = useState(Date.now());

  // Cross-chain pair state — start on a stable pair that can surface live rails.
  const [fromChainId, setFromChainId] = useState<number>(CROSS_V2_DEFAULT_SELECTION.fromChainId);
  const [toChainId,   setToChainId]   = useState<number>(CROSS_V2_DEFAULT_SELECTION.toChainId);
  const [fromTicker, setFromTicker] = useState<string>(CROSS_V2_DEFAULT_SELECTION.fromTicker);
  const [toTicker,   setToTicker]   = useState<string>(CROSS_V2_DEFAULT_SELECTION.toTicker);
  const [fromAmount, setFromAmount] = useState<string>(CROSS_V2_DEFAULT_SELECTION.fromAmount);

  const [selectedOfferId, setSelectedOfferId] = useState<string | null>(null);
  const [selectedGasOfferId, setSelectedGasOfferId] = useState<string | null>(null);
  const [session, setSession] = useState<any>(() => {
    const restored = loadCrossSession<any>();

    if (
      restored?.mode === "single" &&
      restored?.status === "SELECTED" &&
      restored?.integration?.mode === "router_intent" &&
      isRouterIntentExpired(restored.integration)
    ) {
      return null;
    }

    return restored;
  });
  const [isExecuting, setIsExecuting] = useState(false);
  const [isCheckingApproval, setIsCheckingApproval] = useState(false);
  const [isApproving, setIsApproving] = useState(false);
  const [hasRequiredApproval, setHasRequiredApproval] = useState(true);
  const [now, setNow] = useState(Date.now());

  // Gas settings. Paymaster is intentionally disabled in the UI for now.
  const [gasDropOnDestination, setGasDropOnDestination] = useState(false);

  const [sidePanel, setSidePanel] = useState<SidePanelTab>("offers");
  const deferredFromAmount = useDeferredValue(fromAmount);

  useEffect(() => {
    const interval = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(interval);
  }, []);

  // Resolve chain defs
  const fromChain = useMemo(
    () => V2_CHAIN_OPTIONS.find((c) => c.id === fromChainId) ?? V2_CHAIN_OPTIONS[1],
    [fromChainId],
  );
  const toChain = useMemo(
    () => V2_CHAIN_OPTIONS.find((c) => c.id === toChainId) ?? V2_CHAIN_OPTIONS[2],
    [toChainId],
  );

  const fromTier: ChainTier = tierForChainId(fromChainId);
  const toTier:   ChainTier = tierForChainId(toChainId);


  const fromTokenConfig = useMemo(
    () => getTokensForChain(fromChainId).find((t) => t.ticker === fromTicker) ?? null,
    [fromChainId, fromTicker],
  );
  const toTokenConfig = useMemo(
    () => getTokensForChain(toChainId).find((t) => t.ticker === toTicker) ?? null,
    [toChainId, toTicker],
  );
  const toTokenDecimals = Number(toTokenConfig?.decimals ?? 18);

  const quoteRequest = useMemo(
    () =>
      // Keep the page on shared V2 registries; only this adapter knows how
      // to express the selected chain/token/amount as the cross API contract.
      buildCrossQuoteRequest({
        fromToken: fromTokenConfig,
        toToken: toTokenConfig,
        fromAmount: deferredFromAmount,
        fromChainId,
        toChainId,
        userAddress: connectedAddress,
        includeDestinationGas: gasDropOnDestination,
        destinationGasAmount: "0.001",
      }),
    [
      connectedAddress,
      deferredFromAmount,
      fromChainId,
      fromTokenConfig,
      gasDropOnDestination,
      toChainId,
      toTokenConfig,
    ],
  );
  const quoteEnabled = Boolean(
    connectedAddress &&
      quoteRequest &&
      fromChainId !== toChainId &&
      quoteRequest.amountIn !== "0",
  );
  const quote = useCrossQuote(quoteEnabled, quoteRequest);
  const execution = useCrossExecutionSession();

  const effectiveQuote = useMemo(() => {
    if (execution.fallbackOfferSet) {
      // A select can return 409 + fallbackOfferSet when the chosen offer
      // expires. Render that refreshed set instead of leaving stale routes.
      return normalizeOfferSet({ offerSet: execution.fallbackOfferSet });
    }

    return quote.data;
  }, [execution.fallbackOfferSet, quote.data]);

  const gasOffers = useMemo(() => {
    const composition = effectiveQuote?.gasZipComposition;
    if (!composition) return [];

    // Destination gas is quoted as a separate Gas.zip offer and selected via
    // the composed-intent endpoint, not mixed into the primary transfer offer.
    return Array.isArray(composition.destinationGasOffers)
      ? composition.destinationGasOffers
      : composition.gasZipDestinationGasOffer
        ? [composition.gasZipDestinationGasOffer]
        : [];
  }, [effectiveQuote?.gasZipComposition]);

  const displayOffers = useMemo(
    () => getPrimaryOffers(effectiveQuote),
    [effectiveQuote],
  );
  const offerEntries = useMemo<CrossOfferEntry[]>(() => {
    return displayOffers.map((offer: any) => ({
      ...formatCrossOffer(offer, toTokenDecimals),
      rawOffer: offer,
      railBadge: offer.railVariant ?? offer.executionMode ?? offer.deliveryShape,
      executionMode: offer.executionMode,
      deliveryShape: offer.deliveryShape,
    }));
  }, [displayOffers, toTokenDecimals]);
  const quoteUiState = getCrossQuoteUiState({
    walletConnected: walletState.status === "connected",
    quoteReady: quoteEnabled,
    isFetching: quote.isFetching,
    offerCount: offerEntries.length,
  });
  const selectedOffer = useMemo(
    () =>
      displayOffers.find((offer: any) => offer.offerId === selectedOfferId) ??
      displayOffers.find((offer: any) => offer.offerId === effectiveQuote?.bestOfferId) ??
      displayOffers[0] ??
      null,
    [displayOffers, effectiveQuote?.bestOfferId, selectedOfferId],
  );
  const selectedOfferDisplay = useMemo(
    () => (selectedOffer ? formatCrossOffer(selectedOffer, toTokenDecimals) : null),
    [selectedOffer, toTokenDecimals],
  );

  useEffect(() => {
    if (!displayOffers.length) {
      setSelectedOfferId(null);
      return;
    }

    if (
      !selectedOfferId ||
      !displayOffers.some((offer: any) => offer.offerId === selectedOfferId)
    ) {
      setSelectedOfferId(
        displayOffers.find((offer: any) => offer.offerId === effectiveQuote?.bestOfferId)
          ?.offerId ??
          displayOffers[0]?.offerId ??
          null,
      );
    }
  }, [displayOffers, effectiveQuote?.bestOfferId, selectedOfferId]);

  useEffect(() => {
    if (!gasOffers.length) {
      setSelectedGasOfferId(null);
      return;
    }

    if (
      !selectedGasOfferId ||
      !gasOffers.some((offer: any) => offer.offerId === selectedGasOfferId)
    ) {
      setSelectedGasOfferId(gasOffers[0]?.offerId ?? null);
    }
  }, [gasOffers, selectedGasOfferId]);

  useEffect(() => {
    if (session) {
      // Execution can span wallet confirmations and polling intervals. Persist
      // the selected intent so reloads do not strand the lifecycle panel.
      saveCrossSession(session);
    } else {
      clearCrossSession();
    }
  }, [session]);

  useEffect(() => {
    if (execution.fallbackOfferSet) {
      toast.info("Selected route expired. Please choose an updated route.");
    }
  }, [execution.fallbackOfferSet]);

  useEffect(() => {
    if (quote.data) {
      setQuoteIssuedAt(Date.now());
    }
  }, [quote.data]);

  // Reset destination ticker when destination chain tier changes
  useEffect(() => {
    if (toTier === 3) {
      // Force native L1
      const native = configTokensForChain(toChainId).find((t) => t.category === "native");
      if (native && toTicker !== native.ticker) setToTicker(native.ticker);
    } else if (toTier === 2) {
      // Force to a settlement stable if the current ticker isn't supported
      const allowed = tokensFor(toChainId, "to", eligibleRailsFor(fromChainId, toChainId, undefined)).tokens;
      if (!allowed.some((t) => t.ticker === toTicker)) {
        setToTicker(defaultSettlementTicker(toChainId));
      }
    }
  }, [toChainId, toTier, fromChainId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Gas-drop eligibility — Gas.zip must support the destination
  const gasZipRail = RAILS.find((r) => r.name === "Gas.zip");
  const gasDropAvailable = !!gasZipRail && gasZipRail.destinations.includes(toChainId);
  useEffect(() => {
    if (!gasDropAvailable && gasDropOnDestination) setGasDropOnDestination(false);
  }, [gasDropAvailable, gasDropOnDestination]);

  // Prefetch live USD prices via DefiLlama for the current pair.  Falls
  // back to PRICE_USD_FALLBACK silently when the chain isn't covered.
  useEffect(() => {
    _prefetchPrices([
      { chainId: fromChainId, ticker: fromTicker },
      { chainId: toChainId,   ticker: toTicker   },
    ]);
  }, [fromChainId, fromTicker, toChainId, toTicker]);

  const tracking = useCrossIntentTracking(
    session?.mode === "single" ? session.intentId : undefined,
    session?.mode === "composed" ? session.composedIds : undefined,
  );

  const singleApprovalRequest = useMemo(
    () =>
      session?.mode === "single"
        ? getRequiredRouterIntentApproval(session)
        : null,
    [session],
  );

  useEffect(() => {
    let cancelled = false;

    const checkAllowance = async () => {
      if (!connectedAddress || !singleApprovalRequest) {
        setHasRequiredApproval(true);
        setIsCheckingApproval(false);
        return;
      }

      setIsCheckingApproval(true);

      try {
        // Router-intent routes may need ERC20 approval before execute. This is
        // a read-only guard; the actual approve action refreshes the quote.
        const allowance = await (readContract as any)(config, {
          address: singleApprovalRequest.tokenAddress as Address,
          abi: erc20Abi,
          functionName: "allowance",
          args: [connectedAddress, singleApprovalRequest.spender as Address],
          chainId: singleApprovalRequest.chainId as any,
        });

        if (!cancelled) {
          setHasRequiredApproval(allowance >= singleApprovalRequest.amount);
        }
      } catch {
        if (!cancelled) {
          setHasRequiredApproval(false);
        }
      } finally {
        if (!cancelled) {
          setIsCheckingApproval(false);
        }
      }
    };

    checkAllowance();

    return () => {
      cancelled = true;
    };
  }, [connectedAddress, singleApprovalRequest]);

  const recoveryIntentId =
    session?.mode === "single"
      ? session.intentId ?? ""
      : session?.primaryTransfer?.intentId ?? "";
  const recovery = useCrossRecovery(recoveryIntentId);

  const { data: fromTokenBalance } = useBalance({
    address: connectedAddress,
    chainId: fromChainId as any,
    token:
      fromTokenConfig && !fromTokenConfig.isNative
        ? (fromTokenConfig.address as Address)
        : undefined,
    query: {
      enabled: Boolean(connectedAddress && fromTokenConfig),
    },
  });

  const { data: sourceNativeBalance } = useBalance({
    address: connectedAddress,
    chainId: (
      session?.mode === "single"
        ? (session.sourceChainId ?? session.quote?.srcChainId ?? fromChainId)
        : fromChainId
    ) as any,
    query: {
      enabled: Boolean(connectedAddress),
    },
  });

  useEffect(() => {
    if (
      session?.mode === "single" &&
      session?.status === "SELECTED" &&
      session?.integration?.mode === "router_intent" &&
      isRouterIntentExpired(session.integration, now)
    ) {
      setSession(null);
    }
  }, [now, session]);

  const quoteErrorMessage = quote.error ? mapCrossApiError(quote.error) : null;
  const trackingData = tracking.data as any;
  const fromBalanceLabel =
    walletState.status === "connected" && fromTokenBalance
      ? `${Number(fromTokenBalance.formatted).toLocaleString(undefined, {
          maximumFractionDigits: 6,
        })} ${fromTicker}`
      : undefined;
  const fromBalanceNumeric = Number(fromTokenBalance?.formatted ?? 0);
  const toAmountDisplay =
    selectedOfferDisplay?.outputAmount ??
    (quote.isFetching ? "..." : "0");
  const toUsdValue =
    selectedOfferDisplay && Number.isFinite(Number(selectedOfferDisplay.outputAmount))
      ? Number(selectedOfferDisplay.outputAmount) * priceOf(toTicker, toChainId)
      : undefined;
  const sourceTxHash =
    trackingData?.srcTxHash ??
    trackingData?.sourceTxHash ??
    session?.lastTxHash ??
    session?.primaryTransfer?.lastTxHash;
  const destinationTxHash =
    trackingData?.dstTxHash ??
    trackingData?.destinationTxHash ??
    trackingData?.primaryTransfer?.dstTxHash ??
    trackingData?.primaryTransfer?.destinationTxHash;

  // Pickers — chain & token lists with tier badging
  const chainPickerList: PickerChain[] = useMemo(() => {
    return V2_CHAIN_OPTIONS.map((c) => {
      const tier = tierForChainId(c.id);
      return {
        id: c.id,
        name: c.name,
        ticker: c.ticker,
        color: c.color,
        kind: c.kind ?? "EVM",
        tier,
        tierLabel: tierLabel(tier),
      };
    });
  }, []);

  const tokenPickerData = useMemo(() => {
    if (!tokenPickerTarget) return null;
    const chainId = tokenPickerTarget === "from" ? fromChainId : toChainId;
    const role = tokenPickerTarget;
    // For destination filtering we ignore destTicker so we get the full
    // rail set; for source filtering we just need any eligible rail.
    const eligible = eligibleRailsFor(fromChainId, toChainId, undefined);
    const { tokens, restrictedReason } = tokensFor(chainId, role, eligible);
    const chainName = V2_CHAIN_OPTIONS.find((c) => c.id === chainId)?.name ?? "";
    const chainColor = V2_CHAIN_OPTIONS.find((c) => c.id === chainId)?.color;
    return {
      tokens: tokens.map<PickerToken>((t) => ({
        ticker: t.ticker,
        name: t.name,
        chainName,
        chainColor,
        badge: t.badge,
        balance: role === "from" && t.ticker === connectedBalance.nativeTicker
          ? connectedBalance.nativeBalance
          : undefined,
        balanceUSD: role === "from" && t.ticker === connectedBalance.nativeTicker
          ? connectedBalance.nativeBalanceUSD ?? undefined
          : undefined,
      })),
      restrictedReason,
    };
  }, [tokenPickerTarget, fromChainId, toChainId, connectedBalance.nativeBalance, connectedBalance.nativeBalanceUSD, connectedBalance.nativeTicker]);

  const routeHops: RouteHop[] = useMemo(() => {
    if (!selectedOffer) return [];
    return buildCrossRouteHops(selectedOffer, fromChain, toChain, fromTicker, toTicker);
  }, [selectedOffer, fromChain, toChain, fromTicker, toTicker]);

  // Flip
  const flip = () => {
    const fc = fromChainId, ft = fromTicker;
    setFromChainId(toChainId); setToChainId(fc);
    setFromTicker(toTicker); setToTicker(ft);
    setSelectedOfferId(null);
  };

  const onSwap = () => {
    if (walletState.status !== "connected") { setShowWalletModal(true); return; }
    if (!selectedOffer || !effectiveQuote) {
      toast.error(quoteErrorMessage ?? "No executable route is available for this pair.");
      return;
    }
    setQuoteIssuedAt(Date.now());
    setShowConfirm(true);
  };

  const ensureChain = useCallback(
    async (targetChainId: number) => {
      if (currentChainId !== targetChainId) {
        await switchChainAsync({ chainId: targetChainId as any });
      }
    },
    [currentChainId, switchChainAsync],
  );

  const submitStandardIntent = useCallback(
    async (intentId: string, srcTxHash: string) => {
      if (!connectedAddress) {
        throw new Error("Wallet not connected.");
      }

      const timestamp = Date.now();
      const message = buildSubmittedMessage({
        intentId,
        wallet: connectedAddress,
        timestamp,
        srcTxHash,
      });
      const signature = await signMessageAsync({ account: connectedAddress, message });

      await crossApi.markSubmitted(intentId, {
        userAddress: connectedAddress,
        signature,
        timestamp,
        srcTxHash,
      });
    },
    [connectedAddress, signMessageAsync],
  );

  const sendEvmTransaction = useCallback(
    async (tx: any, chainId: number) => {
      if (!connectedAddress) {
        throw new Error("Wallet not connected.");
      }

      await ensureChain(chainId);

      return sendTransaction(config, {
        account: connectedAddress,
        chainId: chainId as any,
        to: tx.to as Address,
        data: (tx.data ?? tx.calldata ?? "0x") as `0x${string}`,
        value: BigInt(tx.value ?? "0"),
        ...(tx.gas !== undefined && tx.gas !== null
          ? { gas: BigInt(tx.gas) }
          : tx.gasLimit !== undefined && tx.gasLimit !== null
            ? { gas: BigInt(tx.gasLimit) }
            : {}),
      });
    },
    [connectedAddress, ensureChain],
  );

  const executeLayerZeroIntent = useCallback(
    async (intentId: string, integration: any, sourceChainId: number) => {
      if (!connectedAddress) {
        throw new Error("Wallet not connected.");
      }

      const action = integration?.action ?? integration;
      let steps = action?.userSteps ?? [];

      if (action?.requiresFreshUserSteps) {
        const refreshed = await crossApi.rebuildLayerZeroUserSteps(intentId);
        steps = mergeLayerZeroUserSteps(integration, refreshed)?.action?.userSteps ?? steps;
      }

      const signatures: string[] = [];
      let sourceTxHash: string | undefined;

      // LayerZero provider-direct flows return wallet steps, not one uniform
      // transaction. Preserve signature steps separately from lifecycle
      // submitted/cancel/refund signatures.
      for (const step of steps) {
        const tx = getLayerZeroStepTx(step);
        if (tx?.to) {
          sourceTxHash = await sendEvmTransaction(tx, sourceChainId);
          continue;
        }

        const message = getLayerZeroStepMessage(step);
        if (typeof message === "string") {
          signatures.push(await signMessageAsync({ account: connectedAddress, message }));
          continue;
        }

        throw new Error("Unsupported LayerZero step for the current wallet capability.");
      }

      if (action?.submitSignatureRequired) {
        await crossApi.submitLayerZeroSignatures(intentId, { signatures });
      }

      if (!sourceTxHash) {
        throw new Error("LayerZero execution did not produce a source transaction.");
      }

      await crossApi.markLayerZeroSubmitted(intentId, {
        userAddress: connectedAddress,
        sourceTxHash,
      });

      return sourceTxHash;
    },
    [connectedAddress, sendEvmTransaction, signMessageAsync],
  );

  const executeIntent = useCallback(
    async (intentId: string, integration: any, sourceChainId: number) => {
      if (integration?.mode === "router_intent") {
        const txHash = await sendEvmTransaction(
          toSendTransactionArgs(integration.integration ?? integration),
          sourceChainId,
        );
        await submitStandardIntent(intentId, txHash);
        return txHash;
      }

      if (integration?.mode === "provider_direct") {
        const classification = classifyProviderDirectAction(integration);
        const actionKind = integration?.action?.kind;

        if (classification === "layerzero_steps") {
          return executeLayerZeroIntent(intentId, integration, sourceChainId);
        }

        if (classification === "evm_tx") {
          const tx = getProviderDirectTx(integration);
          const txHash = await sendEvmTransaction(tx, sourceChainId);
          if (actionKind === "layerzero_value_transfer_api") {
            await crossApi.markLayerZeroSubmitted(intentId, {
              userAddress: connectedAddress,
              sourceTxHash: txHash,
            });
          } else {
            await submitStandardIntent(intentId, txHash);
          }
          return txHash;
        }

        throw new Error("This route requires a non-EVM source wallet. V2 currently supports EVM source execution only.");
      }

      throw new Error("Unsupported integration mode returned by the API.");
    },
    [connectedAddress, executeLayerZeroIntent, sendEvmTransaction, submitStandardIntent],
  );

  const prepareSingleExecution = useCallback(async (options?: {
    offerOverride?: any;
    quoteOverride?: any;
  }) => {
    const quoteForSelection = options?.quoteOverride ?? effectiveQuote;
    const offerForSelection = options?.offerOverride ?? selectedOffer;

    if (!connectedAddress || !offerForSelection || !quoteForSelection) {
      return null;
    }

    // Selection creates a backend intent but does not submit user funds. The
    // lifecycle tab owns the subsequent wallet execution step.
    const response = await execution.selectSingleIntent({
      offerSetId: quoteForSelection.offerSetId,
      offerId: offerForSelection.offerId,
      userAddress: connectedAddress,
    }) as any;

    let nextIntegration = response.integration;
    const action = nextIntegration?.action ?? nextIntegration;

    if (
      nextIntegration?.mode === "provider_direct" &&
      action?.kind === "layerzero_value_transfer_api" &&
      action?.requiresFreshUserSteps
    ) {
      const refreshed = await crossApi.rebuildLayerZeroUserSteps(response.intentId);
      nextIntegration = mergeLayerZeroUserSteps(nextIntegration, refreshed);
    }

    const nextSession = {
      mode: "single",
      intentId: response.intentId,
      selectedOfferId: offerForSelection.offerId,
      offerSetId: quoteForSelection.offerSetId,
      quote: response.quote,
      integration: nextIntegration,
      status: "SELECTED",
      sourceChainId: response.quote?.srcChainId ?? offerForSelection.srcChainId,
      lastError: null,
    };

    setSession(nextSession);
    return nextSession;
  }, [connectedAddress, effectiveQuote, execution, selectedOffer]);

  const handlePrepareExecution = useCallback(async () => {
    if (!connectedAddress || !selectedOffer || !effectiveQuote) {
      return;
    }

    try {
      if (gasDropOnDestination && selectedGasOfferId) {
        // Gas.zip destination gas is a composed route: primary bridge leg plus
        // an independent gas-drop leg, each with its own intent lifecycle.
        const response = await execution.selectComposedIntent({
          offerSetId: effectiveQuote.offerSetId,
          primaryTransferOfferId: selectedOffer.offerId,
          gasZipDestinationGasOfferId: selectedGasOfferId,
          userAddress: connectedAddress,
        }) as any;

        setSession({
          mode: "composed",
          composedIntentId: response.composedIntentId,
          offerSetId: effectiveQuote.offerSetId,
          selectedOfferId: selectedOffer.offerId,
          selectedGasOfferId,
          status: response.status,
          primaryTransfer: response.primaryTransfer,
          gasZipDestinationGas: response.gasZipDestinationGas,
          composedIds: {
            primary: response.primaryTransfer?.intentId,
            gas: response.gasZipDestinationGas?.intentId,
          },
          lastError: null,
        });
        toast.info("Composed route selected. Execute each leg to continue.");
      } else {
        await prepareSingleExecution();
        toast.info("Route selected. Review execution details below.");
      }

      setShowConfirm(false);
      setSidePanel("lifecycle");
    } catch (error: any) {
      toast.error(mapCrossApiError(error));
    }
  }, [
    connectedAddress,
    effectiveQuote,
    execution,
    gasDropOnDestination,
    prepareSingleExecution,
    selectedGasOfferId,
    selectedOffer,
  ]);

  const handleExecuteSingle = useCallback(async () => {
    if (!session || session.mode !== "single") return;

    if (isRouterIntentExpired(session.integration)) {
      setSession(null);
      toast.error("Prepared route expired. Prepare execution again.");
      return;
    }

    try {
      setIsExecuting(true);
      const txHash = await executeIntent(
        session.intentId,
        session.integration,
        session.sourceChainId ?? session.quote?.srcChainId ?? fromChainId,
      );
      setSession((current: any) => ({
        ...current,
        lastTxHash: txHash,
        status: "SUBMITTED",
        lastError: null,
      }));
      toast.success("Source transaction submitted.");
    } catch (error: any) {
      const message = mapCrossApiError(error);
      setSession((current: any) =>
        current ? { ...current, lastError: message } : current,
      );
      toast.error(message);
    } finally {
      setIsExecuting(false);
    }
  }, [executeIntent, fromChainId, session]);

  const handleApproveSingle = useCallback(async () => {
    if (!connectedAddress || !singleApprovalRequest || !selectedOffer) return;

    try {
      setIsApproving(true);
      await ensureChain(singleApprovalRequest.chainId);

      const hash = await (writeContract as any)(config, {
        account: connectedAddress,
        chainId: singleApprovalRequest.chainId as any,
        address: singleApprovalRequest.tokenAddress as Address,
        abi: erc20Abi,
        functionName: "approve",
        args: [
          singleApprovalRequest.spender as Address,
          singleApprovalRequest.amount,
        ],
      });

      toast.info("Approval transaction sent. Waiting for confirmation...");

      await waitForTransactionReceipt(config, {
        hash,
        chainId: singleApprovalRequest.chainId as any,
      });

      const refreshedQuote = (await quote.refetch()).data;
      if (!refreshedQuote) {
        throw new Error("Unable to refresh the route quote after approval.");
      }

      const refreshedOffer = findMatchingRefreshedOffer(
        refreshedQuote,
        selectedOffer,
      );
      if (!refreshedOffer) {
        setSession(null);
        setSelectedOfferId(
          refreshedQuote.bestOfferId ??
            refreshedQuote.offers?.[0]?.offerId ??
            null,
        );
        toast.info("Approved route changed while waiting for confirmation. Review the refreshed quote and prepare execution again.");
        return;
      }

      setHasRequiredApproval(true);
      setSelectedOfferId(refreshedOffer.offerId);
      await prepareSingleExecution({
        quoteOverride: refreshedQuote,
        offerOverride: refreshedOffer,
      });
      toast.success("Token approved. Route refreshed.");
    } catch (error: any) {
      const message = mapCrossApiError(error);
      setSession((current: any) =>
        current ? { ...current, lastError: message } : current,
      );
      toast.error(message);
    } finally {
      setIsApproving(false);
    }
  }, [
    connectedAddress,
    ensureChain,
    prepareSingleExecution,
    quote,
    selectedOffer,
    singleApprovalRequest,
  ]);

  const handleExecuteComposedLeg = useCallback(
    async (leg: "primary" | "gas") => {
      if (!session || session.mode !== "composed") return;

      const legPayload =
        leg === "primary"
          ? session.primaryTransfer
          : session.gasZipDestinationGas;

      if (!legPayload?.intentId || !legPayload?.integration) {
        toast.error("Selected composed leg is missing execution details.");
        return;
      }

      try {
        setIsExecuting(true);
        const txHash = await executeIntent(
          legPayload.intentId,
          legPayload.integration,
          legPayload.quote?.srcChainId ?? fromChainId,
        );

        setSession((current: any) => ({
          ...current,
          [leg === "primary" ? "primaryTransfer" : "gasZipDestinationGas"]: {
            ...legPayload,
            lastTxHash: txHash,
          },
          lastError: null,
        }));
        toast.success(
          leg === "primary"
            ? "Primary transfer submitted."
            : "Destination gas leg submitted.",
        );
      } catch (error: any) {
        const message = mapCrossApiError(error);
        setSession((current: any) =>
          current ? { ...current, lastError: message } : current,
        );
        toast.error(message);
      } finally {
        setIsExecuting(false);
      }
    },
    [executeIntent, fromChainId, session],
  );

  const handleCancel = useCallback(async () => {
    if (!session || session.mode !== "single" || !connectedAddress) return;

    const reason = window.prompt("Cancellation reason", "User requested cancel");
    if (!reason) return;

    try {
      const timestamp = Date.now();
      const message = buildCancelMessage({
        intentId: session.intentId,
        wallet: connectedAddress,
        timestamp,
        reason,
      });
      const signature = await signMessageAsync({ account: connectedAddress, message });

      await recovery.cancel.mutateAsync({
        userAddress: connectedAddress,
        signature,
        timestamp,
        reason,
        replacementTxHash: "",
      });
      toast.success("Cancellation request submitted.");
    } catch (error: any) {
      toast.error(mapCrossApiError(error));
    }
  }, [connectedAddress, recovery.cancel, session, signMessageAsync]);

  const handleRefund = useCallback(async () => {
    if (!session || session.mode !== "single" || !connectedAddress) return;

    const reason = window.prompt("Refund reason", "Bridge appears stuck");
    if (!reason) return;

    try {
      const timestamp = Date.now();
      const message = buildRefundMessage({
        intentId: session.intentId,
        wallet: connectedAddress,
        timestamp,
        reason,
      });
      const signature = await signMessageAsync({ account: connectedAddress, message });

      await recovery.refund.mutateAsync({
        userAddress: connectedAddress,
        signature,
        timestamp,
        reason,
      });
      toast.success("Refund request submitted.");
    } catch (error: any) {
      toast.error(mapCrossApiError(error));
    }
  }, [connectedAddress, recovery.refund, session, signMessageAsync]);

  const singleRouterValue =
    session?.mode === "single" && session.integration?.mode === "router_intent"
      ? toSendTransactionArgs(session.integration.integration ?? session.integration).value
      : 0n;
  const hasRouterNativeValueRequirement = singleRouterValue > 0n;
  const hasSufficientRouterNativeValue =
    !hasRouterNativeValueRequirement ||
    (sourceNativeBalance?.value ?? 0n) >= singleRouterValue;
  const singleRouteNeedsApproval =
    Boolean(singleApprovalRequest) && !hasRequiredApproval;
  const singleExecutionBlockedForNativeValue =
    !singleRouteNeedsApproval && !hasSufficientRouterNativeValue;
  const singleExecutionHint =
    hasRouterNativeValueRequirement && session?.mode === "single"
      ? hasSufficientRouterNativeValue
        ? `This route requires ${formatUnits(singleRouterValue, 18)} native gas value on the source chain in addition to transaction gas.`
        : `This route requires ${formatUnits(singleRouterValue, 18)} native gas value on the source chain. Your wallet balance appears too low for execution.`
      : null;
  const singleActionLabel =
    session?.mode === "single"
      ? isCheckingApproval
        ? "Checking Approval..."
        : isApproving
          ? "Approving..."
          : singleRouteNeedsApproval
            ? "Approve Token"
            : singleExecutionBlockedForNativeValue
              ? "Insufficient Native Value"
              : "Execute Route"
      : undefined;
  const singleActionDisabled =
    isCheckingApproval || isApproving || singleExecutionBlockedForNativeValue;
  const handleSingleAction =
    singleRouteNeedsApproval ? handleApproveSingle : handleExecuteSingle;

  useEffect(() => {
    const status =
      trackingData?.status ??
      trackingData?.primaryTransfer?.status ??
      trackingData?.primary?.status ??
      session?.status;
    const delivered = Boolean(
      trackingData?.dstTxHash ||
        trackingData?.destinationTxHash ||
        status === "DELIVERED" ||
        status === "COMPLETED",
    );
    const intentKey =
      session?.mode === "single"
        ? session.intentId
        : session?.composedIntentId ?? session?.composedIds?.primary;

    // Open success only once the backend tracking stream reports destination
    // delivery/completion. Source submission alone is not a completed cross.
    if (delivered && intentKey && shownSuccessIntentId !== intentKey) {
      setShownSuccessIntentId(intentKey);
      setShowSuccess(true);
    }
  }, [shownSuccessIntentId, session, trackingData]);

  const navLinks = createV2NavLinks("cross");

  // ─── Render ──────────────────────────────────────────────────────────────
  return (
    <div style={{ minHeight: "100vh", background: "#05050c", color: "#fff", fontFamily: "Inter, sans-serif" }}>
      <DappNavbar
        links={navLinks}
        socials={<SocialTray links={EMPX_SOCIALS} withSeparator />}
        controls={
          <>
            <NetworkSelector
              name={walletState.status === "connected" ? walletState.chain.name : fromChain.name}
              color={walletState.status === "connected" ? walletState.chain.color : fromChain.color}
              onClick={() => setChainPickerTarget("from")}
            />
            <WalletButton
              connected={walletState.status === "connected"}
              address={walletState.status === "connected" ? walletState.address : undefined}
              balanceUSD={walletState.status === "connected" ? connectedBalance.nativeBalanceUSD ?? undefined : undefined}
              onConnect={() => setShowWalletModal(true)}
              onClick={() => setShowAccountModal(true)}
            />
          </>
        }
      />

      <main style={{ maxWidth: 1180, margin: "0 auto", padding: isMobile ? "24px 16px 56px" : "32px 24px 72px" }}>
        <header style={{ marginBottom: isMobile ? 18 : 24 }}>
          <p style={{ margin: 0, fontSize: 10, letterSpacing: "0.40em", color: "#FF8A00", textTransform: "uppercase", fontWeight: 700 }}>
            CROSS-CHAIN · {RAILS.length} RAILS
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
            Cross.{" "}
            <span
              style={{
                fontFamily: "'Instrument Serif', serif",
                fontStyle: "italic",
                color: "#FF8A00",
                letterSpacing: "-0.02em",
              }}
            >
              Every chain, every rail.
            </span>
          </h1>
        </header>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: isMobile ? "1fr" : "minmax(0, 1.4fr) minmax(0, 1fr)",
            gap: isMobile ? 18 : 28,
            alignItems: "start",
          }}
        >
          {/* LEFT — cross widget */}
          <div style={{ display: "flex", justifyContent: "center" }}>
            <EmpxCrossWidget
              fromChain={fromChain}
              fromToken={{ ticker: fromTicker }}
              fromAmount={fromAmount}
              fromBalance={fromBalanceLabel}
              fromUsdValue={Number(fromAmount.replace(/,/g, "")) * priceOf(fromTicker, fromChainId)}
              onFromAmountChange={setFromAmount}
              onSelectFromToken={() => setTokenPickerTarget("from")}
              onSelectFromChain={() => setChainPickerTarget("from")}
              onPercentClick={(pct) => setFromAmount(String((fromBalanceNumeric * pct) / 100))}

              toChain={toChain}
              toToken={{ ticker: toTicker }}
              toAmount={toAmountDisplay}
              toUsdValue={toUsdValue}
              onSelectToToken={() => setTokenPickerTarget("to")}
              onSelectToChain={() => setChainPickerTarget("to")}

              railName={selectedOfferDisplay?.railName}
              railBadge={selectedOffer?.railVariant ?? selectedOffer?.executionMode ?? selectedOffer?.deliveryShape}
              protocolFeeBps={selectedOffer?.economics?.protocolFeeBps ?? selectedOffer?.fees?.protocolFeeBps}
              protocolFeeUSD={selectedOfferDisplay?.protocolFeeUSD}
              bridgeFeeUSD={selectedOfferDisplay?.bridgeFeeUSD}
              estimatedTime={selectedOfferDisplay?.estimatedTimeSeconds ? formatEtaSeconds(selectedOfferDisplay.estimatedTimeSeconds) : undefined}
              minimumReceived={selectedOfferDisplay ? `${selectedOfferDisplay.minimumReceived} ${toTicker}` : undefined}
              slippageBps={30}
              routeHops={routeHops}

              walletConnected={walletState.status === "connected"}
              onConnect={() => setShowWalletModal(true)}
              onSwap={onSwap}
              onFlip={flip}
              swapDisabled={!selectedOffer || quote.isFetching || execution.isSelecting}
              swapLoading={quote.isFetching || execution.isSelecting}
              swapLabel={
                walletState.status !== "connected"
                  ? "Connect wallet"
                  : quote.isFetching
                    ? "Fetching route..."
                    : selectedOffer
                      ? "Review route"
                      : quoteErrorMessage ?? "No route"
              }
            />
          </div>

          {/* RIGHT — context panel */}
          <aside style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {walletState.status === "connected" && (
              <Card style={{ padding: 14 }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10 }}>
                  <QuoteCountdown
                    totalMs={30000}
                    issuedAt={quoteIssuedAt}
                    onRefresh={() => {
                      setQuoteIssuedAt(Date.now());
                      void quote.refetch();
                      toast.info("Quote refreshed");
                    }}
                    compact
                  />
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <Pill variant="info">{quoteUiState.summary}</Pill>
                    {selectedOfferId && selectedOfferId !== effectiveQuote?.bestOfferId && <Pill variant="accent">User-selected</Pill>}
                  </div>
                </div>
              </Card>
            )}

            <Card style={{ padding: 18, paddingBottom: 14 }}>
              <p style={{ margin: "0 0 12px", fontSize: 10, letterSpacing: "0.40em", color: "rgba(255,255,255,0.40)", textTransform: "uppercase", fontWeight: 700 }}>
                Rail intelligence
              </p>
              <Tabs
                options={[
                  { value: "offers" as const,    label: "Live offers", count: offerEntries.length },
                  { value: "settings" as const,  label: "Gas" },
                  { value: "rails" as const,     label: "Rail guide", count: RAILS.length },
                  { value: "lifecycle" as const, label: "Lifecycle" },
                ]}
                active={sidePanel}
                onChange={(value) => setSidePanel(value as SidePanelTab)}
                variant="pill"
              />
              <div style={{ marginTop: 14 }}>
                {sidePanel === "offers"   && (
                  <OffersList
                    offers={offerEntries}
                    bestOfferId={effectiveQuote?.bestOfferId}
                    selectedOfferId={selectedOffer?.offerId ?? selectedOfferId}
                    isLoading={quote.isFetching}
                    error={quoteErrorMessage}
                    emptyMessage={quoteUiState.emptyMessage}
                    onSelectOffer={(offerId) => {
                      setSelectedOfferId((cur) => (cur === offerId ? effectiveQuote?.bestOfferId ?? null : offerId));
                      toast.info(selectedOfferId === offerId ? "Reverted to best route" : "Selected route");
                    }}
                    toTicker={toTicker}
                  />
                )}
                {sidePanel === "settings" && (
                  <GasSettings
                    gasDropOnDestination={gasDropOnDestination}
                    setGasDropOnDestination={setGasDropOnDestination}
                    gasDropAvailable={gasDropAvailable}
                    destinationName={toChain.name}
                    destinationNative={toChain.ticker}
                    gasDropUSD={GAS_DROP_USD}
                  />
                )}
                {sidePanel === "rails"     && <RailsCatalog />}
                {sidePanel === "lifecycle" && (
                  <LifecycleStatus
                    session={session}
                    tracking={trackingData}
                    isExecuting={isExecuting}
                    isCancelling={recovery.cancel.isPending}
                    isRefunding={recovery.refund.isPending}
                    onExecuteSingle={handleSingleAction}
                    onExecutePrimary={() => handleExecuteComposedLeg("primary")}
                    onExecuteGas={() => handleExecuteComposedLeg("gas")}
                    onCancel={handleCancel}
                    onRefund={handleRefund}
                    onClearSession={() => setSession(null)}
                    singleActionLabel={singleActionLabel}
                    singleActionDisabled={singleActionDisabled}
                    singleExecutionHint={singleExecutionHint}
                    singleExecutionError={session?.lastError ?? null}
                  />
                )}
              </div>
            </Card>
          </aside>
        </div>
      </main>

      {/* Overlays — modal scopes to the source chain's kind when non-EVM,
           so picking BTC source surfaces Unisat/Phantom-BTC, not MetaMask. */}
      <WalletModal
        open={showWalletModal}
        onClose={() => setShowWalletModal(false)}
        wallets={walletOptions}
        kindFilter={(() => {
          const k = fromChain.kind ?? "EVM";
          if (k === "BTC") return "bitcoin";
          if (k === "SOL") return "solana";
          return undefined; // EVM / OTHER → show full modal (no scope)
        })()}
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
          mode="cross"
          onSelect={(c) => {
            if (chainPickerTarget === "from") {
              setFromChainId(c.id);
              const newFromTier = tierForChainId(c.id);
              // Reset source ticker to a safe default on new tier
              if (newFromTier === 3) {
                const native = configTokensForChain(c.id).find((t) => t.category === "native");
                if (native) setFromTicker(native.ticker);
              }
            } else {
              setToChainId(c.id);
              setToTicker(defaultSettlementTicker(c.id));
            }
            setSelectedOfferId(null);
            setChainPickerTarget(null);
            toast.info(`${chainPickerTarget === "from" ? "Source" : "Destination"} → ${c.name}`);
          }}
        />
      )}

      {tokenPickerTarget && tokenPickerData && (
        <TokenPicker
          open={!!tokenPickerTarget}
          onClose={() => setTokenPickerTarget(null)}
          tokens={tokenPickerData.tokens}
          recent={tokenPickerData.tokens.slice(0, Math.min(4, tokenPickerData.tokens.length))}
          restrictedReason={tokenPickerData.restrictedReason}
          onSelect={(t) => {
            if (tokenPickerTarget === "from") setFromTicker(t.ticker);
            else setToTicker(t.ticker);
            setSelectedOfferId(null);
            setTokenPickerTarget(null);
          }}
        />
      )}

      <ConfirmTradeModal
        open={showConfirm}
        onClose={() => setShowConfirm(false)}
        onConfirm={handlePrepareExecution}
        eyebrow="REVIEW · CROSS-CHAIN"
        title="Confirm trade"
        fromTicker={fromTicker}
        fromAmount={fromAmount}
        fromChainName={fromChain.name}
        toTicker={toTicker}
        toAmount={toAmountDisplay}
        toChainName={toChain.name}
        routeHops={routeHops}
        feeRows={
          selectedOfferDisplay
            ? [
                { label: "Via rail",      value: selectedOfferDisplay.railName },
                { label: "Execution",     value: selectedOffer?.executionMode ?? selectedOffer?.deliveryShape ?? "Route" },
                { label: "Protocol fee",  value: `$${selectedOfferDisplay.protocolFeeUSD.toFixed(2)}`, accent: true },
                { label: "Bridge fee",    value: selectedOfferDisplay.bridgeFeeUSD <= 0.005 ? "FREE" : `$${selectedOfferDisplay.bridgeFeeUSD.toFixed(2)}` },
                ...(gasDropOnDestination ? [{ label: "Gas drop", value: `+$${GAS_DROP_USD.toFixed(2)} ${toChain.ticker}` }] : []),
                ...(selectedOfferDisplay.estimatedTimeSeconds ? [{ label: "Est. time", value: formatEtaSeconds(selectedOfferDisplay.estimatedTimeSeconds) }] : []),
                { label: "Minimum received", value: `${selectedOfferDisplay.minimumReceived} ${toTicker}`, muted: true },
              ]
            : []
        }
        quoteIssuedAt={quoteIssuedAt}
        quoteValidMs={30000}
        onRefreshQuote={() => {
          setQuoteIssuedAt(Date.now());
          void quote.refetch();
        }}
        warning={
          selectedOffer?.executionMode === "provider_direct"
            ? "Provider-direct routes may require wallet-specific transaction steps. Review the lifecycle tab after route selection."
            : undefined
        }
      />

      <TradeSuccessModal
        open={showSuccess}
        onClose={() => setShowSuccess(false)}
        kind="CROSS-CHAIN"
        fromTicker={fromTicker}
        fromAmount={fromAmount}
        fromChainName={fromChain.name}
        toTicker={toTicker}
        toAmount={toAmountDisplay}
        toChainName={toChain.name}
        message={`${toTicker} delivery tracked on ${toChain.name}`}
        timeline={buildCrossTimeline(trackingData, session, fromChain.name, toChain.name, toTicker)}
        txHashes={[
          ...(sourceTxHash
            ? [{
                label: "Source tx",
                hashShort: shortHash(sourceTxHash),
                url: getExplorerTxUrl(fromChainId, sourceTxHash) ?? undefined,
              }]
            : []),
          ...(destinationTxHash
            ? [{
                label: "Destination tx",
                hashShort: shortHash(destinationTxHash),
                url: getExplorerTxUrl(toChainId, destinationTxHash) ?? undefined,
              }]
            : []),
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
          chainName={walletState.chain.name}
          chainColor={walletState.chain.color}
          balanceUSD={connectedBalance.nativeBalanceUSD ?? undefined}
          nativeBalance={connectedBalance.nativeBalance}
          nativeTicker={connectedBalance.nativeTicker}
          explorerUrl={getExplorerAddressUrl(fromChainId, walletState.address) ?? undefined}
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

// ─── Offers list — user-selectable ────────────────────────────────────────

type CrossOfferEntry = CrossV2OfferDisplay & {
  rawOffer: any;
  railBadge?: string;
  executionMode?: string;
  deliveryShape?: string;
};

function OffersList({
  offers,
  bestOfferId,
  selectedOfferId,
  onSelectOffer,
  toTicker,
  isLoading,
  error,
  emptyMessage,
}: {
  offers: CrossOfferEntry[];
  bestOfferId?: string;
  selectedOfferId: string | null;
  onSelectOffer: (offerId: string) => void;
  toTicker: string;
  isLoading?: boolean;
  error?: string | null;
  emptyMessage: string;
}) {
  if (isLoading && offers.length === 0) {
    return (
      <p style={{ margin: 0, padding: "16px 4px", fontSize: 12, color: "rgba(255,255,255,0.50)", textAlign: "center", lineHeight: 1.55 }}>
        {emptyMessage}
      </p>
    );
  }

  if (error && offers.length === 0) {
    return (
      <p style={{ margin: 0, padding: "16px 4px", fontSize: 12, color: "rgba(248,113,113,0.85)", textAlign: "center", lineHeight: 1.55 }}>
        {error}
      </p>
    );
  }

  if (offers.length === 0) {
    return (
      <p style={{ margin: 0, padding: "16px 4px", fontSize: 12, color: "rgba(255,255,255,0.50)", textAlign: "center", lineHeight: 1.55 }}>
        {emptyMessage}
      </p>
    );
  }
  return (
    <>
      <p style={{ margin: "0 0 10px", fontSize: 10.5, color: "rgba(255,255,255,0.40)", lineHeight: 1.45 }}>
        Tap a route to select it. Tap again to revert to the backend best route.
      </p>
      <div style={{ display: "flex", flexDirection: "column", gap: 1, maxHeight: 320, overflowY: "auto" }}>
        {offers.map((o, idx) => {
          const isBest = o.offerId === bestOfferId || o.isBest;
          const isSelected = o.offerId === selectedOfferId;
          const isActive = isSelected || (!selectedOfferId && isBest);
          const tag = isSelected && !isBest ? "SELECTED" : isBest ? "BEST" : o.railBadge;
          const tagAccent = isSelected || isBest;
          const modeColor = o.executionMode === "provider_direct" ? "#93C5FD" : "#FFB347";
          return (
            <button
              key={o.offerId}
              type="button"
              onClick={() => onSelectOffer(o.offerId)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "10px 12px",
                width: "100%",
                textAlign: "left",
                cursor: "pointer",
                background: isActive ? "rgba(255,138,0,0.06)" : "transparent",
                border: "none",
                borderLeft: `2px solid ${isActive ? "#FF8A00" : "transparent"}`,
                borderRadius: 0,
                borderTop: idx === 0 ? "none" : "1px solid rgba(255,255,255,0.04)",
                color: "#fff",
                transition: "background 140ms ease, border-color 140ms ease",
              }}
              onMouseEnter={(e) => {
                if (!isActive) e.currentTarget.style.background = "rgba(255,255,255,0.025)";
              }}
              onMouseLeave={(e) => {
                if (!isActive) e.currentTarget.style.background = "transparent";
              }}
            >
              {/* Tiny mode dot — replaces the chunky "Mode A/B" pill */}
              <span
                aria-hidden
                title={o.executionMode ?? "route"}
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: "50%",
                  background: modeColor,
                  boxShadow: `0 0 6px ${modeColor}`,
                  flexShrink: 0,
                }}
              />

              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={{ fontSize: 12.5, fontWeight: 600, color: isActive ? "#fff" : "rgba(255,255,255,0.92)" }}>
                    {o.railName}
                  </span>
                  {tag && (
                    <span
                      style={{
                        fontSize: 8.5,
                        fontWeight: 700,
                        letterSpacing: "0.20em",
                        padding: "1px 5px",
                        borderRadius: 2,
                        color: tagAccent ? "#FF8A00" : "rgba(255,255,255,0.55)",
                        background: tagAccent ? "rgba(255,138,0,0.10)" : "rgba(255,255,255,0.05)",
                        border: `1px solid ${tagAccent ? "rgba(255,138,0,0.30)" : "rgba(255,255,255,0.08)"}`,
                      }}
                    >
                      {tag}
                    </span>
                  )}
                </div>
                <p
                  style={{
                    margin: "2px 0 0",
                    fontSize: 10.5,
                    color: "rgba(255,255,255,0.40)",
                    fontFamily: "'Space Grotesk', sans-serif",
                    letterSpacing: "-0.005em",
                  }}
                  title={o.offerId}
                >
                  {o.executionMode ?? "route"} · {o.estimatedTimeSeconds ? formatEtaSeconds(o.estimatedTimeSeconds) : "ETA pending"} · ${o.totalFeeUSD.toFixed(2)}
                </p>
              </div>

              <div style={{ textAlign: "right", flexShrink: 0 }}>
                <p
                  style={{
                    margin: 0,
                    fontFamily: "'Space Grotesk', sans-serif",
                    fontSize: 13,
                    fontWeight: 500,
                    color: isActive ? "#FF8A00" : "rgba(255,255,255,0.90)",
                    letterSpacing: "-0.01em",
                    lineHeight: 1.2,
                  }}
                >
                  {o.outputAmount}
                </p>
                <p style={{ margin: "1px 0 0", fontSize: 10, color: "rgba(255,255,255,0.40)" }}>
                  {toTicker} · min {o.minimumReceived}
                </p>
              </div>
            </button>
          );
        })}
      </div>
    </>
  );
}

// ─── Gas settings tab ─────────────────────────────────────────────────────

function GasSettings({
  gasDropOnDestination, setGasDropOnDestination, gasDropAvailable,
  destinationName, destinationNative, gasDropUSD,
}: {
  gasDropOnDestination: boolean;
  setGasDropOnDestination: (v: boolean) => void;
  gasDropAvailable: boolean;
  destinationName: string;
  destinationNative: string;
  gasDropUSD: number;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <GasToggle
        title="Gasless source"
        hint="Paymaster execution is temporarily unavailable in this interface."
        enabled={false}
        disabled
        tag="EIP-4337"
      />
      <GasToggle
        title="Drop destination gas"
        hint={
          gasDropAvailable
            ? `Arrive on ${destinationName} with ~$${gasDropUSD.toFixed(2)} of ${destinationNative} so you can transact immediately. Routed via Gas.zip side-leg.`
            : `Gas.zip doesn't support ${destinationName} as a destination.`
        }
        enabled={gasDropOnDestination}
        disabled={!gasDropAvailable}
        onToggle={() => setGasDropOnDestination(!gasDropOnDestination)}
        tag="GAS.ZIP"
      />
    </div>
  );
}

function GasToggle({
  title, hint, enabled, disabled, onToggle, tag,
}: {
  title: string;
  hint: string;
  enabled: boolean;
  disabled?: boolean;
  onToggle?: () => void;
  tag?: string;
}) {
  return (
    <div
      style={{
        display: "flex",
        gap: 12,
        padding: "12px 12px",
        background: disabled ? "rgba(255,255,255,0.015)" : "rgba(255,255,255,0.03)",
        border: `1px solid ${enabled ? "rgba(255,138,0,0.30)" : "rgba(255,255,255,0.06)"}`,
        borderRadius: 4,
        opacity: disabled ? 0.55 : 1,
      }}
    >
      <div style={{ flex: 1 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <p style={{ margin: 0, fontSize: 12.5, fontWeight: 600, color: "#fff" }}>{title}</p>
          {tag && (
            <span
              style={{
                fontSize: 8.5,
                fontWeight: 700,
                letterSpacing: "0.20em",
                padding: "1px 5px",
                borderRadius: 2,
                color: "rgba(255,255,255,0.55)",
                background: "rgba(255,255,255,0.05)",
                border: "1px solid rgba(255,255,255,0.10)",
              }}
            >
              {tag}
            </span>
          )}
          {disabled && (
            <span
              style={{
                fontSize: 8.5,
                fontWeight: 700,
                letterSpacing: "0.18em",
                padding: "1px 5px",
                borderRadius: 2,
                color: "#A78BFA",
                background: "rgba(139,92,246,0.10)",
                border: "1px solid rgba(139,92,246,0.25)",
              }}
            >
              N/A HERE
            </span>
          )}
        </div>
        <p style={{ margin: "4px 0 0", fontSize: 11, color: "rgba(255,255,255,0.55)", lineHeight: 1.5 }}>
          {hint}
        </p>
      </div>
      <button
        type="button"
        onClick={disabled ? undefined : onToggle}
        disabled={disabled}
        aria-pressed={enabled}
        style={{
          width: 34,
          height: 20,
          flexShrink: 0,
          alignSelf: "center",
          position: "relative",
          background: enabled ? "#FF8A00" : "rgba(255,255,255,0.10)",
          border: "1px solid " + (enabled ? "rgba(255,138,0,0.60)" : "rgba(255,255,255,0.15)"),
          borderRadius: 999,
          cursor: disabled ? "not-allowed" : "pointer",
          transition: "all 180ms ease",
          padding: 0,
        }}
      >
        <span
          style={{
            position: "absolute",
            top: 1.5,
            left: enabled ? 15 : 1.5,
            width: 15,
            height: 15,
            background: "#fff",
            borderRadius: "50%",
            transition: "left 180ms ease",
            boxShadow: "0 1px 3px rgba(0,0,0,0.30)",
          }}
        />
      </button>
    </div>
  );
}

// ─── Rails catalog (read-only) ────────────────────────────────────────────

function RailsCatalog() {
  return (
    <div>
      <p style={{ margin: "0 0 10px", fontSize: 10.5, color: "rgba(255,255,255,0.45)", lineHeight: 1.5 }}>
        Reference catalog only. Live availability for the selected pair appears under Live offers.
      </p>
      <div style={{ display: "flex", flexDirection: "column", gap: 4, maxHeight: 330, overflowY: "auto", paddingRight: 4 }}>
        {RAILS.map((r) => (
          <div
            key={r.name}
            style={{
              display: "grid",
              gridTemplateColumns: "1.6fr 0.5fr 0.7fr 0.8fr",
              alignItems: "center",
              gap: 8,
              padding: "8px 10px",
              background: "rgba(255,255,255,0.02)",
              border: "1px solid rgba(255,255,255,0.04)",
              borderRadius: 4,
              fontSize: 11,
            }}
          >
            <div>
              <p style={{ margin: 0, color: "#fff", fontWeight: 600, fontSize: 12 }}>{r.name}</p>
              <p style={{ margin: "2px 0 0", color: "rgba(255,255,255,0.45)", fontSize: 10 }}>
                {r.speciality}
              </p>
            </div>
            <Pill variant={r.mode === "A" ? "accent" : "info"}>Mode {r.mode}</Pill>
            <span style={{ fontFamily: "'Space Grotesk', sans-serif", color: "#fff", letterSpacing: "-0.01em", fontWeight: 500 }}>
              {r.reliability.toFixed(1)}%
            </span>
            <span style={{ color: "rgba(255,255,255,0.55)", textAlign: "right", fontSize: 10 }} title="Baseline ETA — live quote may differ">
              {formatEtaSeconds(r.etaSecondsBaseline)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Lifecycle explainer ─────────────────────────────────────────────────

function LifecycleStatus({
  session,
  tracking,
  isExecuting,
  isCancelling,
  isRefunding,
  onExecuteSingle,
  onExecutePrimary,
  onExecuteGas,
  onCancel,
  onRefund,
  onClearSession,
  singleActionLabel,
  singleActionDisabled,
  singleExecutionHint,
  singleExecutionError,
}: {
  session: any;
  tracking: any;
  isExecuting: boolean;
  isCancelling: boolean;
  isRefunding: boolean;
  onExecuteSingle: () => void;
  onExecutePrimary: () => void;
  onExecuteGas: () => void;
  onCancel: () => void;
  onRefund: () => void;
  onClearSession: () => void;
  singleActionLabel?: string;
  singleActionDisabled?: boolean;
  singleExecutionHint?: string | null;
  singleExecutionError?: string | null;
}) {
  if (!session) return <LifecycleExplainer />;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <CrossExecutionPanel
        session={session}
        isExecuting={isExecuting}
        onExecuteSingle={onExecuteSingle}
        onExecutePrimary={onExecutePrimary}
        onExecuteGas={onExecuteGas}
        singleActionLabel={singleActionLabel}
        singleActionDisabled={singleActionDisabled}
        singleExecutionHint={singleExecutionHint}
        singleExecutionError={singleExecutionError}
      />
      <CrossTrackingPanel
        session={session}
        tracking={tracking}
        isCancelling={isCancelling}
        isRefunding={isRefunding}
        onCancel={onCancel}
        onRefund={onRefund}
      />
      <button
        type="button"
        onClick={onClearSession}
        style={{
          alignSelf: "flex-start",
          background: "transparent",
          border: "1px solid rgba(255,255,255,0.10)",
          color: "rgba(255,255,255,0.55)",
          cursor: "pointer",
          fontSize: 10,
          fontWeight: 700,
          letterSpacing: "0.22em",
          padding: "8px 10px",
          textTransform: "uppercase",
        }}
      >
        Clear session
      </button>
    </div>
  );
}

function LifecycleExplainer() {
  const steps: TradeTimelineStep[] = [
    { label: "Quote",   description: "RailSolver returns offer + economics", state: "complete" },
    { label: "Execute", description: "User signs source tx",       state: "complete" },
    { label: "Watch",   description: "Streams transitions",state: "active"  },
    { label: "Settle",  description: "SettleResult: SETTLED / STUCK / FAILED",        state: "pending" },
  ];
  return (
    <div>
      <p style={{ margin: "0 0 12px", fontSize: 11, color: "rgba(255,255,255,0.55)", lineHeight: 1.55 }}>
        Every cross-chain intent flows through the RailSolver. Stuck detection runs per-rail; failed intents return to the user's wallet via the rail's recovery flow.
      </p>
      <div style={{ display: "flex", flexDirection: "column" }}>
        {steps.map((s, i) => (
          <div key={s.label} style={{ display: "flex", gap: 10, paddingBottom: i < steps.length - 1 ? 12 : 0 }}>
            <div style={{ position: "relative", width: 12, flexShrink: 0 }}>
              <span
                aria-hidden
                style={{
                  position: "absolute",
                  top: 5,
                  left: 4,
                  width: 4,
                  height: 4,
                  borderRadius: "50%",
                  background: s.state === "complete" ? "#34D399" : s.state === "active" ? "#FF8A00" : "rgba(255,255,255,0.20)",
                  boxShadow: s.state !== "pending" ? `0 0 6px currentColor` : "none",
                }}
              />
              {i < steps.length - 1 && (
                <span
                  aria-hidden
                  style={{
                    position: "absolute",
                    top: 11,
                    left: 5.5,
                    bottom: -12,
                    width: 1,
                    background: s.state === "complete" ? "#34D399" : "rgba(255,255,255,0.08)",
                  }}
                />
              )}
            </div>
            <div style={{ flex: 1 }}>
              <p style={{ margin: 0, fontSize: 12, fontWeight: 600, color: s.state === "pending" ? "rgba(255,255,255,0.45)" : "#fff" }}>
                {s.label}
              </p>
              <p style={{ margin: "2px 0 0", fontSize: 11, color: "rgba(255,255,255,0.45)", lineHeight: 1.5 }}>
                {s.description}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
