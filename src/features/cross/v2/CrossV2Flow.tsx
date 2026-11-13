// EMPX V2 cross-chain page, built from the V1 page's own pieces (navbar, EmpxCrossWidget, pickers, confirm modal, footer) so the two engines
// look like one product and only the data differs. Rendered by CrossEnginePage when the V2 engine is selected (see ../engine.ts).
// Flow: live quote (useV2Quote) -> rail cards -> confirm -> the wallet signs the locally checked plan -> tracking (useV2Intent) to a terminal state.
// Chains come from the live capability corridors. Held-back routes need an explicit accept; two-order journeys and recovery come in later sections.
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { formatUnits, type Address } from "viem";
import { useBalance } from "wagmi";
import DestinationAddressInput from "../../../components/DestinationAddressInput";
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
import { Disclosure, WidgetKitKeyframes } from "../../../design-system/widgetKit";
import type { V2TokenConfig } from "../../../design-system/data/v2TokenView";
import { assetIdOf, defaultToken, tickerForAsset, v2ChainById, v2Tokens } from "./assets";
import { createCrossV2Client } from "./client";
import CrossV2ExecutionPanel from "./CrossV2ExecutionPanel";
import CrossV2JourneyPanel from "./CrossV2JourneyPanel";
import { describeV2Error, errText } from "./errors";
import { executeCheckedPlan, type ExecuteResult } from "./execute";
import { checkOffer } from "./planCheck";
import type { HumanAcceptance } from "./types";
import { useV2Corridors } from "./useV2Corridors";
import { claimTx, useV2Intent } from "./useV2Intent";
import { useV2Quote } from "./useV2Quote";
import { useV2TwoHopFlow } from "./useV2TwoHopFlow";
import V2OffersFooter, { acceptableWithheld } from "./V2OffersFooter";
import { useV2WalletPort } from "./useV2WalletPort";
import { formatUnitsShort, planIdOf, railCardNames, railNameOf, routeHopsOf, selectedOfferView, toRailCards } from "./widgetView";
import { chainKindFor, isNonEvmChain } from "@/lib/wallet/chainKind";
import { addressValidFor } from "./nonEvm";

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
  const recipientOrSender = recipient.trim() || (isNonEvmChain(toChain.id) ? "" : sender || "");
  const recipientValid = addressValidFor(toChain.id, recipientOrSender);
  const quoteSender = isNonEvmChain(fromChain.id) ? sourceAddress.trim() : sender;
  const [showConfirm, setShowConfirm] = useState(false);
  const [executing, setExecuting] = useState(false);
  const quote = useV2Quote(
    client,
    {
      fromAsset, fromDecimals: fromToken?.decimals ?? 18, toAsset, amount: fromAmount, sender, sourceAddress,
      recipient: recipient.trim(), paused: showConfirm || executing,
    },
    errText,
  );
  // Selection: the user's pick while it is still offered (a normal route, an accepted held-back route, or one delivering another token),
  // else the first normal route that passed the local check. Held-back and other-token routes are never selected automatically.
  const [pickedPlanId, setPickedPlanId] = useState<string | null>(null);
  const acceptable = quote.withheld.filter(acceptableWithheld);
  const pool = [...quote.offers, ...acceptable, ...quote.substitutes.flatMap((s) => s.offers)];
  const chosen = pool.find((o) => o.check.ok && planIdOf(o.offer) === pickedPlanId) ?? quote.offers.find((o) => o.check.ok);
  const chosenAssessment = chosen && acceptable.includes(chosen as never) ? chosen.offer.journey.assessment : null;
  const humanAcceptance: HumanAcceptance | undefined =
    chosenAssessment && (chosenAssessment.status === "warning" || chosenAssessment.status === "unpriced") && chosenAssessment.policyVersion
      ? { status: chosenAssessment.status, policyVersion: chosenAssessment.policyVersion }
      : undefined;
  // A two-order route is only ever used when the user picks it (keyed by its intermediate chain and asset, so a re-quote keeps the pick).
  const [pickedTwoHop, setPickedTwoHop] = useState<string | null>(null);
  const twoHopKey = quote.twoHop ? `${quote.twoHop.viaChain}|${quote.twoHop.viaAsset}` : null;
  const twoHop = !chosen && quote.twoHop?.check.ok && twoHopKey === pickedTwoHop ? quote.twoHop : null;
  const viaName = twoHop ? (corridors.sources.find((c) => `eip155:${c.id}` === twoHop.viaChain)?.name ?? twoHop.viaChain) : "";
  const journeyFlow = useV2TwoHopFlow(client, sender, port, errText);
  const chosenToAsset = chosen?.offer.execution.plan.journey.toAsset ?? toAsset;
  const delivers = chosen?.offer.execution.plan.delivers;

  const fromPrice = useUnifiedPrice(fromChainId, fromToken?.ticker, fromToken?.address);
  const toPrice = useUnifiedPrice(toChainId, toToken?.ticker, toToken?.address);
  const priceOf = useCallback((asset: string) => (asset === fromAsset ? fromPrice : asset === toAsset ? toPrice : null), [fromAsset, toAsset, fromPrice, toPrice]);
  const ticker = useCallback((asset: string) => tickerForAsset(asset) ?? asset.split("/").pop()?.slice(0, 10) ?? asset, []);
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
  // Execution
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
    // One commit key per plan: retrying after a network failure replays the same intent instead of creating a second one.
    const plan = recheck.plan;
    const commitKey = commitKeys.current.get(plan.hash) ?? `commit-${crypto.randomUUID()}`;
    commitKeys.current.set(plan.hash, commitKey);
    // Remembered from the commit on, and updated per broadcast, so a stop midway (or a reload) keeps the transfer and its links.
    const record = { intentId: "", createdAt: Date.now(), fromChain: fromAsset.split("/")[0], toChain: chosenToAsset.split("/")[0]!, toAsset: chosenToAsset, rail: plan.compiled.rail, sourceTxs: [] as Array<{ chainId: number; hash: string; stepId?: string }> };
    try {
      const r = await executeCheckedPlan(client, { plan, journey: chosen.offer.journey }, recheck.sourceChainId, port, {
        commitKey,
        sender: quoteSender,
        humanAcceptance,
        onCommitted: (id) => {
          record.intentId = id;
          intent.track({ ...record });
        },
        onSent: (t) => {
          record.sourceTxs = [...record.sourceTxs, { chainId: t.chainId, hash: t.hash, stepId: t.stepId }];
          if (record.intentId) intent.track({ ...record });
        },
        onStep: (id, phase) => setStepNote(phase === "wallet" ? `Confirm in your wallet (${id})` : phase === "confirming" ? `Waiting for confirmation (${id})` : null),
      });
      record.intentId = r.intentId;
      if (r.deposit) setDeposit({ instruction: r.deposit, rail: plan.compiled.rail, sourceAddress: quoteSender, client });
      intent.track({ ...record, sourceTxs: r.txs.map((t) => ({ chainId: t.chainId, hash: t.hash, stepId: t.stepId })) });
      if (r.waiting.length) setExecError(`Steps still waiting: ${r.waiting.join(", ")}`);
      if (r.tracking === "unavailable" || r.tracking === "failed")
        toast.info("Sent. Live tracking for this provider is not linked yet, so the status may stay pending: check the provider's explorer.");
    } catch (e) {
      const v = describeV2Error(e);
      setExecError(v.text);
      setExecErrorRef(v.requestId);
    } finally {
      setStepNote(null);
      setExecuting(false);
    }
  }

  // The server's word on delivery; the toast fires once per transfer.
  const toasted = useRef<string | null>(null);
  useEffect(() => {
    if (!intentId || toasted.current === intentId) return;
    if (status?.status === "delivered" || status?.status === "claimed") {
      toasted.current = intentId;
      toast.success("Delivered");
    }
  }, [intentId, status?.status]);
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

  const sameChain = fromChainId === toChainId;
  // A provider's own fee in the source chain's gas token, sent on top of the transfer (shown before signing).
  const extraNative = chosen?.check.extraNative;
  const extraNativeText = extraNative ? `${formatUnitsShort({ amount: extraNative.toString(), decimals: 18 })} ${fromChain.ticker}` : null;
  // What the user must know before signing the chosen route, in the order it matters (also shown in the confirm modal).
  const routeWarning = !chosen
    ? undefined
    : delivers && !delivers.isRequested
      ? `This route delivers ${ticker(delivers.asset)}, not ${toToken?.ticker ?? "the token you picked"}.`
      : chosenAssessment
        ? `You accepted a held-back route (${chosenAssessment.label}): ${chosenAssessment.reason}`
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
          : quote.degraded
            ? { tone: "info" as const, text: "Market pricing is unavailable right now: routes are labelled and values could not be checked." }
            : undefined;
  const railsMessage =
    quote.state === "empty"
      ? // The server's own reason text is for integrators: say what the user can do instead.
        quote.substitutes.length
        ? `No route delivers ${toToken?.ticker ?? "this token"} right now. The routes below deliver another token instead.`
        : quote.withheld.length || quote.twoHop || quote.belowMinimum.length
          ? "No automatic route: see the options below."
          : "No route is available for this transfer right now."
      : quote.state === "idle"
        ? isNonEvmChain(fromChainId) ? "Enter the source and recipient addresses to fetch offers." : "Connect a wallet to fetch live cross-chain offers."
        : quote.error ?? undefined;
  const quoting = Boolean(quoteSender) && (quote.state === "loading" || (quote.state === "refreshing" && quote.forNewInput));
  const routeJourney = chosen?.offer.journey ?? twoHop?.journey;
  const routeHops = useMemo(
    () => (routeJourney ? routeHopsOf(routeJourney, ticker, (c) => v2ChainById(Number(c.split(":")[1]))) : []),
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
          toToken={toToken ? { ticker: toToken.ticker, logo: <TokenLogo ticker={toToken.ticker} chainId={toChainId} address={toToken.address} logoUrl={toToken.logoUrl} isNative={toToken.isNative} size={30} /> } : null}
          toAmount={quoting ? "..." : view?.toAmount ?? "0"}
          toUsdValue={view && toPrice != null ? Number(view.toAmount.replace(/,/g, "")) * toPrice : null}
          onSelectToToken={() => setTokenPicker("to")}
          onSelectToChain={() => setChainPicker("to")}
          destinationSlot={
            <>
              {isNonEvmChain(fromChain.id) && <DestinationAddressInput id="cross-v2-source-address"
                chainKind={chainKindFor(fromChain.id)!} chainLabel={fromChain.name} value={sourceAddress}
                onChange={setSourceAddress} label={`Your ${fromChain.name} address (refunds go here)`} required />}
              {isNonEvmChain(toChain.id) ? <DestinationAddressInput id="cross-v2-recipient"
                chainKind={chainKindFor(toChain.id)!} chainLabel={toChain.name} value={recipient} onChange={setRecipient}
                label={`Recipient on ${toChain.name} (required)`} required /> :
                <Disclosure label={recipient ? "Recipient · another address" : "Send to another address"}>
                  <DestinationAddressInput id="cross-v2-recipient" chainKind={chainKindFor(toChain.id)!}
                    chainLabel={toChain.name} value={recipient} onChange={setRecipient} label="Recipient (defaults to your wallet)" />
                </Disclosure>}
            </>
          }
          railName={view?.railName}
          routeHops={routeHops}
          railBadge={view?.railBadge}
          protocolFeeBps={view?.protocolFeeBps}
          protocolFeeUSD={view?.protocolFeeUSD}
          bridgeFeeUSD={view?.bridgeFeeUSD}
          relayerFeeUSD={view?.relayerFeeUSD} feeRows={view?.feeRows}
          estimatedTime={view?.estimatedTime}
          minimumReceived={view?.minimumReceived}
          slippageBps={view?.slippageBps}
          rails={toRailCards(quote.offers, chosen ? planIdOf(chosen.offer) : null)}
          onSelectRail={(name) => {
            const hit = quote.offers[railCardNames(quote.offers).indexOf(name)];
            if (hit?.check.ok) setPickedPlanId(planIdOf(hit.offer));
          }}
          railsFooter={
            sameChain ? undefined : (
              <V2OffersFooter
                withheld={quote.withheld}
                substitutes={quote.substitutes}
                twoHop={quote.twoHop}
                selectedPlanId={chosen ? planIdOf(chosen.offer) : null}
                ticker={ticker}
                onPick={setPickedPlanId}
                twoHopSelected={Boolean(twoHop)}
                onPickTwoHop={() => setPickedTwoHop(twoHopKey)}
                belowMinimum={quote.belowMinimum}
                onUseAmount={(m) => { setFromAmount(formatUnits(BigInt(m.amount), m.decimals)); setPickedPlanId(null); }}
              />
            )
          }
          railsState={sameChain ? "idle" : quote.state}
          railsMessage={sameChain ? "Pick two different chains." : railsMessage}
          walletConnected={Boolean(quoteSender)}
          onConnect={() => setShowWalletModal(true)}
          onSwap={() => setShowConfirm(true)}
          onFlip={flip}
          // While a quote is in flight the routes on screen are for the previous input: nothing can be reviewed until it lands.
          swapDisabled={!(chosen?.check.ok || twoHop) || (!port && !isNonEvmChain(fromChainId)) || executing || sameChain || !recipientValid || quoting}
          swapLoading={quoting || executing}
          swapLabel={!quoteSender ? "Connect wallet" : quoting ? "Fetching route..." : chosen || twoHop ? "Review route" : quote.twoHop?.check.ok ? "Pick the two-step route" : "No route"}
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
            delivered={deliveredLine}
            error={execError ?? intent.pollError}
            errorRef={execErrorRef}
            sentTxs={intent.stored?.sourceTxs}
            rail={intent.stored?.rail}
            canClaim={Boolean(claimTx(status, sender))}
            claiming={intent.claiming}
            onClaim={() => void claimParked()}
            onDone={() => { setInFlight(false); intent.clear(); setExecError(null); setExecErrorRef(undefined); quote.refresh(); }}
          />
        )}
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
        toTicker={chosen ? ticker(chosenToAsset) : toToken?.ticker ?? ""}
        toAmount={view?.toAmount ?? "0"}
        toChainName={toChain.name}
        feeRows={view ? [
          { label: "Via rail", value: view.railName },
          { label: "Guarantee", value: view.railBadge },
          ...view.feeRows.map((f, i) => ({ ...f, accent: i === 0 })),
          ...(extraNativeText ? [{ label: "Provider fee (gas token)", value: extraNativeText }] : []),
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
