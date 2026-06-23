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
//   • Paymaster (gasless source) deployed chains
//       → empx-cross-bridge/src/vps/services/PaymasterService.ts PIMLICO_URLS
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
//   5. Gasless-source Paymaster toggle (only on Paymaster-deployed chains).

import { useEffect, useMemo, useState } from "react";
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
  type NavLink,
  type PickerChain,
  type PickerToken,
  type RouteHop,
  type TradeTimelineStep,
  type WalletOption,
} from "../components";
import { useWalletConnection } from "../hooks/useWalletConnection";
import EmpxCrossWidget from "../EmpxCrossWidget";
import { EMPX_SOCIALS } from "./SwapPage";
import {
  AGG_CHAIN_IDS,
  PAYMASTER_CHAIN_IDS,
  RAILS,
  MODE_B_FEE_BPS,
  classifyPair,
  modeAFeeBps,
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

const CHAIN_CATALOG: ChainDef[] = [
  // T1 — aggregator-deployed EVM
  { id: 1,     name: "Ethereum",   color: "#627EEA", ticker: "ETH" },
  { id: 42161, name: "Arbitrum",   color: "#28A0F0", ticker: "ETH" },
  { id: 8453,  name: "Base",       color: "#0052FF", ticker: "ETH" },
  { id: 10,    name: "Optimism",   color: "#FF0420", ticker: "ETH" },
  { id: 137,   name: "Polygon",    color: "#7B3FE4", ticker: "POL" },
  { id: 56,    name: "BSC",        color: "#F0B90B", ticker: "BNB" },
  { id: 43114, name: "Avalanche",  color: "#E84142", ticker: "AVAX" },
  { id: 369,   name: "PulseChain", color: "#FF66C4", ticker: "PLS" },
  { id: 146,   name: "Sonic",      color: "#FE9A4D", ticker: "S" },
  { id: 1329,  name: "Sei",        color: "#9B1B30", ticker: "SEI" },
  { id: 80094, name: "Berachain",  color: "#F47834", ticker: "BERA" },
  { id: 30,    name: "Rootstock",  color: "#00B520", ticker: "RBTC" },
  { id: 143,   name: "Monad",      color: "#836EF9", ticker: "MON" },
  { id: 999,   name: "HyperEVM",   color: "#00D1AB", ticker: "HYPE" },
  { id: 10001, name: "EthereumPOW",color: "#86939B", ticker: "ETHW" },
  // T3 — non-EVM (gated to Mode B rails)
  { id: 0,     name: "Bitcoin",    color: "#F7931A", ticker: "BTC",  kind: "BTC" },
  { id: 900,   name: "Solana",     color: "#9945FF", ticker: "SOL",  kind: "SOL" },
  { id: 901,   name: "Dogecoin",   color: "#C2A633", ticker: "DOGE", kind: "OTHER" },
  { id: 902,   name: "Litecoin",   color: "#345D9D", ticker: "LTC",  kind: "OTHER" },
  { id: 903,   name: "BitcoinCash",color: "#0AC18E", ticker: "BCH",  kind: "OTHER" },
];

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

const STABLE_USDC: Token = { ticker: "USDC", name: "USD Coin",        category: "stable", badge: "VERIFIED" };
const STABLE_USDT: Token = { ticker: "USDT", name: "Tether",          category: "stable", badge: "VERIFIED" };

// T1 chains — full liquidity surface (would come from the aggregator's
// chain token registry; sample here mirrors typical top-volume entries).
const T1_TOKENS_BY_CHAIN: Record<number, Token[]> = {
  1:     [STABLE_USDC, STABLE_USDT, { ticker: "ETH",  name: "Ether",         category: "native" }, { ticker: "WBTC", name: "Wrapped BTC", category: "wrapped" }, { ticker: "DAI",  name: "Dai",     category: "stable" }, { ticker: "PEPE", name: "Pepe",  category: "other" }],
  42161: [STABLE_USDC, STABLE_USDT, { ticker: "ETH",  name: "Ether",         category: "native" }, { ticker: "ARB",  name: "Arbitrum",    category: "other"   }, { ticker: "WBTC", name: "Wrapped BTC", category: "wrapped" }, { ticker: "GMX", name: "GMX",  category: "other" }],
  8453:  [STABLE_USDC,              { ticker: "ETH",  name: "Ether",         category: "native" }, { ticker: "DEGEN", name: "Degen",      category: "other"   }, { ticker: "AERO", name: "Aerodrome",   category: "other"  }],
  10:    [STABLE_USDC, STABLE_USDT, { ticker: "ETH",  name: "Ether",         category: "native" }, { ticker: "OP",   name: "Optimism",    category: "other"   }],
  137:   [STABLE_USDC, STABLE_USDT, { ticker: "POL",  name: "Polygon Ecosystem Token", category: "native" }, { ticker: "WETH", name: "Wrapped Ether", category: "wrapped" }],
  56:    [STABLE_USDT, STABLE_USDC, { ticker: "BNB",  name: "BNB",           category: "native" }, { ticker: "CAKE", name: "PancakeSwap", category: "other"   }],
  43114: [STABLE_USDC, STABLE_USDT, { ticker: "AVAX", name: "Avalanche",     category: "native" }, { ticker: "JOE",  name: "Trader Joe",  category: "other"   }],
  369:   [STABLE_USDC,              { ticker: "PLS",  name: "Pulse",         category: "native" }, { ticker: "HEX",  name: "HEX",         category: "other"   }, { ticker: "PLSX", name: "PulseX",   category: "other"  }],
  146:   [STABLE_USDC,              { ticker: "S",    name: "Sonic",         category: "native" }],
  1329:  [STABLE_USDC,              { ticker: "SEI",  name: "Sei",           category: "native" }],
  80094: [STABLE_USDC,              { ticker: "BERA", name: "Berachain",     category: "native" }, { ticker: "HONEY", name: "Honey",      category: "stable"  }],
  30:    [                          { ticker: "RBTC", name: "Rootstock BTC", category: "native" }, { ticker: "RIF",  name: "RSK Infra",   category: "other"   }],
  143:   [STABLE_USDC,              { ticker: "MON",  name: "Monad",         category: "native" }],
  999:   [STABLE_USDC,              { ticker: "HYPE", name: "Hyperliquid",   category: "native" }],
  10001: [                          { ticker: "ETHW", name: "EthereumPOW",   category: "native" }],
  // T3 native source
  0:     [{ ticker: "BTC",  name: "Bitcoin",  category: "native" }],
  900:   [{ ticker: "SOL",  name: "Solana",   category: "native" }, STABLE_USDC],
  901:   [{ ticker: "DOGE", name: "Dogecoin", category: "native" }],
  902:   [{ ticker: "LTC",  name: "Litecoin", category: "native" }],
  903:   [{ ticker: "BCH",  name: "BitcoinCash", category: "native" }],
};

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
  const full = T1_TOKENS_BY_CHAIN[chainId] ?? [];

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

// ─── Page-level constants ─────────────────────────────────────────────────

type ChainPickerTarget = "from" | "to";
type TokenPickerTarget = "from" | "to";
type SidePanelTab = "offers" | "settings" | "rails" | "lifecycle";

// Gas-drop typical USD value per destination chain (rough — production reads
// from DestinationGasAutoFund.ts policy).
const GAS_DROP_USD = 2.5;

export default function CrossPage() {
  const isMobile = useIsMobile();

  const { walletState, walletOptions, onSelectWallet, disconnect, switchChain, currentChain } =
    useWalletConnection();
  const [showWalletModal, setShowWalletModal] = useState(false);
  const [chainPickerTarget, setChainPickerTarget] = useState<ChainPickerTarget | null>(null);
  const [tokenPickerTarget, setTokenPickerTarget] = useState<TokenPickerTarget | null>(null);
  const [showAccountModal, setShowAccountModal] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [quoteIssuedAt, setQuoteIssuedAt] = useState(Date.now());

  // Cross-chain pair state — default Arbitrum ETH → Base USDC
  const [fromChainId, setFromChainId] = useState(42161);
  const [toChainId,   setToChainId]   = useState(8453);
  const [fromTicker, setFromTicker] = useState("ETH");
  const [toTicker,   setToTicker]   = useState(defaultSettlementTicker(8453));
  const [fromAmount, setFromAmount] = useState("0.5");

  // Rail selection — null means "use best output"
  const [selectedRailName, setSelectedRailName] = useState<string | null>(null);

  // Gas settings
  const [gasDropOnDestination, setGasDropOnDestination] = useState(false);
  const [payInToken, setPayInToken] = useState(false); // Paymaster path

  const [sidePanel, setSidePanel] = useState<SidePanelTab>("offers");

  // Resolve chain defs
  const fromChain = useMemo(
    () => CHAIN_CATALOG.find((c) => c.id === fromChainId) ?? CHAIN_CATALOG[1],
    [fromChainId],
  );
  const toChain = useMemo(
    () => CHAIN_CATALOG.find((c) => c.id === toChainId) ?? CHAIN_CATALOG[2],
    [toChainId],
  );

  const fromTier: ChainTier = tierForChainId(fromChainId);
  const toTier:   ChainTier = tierForChainId(toChainId);


  // Eligible rails for the current (src, dst, destTicker) — rail/token aware
  const eligibleRails = useMemo(
    () => eligibleRailsFor(fromChainId, toChainId, toTicker),
    [fromChainId, toChainId, toTicker],
  );

  // Offers — compute output for each eligible rail
  const offers = useMemo(() => {
    const amountIn = Number(fromAmount.replace(/,/g, "")) || 0;
    const fromPrice = priceOf(fromTicker, fromChainId);
    const toPrice = priceOf(toTicker, toChainId);
    const amountInUSD = amountIn * fromPrice;
    const pairType = classifyPair(fromTicker, toTicker);

    return eligibleRails
      .map((r) => {
        const feeBps = r.mode === "A" ? modeAFeeBps(pairType) : MODE_B_FEE_BPS;
        const protocolFeeUSD = amountInUSD * (feeBps / 10_000);
        const railFeeUSD = r.baseFeeUSD;
        const gasDropFeeUSD = gasDropOnDestination ? GAS_DROP_USD : 0;
        const totalFeeUSD = protocolFeeUSD + railFeeUSD + gasDropFeeUSD;
        const outUSD = Math.max(0, amountInUSD - totalFeeUSD);
        const outAmount = toPrice > 0 ? outUSD / toPrice : 0;
        // quotedEtaSeconds is populated from RailSolver.quote().etaSeconds
        // in production.  Demo build: null → UI falls back to baseline.
        const quotedEtaSeconds: number | null = null;
        const displayEtaSeconds = quotedEtaSeconds ?? r.etaSecondsBaseline;
        return {
          rail: r,
          pairType,
          feeBps,
          protocolFeeUSD,
          railFeeUSD,
          gasDropFeeUSD,
          totalFeeUSD,
          outAmount,
          outUSD,
          quotedEtaSeconds,
          displayEtaSeconds,
          etaSource: quotedEtaSeconds != null ? ("live" as const) : ("baseline" as const),
        };
      })
      .sort((a, b) => b.outUSD - a.outUSD);
  }, [eligibleRails, fromAmount, fromTicker, toTicker, gasDropOnDestination]);

  const bestOffer = offers[0];
  const selectedOffer = useMemo(() => {
    if (!selectedRailName) return bestOffer;
    return offers.find((o) => o.rail.name === selectedRailName) ?? bestOffer;
  }, [offers, selectedRailName, bestOffer]);

  // Reset rail selection if the previously-pinned rail is no longer eligible
  useEffect(() => {
    if (selectedRailName && !offers.some((o) => o.rail.name === selectedRailName)) {
      setSelectedRailName(null);
    }
  }, [offers, selectedRailName]);

  // Reset destination ticker when destination chain tier changes
  useEffect(() => {
    if (toTier === 3) {
      // Force native L1
      const native = T1_TOKENS_BY_CHAIN[toChainId]?.find((t) => t.category === "native");
      if (native && toTicker !== native.ticker) setToTicker(native.ticker);
    } else if (toTier === 2) {
      // Force to a settlement stable if the current ticker isn't supported
      const allowed = tokensFor(toChainId, "to", eligibleRailsFor(fromChainId, toChainId, undefined)).tokens;
      if (!allowed.some((t) => t.ticker === toTicker)) {
        setToTicker(defaultSettlementTicker(toChainId));
      }
    }
  }, [toChainId, toTier, fromChainId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Paymaster eligibility — Paymaster only deployed on a subset of T1 chains
  const paymasterAvailable = PAYMASTER_CHAIN_IDS.has(fromChainId);
  useEffect(() => {
    if (!paymasterAvailable && payInToken) setPayInToken(false);
  }, [paymasterAvailable, payInToken]);

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

  // Pickers — chain & token lists with tier badging
  const chainPickerList: PickerChain[] = useMemo(() => {
    return CHAIN_CATALOG.map((c) => {
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
    const chainName = CHAIN_CATALOG.find((c) => c.id === chainId)?.name ?? "";
    const chainColor = CHAIN_CATALOG.find((c) => c.id === chainId)?.color;
    return {
      tokens: tokens.map<PickerToken>((t) => ({
        ticker: t.ticker,
        name: t.name,
        chainName,
        chainColor,
        badge: t.badge,
        // Demo balance — only on source side, only for sample tickers
        balance: role === "from" && (t.ticker === "ETH" || t.ticker === "USDC")
          ? (t.ticker === "ETH" ? "12.45" : "8,420.10")
          : undefined,
        balanceUSD: role === "from" && t.ticker === "ETH" ? 39625.20 : role === "from" && t.ticker === "USDC" ? 8420.10 : undefined,
      })),
      restrictedReason,
    };
  }, [tokenPickerTarget, fromChainId, toChainId]);

  // Demo route (uses selected offer's rail)
  const routeHops: RouteHop[] = useMemo(() => {
    if (!selectedOffer) return [];
    const settle = defaultSettlementTicker(fromChainId);
    return [
      { ticker: fromTicker, chainName: fromChain.name, chainColor: fromChain.color, via: fromTier === 1 ? "EmpX aggregator" : "Native" },
      { ticker: settle, chainName: fromChain.name, chainColor: fromChain.color, via: selectedOffer.rail.name },
      { ticker: toTicker, chainName: toChain.name, chainColor: toChain.color, via: toTier === 1 ? "EmpX aggregator" : undefined },
    ];
  }, [selectedOffer, fromChain, toChain, fromTicker, toTicker, fromChainId, fromTier, toTier]);

  // Flip
  const flip = () => {
    const fc = fromChainId, ft = fromTicker;
    setFromChainId(toChainId); setToChainId(fc);
    setFromTicker(toTicker); setToTicker(ft);
    setSelectedRailName(null);
  };

  const onSwap = () => {
    if (walletState.status !== "connected") { setShowWalletModal(true); return; }
    setQuoteIssuedAt(Date.now());
    setShowConfirm(true);
  };

  const navLinks: NavLink[] = [
    { label: "Swap",      href: "/swap-v2" },
    { label: "Cross",     href: "/cross-v2", active: true },
    { label: "Bridge",    href: "/bridge-v2" },
    { label: "Multi",     href: "/multi-v2", badge: "NEW" },
    { label: "Gas",       href: "/gas-v2" },
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
              name={walletState.status === "connected" ? walletState.chain.name : fromChain.name}
              color={walletState.status === "connected" ? walletState.chain.color : fromChain.color}
              onClick={() => setChainPickerTarget("from")}
            />
            <WalletButton
              connected={walletState.status === "connected"}
              address={walletState.status === "connected" ? walletState.address : undefined}
              balanceUSD={walletState.status === "connected" ? 51570 : undefined}
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
              fromBalance={fromTicker === "ETH" ? "12.45" : undefined}
              fromUsdValue={Number(fromAmount.replace(/,/g, "")) * priceOf(fromTicker, fromChainId)}
              onFromAmountChange={setFromAmount}
              onSelectFromToken={() => setTokenPickerTarget("from")}
              onSelectFromChain={() => setChainPickerTarget("from")}
              onPercentClick={(pct) => setFromAmount(String((12.45 * pct) / 100))}

              toChain={toChain}
              toToken={{ ticker: toTicker }}
              toAmount={selectedOffer ? selectedOffer.outAmount.toFixed(4) : "0"}
              toUsdValue={selectedOffer?.outUSD}
              onSelectToToken={() => setTokenPickerTarget("to")}
              onSelectToChain={() => setChainPickerTarget("to")}

              railName={selectedOffer?.rail.name}
              railBadge={selectedOffer?.rail.badge as any}
              protocolFeeBps={selectedOffer?.feeBps}
              protocolFeeUSD={selectedOffer?.protocolFeeUSD}
              bridgeFeeUSD={selectedOffer ? selectedOffer.railFeeUSD + selectedOffer.gasDropFeeUSD : undefined}
              estimatedTime={selectedOffer ? formatEtaSeconds(selectedOffer.displayEtaSeconds) : undefined}
              minimumReceived={selectedOffer ? `${(selectedOffer.outAmount * 0.997).toFixed(4)} ${toTicker}` : undefined}
              slippageBps={30}
              routeHops={routeHops}

              walletConnected={walletState.status === "connected"}
              onConnect={() => setShowWalletModal(true)}
              onSwap={onSwap}
              onFlip={flip}
              swapLabel={walletState.status === "connected" ? "Cross-chain swap" : "Connect wallet"}
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
                    onRefresh={() => { setQuoteIssuedAt(Date.now()); toast.info("Quote refreshed"); }}
                    compact
                  />
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <Pill variant="info">{eligibleRails.length} eligible</Pill>
                    {selectedRailName && <Pill variant="accent">User-pinned</Pill>}
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
                  { value: "offers" as const,    label: "Offers",   count: offers.length },
                  { value: "settings" as const,  label: "Gas" },
                  { value: "rails" as const,     label: "Catalog",  count: RAILS.length },
                  { value: "lifecycle" as const, label: "Lifecycle" },
                ]}
                active={sidePanel}
                onChange={setSidePanel}
                variant="pill"
              />
              <div style={{ marginTop: 14 }}>
                {sidePanel === "offers"   && (
                  <OffersList
                    offers={offers}
                    bestRailName={bestOffer?.rail.name}
                    selectedRailName={selectedRailName}
                    onSelectRail={(name) => {
                      setSelectedRailName((cur) => (cur === name ? null : name));
                      toast.info(selectedRailName === name ? "Reverted to best rail" : `Pinned to ${name}`);
                    }}
                    toTicker={toTicker}
                  />
                )}
                {sidePanel === "settings" && (
                  <GasSettings
                    payInToken={payInToken}
                    setPayInToken={setPayInToken}
                    paymasterAvailable={paymasterAvailable}
                    paymasterChainName={fromChain.name}
                    gasDropOnDestination={gasDropOnDestination}
                    setGasDropOnDestination={setGasDropOnDestination}
                    gasDropAvailable={gasDropAvailable}
                    destinationName={toChain.name}
                    destinationNative={toChain.ticker}
                    gasDropUSD={GAS_DROP_USD}
                  />
                )}
                {sidePanel === "rails"     && <RailsCatalog />}
                {sidePanel === "lifecycle" && <LifecycleExplainer />}
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
                const native = T1_TOKENS_BY_CHAIN[c.id]?.find((t) => t.category === "native");
                if (native) setFromTicker(native.ticker);
              }
            } else {
              setToChainId(c.id);
              setToTicker(defaultSettlementTicker(c.id));
            }
            setSelectedRailName(null);
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
            setSelectedRailName(null);
            setTokenPickerTarget(null);
          }}
        />
      )}

      <ConfirmTradeModal
        open={showConfirm}
        onClose={() => setShowConfirm(false)}
        onConfirm={() => { setShowConfirm(false); setShowSuccess(true); }}
        eyebrow="REVIEW · CROSS-CHAIN"
        title="Confirm trade"
        fromTicker={fromTicker}
        fromAmount={fromAmount}
        fromChainName={fromChain.name}
        toTicker={toTicker}
        toAmount={selectedOffer ? selectedOffer.outAmount.toFixed(4) : "0"}
        toChainName={toChain.name}
        routeHops={routeHops}
        feeRows={
          selectedOffer
            ? [
                { label: "Via rail",      value: selectedOffer.rail.name },
                { label: "Mode",          value: `Mode ${selectedOffer.rail.mode}` },
                { label: "Protocol fee",  value: `${selectedOffer.feeBps} bps`, sub: `· $${selectedOffer.protocolFeeUSD.toFixed(2)}`, accent: true },
                { label: "Rail fee",      value: selectedOffer.railFeeUSD <= 0.005 ? "FREE" : `$${selectedOffer.railFeeUSD.toFixed(2)}` },
                ...(gasDropOnDestination ? [{ label: "Gas drop", value: `+$${GAS_DROP_USD.toFixed(2)} ${toChain.ticker}` }] : []),
                ...(payInToken ? [{ label: "Source gas", value: `Paid in ${fromTicker} (Paymaster)`, muted: true }] : []),
                { label: "Est. time",     value: formatEtaSeconds(selectedOffer.displayEtaSeconds), sub: selectedOffer.etaSource === "live" ? "· live quote" : "· baseline" },
                { label: "Reliability",   value: `${selectedOffer.rail.reliability.toFixed(1)}% (30d)`, muted: true },
                { label: "Stuck after",   value: `${selectedOffer.rail.stuckThresholdMin} min`, muted: true },
              ]
            : []
        }
        quoteIssuedAt={quoteIssuedAt}
        quoteValidMs={30000}
        onRefreshQuote={() => setQuoteIssuedAt(Date.now())}
        warning={
          selectedOffer && selectedOffer.rail.mode === "B"
            ? "Mode B rails settle via the rail's own vault. EmpX is NOT in the tx path — your funds flow through the rail's protocol directly."
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
        toAmount={selectedOffer ? selectedOffer.outAmount.toFixed(4) : "0"}
        toChainName={toChain.name}
        message={`${toTicker} arrived on ${toChain.name}`}
        timeline={[
          { label: "Source confirmation",  description: `${fromChain.name} tx mined`,                            state: "complete", timeLabel: "0:00" },
          { label: "Rail settlement",      description: `${selectedOffer?.rail.name || "Rail"} relay completed`, state: "complete", timeLabel: "0:42" },
          { label: "Destination delivery", description: `${toTicker} delivered on ${toChain.name}`,              state: "complete", timeLabel: "0:58" },
        ]}
        txHashes={[
          { label: "Source",      chainName: fromChain.name, chainColor: fromChain.color, hashShort: "0xab12…3f9d", url: "https://etherscan.io" },
          { label: "Destination", chainName: toChain.name,   chainColor: toChain.color,   hashShort: "0x4e8a…c124", url: "https://basescan.org" },
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
          balanceUSD={51570.49}
          nativeBalance="12.45"
          nativeTicker="ETH"
          explorerUrl={`https://arbiscan.io/address/${walletState.address}`}
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

interface OfferEntry {
  rail: RailEntry;
  pairType: "V/V" | "V/S" | "S/S";
  feeBps: number;
  protocolFeeUSD: number;
  railFeeUSD: number;
  gasDropFeeUSD: number;
  totalFeeUSD: number;
  outAmount: number;
  outUSD: number;
  /** ETA from a live RailSolver.quote() response. null until a quote arrives. */
  quotedEtaSeconds: number | null;
  /** What to actually render — quotedEtaSeconds when present, baseline otherwise. */
  displayEtaSeconds: number;
  /** Where displayEtaSeconds came from. Drives the "Live"/"Baseline" pill. */
  etaSource: "live" | "baseline";
}

function OffersList({
  offers,
  bestRailName,
  selectedRailName,
  onSelectRail,
  toTicker,
}: {
  offers: OfferEntry[];
  bestRailName?: string;
  selectedRailName: string | null;
  onSelectRail: (name: string) => void;
  toTicker: string;
}) {
  if (offers.length === 0) {
    return (
      <p style={{ margin: 0, padding: "16px 4px", fontSize: 12, color: "rgba(255,255,255,0.50)", textAlign: "center", lineHeight: 1.55 }}>
        No rails support this route + token combination. Try a different chain pair or destination token.
      </p>
    );
  }
  return (
    <>
      <p style={{ margin: "0 0 10px", fontSize: 10.5, color: "rgba(255,255,255,0.40)", lineHeight: 1.45 }}>
        Tap a rail to pin it. Tap again to revert to best output.
      </p>
      <div style={{ display: "flex", flexDirection: "column", gap: 1, maxHeight: 320, overflowY: "auto" }}>
        {offers.map((o, idx) => {
          const isBest     = o.rail.name === bestRailName;
          const isSelected = o.rail.name === selectedRailName;
          const isActive   = isSelected || (!selectedRailName && isBest);
          // Pick ONE secondary tag — Pinned beats Best beats rail.badge.
          const tag = isSelected ? "PINNED" : (isBest && !selectedRailName) ? "BEST" : o.rail.badge;
          const tagAccent = isSelected || (isBest && !selectedRailName);
          const modeColor = o.rail.mode === "A" ? "#FFB347" : "#93C5FD";
          return (
            <button
              key={o.rail.name}
              type="button"
              onClick={() => onSelectRail(o.rail.name)}
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
                title={`Mode ${o.rail.mode}`}
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
                    {o.rail.name}
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
                  title={`${o.rail.reliability.toFixed(1)}% reliability (30d) · ETA source: ${o.etaSource}`}
                >
                  {o.feeBps} bps · {formatEtaSeconds(o.displayEtaSeconds)} · ${o.totalFeeUSD.toFixed(2)}
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
                  {o.outAmount.toFixed(4)}
                </p>
                <p style={{ margin: "1px 0 0", fontSize: 10, color: "rgba(255,255,255,0.40)" }}>
                  {toTicker} · ${o.outUSD.toLocaleString("en-US", { maximumFractionDigits: 0 })}
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
  payInToken, setPayInToken, paymasterAvailable, paymasterChainName,
  gasDropOnDestination, setGasDropOnDestination, gasDropAvailable,
  destinationName, destinationNative, gasDropUSD,
}: {
  payInToken: boolean;
  setPayInToken: (v: boolean) => void;
  paymasterAvailable: boolean;
  paymasterChainName: string;
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
        hint={
          paymasterAvailable
            ? `Pay source gas in your input token via the EmpX Paymaster on ${paymasterChainName}. No native gas needed.`
            : `Paymaster not deployed on ${paymasterChainName}. Available on Ethereum, Arbitrum, Base, OP, Polygon, Avalanche, BSC.`
        }
        enabled={payInToken}
        disabled={!paymasterAvailable}
        onToggle={() => setPayInToken(!payInToken)}
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
      <p style={{ margin: "6px 2px 0", fontSize: 10.5, color: "rgba(255,255,255,0.40)", lineHeight: 1.55 }}>
        Both features map to live SDK services — Paymaster path uses{" "}
        <code style={{ color: "rgba(255,255,255,0.65)" }}>PaymasterService</code>,
        gas-drop side-leg uses <code style={{ color: "rgba(255,255,255,0.65)" }}>GasZipSolver</code> +{" "}
        <code style={{ color: "rgba(255,255,255,0.65)" }}>DestinationGasAutoFund</code>.
      </p>
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
  onToggle: () => void;
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
    <div style={{ display: "flex", flexDirection: "column", gap: 4, maxHeight: 360, overflowY: "auto", paddingRight: 4 }}>
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
      <p style={{ margin: "10px 4px 0", fontSize: 10.5, color: "rgba(255,255,255,0.40)", lineHeight: 1.55 }}>
        ETAs shown here are <em>baselines</em> from <code>RailConfig.etaSeconds</code>. Real quotes use <code>Quote.etaSeconds</code> from <code>RailSolver.quote()</code>, which adjusts for live network conditions, hop count, and attestation queues. Reliability sourced from the cross-bridge VPS <code>route_outcomes</code> table — last 30 days per rail. Stuck-threshold is the per-rail cutoff at which a watching intent transitions to STUCK.
      </p>
    </div>
  );
}

// ─── Lifecycle explainer ─────────────────────────────────────────────────

function LifecycleExplainer() {
  const steps: TradeTimelineStep[] = [
    { label: "Quote",   description: "RailSolver.quote() returns offer + economics", state: "complete" },
    { label: "Execute", description: "buildExecution() → user signs source tx",       state: "complete" },
    { label: "Watch",   description: "AsyncIterable<IntentEvent> streams transitions",state: "active"  },
    { label: "Settle",  description: "SettleResult: SETTLED / STUCK / FAILED",        state: "pending" },
  ];
  return (
    <div>
      <p style={{ margin: "0 0 12px", fontSize: 11, color: "rgba(255,255,255,0.55)", lineHeight: 1.55 }}>
        Every cross-chain intent flows through the RailSolver interface. Stuck detection runs per-rail in the VPS worker; failed intents return to the user's wallet via the rail's recovery flow.
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
