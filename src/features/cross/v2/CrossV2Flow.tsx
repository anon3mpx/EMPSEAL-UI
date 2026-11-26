import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { formatUnits, type Address } from "viem";
import { useBalance } from "wagmi";
import V2AddressFields from "./V2AddressFields";
import EmpxCrossWidget from "../../../design-system/EmpxCrossWidget";
import {
  AccountModal, ChainLogo, ChainPicker, ConfirmTradeModal, DappFooter, DappNavbar, NetworkSelector, Toaster, TokenLogo,
  TokenPicker, WalletButton, WalletModal, toast, useIsMobile, type PickerChain, type PickerToken,
} from "../../../design-system/components";
import { getExplorerAddressUrl } from "../../../design-system/data/explorers";
import { useAccountSnapshot } from "../../../design-system/hooks/useAccountSnapshot";
import { useUnifiedPrice } from "../../../design-system/hooks/useUnifiedPrice";
import { useV2Balances } from "../../../design-system/hooks/useV2Balances";
import { useWalletConnection } from "../../../design-system/hooks/useWalletConnection";
import { WidgetKitKeyframes } from "../../../design-system/widgetKit";
import type { V2TokenConfig } from "../../../design-system/data/v2TokenView";
import { assetIdOf, defaultToken, outputTokenOf, tickerForAsset, v2ChainById, v2Tokens } from "./assets";
import { createCrossV2Client } from "./client";
import CrossV2ExecutionPanel from "./CrossV2ExecutionPanel";
import TransferHistory from "./TransferHistory";
import CrossV2JourneyPanel from "./CrossV2JourneyPanel";
import { describeV2Error, errText } from "./errors";
import { executeCheckedPlan, type ExecuteResult } from "./execute";
import { checkOffer } from "./planCheck";
import type { StoredIntent } from "./journeyStore";
import { useV2Corridors } from "./useV2Corridors";
import { claimTx, useV2Intent } from "./useV2Intent";
import { useV2Quote } from "./useV2Quote";
import { useV2TwoHopFlow } from "./useV2TwoHopFlow";
import V2OffersFooter from "./V2OffersFooter";
import { chooseRoute, routeCardsOf } from "./routeCards";
import { legRowsOf, marketPricingDown, offerValueOf } from "./offerValue";
import { useV2WalletPort } from "./useV2WalletPort";
import { formatUnitsShort, planIdOf, railNameOf, routeHopsOf, routeKeyOf, selectedOfferView } from "./widgetView";
import { chainKindFor, isNonEvmChain } from "@/lib/wallet/chainKind";
import { hasAdaptersFor, loadAdaptersFor } from "@/lib/wallet/adapters";
import { addressValidFor, canonicalAddressFor, chainIdOfCaip2 } from "./nonEvm";
import { useSolanaSender } from "./useSolanaSender";
import { allowSameChain } from "./solanaSwap";

const client = createCrossV2Client();
type Side = "from" | "to";
export default function CrossV2Flow() {
  const isMobile = useIsMobile();
  const { walletState, walletOptions, onSelectWallet, disconnect } = useWalletConnection();
  const sender = walletState.status === "connected" ? walletState.address : undefined;
  const port = useV2WalletPort(sender);
  const accountSnapshot = useAccountSnapshot(sender ?? null);
  const connectedBalance = useV2Balances();
  const [showWalletModal, setShowWalletModal] = useState(false);
  const [showAccountModal, setShowAccountModal] = useState(false);
  const corridors = useV2Corridors(client);
  const [fromChainId, setFromChainId] = useState(8453);
  const [toChainId, setToChainId] = useState(42161);
  const [fromToken, setFromToken] = useState<V2TokenConfig | undefined>(() => defaultToken(8453));
  const [toToken, setToToken] = useState<V2TokenConfig | undefined>(() => defaultToken(42161));
  const [fromAmount, setFromAmount] = useState("10");
  const [recipient, setRecipient] = useState("");
  const [sourceAddress, setSourceAddress] = useState("");
  const [chainPicker, setChainPicker] = useState<Side | null>(null);
  const [tokenPicker, setTokenPicker] = useState<Side | null>(null);
  const destinations = corridors.destinationsFor(fromChainId);
  const fromChain = corridors.sources.find((c) => c.id === fromChainId) ?? corridors.sources[0]!;
  const toChain = destinations.find((c) => c.id === toChainId) ?? destinations[0] ?? fromChain;
  const solana = useSolanaSender(fromChain.id, sender);
  // A non-EVM source (BTC, Tron, Cosmos...) connects that chain's own wallet and fills the refund address; the EVM modal is only for EVM sources.
  const sourceKind = isNonEvmChain(fromChain.id) && !solana.isSolana ? chainKindFor(fromChain.id) : null;
  const nativeWallet = sourceKind && hasAdaptersFor(sourceKind) ? sourceKind : null;
  const connectNativeSource = async (kind: NonNullable<typeof nativeWallet>) => {
    const adapters = await loadAdaptersFor(kind);
    const installed = adapters.find((a) => a.isInstalled());
    if (!installed) {
      toast.error(adapters[0] ? `Install ${adapters[0].brand} (${adapters[0].installUrl}) or paste your ${fromChain.name} address.` : `Paste your ${fromChain.name} address.`);
      return;
    }
    setSourceAddress((await installed.connect()).address);
  };
  const connectSource = () =>
    solana.isSolana
      ? void solana.connect().catch((e) => toast.error(errText(e)))
      : nativeWallet
        ? void connectNativeSource(nativeWallet).catch((e) => { if (e?.code !== "USER_REJECTED") toast.error(errText(e)); })
        : sourceKind
          ? document.getElementById("cross-v2-source-address")?.focus()
          : setShowWalletModal(true);
  // When the live corridors drop the current pair, move to the first one they offer.
  useEffect(() => {
    if (fromChain.id !== fromChainId) {
      setFromChainId(fromChain.id);
      setFromToken(defaultToken(fromChain.id, fromToken?.ticker));
    }
    if (toChain.id !== toChainId) {
      setToChainId(toChain.id);
      setToToken(defaultToken(toChain.id, toToken?.ticker ?? fromToken?.ticker));
    }
  }, [fromChain.id, toChain.id]); // eslint-disable-line react-hooks/exhaustive-deps
  const fromAsset = fromToken ? assetIdOf(fromToken) : "";
  const toAsset = toToken ? assetIdOf(toToken) : "";
  // A Solana source quotes with Phantom's address, or a pasted one so offers show before Phantom is connected; signing still needs Phantom.
  const solanaAddress = solana.isSolana ? solana.sender ?? (canonicalAddressFor(fromChain.id, sourceAddress) || undefined) : undefined;
  const needsPhantom = solana.isSolana && !solana.sender;
  const recipientOrSender = allowSameChain(fromChain.id, toChain.id) ? solanaAddress ?? "" : canonicalAddressFor(toChain.id, recipient) || (isNonEvmChain(toChain.id) ? "" : sender || "");
  const recipientValid = addressValidFor(toChain.id, recipientOrSender);
  const quoteSender = solana.isSolana ? solanaAddress : isNonEvmChain(fromChain.id) ? canonicalAddressFor(fromChain.id, sourceAddress) : sender;
  const [showConfirm, setShowConfirm] = useState(false);
  const [executing, setExecuting] = useState(false);
  const quote = useV2Quote(
    client,
    {
      fromAsset, fromDecimals: fromToken?.decimals ?? 18, toAsset, amount: fromAmount, sender, sourceAddress: solana.isSolana ? solanaAddress ?? "" : sourceAddress,
      recipient: recipientOrSender, paused: showConfirm || executing,
    },
    errText,
  );
  const [pickedPlanId, setPickedPlanId] = useState<string | null>(null);
  // Nothing is blocked (owner decision 2026-11-24): a held-back route is shown with its value and the user may pick it; its label is accepted at commit.
  const { chosen, chosenAssessment, humanAcceptance } = chooseRoute(quote.offers, quote.withheld, quote.substitutes.flatMap((s) => s.offers), pickedPlanId);
  // A two-order route is only ever used when the user picks it (keyed by its intermediate chain and asset, so a re-quote keeps the pick).
  const [pickedTwoHop, setPickedTwoHop] = useState<string | null>(null);
  const twoHopKey = quote.twoHop ? `${quote.twoHop.viaChain}|${quote.twoHop.viaAsset}` : null;
  const twoHop = !chosen && quote.twoHop?.check.ok && twoHopKey === pickedTwoHop ? quote.twoHop : null;
  const viaName = twoHop ? (corridors.sources.find((c) => `eip155:${c.id}` === twoHop.viaChain)?.name ?? twoHop.viaChain) : "";
  const journeyFlow = useV2TwoHopFlow(client, sender, port, errText);
  const chosenToAsset = chosen?.offer.execution.plan.journey.toAsset ?? toAsset;
  const delivers = chosen?.offer.execution.plan.delivers;
  // the output field shows what the chosen route really delivers (a substitute delivers another token than the one picked)
  // (only a substitute: a route for the requested token keeps the picked token, also while a re-quote for a new pick is in flight)
  const outToken = outputTokenOf(toChainId, toToken, delivers && !delivers.isRequested ? delivers.asset : undefined);
  const [gasEnabled, setGasEnabled] = useState(true);
  const gas = quote.gasTopUp?.offer;
  const primaryPlan = chosen?.offer.execution.plan;
  const gasOffer = gas?.check.ok && primaryPlan && primaryPlan.compiled.rail !== "gaszip" && !(primaryPlan.compiled.rail === "garden" && primaryPlan.journey.from.asset.includes("/slip44:")) && gas.offer.journey.toAsset.split("/")[0] === chosenToAsset.split("/")[0] && gas.offer.journey.recipient === primaryPlan.journey.recipient ? gas : null;
  useEffect(() => setGasEnabled(true), [gas?.offer.execution.plan.hash, primaryPlan?.hash]);

  const fromPrice = useUnifiedPrice(fromChainId, fromToken?.ticker, fromToken?.address);
  const toPrice = useUnifiedPrice(toChainId, toToken?.ticker, toToken?.address);
  const priceOf = useCallback((asset: string) => (asset === fromAsset ? fromPrice : asset === toAsset ? toPrice : null), [fromAsset, toAsset, fromPrice, toPrice]);
  const ticker = useCallback((asset: string) => tickerForAsset(asset) ?? asset.split("/").pop()?.slice(0, 10) ?? asset, []);
  const routes = routeCardsOf(quote.offers, quote.withheld, chosen ? planIdOf(chosen.offer) : null, ticker);
  // the server's own USD value of what the chosen route delivers; the page's price only for the token the user picked
  const outUsd = chosen ? offerValueOf(chosen.offer, ticker)?.outUsd : undefined;
  const steps = chosen ? legRowsOf(chosen.offer, ticker, (c) => v2ChainById(chainIdOfCaip2(c) ?? NaN)?.name ?? c) : [];
  const view = useMemo(
    () =>
      chosen
        ? selectedOfferView(chosen.offer.journey, railNameOf(chosen.offer), ticker, priceOf, chosen.offer.sponsoredRelayerFee)
        : twoHop
          ? selectedOfferView(twoHop.journey, `Two orders via ${viaName}`, ticker, priceOf)
          : null,
    [chosen, twoHop, viaName, ticker, priceOf],
  );
  const { data: fromBalance } = useBalance({
    address: sender as Address | undefined,
    chainId: fromChainId as never,
    token: fromToken && !fromToken.isNative && fromToken.address ? (fromToken.address as Address) : undefined,
    query: { enabled: Boolean(sender && fromToken && !isNonEvmChain(fromChainId)) },
  });
  const fromBalanceNum = fromBalance ? Number(formatUnits(fromBalance.value, fromBalance.decimals)) : 0;
  const amountNum = Number(fromAmount.replace(/,/g, ""));
  const [stepNote, setStepNote] = useState<string | null>(null);
  const [deposit, setDeposit] = useState<{ instruction: NonNullable<ExecuteResult["deposit"]>; rail: string; sourceAddress: string; client: typeof client }>();
  const [execError, setExecError] = useState<string | null>(null);
  const [execErrorRef, setExecErrorRef] = useState<string | undefined>(undefined);
  const intent = useV2Intent(client, sender, port, errText);
  const { intentId, status } = intent;
  const [inFlight, setInFlight] = useState(false);
  const commitKeys = useRef(new Map<string, string>());
  async function execute() {
    setShowConfirm(false);
    if (twoHop && port && sender) {
      setExecuting(true);
      const err = await journeyFlow.start(twoHop, { fromAsset, amount: twoHop.journey.input.amount, toAsset, recipient: recipientOrSender }, setStepNote);
      setExecuting(false);
      if (err) toast.error(err);
      return;
    }
    if (!chosen || !quoteSender || (!port && !isNonEvmChain(fromChainId))) return;
    // Re-check at the moment of signing: the quote may have aged while the user read it.
    const recheck = checkOffer(chosen.offer, {
      fromAsset, amount: chosen.offer.execution.plan.journey.from.amount, toAsset: chosenToAsset, sender: quoteSender!, recipient: recipientOrSender, now: Math.floor(Date.now() / 1000), allowHeldBack: Boolean(humanAcceptance),
    });
    const gasCheck = gasEnabled && gasOffer ? checkOffer(gasOffer.offer, { fromAsset: gasOffer.offer.journey.input.asset, amount: gasOffer.offer.journey.input.amount, toAsset: gasOffer.offer.journey.toAsset, sender: quoteSender, recipient: recipientOrSender, now: Math.floor(Date.now() / 1000), allowHeldBack: true }) : null;
    if (gasCheck && !gasCheck.ok) { setExecError("Gas quote expired or changed. Refresh before signing."); return; }
    setInFlight(true);
    intent.clear();
    setExecErrorRef(undefined);
    setDeposit(undefined);
    if (!recheck.ok) {
      setExecError(`This route can no longer be signed: ${recheck.problems[0]}. Refresh the quote.`);
      return;
    }
    setExecuting(true);
    setExecError(null);
    const plan = recheck.plan;
    const selectionKey = `${plan.hash}:${gasCheck?.ok ? gasCheck.plan.hash : "plain"}`;
    const commitKey = commitKeys.current.get(selectionKey) ?? `commit-${crypto.randomUUID()}`;
    commitKeys.current.set(selectionKey, commitKey);
    const record: StoredIntent = { intentId: "", createdAt: Date.now(), fromChain: fromAsset.split("/")[0], toChain: chosenToAsset.split("/")[0]!, toAsset: chosenToAsset, rail: plan.compiled.rail, sourceTxs: [] };
    try {
      const r = await executeCheckedPlan(client, { plan, journey: chosen.offer.journey }, recheck.sourceChainId, port, {
        commitKey,
        sender: quoteSender, solanaWallet: solana.wallet,
        humanAcceptance,
        ...(gasCheck?.ok && gasOffer ? { gasTopUp: { offer: gasOffer.offer, sourceChainId: gasCheck.sourceChainId } } : {}),
        onComposition: (id) => { record.compositionId = id; },
        onCommitted: (id) => { record.intentId = id; intent.track({ ...record }); },
        onSent: (t) => {
          record.sourceTxs = [...record.sourceTxs, { chainId: t.chainId, hash: t.hash, stepId: t.stepId }];
          if (record.intentId) intent.track({ ...record });
        },
        onStep: (id, phase) => setStepNote(phase === "wallet" ? `Confirm in your wallet (${id})` : phase === "confirming" ? `Waiting for confirmation (${id})` : null),
      });
      record.intentId = r.intentId;
      if (r.deposit) setDeposit({ instruction: r.deposit, rail: plan.compiled.rail, sourceAddress: quoteSender, client });
      intent.track({ ...record });
      if (r.waiting.length) setExecError(`Steps still waiting: ${r.waiting.join(", ")}`);
      if (r.gasError) setExecError(`Transfer submitted. Gas top-up: ${r.gasError}`);
      if (r.tracking === "unavailable" || r.tracking === "failed")
        toast.info("Sent. Live tracking for this provider is not linked yet, so the status may stay pending: check the provider's explorer.");
    } catch (e) {
      const v = describeV2Error(e);
      setExecError(v.text);
      setExecErrorRef(v.requestId);
      if (v.requote) { setShowConfirm(false); quote.refresh(); }
    } finally {
      setStepNote(null);
      setExecuting(false);
    }
  }

  const toasted = useRef<string | null>(null);
  useEffect(() => {
    if (!intentId || toasted.current === intentId) return;
    if (intent.composition?.state === "delivered_without_gas") { toasted.current = intentId; toast.info("Delivered, gas top-up failed"); }
    else if ((!intent.composition || intent.composition.state === "delivered") && (status?.status === "delivered" || status?.status === "claimed")) { toasted.current = intentId; toast.success("Delivered"); }
  }, [intentId, status?.status, intent.composition?.state]);
  async function claimParked() {
    const err = await intent.claim();
    if (err) toast.error(err);
    else toast.info("Claim sent. The status updates once it confirms.");
  }

  const selectChain = (side: Side, c: PickerChain) => {
    if (side === "from") {
      setFromChainId(c.id);
      setFromToken(defaultToken(c.id, fromToken?.ticker));
    } else {
      setToChainId(c.id);
      setToToken(defaultToken(c.id, toToken?.ticker ?? fromToken?.ticker));
    }
    setPickedPlanId(null);
    setChainPicker(null);
  };
  const selectToken = (side: Side, t: PickerToken) => {
    const hit = v2Tokens(side === "from" ? fromChainId : toChainId).find((x) => assetIdOf(x) === t.tokenKey);
    if (side === "from") setFromToken(hit);
    else setToToken(hit);
    setPickedPlanId(null);
    setTokenPicker(null);
  };
  const flip = () => {
    setFromChainId(toChainId);
    setToChainId(fromChainId);
    setFromToken(toToken);
    setToToken(fromToken);
    setPickedPlanId(null);
  };

  const chainList = (side: Side): PickerChain[] =>
    (side === "from" ? corridors.sources : destinations).map((c) => ({ id: c.id, name: c.name, ticker: c.ticker, color: c.color, kind: c.kind, tier: c.tier }));
  const pickerTokens = (side: Side): PickerToken[] => {
    const chainId = side === "from" ? fromChainId : toChainId;
    const chainName = side === "from" ? fromChain.name : toChain.name;
    return v2Tokens(chainId).map((t) => ({
      tokenKey: assetIdOf(t), address: t.address, ticker: t.ticker, name: t.name, chainId, chainName, logoUrl: t.logoUrl, isNative: t.isNative,
      logo: <TokenLogo ticker={t.ticker} chainId={chainId} address={t.address} logoUrl={t.logoUrl} isNative={t.isNative} size={28} />,
    }));
  };

  const sameChain = fromChainId === toChainId && !allowSameChain(fromChainId, toChainId);
  // A provider's own fee in the source chain's gas token, sent on top of the transfer (shown before signing).
  const extraNative = chosen?.check.extraNative;
  const extraNativeText = extraNative ? `${formatUnitsShort({ amount: extraNative.toString(), decimals: 18 })} ${fromChain.ticker}` : null;
  // What the user must know before signing the chosen route, in the order it matters (also shown in the confirm modal).
  const routeWarning = !chosen
    ? undefined
    : delivers && !delivers.isRequested
      ? `This route delivers ${ticker(delivers.asset)}, not ${toToken?.ticker ?? "the token you picked"}.`
      : chosenAssessment
        ? `${quote.offers.length ? "This route did not pass the automatic value check" : "No route passed the automatic value check. Compare the routes and pick one"}. Selected: ${offerValueOf(chosen.offer, ticker)?.note ?? chosenAssessment.label}. Reviewing it accepts this.`
        : delivers?.fallback
          ? `If the swap on arrival cannot meet the minimum, you receive at least ${formatUnitsShort({ amount: delivers.fallback.minAmount, decimals: chosen.offer.journey.expectedOutput.decimals })} ${ticker(delivers.fallback.asset)} instead.`
          : chosen.offer.journey.outputGuarantee === "estimate_only"
            ? "This route only estimates the output: there is no guaranteed minimum."
            : undefined;
  const notice = sameChain
    ? { tone: "error" as const, text: "Pick two different chains for a cross-chain transfer." }
    : quote.error
      ? { tone: "error" as const, text: quote.error }
      : chosen && !chosen.check.ok
        ? { tone: "error" as const, text: `Route failed the local check: ${chosen.check.problems[0]}` }
        : routeWarning
          ? { tone: "info" as const, text: routeWarning }
          : marketPricingDown([...quote.offers, ...quote.withheld].map((o) => o.offer))
            ? { tone: "info" as const, text: "Market pricing is unavailable right now: routes are labelled and values could not be checked." }
            : undefined;
  const railsMessage =
    quote.state === "empty"
      ? // The server's own reason text is for integrators: say what the user can do instead.
        quote.substitutes.length
        ? `No route delivers ${toToken?.ticker ?? "this token"} right now. The routes below deliver another token instead.`
        : quote.twoHop || quote.belowMinimum.length
          ? "No automatic route: see the options below."
          : "No route is available for this transfer right now."
      : quote.state === "idle"
        ? solana.isSolana ? "Connect Phantom or paste your Solana address, and choose a recipient, to fetch offers." : isNonEvmChain(fromChainId) ? "Enter the source and recipient addresses to fetch offers." : "Connect a wallet to fetch live cross-chain offers."
        : quote.error ?? undefined;
  const quoting = Boolean(quoteSender) && (quote.state === "loading" || (quote.state === "refreshing" && quote.forNewInput));
  const routeJourney = chosen?.offer.journey ?? twoHop?.journey;
  const routeHops = useMemo(
    () => (routeJourney ? routeHopsOf(routeJourney, ticker, (c) => v2ChainById(chainIdOfCaip2(c) ?? NaN)) : []),
    [routeJourney, ticker],
  );
  const walletDisplay = walletState.status === "connected" ? walletState : null;
  const deliveredLine = status?.deliveredAmount && status.deliveredAsset
    ? `${formatUnitsShort({ amount: status.deliveredAmount, decimals: (toToken && status.deliveredAsset === toAsset ? toToken.decimals : chosen?.offer.journey.expectedOutput.decimals) ?? 18 })} ${ticker(status.deliveredAsset)}`
    : null;

  return (
    <div style={{ minHeight: "100vh", background: "#05050c", color: "#fff", fontFamily: "Inter, sans-serif" }}>
      <DappNavbar
        activeHref="/cross-v2"
        controls={
          <>
            <NetworkSelector
              name={walletDisplay?.chain.name ?? fromChain.name}
              color={walletDisplay?.chain.color ?? fromChain.color}
              logo={<ChainLogo chainId={walletDisplay?.chain.id ?? fromChainId} symbol={(walletDisplay?.chain.name ?? fromChain.name).slice(0, 3).toUpperCase()} bg={walletDisplay?.chain.color ?? fromChain.color} size={14} />}
              onClick={() => setChainPicker("from")}
            />
            <WalletButton
              connected={Boolean(sender)}
              address={sender}
              balanceUSD={accountSnapshot.balanceUSD}
              onConnect={() => setShowWalletModal(true)}
              onClick={() => setShowAccountModal(true)}
            />
          </>
        }
      />
      <WidgetKitKeyframes />

      <main style={{ maxWidth: 480 + (isMobile ? 32 : 40), margin: "0 auto", padding: isMobile ? "24px 16px 40px" : "38px 20px 48px", display: "flex", flexDirection: "column", alignItems: "center" }}>
        <EmpxCrossWidget
          fromChain={{ id: fromChain.id, name: fromChain.name, color: fromChain.color, logo: <ChainLogo chainId={fromChainId} symbol={fromChain.name.slice(0, 3).toUpperCase()} bg={fromChain.color} size={17} /> }}
          fromToken={fromToken ? { ticker: fromToken.ticker, logo: <TokenLogo ticker={fromToken.ticker} chainId={fromChainId} address={fromToken.address} logoUrl={fromToken.logoUrl} isNative={fromToken.isNative} size={30} /> } : null}
          fromAmount={fromAmount}
          fromBalance={fromBalance && fromToken ? `${fromBalanceNum.toLocaleString(undefined, { maximumFractionDigits: 6 })} ${fromToken.ticker}` : undefined}
          fromUsdValue={fromPrice != null && Number.isFinite(amountNum) ? amountNum * fromPrice : null}
          onFromAmountChange={(v) => { setFromAmount(v); setPickedPlanId(null); }}
          onSelectFromToken={() => setTokenPicker("from")}
          onSelectFromChain={() => setChainPicker("from")}
          onPercentClick={(pct) => setFromAmount(String((fromBalanceNum * pct) / 100))}
          toChain={{ id: toChain.id, name: toChain.name, color: toChain.color, logo: <ChainLogo chainId={toChainId} symbol={toChain.name.slice(0, 3).toUpperCase()} bg={toChain.color} size={17} /> }}
          toToken={outToken ? { ticker: outToken.ticker, logo: <TokenLogo ticker={outToken.ticker} chainId={toChainId} address={outToken.address} logoUrl={outToken.logoUrl} isNative={outToken.isNative} size={30} /> } : null}
          toAmount={quoting ? "..." : view?.toAmount ?? "0"}
          toUsdValue={outUsd ?? (view && toPrice != null && outToken === toToken ? Number(view.toAmount.replace(/,/g, "")) * toPrice : null)}
          onSelectToToken={() => setTokenPicker("to")}
          onSelectToChain={() => setChainPicker("to")}
          destinationSlot={
            <V2AddressFields fromChain={fromChain} toChain={toChain} sourceAddress={sourceAddress} setSourceAddress={setSourceAddress}
              recipient={recipient} setRecipient={setRecipient} solana={solana.isSolana} solanaSender={solana.sender} evmSender={sender} />
          }
          railName={view?.railName}
          routeHops={routeHops}
          steps={steps}
          railBadge={view?.railBadge}
          protocolFeeBps={view?.protocolFeeBps}
          protocolFeeUSD={view?.protocolFeeUSD}
          bridgeFeeUSD={view?.bridgeFeeUSD}
          relayerFeeUSD={view?.relayerFeeUSD} feeRows={view?.feeRows}
          estimatedTime={view?.estimatedTime}
          minimumReceived={view?.minimumReceived}
          slippageBps={view?.slippageBps}
          rails={routes.cards}
          onSelectRail={(name) => {
            const hit = routes.offerOf(name);
            if (hit) setPickedPlanId(routeKeyOf(hit.offer));
          }}
          railsFooter={
            sameChain ? undefined : (
              <V2OffersFooter
                gasTopUp={gasOffer ? { offer: gasOffer.offer, reason: quote.gasTopUp!.reason, enabled: gasEnabled, chain: toChain.name, onToggle: () => setGasEnabled(v => !v) } : undefined}
                substitutes={quote.substitutes}
                twoHop={quote.twoHop}
                selectedPlanId={chosen ? planIdOf(chosen.offer) : null}
                ticker={ticker}
                onPick={(id) => { const o = [...quote.offers, ...quote.withheld, ...quote.substitutes.flatMap((s) => s.offers)].find((x) => planIdOf(x.offer) === id); setPickedPlanId(o ? routeKeyOf(o.offer) : id); }}
                twoHopSelected={Boolean(twoHop)}
                onPickTwoHop={() => setPickedTwoHop(twoHopKey)}
                belowMinimum={quote.belowMinimum}
                onUseAmount={(m) => { setFromAmount(formatUnits(BigInt(m.amount), m.decimals)); setPickedPlanId(null); }}
              />
            )
          }
          railsState={sameChain ? "idle" : quote.state === "empty" && routes.cards.length ? "ready" : quote.state} railsPending={quote.streaming}
          railsMessage={sameChain ? "Pick two different chains." : railsMessage}
          walletConnected={Boolean(quoteSender)}
          onConnect={connectSource} connectLabel={solana.isSolana ? "Connect Phantom" : nativeWallet ? `Connect ${fromChain.name} wallet` : sourceKind ? `Enter ${fromChain.name} address` : undefined}
          onSwap={() => { if (needsPhantom) return connectSource(); if (chosen) setPickedPlanId(routeKeyOf(chosen.offer)); setShowConfirm(true); }}
          onFlip={flip}
          swapDisabled={!(chosen?.check.ok || twoHop) || (!port && !isNonEvmChain(fromChainId)) || executing || sameChain || !recipientValid || quoting}
          swapLoading={quoting || executing}
          swapLabel={!quoteSender ? "Connect wallet" : needsPhantom && !quoting && (chosen || twoHop) ? "Connect Phantom to sign" : quoting ? "Fetching route..." : chosen || twoHop ? "Review route" : quote.twoHop?.check.ok ? "Pick the two-step route" : "No route"}
          quote={quoteSender && quote.issuedAt ? { issuedAt: quote.issuedAt, validMs: quote.validMs, onRefresh: () => { quote.refresh(); toast.info("Quote refreshed"); } } : undefined}
          notice={notice}
        />

        {journeyFlow.journeyId && journeyFlow.stored && (
          <CrossV2JourneyPanel
            journeyId={journeyFlow.journeyId}
            j={{ ...journeyFlow.j, stepNote: journeyFlow.j.stepNote ?? (executing ? stepNote : null) }}
            fromChain={journeyFlow.stored.fromChain}
            viaChain={journeyFlow.stored.viaChain}
            toChain={journeyFlow.stored.toChain}
            ticker={ticker}
            onDone={() => { journeyFlow.clear(); setPickedTwoHop(null); quote.refresh(); }}
          />
        )}

        {(inFlight || intentId) && (
          <CrossV2ExecutionPanel
            stepNote={stepNote}
            deposit={deposit}
            intentId={intentId}
            status={status}
            composition={intent.composition}
            delivered={deliveredLine}
            error={execError ?? intent.pollError}
            errorRef={execErrorRef}
            sentTxs={intent.stored?.sourceTxs}
            rail={intent.stored?.rail}
            canClaim={Boolean(claimTx(status, sender))}
            claiming={intent.claiming}
            onClaim={() => void claimParked()}
            onDone={() => { setInFlight(false); intent.clear(); setExecError(null); setExecErrorRef(undefined); quote.refresh(); }} onHide={executing ? undefined : () => { setInFlight(false); intent.clear(); }}
          />
        )}
        <TransferHistory entries={intent.history} activeId={intentId} onOpen={(e) => { setExecError(null); intent.track(e); }} ticker={ticker} />
      </main>

      <WalletModal open={showWalletModal} onClose={() => setShowWalletModal(false)} wallets={walletOptions} onSelect={(w) => { onSelectWallet(w); setShowWalletModal(false); }} />

      {chainPicker && (
        <ChainPicker open onClose={() => setChainPicker(null)} chains={chainList(chainPicker)}selectedId={chainPicker === "from" ? fromChainId : toChainId} mode="cross" onSelect={(c) => selectChain(chainPicker, c)} />
      )}
      {tokenPicker && (
        <TokenPicker open onClose={() => setTokenPicker(null)} tokens={pickerTokens(tokenPicker)} showBalances={false} showBadges={false} onSelect={(t) => selectToken(tokenPicker, t)} />
      )}

      <ConfirmTradeModal
        open={showConfirm}
        onClose={() => setShowConfirm(false)}
        onConfirm={execute}
        confirming={executing}
        eyebrow="REVIEW · CROSS-CHAIN · V2"
        title="Confirm transfer"
        fromTicker={fromToken?.ticker ?? ""}
        fromAmount={fromAmount}
        fromChainName={fromChain.name}
        toTicker={chosen ? outToken?.ticker ?? ticker(chosenToAsset) : toToken?.ticker ?? ""}
        toAmount={view?.toAmount ?? "0"}
        toChainName={toChain.name}
        feeRows={view ? [
          { label: "Via rail", value: view.railName },
          ...steps.map((r, i) => ({ label: `Step ${i + 1} · ${r.step}`, value: `${r.detail} · ${r.out}${r.valueText ? ` · ${r.valueText}` : ""}` })),
          { label: "Guarantee", value: view.railBadge },
          ...view.feeRows.map((f, i) => ({ ...f, accent: i === 0 })),
          ...(extraNativeText ? [{ label: "Provider fee (gas token)", value: extraNativeText }] : []),
          ...(gasEnabled && gasOffer ? [{ label: "Independent gas top-up", value: `${formatUnitsShort(gasOffer.offer.journey.expectedOutput)} native for ${formatUnitsShort(gasOffer.offer.journey.input)} ${ticker(gasOffer.offer.journey.input.asset)}` }] : []),
          { label: "Est. time", value: view.estimatedTime },
          { label: "Recipient", value: recipientOrSender ? `${recipientOrSender.slice(0, 6)}…${recipientOrSender.slice(-4)}` : "—", muted: true },
          { label: "Minimum received", value: view.minimumReceived, muted: true },
        ] : []}
        quoteIssuedAt={quote.issuedAt ?? undefined}
        quoteValidMs={quote.validMs ?? undefined}
        onRefreshQuote={quote.refresh}
        warning={
          twoHop
            ? `Two separate orders: you sign the first now; when it lands, the funds wait in your own wallet on ${viaName} until you sign the second.`
            : routeWarning
        }
      />

      {walletDisplay && (
        <AccountModal
          open={showAccountModal}
          onClose={() => setShowAccountModal(false)}
          address={walletDisplay.address}
          providerName={walletDisplay.providerName}
          chainName={walletDisplay.chain.name}
          chainColor={walletDisplay.chain.color}
          balanceUSD={accountSnapshot.balanceUSD}
          portfolioStatus={accountSnapshot.status}
          activityAvailable={false}
          tokens={accountSnapshot.tokens}
          networks={accountSnapshot.networks}
          nativeBalance={connectedBalance.nativeBalance}
          nativeTicker={connectedBalance.nativeTicker}
          explorerUrl={getExplorerAddressUrl(fromChainId, walletDisplay.address) ?? undefined}
          onCopy={() => toast.success("Address copied")}
          onSwitchNetwork={() => { setShowAccountModal(false); setChainPicker("from"); }}
          onSwitchWallet={() => { setShowAccountModal(false); setShowWalletModal(true); }}
          onDisconnect={() => { setShowAccountModal(false); disconnect(); toast.info("Wallet disconnected"); }}
        />
      )}

      <DappFooter />
      <Toaster />
    </div>
  );
}
