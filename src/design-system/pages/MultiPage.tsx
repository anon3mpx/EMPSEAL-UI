// ─── MultiPage — IntentBasket-backed multi-leg surface ─────────────────────
//
// Wires the four user-facing features that share ONE underlying SDK op
// (the IntentBasket abstraction in empx-cross-bridge):
//
//   1. Multiswap         (multi-to-one)    N tokens → 1 target
//   2. Split routes      (one-to-many)     1 token → N outputs (allocationBps)
//   3. Wallet Liquidator (wallet-liquidator) auto-scan → 1 target
//   4. Cross Rebalancer  (many-to-many)    N inputs ↔ M outputs
//
// SDK grounding (every UI decision maps to a real SDK file):
//   • empx-cross-bridge/src/vps/core/IntentBasket.ts      shape + validateBasket
//   • empx-cross-bridge/src/vps/services/BasketQuoteEngine.ts  quote per leg
//   • empx-cross-bridge/src/vps/services/BasketStatusEngine.ts rollup status
//   • empx-cross-bridge/src/vps/services/WalletScanner.ts      liquidator scan
//
// Caps come from GET /api/v1/basket/capabilities (fallback BASKET_LIMITS).
// allocationBps MUST sum to 10_000 across outputs in one-to-many /
// many-to-many; the form enforces this before letting the user quote.
//
// Layout: one centred 480px column (same measure as swap / cross / gas) —
// mode tabs, legs, collapsible constraints, then the basket review / execute
// card. The locked EmpxMultiWidget is NOT used here: it models a demo review
// flow, while this page runs the real quote → plan → execute → retry
// pipeline, per-output recipients and the live liquidator scan.
//
// Honest disclosures:
//   • Per-leg revenueTier surfaced ("agg-wired" / "api-direct" / "unknown")
//   • `skipped` legs from BasketQuote are explicit in the review panel
//   • Wallet-liquidator scan uses POST /api/v1/wallet/scan (50 tokens/chain)

import { sendTransaction, writeContract } from "@wagmi/core";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { erc20Abi, isAddress, type Address } from "viem";
import { useChainId, useSignMessage, useSwitchChain } from "wagmi";
import { config } from "../../Wagmi/config";
import {
  BasketReviewPanel,
  basketApi,
  basketEditorFingerprint,
  basketLimits,
  basketModeConfig,
  buildBasketQuoteRequest,
  mapBasketApiError,
  mapWalletScanBalances,
  useBasketCapabilities,
  useBasketSession,
} from "../../features/basket";
import {
  AccountModal,
  ChainLogo,
  ChainPicker,
  DappFooter,
  DappNavbar,
  FeeBreakdown,
  NetworkSelector,
  Toaster,
  TokenLogo,
  TokenPicker,
  WalletButton,
  WalletModal,
  useIsMobile,
  toast,
  type PickerChain,
  type PickerToken,
} from "../components";
import { Disclosure, MicroLabel, WidgetKitKeyframes, wk } from "../widgetKit";
import EmpxMultiWidget, {
  type MultiChain,
  type MultiInputLeg,
  type MultiOutputLeg,
  type MultiScanRow,
  type MultiToken,
} from "../EmpxMultiWidget";
import { useWalletConnection } from "../hooks/useWalletConnection";
import { useV2Balances } from "../hooks/useV2Balances";
import { useAccountSnapshot } from "../hooks/useAccountSnapshot";
import { getExplorerAddressUrl } from "../data/explorers";
import {
  tierForChainId,
  tierLabel,
} from "../data/empxRegistry";
import { V2_AGGREGATOR_CHAINS, getV2Chain } from "../data/v2ChainView";
import { getTokensForChain } from "../data/v2TokenView";
import { toMultiPickerToken } from "../data/multiV2Adapters";


// Gas top-up toggled on from the widget drops this much native gas per leg.
const DEFAULT_GAS_TOPUP_USD = 2.5;

function basketChainCatalog(supportedChainIds?: number[]) {
  const allowed = supportedChainIds && supportedChainIds.length > 0
    ? new Set(supportedChainIds)
    : null;
  return V2_AGGREGATOR_CHAINS.filter((chain) => !allowed || allowed.has(chain.id));
}

const chainName = (id: number) => getV2Chain(id)?.name ?? `Chain ${id}`;
const chainColor = (id: number) => getV2Chain(id)?.color ?? "#888";

function multiChainView(id: number): MultiChain {
  const name = chainName(id);
  const color = chainColor(id);
  return {
    id,
    name,
    color,
    logo: <ChainLogo chainId={id} symbol={name.slice(0, 3).toUpperCase()} bg={color} size={17} />,
  };
}

function multiTokenView(chainId: number, ticker: string, address?: string): MultiToken {
  const config = getTokensForChain(chainId).find((token) => token.ticker === ticker);
  return {
    ticker,
    logo: (
      <TokenLogo
        ticker={ticker}
        chainId={chainId}
        address={address ?? config?.address}
        logoUrl={config?.logoUrl}
        isNative={config?.isNative}
        size={26}
      />
    ),
  };
}

const formatEta = (seconds: number) => (seconds < 60 ? `~${Math.max(1, Math.round(seconds))}s` : `~${Math.round(seconds / 60)} min`);

// ─── Mode definitions ─────────────────────────────────────────────────────

type BasketMode = "multi-to-one" | "one-to-many" | "wallet-liquidator" | "many-to-many";

const MODE_LABEL: Record<BasketMode, string> = {
  "multi-to-one":     "Multiswap",
  "one-to-many":      "Split routes",
  "wallet-liquidator":"Liquidator",
  "many-to-many":     "Rebalancer",
};

// Short tab names (from the locked EmpxMultiWidget) so four tabs fit the
// 480px column without wrapping; MODE_LABEL stays the full name elsewhere.
const MODE_TAB_LABEL: Record<BasketMode, string> = {
  "multi-to-one":     "Multiswap",
  "one-to-many":      "Split",
  "wallet-liquidator":"Liquidator",
  "many-to-many":     "Rebalance",
};

const MODE_SUBTITLE: Record<BasketMode, string> = {
  "multi-to-one":     "N tokens → 1 target",
  "one-to-many":      "1 token → N outputs",
  "wallet-liquidator":"Auto-scan → 1 target",
  "many-to-many":     "N inputs ↔ M outputs",
};

const MODE_BLURB: Record<BasketMode, string> = {
  "multi-to-one":     "Pick multiple inputs across chains and converge them into one target asset. Each leg routes via the existing pipeline — same-chain via the aggregator, cross-chain via the best eligible rail.",
  "one-to-many":      "One source token, multiple outputs with percentage allocations. Allocations must sum to 100%. The SDK pre-splits the input amount and runs each output as a separate leg.",
  "wallet-liquidator":"Scan your wallet, then pick which tokens to liquidate into a single target. Preserve assets you want to keep — only checked ones get swept.",
  "many-to-many":     "Pair N inputs against M outputs by allocation. Today executes as a full N×M cross-product; smarter pairing is a Phase-3 optimisation.",
};

// Walked-through example per mode — uses generic Token A/B/C names.
const MODE_EXAMPLE: Record<BasketMode, { title: string; lines: string[] }> = {
  "multi-to-one": {
    title: "Example",
    lines: [
      "You hold Token A on Arbitrum, Token B on Polygon, Token C on Base.",
      "Set destination = Token D on Base.",
      "Result: 3 legs run in parallel — A→D, B→D, C→D. You end up holding only Token D on Base.",
    ],
  },
  "one-to-many": {
    title: "Example",
    lines: [
      "You hold 1000 of Token A on Arbitrum.",
      "Set outputs: 50% Token B (Arbitrum), 30% Token C (Base), 20% Token D (Polygon).",
      "Result: 500 A → B, 300 A → C, 200 A → D — one input, three settled outputs.",
    ],
  },
  "wallet-liquidator": {
    title: "Example",
    lines: [
      "Scan finds Token A, Token B, Token C in your wallet.",
      "Uncheck Token A (preserve it) — only B and C get liquidated.",
      "Result: 2 legs run, Token B + Token C → target (e.g. USDC on Arbitrum). Token A stays put.",
    ],
  },
  "many-to-many": {
    title: "Example",
    lines: [
      "You hold Token A (Arbitrum) + Token B (Base).",
      "Set outputs: 60% Token C (Polygon), 40% Token D (Optimism).",
      "Result: cross-product runs — A→C, A→D, B→C, B→D — 4 legs total. Allocations split each input by output %.",
    ],
  },
};

// User-friendly slippage presets — in percent.
const SLIPPAGE_PCT_PRESETS = [0.1, 0.5, 1.0, 3.0];

// Convert between UI percent and SDK bps
const pctToBps = (pct: number) => Math.round(pct * 100);
const bpsToPct = (bps: number) => bps / 100;

// ─── Page-level state shapes (UI-only mirror of IntentBasket) ─────────────

interface InputLeg {
  id: string;
  chainId: number;
  ticker: string;
  amount: string;
  token?: string;
  decimals?: number;
  amountBase?: string;
  usdPrice: number;
}

interface OutputLeg {
  id: string;
  chainId: number;
  ticker: string;
  allocationBps: number;
  recipient?: string;
  gasTopUpUSD?: number;
}

// Cold-start price floor.  Live values fetched via DefiLlama (priceService)
// when the chain is covered.  Same pattern as CrossPage.
import { getCachedPrice, getTokenPrices } from "../data/priceService";

const PRICE_USD_FALLBACK: Record<string, number> = {
  ETH: 3184, WBTC: 67852, BTC: 67852, SOL: 158, USDC: 1, USDT: 1, DAI: 1,
  POL: 0.72, BNB: 612, AVAX: 38, ARB: 0.79, OP: 1.84, PLS: 0.00007,
};

function nextId() { return Math.random().toString(36).slice(2, 9); }

function availablePriceOf(ticker: string, chainId?: number, tokenAddress?: string): number | null {
  if (chainId != null) {
    const live = getCachedPrice(chainId, ticker, tokenAddress);
    if (live != null) return live;
  }
  return PRICE_USD_FALLBACK[ticker.toUpperCase()] ?? null;
}

function priceOf(ticker: string, chainId?: number, tokenAddress?: string): number {
  return availablePriceOf(ticker, chainId, tokenAddress) ?? 0;
}

function _prefetchBasketPrices(pairs: { chainId: number; ticker: string; tokenAddress?: string }[]) {
  void getTokenPrices(pairs);
}

export default function MultiPage() {
  const isMobile = useIsMobile();
  const { walletState, walletOptions, onSelectWallet, disconnect, currentChain } =
    useWalletConnection();
  const connectedBalance = useV2Balances();
  const accountSnapshot = useAccountSnapshot(walletState.status === "connected" ? walletState.address : null);
  const connectedChainId = useChainId();
  const connectedChainIdRef = useRef(connectedChainId);
  connectedChainIdRef.current = connectedChainId;
  const { switchChainAsync } = useSwitchChain();
  const { signMessageAsync } = useSignMessage();
  const connectedAddress = walletState.status === "connected" ? walletState.address : undefined;
  const { capabilities, errorMessage: capabilitiesError } = useBasketCapabilities();
  const basketWallet = useMemo(() => ({
    address: connectedAddress,
    chainId: connectedChainId,
    signMessage: (message: string) => signMessageAsync({ account: connectedAddress as Address, message }),
    switchChain: (chainId: number) => switchChainAsync({ chainId: chainId as any }),
    getConnectedChainId: () => connectedChainIdRef.current,
    sendTransaction: async (tx: { to: string; data: string; value: string; chainId: number }) => sendTransaction(config, {
      account: connectedAddress as Address,
      chainId: tx.chainId as any,
      to: tx.to as Address,
      data: (tx.data || "0x") as `0x${string}`,
      value: BigInt(tx.value || "0"),
    }),
    approveToken: async (approval: { token: string; spender: string; amount: string; chainId: number }) => writeContract(config, {
      address: approval.token as Address,
      abi: erc20Abi,
      functionName: "approve",
      args: [approval.spender as Address, BigInt(approval.amount)],
      chainId: approval.chainId as any,
      account: connectedAddress as Address,
    }),
  }), [connectedAddress, connectedChainId, signMessageAsync, switchChainAsync]);
  const basket = useBasketSession({ wallet: basketWallet });
  const [liquidatorInputs, setLiquidatorInputs] = useState<InputLeg[]>([]);
  const [showWalletModal, setShowWalletModal] = useState(false);
  const [showAccountModal, setShowAccountModal] = useState(false);

  const [mode, setMode] = useState<BasketMode>("multi-to-one");
  const [slippageBps, setSlippageBps] = useState(50);
  const [deadlineSeconds, setDeadlineSeconds] = useState(600);

  // Chain picker — track which leg is currently picking, so onSelect knows
  // where to write the chainId back. Shape mirrors the cross / gas pages.
  const [chainPickerTarget, setChainPickerTarget] = useState<
    | { kind: "input"; id: string }
    | { kind: "output"; id: string }
    | null
  >(null);

  // Token picker — same shape as chain picker. Opens from the leg's TokenSwitcher.
  const [tokenPickerTarget, setTokenPickerTarget] = useState<
    | { kind: "input"; id: string }
    | { kind: "output"; id: string }
    | null
  >(null);

  // ── Inputs / outputs state ──────────────────────────────────────────────
  const [inputs, setInputs] = useState<InputLeg[]>(() => [
    { id: nextId(), chainId: 42161, ticker: "ETH", amount: "0.5", usdPrice: priceOf("ETH") },
  ]);
  const [outputs, setOutputs] = useState<OutputLeg[]>(() => [
    { id: nextId(), chainId: 8453, ticker: "USDC", allocationBps: 10_000 },
  ]);

  // Prefetch DefiLlama prices for every leg in the basket. Falls back
  // silently for chains/tokens DefiLlama doesn't cover.
  useEffect(() => {
    const pairs = [
      ...inputs.map((l) => ({ chainId: l.chainId, ticker: l.ticker })),
      ...outputs.map((l) => ({ chainId: l.chainId, ticker: l.ticker })),
    ];
    _prefetchBasketPrices(pairs);
  }, [inputs, outputs]);

  // ── Mode-driven structural rules ────────────────────────────────────────
  // multi-to-one: 1 output only.  one-to-many: 1 input only.
  // wallet-liquidator: inputs auto-scanned; outputs = 1.
  // many-to-many: 2+ inputs, 2+ outputs allowed.
  const switchMode = (next: BasketMode) => {
    setMode(next);
    if (next === "multi-to-one") {
      // Allow many inputs, exactly 1 output
      setOutputs((cur) => cur.slice(0, 1).map((o) => ({ ...o, allocationBps: 10_000 })));
    } else if (next === "one-to-many") {
      setInputs((cur) => cur.slice(0, 1));
      // Default outputs to 2-way 50/50 if currently single
      setOutputs((cur) => {
        if (cur.length >= 2) return cur;
        const a = cur[0] ?? { id: nextId(), chainId: 8453, ticker: "USDC", allocationBps: 5000 };
        return [
          { ...a, allocationBps: 5000 },
          { id: nextId(), chainId: 42161, ticker: "ETH", allocationBps: 5000 },
        ];
      });
    } else if (next === "wallet-liquidator") {
      // Inputs auto-scanned — UI shows scan card, outputs = 1
      setOutputs((cur) => cur.slice(0, 1).map((o) => ({ ...o, allocationBps: 10_000 })));
    }
    // many-to-many: leave both as-is
  };

  // ── Derived: leg count + cap checks ─────────────────────────────────────
  const legCount = useMemo(() => {
    if (mode === "multi-to-one" || mode === "wallet-liquidator") return inputs.length;
    if (mode === "one-to-many")       return outputs.length;
    return inputs.length * outputs.length; // many-to-many full cross-product
  }, [mode, inputs.length, outputs.length]);

  const totalBps = outputs.reduce((s, o) => s + o.allocationBps, 0);
  const allocOk = mode === "multi-to-one" || mode === "wallet-liquidator" || totalBps === 10_000;
  const limits = basketLimits(capabilities?.limits);
  const modeConfig = basketModeConfig(mode, capabilities?.limits);
  const pickerChains = useMemo(
    () => basketChainCatalog(capabilities?.supportedChainIds),
    [capabilities?.supportedChainIds],
  );

  const quoteInputs = liquidatorInputs.length > 0 && mode === "wallet-liquidator" ? liquidatorInputs : inputs;
  const inputsValid = quoteInputs.length > 0 && quoteInputs.every((i) => /^\s*(0|[1-9]\d*)(\.\d+)?\s*$/.test(i.amount) && i.amount.trim() !== "0" && !/^0\.0+$/.test(i.amount.trim()));
  const recipientsValid = outputs.every((output) => {
    const recipient = output.recipient?.trim();
    return !recipient || isAddress(recipient);
  });
  const overCap = quoteInputs.length > modeConfig.maxInputs
               || outputs.length > modeConfig.maxOutputs
               || legCount > modeConfig.maxLegs;

  const totalInputUSD = quoteInputs.reduce((s, i) => s + Number(i.amount) * i.usdPrice, 0);

  const runQuote = useCallback(async () => {
    if (walletState.status !== "connected" || !connectedAddress) {
      setShowWalletModal(true);
      return;
    }
    try {
      await basket.requestQuote(buildBasketQuoteRequest({
        mode,
        wallet: connectedAddress,
        inputs: quoteInputs.map((leg) => ({
          chainId: leg.chainId,
          ticker: leg.ticker,
          amount: leg.amount,
          ...(leg.token ? { token: leg.token } : {}),
          ...(leg.decimals != null ? { decimals: leg.decimals } : {}),
          ...(leg.amountBase ? { amountBase: leg.amountBase } : {}),
        })),
        outputs: outputs.map((leg) => ({
          chainId: leg.chainId,
          ticker: leg.ticker,
          allocationBps: leg.allocationBps,
          ...(leg.recipient ? { recipient: leg.recipient } : {}),
        })),
        slippageBps,
        deadlineSeconds,
      }), mode);
      toast.success("Basket quote ready");
    } catch (error) {
      toast.error(mapBasketApiError(error));
    }
  }, [basket, connectedAddress, deadlineSeconds, mode, outputs, quoteInputs, slippageBps, walletState.status]);

  const editorFingerprint = useMemo(() => basketEditorFingerprint({
    mode,
    inputs: quoteInputs.map((leg) => ({
      chainId: leg.chainId,
      ticker: leg.ticker,
      amount: leg.amount,
      token: leg.token,
      amountBase: leg.amountBase,
    })),
    outputs: outputs.map((leg) => ({
      chainId: leg.chainId,
      ticker: leg.ticker,
      allocationBps: leg.allocationBps,
      recipient: leg.recipient,
    })),
    slippageBps,
    deadlineSeconds,
  }), [deadlineSeconds, mode, outputs, quoteInputs, slippageBps]);
  const clearQuote = basket.clearQuote;
  useEffect(() => {
    clearQuote();
  }, [clearQuote, editorFingerprint]);

  // ── Widget view model ───────────────────────────────────────────────────
  const [reviewOpen, setReviewOpen] = useState(false);
  const usesAllocation = mode === "one-to-many" || mode === "many-to-many";

  const liquidatorScan = useLiquidatorScan({
    walletConnected: walletState.status === "connected",
    wallet: connectedAddress,
    chainIds: capabilities?.supportedChainIds ?? [],
    maxInputs: modeConfig.maxInputs,
    onSelected: (next) => setLiquidatorInputs(next.map((asset) => ({
      id: asset.id,
      chainId: asset.chainId,
      ticker: asset.ticker,
      amount: asset.amount,
      token: asset.token,
      decimals: asset.decimals,
      amountBase: asset.amountBase,
      usdPrice: asset.usd != null
        ? asset.usd / Number(asset.amount || 1)
        : 0,
    }))),
  });

  // Entering Liquidator with a wallet connected scans once automatically;
  // the widget's Re-scan control handles every later run.
  const autoScannedFor = useRef<string | null>(null);
  useEffect(() => {
    if (mode !== "wallet-liquidator" || !connectedAddress) return;
    if (!capabilities?.supportedChainIds?.length) return;
    if (autoScannedFor.current === connectedAddress) return;
    autoScannedFor.current = connectedAddress;
    void liquidatorScan.scan();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, connectedAddress, capabilities?.supportedChainIds]);

  const widgetInputs: MultiInputLeg[] = inputs.map((leg) => ({
    id: leg.id,
    chain: multiChainView(leg.chainId),
    token: multiTokenView(leg.chainId, leg.ticker, leg.token),
    amount: leg.amount,
    usdValue: (Number(leg.amount) || 0) * (leg.usdPrice || priceOf(leg.ticker, leg.chainId)),
  }));

  // Converged output: the server quote's figure once quoted, otherwise a
  // price-only estimate from the input total (fees not yet known).
  const convergedUsd = basket.quote?.totals.outputsUsd ?? (totalInputUSD > 0 ? totalInputUSD : undefined);
  const widgetOutputs: MultiOutputLeg[] = outputs.map((leg) => {
    const outPrice = priceOf(leg.ticker, leg.chainId);
    return {
      id: leg.id,
      chain: multiChainView(leg.chainId),
      token: multiTokenView(leg.chainId, leg.ticker),
      allocationBps: leg.allocationBps,
      convergedUsd: usesAllocation ? undefined : convergedUsd,
      convergedAmount: !usesAllocation && convergedUsd != null && outPrice > 0
        ? (convergedUsd / outPrice).toLocaleString("en-US", { maximumFractionDigits: 4 })
        : undefined,
      gasTopUpEnabled: (leg.gasTopUpUSD ?? 0) > 0,
      recipient: leg.recipient,
      recipientInvalid: Boolean(leg.recipient?.trim()) && !isAddress(leg.recipient!.trim()),
    };
  });

  const widgetScanRows: MultiScanRow[] = (liquidatorScan.assets ?? []).map((asset) => ({
    id: asset.id,
    token: multiTokenView(asset.chainId, asset.ticker, asset.token),
    chainName: asset.chain,
    amount: asset.balance,
    usdValue: asset.usd ?? 0,
    selected: asset.selected,
  }));

  const quoteFeeBps = basket.quote && basket.quote.totals.inputsUsd > 0
    ? Math.round((basket.quote.totals.feeUsd / basket.quote.totals.inputsUsd) * 10_000)
    : undefined;

  const blockedReason = overCap
    ? `Over basket cap · max ${modeConfig.maxLegs} legs`
    : !allocOk
      ? `Allocations total ${(totalBps / 100).toFixed(2)}% · need 100%`
      : !recipientsValid
        ? "Recipient must be a valid address"
        : !inputsValid
          ? mode === "wallet-liquidator" ? "Select tokens to sweep" : "Enter an amount on every input"
          : capabilities && !capabilities.enabled
            ? "Basket service unavailable"
            : undefined;

  return (
    <div style={{ minHeight: "100vh", background: "#05050c", color: "#fff", fontFamily: "Inter, sans-serif" }}>
      <DappNavbar
        activeHref="/multi-v2"
        controls={
          <>
            <NetworkSelector
              name="Arbitrum"
              color="#28A0F0"
              onClick={() => toast.info("Active chain controlled per-leg below")}
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

      {/* Single centred column, same measure as swap / cross / gas. The
          locked EmpxMultiWidget is the composer; the real server pipeline
          (quote → plan → execute → retry) opens underneath once the user
          asks to review the basket. */}
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
        <EmpxMultiWidget
          mode={mode}
          onModeChange={(m) => switchMode(m)}
          modeSubtitle={MODE_SUBTITLE[mode]}
          modeBlurb={MODE_BLURB[mode]}
          modeExample={MODE_EXAMPLE[mode].lines}

          legCount={legCount}
          maxLegs={modeConfig.maxLegs}

          inputs={widgetInputs}
          onInputAmountChange={(id, v) => setInputs(inputs.map((l) => (l.id === id ? { ...l, amount: v } : l)))}
          onSelectInputChain={(id) => setChainPickerTarget({ kind: "input", id })}
          onSelectInputToken={(id) => setTokenPickerTarget({ kind: "input", id })}
          onRemoveInput={(id) => setInputs(inputs.filter((l) => l.id !== id))}
          onAddInput={() => setInputs([...inputs, { id: nextId(), chainId: 42161, ticker: "ETH", amount: "", usdPrice: priceOf("ETH", 42161) }])}
          canAddInput={mode !== "one-to-many" && mode !== "wallet-liquidator" && inputs.length < modeConfig.maxInputs}

          outputs={widgetOutputs}
          onOutputAllocationChange={(id, pct) =>
            setOutputs(outputs.map((l) => (l.id === id
              ? { ...l, allocationBps: Math.round(Math.max(0, Math.min(100, pct)) * 100) }
              : l)))
          }
          onSelectOutputChain={(id) => setChainPickerTarget({ kind: "output", id })}
          onSelectOutputToken={(id) => setTokenPickerTarget({ kind: "output", id })}
          onRemoveOutput={(id) => setOutputs(outputs.filter((l) => l.id !== id))}
          onAddOutput={() => setOutputs([...outputs, { id: nextId(), chainId: 8453, ticker: "USDC", allocationBps: 0 }])}
          canAddOutput={usesAllocation && outputs.length < modeConfig.maxOutputs}
          onToggleGasTopUp={(id) => setOutputs(outputs.map((l) => (l.id === id
            ? { ...l, gasTopUpUSD: (l.gasTopUpUSD ?? 0) > 0 ? 0 : DEFAULT_GAS_TOPUP_USD }
            : l)))}
          onOutputRecipientChange={(id, v) => setOutputs(outputs.map((l) => (l.id === id ? { ...l, recipient: v } : l)))}

          scanRows={widgetScanRows}
          onToggleScanRow={liquidatorScan.toggleAsset}
          onRescan={() => { void liquidatorScan.scan(); }}
          scanning={liquidatorScan.scanning}

          totalFeeUSD={basket.quote?.totals.feeUsd}
          feeBps={quoteFeeBps}
          estimatedTime={basket.quote ? formatEta(basket.quote.totals.parallelEtaSeconds) : undefined}
          etaNote={basket.quote ? "Slowest leg governs" : "Quoted on review"}
          blockedReason={blockedReason}

          walletConnected={walletState.status === "connected"}
          onConnect={() => setShowWalletModal(true)}
          onReview={() => {
            setReviewOpen(true);
            if (!basket.busy) void runQuote();
          }}
        />

        {mode === "wallet-liquidator" && (liquidatorScan.scanError || liquidatorScan.skipped.length > 0 || liquidatorScan.assets?.length === 0) && (
          <div style={{ width: "100%", maxWidth: 480, padding: "10px 22px 0" }}>
            {liquidatorScan.scanError && (
              <p style={{ margin: 0, fontSize: 10.5, color: "#F87171", lineHeight: 1.6 }}>{liquidatorScan.scanError}</p>
            )}
            {liquidatorScan.assets?.length === 0 && (
              <p style={{ margin: 0, fontSize: 10.5, color: wk.t3, lineHeight: 1.6 }}>
                No balances returned for the supported basket chains.
              </p>
            )}
            {liquidatorScan.skipped.length > 0 && (
              <p style={{ margin: 0, fontSize: 10.5, color: wk.t3, lineHeight: 1.6 }}>
                Skipped {liquidatorScan.skipped.length === 1 ? "chain" : `${liquidatorScan.skipped.length} chains`}: {liquidatorScan.skipped.map((entry) => chainName(entry.chainId)).join(", ")}
              </p>
            )}
          </div>
        )}

        {/* Basket review — server quote, plan, execute, retry. Hidden until
            the widget's review CTA is pressed so the composer reads clean. */}
        {(reviewOpen || basket.quote || basket.plan || basket.status) && (
          <div style={{ width: "100%", maxWidth: 480, padding: "0 22px" }}>
            <div style={{ height: 1, background: wk.border, margin: "8px 0 18px" }} />
            <MicroLabel>Basket review</MicroLabel>
            <div style={{ marginTop: 12 }}>
              <FeeBreakdown
                rows={[
                  { label: "Mode", value: MODE_LABEL[mode] },
                  { label: "Legs", value: `${legCount} configured · cap ${limits.maxLegs}` },
                  { label: "Input estimate", value: `$${totalInputUSD.toLocaleString("en-US", { maximumFractionDigits: 2 })}`, muted: true },
                  ...(basket.quote ? [
                    { label: "Quote", value: basket.quote.basketId, sub: `${basket.quote.legs.length} legs · v${basket.quote.quoteVersion}` },
                    { label: "Skipped", value: String(basket.quote.skipped.length), muted: true },
                  ] : []),
                  ...(basket.status ? [
                    { label: "Status", value: basket.status.composite, accent: true },
                  ] : []),
                ]}
              />
            </div>
            <div style={{ marginTop: 14 }}>
              <BasketReviewPanel
                mode={mode}
                capabilities={capabilities}
                capabilitiesError={capabilitiesError}
                quote={basket.quote}
                plan={basket.plan}
                status={basket.status}
                busy={basket.busy}
                walletConnected={walletState.status === "connected"}
                canQuote={inputsValid && allocOk && recipientsValid && !overCap}
                executeLocked={basket.executeLocked}
                onQuote={() => { void runQuote(); }}
                onPlan={() => {
                  void basket.requestPlan().then(() => toast.success("Server plan ready")).catch(() => {
                    toast.error(basket.errorMessage ?? "Plan failed");
                  });
                }}
                onExecute={() => {
                  void basket.executePlan().then(() => toast.success("Submitted hashes acknowledged")).catch(() => {
                    toast.error(basket.errorMessage ?? "Execution failed");
                  });
                }}
                onRetry={() => {
                  void basket.retryFailedLegs().then(() => toast.success("Failed legs retried")).catch(() => {
                    toast.error(basket.errorMessage ?? "Retry failed");
                  });
                }}
              />
              {basket.errorMessage && (
                <p style={{ margin: "10px 0 0", fontSize: 11.5, color: "#F87171", lineHeight: 1.5 }}>
                  {basket.errorMessage}
                </p>
              )}
            </div>
          </div>
        )}

        {/* Constraints — under the widget behind a disclosure, so the
            surface stays a tool rather than a settings panel. */}
        <div style={{ width: "100%", maxWidth: 480, padding: "0 22px" }}>
          <div style={{ height: 1, background: wk.border, margin: "8px 0 0" }} />
          <Disclosure label={`Constraints · ${bpsToPct(slippageBps)}% slippage · ${Math.round(deadlineSeconds / 60)} min deadline`}>
            <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 8 }}>
              <span style={{ fontSize: 10.5, color: wk.t3 }}>Slippage tolerance</span>
              <span style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 10.5, color: wk.t2, fontVariantNumeric: "tabular-nums" }}>
                {slippageBps} bps
              </span>
            </div>
            <div style={{ display: "flex", gap: 5, flexWrap: "wrap", alignItems: "center", marginBottom: 16 }}>
              {SLIPPAGE_PCT_PRESETS.map((pct) => (
                <ConstraintChip
                  key={pct}
                  active={slippageBps === pctToBps(pct)}
                  onClick={() => setSlippageBps(pctToBps(pct))}
                >
                  {pct}%
                </ConstraintChip>
              ))}
              <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                <input
                  type="number"
                  step={0.1}
                  min={0.01}
                  max={10}
                  value={bpsToPct(slippageBps)}
                  onChange={(e) => setSlippageBps(pctToBps(Math.max(0.01, Math.min(10, Number(e.target.value)))))}
                  aria-label="Custom slippage percent"
                  style={{
                    width: 56, padding: "5px 7px", borderRadius: 4, outline: "none",
                    background: "rgba(255,255,255,.035)", border: "1px solid transparent",
                    color: wk.t1, fontFamily: "'Space Grotesk', sans-serif", fontSize: 10.5, textAlign: "right",
                  }}
                />
                <span style={{ fontSize: 10.5, color: wk.t3 }}>%</span>
              </span>
            </div>

            <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 8 }}>
              <span style={{ fontSize: 10.5, color: wk.t3 }}>Quote deadline</span>
              <span style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 10.5, color: wk.t2, fontVariantNumeric: "tabular-nums" }}>
                {Math.round(deadlineSeconds / 60)} min
              </span>
            </div>
            <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
              {[300, 600, 1800].map((secs) => (
                <ConstraintChip
                  key={secs}
                  active={deadlineSeconds === secs}
                  onClick={() => setDeadlineSeconds(secs)}
                >
                  {secs / 60} min
                </ConstraintChip>
              ))}
            </div>

            <p style={{ margin: "14px 0 0", fontSize: 9.5, color: wk.t3, lineHeight: 1.6 }}>
              Applies per leg unless a leg overrides it. Caps: max {limits.maxInputs} inputs ·
              max {limits.maxOutputs} outputs · max {limits.maxLegs} legs.
            </p>
          </Disclosure>
        </div>
      </main>

      <WalletModal
        open={showWalletModal}
        onClose={() => setShowWalletModal(false)}
        wallets={walletOptions}
        onSelect={(w) => {
          setShowWalletModal(false);
          onSelectWallet(w);
        }}
      />

      {/* Chain picker — opens on any leg's ChainSwitcher click */}
      {chainPickerTarget && (
        <ChainPicker
          open={!!chainPickerTarget}
          onClose={() => setChainPickerTarget(null)}
          mode="cross"
          chains={pickerChains.map<PickerChain>((c) => {
            const tier = tierForChainId(c.id);
            return {
              id: c.id,
              name: c.name,
              ticker: c.ticker,
              color: c.color,
              tier,
              tierLabel: tierLabel(tier),
            };
          })}
          selectedId={
            chainPickerTarget.kind === "input"
              ? inputs.find((l) => l.id === chainPickerTarget.id)?.chainId
              : outputs.find((l) => l.id === chainPickerTarget.id)?.chainId
          }
          onSelect={(c) => {
            if (chainPickerTarget.kind === "input") {
              setInputs(inputs.map((l) => (l.id === chainPickerTarget.id ? { ...l, chainId: c.id } : l)));
            } else {
              setOutputs(outputs.map((l) => (l.id === chainPickerTarget.id ? { ...l, chainId: c.id } : l)));
            }
            setChainPickerTarget(null);
          }}
        />
      )}

      {/* Token picker — opens on any leg's TokenSwitcher click */}
      {tokenPickerTarget && (() => {
        const targetLeg = tokenPickerTarget.kind === "input"
          ? inputs.find((l) => l.id === tokenPickerTarget.id)
          : outputs.find((l) => l.id === tokenPickerTarget.id);
        if (!targetLeg) return null;
        const targetChain = getV2Chain(targetLeg.chainId);
        const pickerChain = targetChain ?? {
          name: chainName(targetLeg.chainId),
          color: chainColor(targetLeg.chainId),
        };
        const sampleTokens: PickerToken[] = getTokensForChain(targetLeg.chainId)
          .map((token) => toMultiPickerToken(token, pickerChain));
        return (
          <TokenPicker
            open={!!tokenPickerTarget}
            onClose={() => setTokenPickerTarget(null)}
            tokens={sampleTokens}
            recent={sampleTokens.slice(0, 4)}
            selected={targetLeg.ticker}
            onSelect={(t) => {
              const patch = { ticker: t.ticker, usdPrice: priceOf(t.ticker, targetLeg.chainId) };
              if (tokenPickerTarget.kind === "input") {
                setInputs(inputs.map((l) => (l.id === tokenPickerTarget.id ? { ...l, ...patch } : l)));
              } else {
                setOutputs(outputs.map((l) => (l.id === tokenPickerTarget.id ? { ...l, ...patch } : l)));
              }
              setTokenPickerTarget(null);
              toast.info(`${tokenPickerTarget.kind === "input" ? "Input" : "Output"} → ${t.ticker}`);
            }}
          />
        );
      })()}

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
          nativeBalance={connectedBalance.nativeBalance}
          nativeTicker={connectedBalance.nativeTicker}
          explorerUrl={getExplorerAddressUrl(walletState.chain.id, walletState.address) ?? undefined}
          onCopy={() => toast.success("Address copied")}
          onSwitchNetwork={() => toast.info("Per-leg chain control in panels below")}
          onSwitchWallet={() => { setShowAccountModal(false); setShowWalletModal(true); }}
          onDisconnect={() => { setShowAccountModal(false); disconnect(); toast.info("Wallet disconnected"); }}
        />
      )}

      <DappFooter />
      <Toaster />
    </div>
  );
}

// ─── Liquidator wallet scan ──────────────────────────────────────────────

interface ScannedAsset {
  id: string;
  chain: string;
  chainId: number;
  chainColor: string;
  ticker: string;
  token: string;
  decimals: number;
  amount: string;
  amountBase: string;
  balance: string;
  usd: number | null;
  selected: boolean;
}

type SelectedScanAsset = {
  id: string;
  chainId: number;
  ticker: string;
  token: string;
  decimals: number;
  amount: string;
  amountBase: string;
  usd: number | null;
};

function useLiquidatorScan({
  walletConnected,
  wallet,
  chainIds,
  maxInputs,
  onSelected,
}: {
  walletConnected: boolean;
  wallet?: string;
  chainIds: number[];
  maxInputs: number;
  onSelected: (assets: SelectedScanAsset[]) => void;
}) {
  const [scanning, setScanning] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);
  const [skipped, setSkipped] = useState<Array<{ chainId: number; reason: string }>>([]);
  const [assets, setAssets] = useState<ScannedAsset[] | null>(null);

  const scan = async () => {
    if (!walletConnected || !wallet) {
      toast.info("Connect a wallet before scanning.");
      return;
    }
    if (chainIds.length === 0) {
      toast.info("Basket capabilities have not published supported chains yet.");
      return;
    }
    setScanning(true);
    setScanError(null);
    setAssets(null);
    onSelected([]);
    try {
      const result = await basketApi.scanWallet({ wallet, chainIds });
      await getTokenPrices(result.balances
        .filter((balance) => typeof balance.balanceUsd !== "number" || !Number.isFinite(balance.balanceUsd))
        .map((balance) => ({
          chainId: balance.chainId,
          ticker: balance.symbol?.trim() ?? "",
          tokenAddress: balance.token,
        })));
      const mapped = mapWalletScanBalances(result, {
        supportedChainIds: chainIds,
        usdPrice: availablePriceOf,
      }).map((asset): ScannedAsset => ({
        ...asset,
        chain: chainName(asset.chainId),
        chainColor: chainColor(asset.chainId),
        balance: asset.amount,
        selected: false,
      }));
      setSkipped(result.skipped ?? []);
      setAssets(mapped);
      if (mapped.length === 0) {
        toast.info("No balances returned for the supported basket chains.");
      }
    } catch (error) {
      const message = mapBasketApiError(error);
      setScanError(message);
      toast.error(message);
    } finally {
      setScanning(false);
    }
  };

  const toggleAsset = (id: string) => {
    if (!assets) return;
    const current = assets.find((asset) => asset.id === id);
    const selectedCount = assets.filter((asset) => asset.selected).length;
    if (current && !current.selected && selectedCount >= maxInputs) {
      toast.info(`Basket inputs are capped at ${maxInputs}.`);
      return;
    }
    const next = assets.map((a) => (a.id === id ? { ...a, selected: !a.selected } : a));
    setAssets(next);
    onSelected(next.filter((a) => a.selected).map((a) => ({
      id: a.id,
      chainId: a.chainId,
      ticker: a.ticker,
      token: a.token,
      decimals: a.decimals,
      amount: a.amount,
      amountBase: a.amountBase,
      usd: a.usd,
    })));
  };

  return { assets, scanning, scanError, skipped, scan, toggleAsset };
}

function ConstraintChip({
  active, onClick, children,
}: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      style={{
        padding: "5px 11px", borderRadius: 4, cursor: "pointer",
        background: active ? "rgba(255,138,0,.12)" : "rgba(255,255,255,.035)",
        border: `1px solid ${active ? "rgba(255,138,0,.45)" : "transparent"}`,
        color: active ? wk.orange : wk.t2,
        fontFamily: "Inter, sans-serif", fontSize: 10.5, fontWeight: 600,
        fontVariantNumeric: "tabular-nums",
      }}
    >
      {children}
    </button>
  );
}
