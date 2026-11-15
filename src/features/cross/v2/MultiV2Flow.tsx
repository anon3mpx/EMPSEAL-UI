import { useEffect, useMemo, useRef, useState } from "react";
import { isAddress } from "viem";
import EmpxMultiWidget from "../../../design-system/EmpxMultiWidget";
import {
  AccountModal, ChainPicker, DappFooter, DappNavbar, TokenLogo, TokenPicker, WalletButton, WalletModal, Toaster, toast, useIsMobile,
} from "../../../design-system/components";
import { getV2Chain } from "../../../design-system/data/v2ChainView";
import { toMultiPickerToken } from "../../../design-system/data/multiV2Adapters";
import { useWalletConnection } from "../../../design-system/hooks/useWalletConnection";
import { Disclosure, MicroLabel, WidgetKitKeyframes, wk } from "../../../design-system/widgetKit";
import type { MultiOutputLeg } from "../../../design-system/EmpxMultiWidget";
import { BASKET_MODES, MODE_LABEL } from "../../basket/model/modes";
import type { BasketMode } from "../../basket/api/contracts";
import type { BasketUiInput } from "../../basket/model/quoteRequest";
import type { V2LiquidateQuote, V2WalletScanRequest } from "../../basket/api/contracts";
import { mapV2WalletScan, type MappedWalletScanAsset } from "../../basket/model/walletScan";
import { buildV2BasketRequest } from "./basketRequest";
import type { V2BasketUiOutput } from "./basketRequest";
import { createCrossV2Client } from "./client";
import { useV2Basket } from "./useV2Basket";
import { useV2WalletPort } from "./useV2WalletPort";
import { assetIdOf, assetInfo, v2ChainById, v2Chains, v2Tokens } from "./assets";
import type { BasketPlanRequest } from "./basketTypes";
import { BasketV2Review, chainLogoNode, columnStyle, ConstraintChip, Note, SmallButton } from "./MultiV2Panels";
import { feeAmountsOf, useV2BasketPreview } from "./useV2BasketPreview";
import { feeUsd, formatEta, formatUnitsShort } from "./widgetView";
import { openBaskets } from "./journeyStore";
import BasketV2Progress from "./BasketV2Progress";

type Mode = BasketMode;
type Target = { side: "input" | "output"; id: string };
const client = createCrossV2Client();
const SLIPPAGE_BPS_PRESETS = [10, 50, 100, 300];
/** The picker token behind a leg (an explicit selection, else the chain's token with that ticker). */
const legToken = (chainId: number, ticker: string, address?: string) =>
  v2Tokens(chainId).find((t) => (address !== undefined ? t.address === address : t.ticker === ticker)) ?? v2Tokens(chainId).find((t) => t.ticker === ticker);
const tokenLogoNode = (chainId: number, ticker: string, address?: string, size = 22) => {
  const t = legToken(chainId, ticker, address);
  return <TokenLogo ticker={ticker} chainId={chainId} address={t?.address} logoUrl={t?.logoUrl} isNative={t?.isNative} size={size} />;
};
const chainView = (chainId: number) => ({ id: chainId, name: v2ChainById(chainId)?.name ?? String(chainId), logo: chainLogoNode(chainId) });
const modes = BASKET_MODES.map(value => ({value, label: value === "wallet-liquidator" ? "Sweep wallet" : MODE_LABEL[value]}));

export default function MultiV2Flow() {
  const { walletState, walletOptions, onSelectWallet, disconnect } = useWalletConnection();
  const sender = walletState.status === "connected" ? walletState.address : undefined;
  const wallet = useV2WalletPort(sender);
  const [showWallet, setShowWallet] = useState(false);
  const [showAccount, setShowAccount] = useState(false);
  const isMobile = useIsMobile();
  /** Destination asset per leg id, from the request that planned the basket on screen (LegView does not carry it). */
  const [plannedTo, setPlannedTo] = useState<Record<string, string>>({});
  const [mode, setMode] = useState<Mode>("multi-to-one");
  const [inputs, setInputs] = useState<Array<BasketUiInput & { id: string }>>([{ id: "in-0", chainId: 8453, ticker: "ETH", amount: "" }]);
  const [outputs, setOutputs] = useState<Array<V2BasketUiOutput & { id: string }>>([
    { id: "out-0", chainId: 42161, ticker: "USDC", allocationBps: 10000 },
  ]);
  const [slippageBps, setSlippageBps] = useState(50);
  const [chainTarget, setChainTarget] = useState<Target | null>(null);
  const [tokenTarget, setTokenTarget] = useState<Target | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);
  const [scanAssets, setScanAssets] = useState<MappedWalletScanAsset[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [scanMessages, setScanMessages] = useState<string[]>([]);
  const [skipped, setSkipped] = useState<V2LiquidateQuote["skipped"]>([]);
  const [scanRequest, setScanRequest] = useState<V2WalletScanRequest | null>(null);
  const scanController = useRef(new AbortController());
  const evmChains = v2Chains().filter(c => c.kind === "EVM");
  const [scanChains, setScanChains] = useState<number[]>(evmChains.slice(0, 10).map(c => c.id));
  useEffect(() => {
    scanController.current.abort();
    scanController.current = new AbortController();
    setScanAssets([]); setSelected([]); setScanMessages([]); setSkipped([]); setScanRequest(null); setScanning(false);
    return () => scanController.current.abort();
  }, [sender, mode]);
  async function scan() {
    if (!sender || scanning) return;
    scanController.current.abort();
    const controller = new AbortController();
    scanController.current = controller;
    setScanning(true); setFormError(null); setSkipped([]);
    const tokensByChain: Record<number, string[]> = {};
    let remaining = 200;
    for (const id of scanChains.slice(0, 10)) {
      const tokens = v2Tokens(id).filter(t => !t.isNative && t.address && !/^0x(0{40}|e{40})$/i.test(t.address));
      tokensByChain[id] = tokens.slice(0, Math.min(50, remaining)).map(t => t.address!.toLowerCase());
      remaining -= tokensByChain[id]!.length;
    }
    const request = {wallet: sender, tokensByChain, includeNative: true};
    try {
      const mapped = mapV2WalletScan(await client.scanWallet(request, controller.signal));
      if (controller.signal.aborted) return;
      setScanRequest(request); setScanAssets(mapped.assets);
      setSelected(mapped.assets.filter(a => !a.dust && a.usd !== null).map(a => a.id));
      setScanMessages([...mapped.errors.map(e => `Chain ${e.chainId}: ${e.error}`), ...mapped.unreadable.map(a => `${a}: unreadable`)]);
    } catch (e) {
      if (!controller.signal.aborted) setFormError(e instanceof Error ? e.message : String(e));
    } finally { if (!controller.signal.aborted) setScanning(false); }
  }
  async function liquidate() {
    if (!scanRequest || !sender || scanning || selected.length === 0) return;
    const target = outputs[0]!;
    const token = v2Tokens(target.chainId).find(t => target.token ? t.address === target.token : t.ticker === target.ticker);
    if (!token) { setFormError("Select a target token"); return; }
    const signal = scanController.current.signal;
    setScanning(true); setFormError(null);
    try {
      const quote = await client.liquidateQuote({...scanRequest, target: assetIdOf(token), recipient: target.recipient?.trim() || sender, include: selected, slippageBps, maxTier: 3}, signal);
      if (signal.aborted) return;
      setSkipped(quote.skipped);
      const mapped = mapV2WalletScan(quote.scan);
      setScanMessages([...mapped.errors.map(e => `Chain ${e.chainId}: ${e.error}`), ...mapped.unreadable.map(a => `${a}: unreadable`)]);
      if (quote.basket) {
        const target = assetIdOf(token);
        setPlannedTo(Object.fromEntries(quote.basket.legs.map((l) => [l.legId, target])));
        await basket.resume(quote.basket.basketId);
      }
      else setFormError("No selected balances are eligible for liquidation.");
    } catch (e) {
      if (!signal.aborted) setFormError(e instanceof Error ? e.message : String(e));
    } finally { if (!signal.aborted) setScanning(false); }
  }
  const ctx = useMemo(
    () => ({ fromAsset: "", amount: "", toAsset: "", sender: sender ?? "", recipient: sender ?? "", now: Math.floor(Date.now() / 1000) }),
    [sender],
  );
  const basket = useV2Basket(client, wallet, ctx);
  const busy = basket.phase === "planning";
  const editing = !basket.view;
  const usesAllocation = mode === "one-to-many" || mode === "many-to-many";
  const legCount = mode === "wallet-liquidator" ? Math.min(10, selected.length) : inputs.length * outputs.length;
  const tokenLeg = tokenTarget ? (tokenTarget.side === "input" ? inputs : outputs).find((l) => l.id === tokenTarget.id) : undefined;
  const tokenChain = tokenLeg ? getV2Chain(tokenLeg.chainId) : undefined;
  const pickerTokens = tokenLeg
    ? v2Tokens(tokenLeg.chainId).map((t) => toMultiPickerToken(t, tokenChain ?? { name: `Chain ${tokenLeg.chainId}`, color: "#888" }))
    : [];
  let blockedReason: string | undefined;
  if (mode === "wallet-liquidator") {
    if (!scanRequest) blockedReason = "Scan your wallet first";
    else if (!selected.length) blockedReason = "Select balances to sweep";
    else if (outputs[0]?.recipient?.trim() && !isAddress(outputs[0].recipient.trim())) blockedReason = "Enter a valid recipient";
  } else if (legCount > 10) blockedReason = "A V2 basket has 1 to 10 legs";
  else if (inputs.some((i) => !/^(0|[1-9]\d*)(\.\d+)?$/.test(i.amount.trim()))) blockedReason = "Enter an amount for every input";
  else if (usesAllocation && outputs.reduce((s, o) => s + o.allocationBps, 0) !== 10000) blockedReason = "Allocations must sum to 100%";
  else if (outputs.some((o) => o.recipient?.trim() && !isAddress(o.recipient.trim()))) blockedReason = "Enter a valid recipient";

  // Live per-leg quotes while composing (not for the sweep: its legs exist only once the server scans and plans them).
  const previewRequest = useMemo<BasketPlanRequest | null>(() => {
    if (!sender || mode === "wallet-liquidator" || blockedReason) return null;
    try {
      return buildV2BasketRequest({ mode, wallet: sender, inputs, outputs, slippageBps, maxTier: 3 });
    } catch {
      return null;
    }
  }, [sender, mode, blockedReason, inputs, outputs, slippageBps]);
  const preview = useV2BasketPreview(client, previewRequest);
  const quotedOutputs = mode === "multi-to-one" ? outputs.slice(0, 1) : outputs;
  const outputQuote = quotedOutputs.map((_, oi) => {
    const legs = preview.legs.filter((_, li) => li % quotedOutputs.length === oi);
    if (!legs.length || legs.some((l) => !l.journey)) return undefined;
    const first = legs[0]!.journey!.expectedOutput;
    const amount = legs.reduce((sum, l) => sum + BigInt(l.journey!.expectedOutput.amount), 0n).toString();
    const price = preview.prices[first.asset];
    const value = Number(formatUnitsShort({ amount, decimals: first.decimals }, 18).replace(/,/g, ""));
    return { amount: formatUnitsShort({ amount, decimals: first.decimals }), usd: price != null ? value * price : undefined };
  });
  const quotedJourneys = preview.legs.flatMap((l) => (l.journey ? [l.journey] : []));
  const allQuoted = preview.state !== "loading" && quotedJourneys.length > 0 && quotedJourneys.length === preview.legs.length;
  const legFees = quotedJourneys.map((j) => feeUsd(feeAmountsOf(j), (a) => preview.prices[a]));
  const totalFeeUSD = allQuoted && legFees.every((f) => f !== undefined) ? legFees.reduce((s, f) => s + f!, 0) : undefined;
  const feeBpsList = quotedJourneys.flatMap((j) => (j.fees.allIn.bps != null ? [j.fees.allIn.bps] : []));
  const feeBps = allQuoted && feeBpsList.length ? Math.round(feeBpsList.reduce((s, b) => s + b, 0) / feeBpsList.length) : undefined;
  const slowest = quotedJourneys.reduce<number | null>((m, j) => (j.etaSec != null && (m == null || j.etaSec > m) ? j.etaSec : m), null);
  const etaNote = !sender ? "Connect a wallet to quote"
    : mode === "wallet-liquidator" ? "Quoted on review"
    : preview.state === "loading" ? "Quoting…"
    : allQuoted ? "Slowest leg governs" : undefined;
  const inputUsd = (l: BasketUiInput) => {
    const t = legToken(l.chainId, l.ticker, l.token);
    const price = t ? preview.prices[assetIdOf(t)] : undefined;
    const n = Number(l.amount);
    return price != null && Number.isFinite(n) && n > 0 ? n * price : undefined;
  };

  // Entering Sweep wallet with a wallet connected scans once; Re-scan handles every later run.
  const autoScannedFor = useRef<string | null>(null);
  useEffect(() => {
    if (mode !== "wallet-liquidator" || !sender || autoScannedFor.current === sender || !scanChains.length) return;
    autoScannedFor.current = sender;
    void scan();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, sender]);

  const toAssetOf = (legId: string) => plannedTo[legId];
  const resumable = sender ? openBaskets(sender).filter((b) => b.basketId !== basket.view?.basketId) : [];
  const widgetOutputs: MultiOutputLeg[] = outputs.map((l, i) => ({
    id: l.id,
    allocationBps: l.allocationBps,
    recipient: l.recipient,
    recipientInvalid: !!l.recipient?.trim() && !isAddress(l.recipient.trim()),
    chain: chainView(l.chainId),
    token: { ticker: l.ticker, logo: tokenLogoNode(l.chainId, l.ticker, l.token) },
    convergedAmount: outputQuote[i]?.amount,
    convergedUsd: usesAllocation ? undefined : outputQuote[i]?.usd,
  }));

  return (
    <div style={{ minHeight: "100vh", background: "#05050c", color: "#fff", fontFamily: "Inter, sans-serif" }}>
      <DappNavbar
        activeHref="/multi-v2"
        controls={
          <WalletButton
            connected={!!sender}
            address={sender}
            onConnect={() => setShowWallet(true)}
            onClick={() => (sender ? setShowAccount(true) : setShowWallet(true))}
          />
        }
      />
      <WidgetKitKeyframes />
      <main
        style={{
          maxWidth: 480 + (isMobile ? 32 : 40), margin: "0 auto", padding: isMobile ? "24px 16px 40px" : "38px 20px 48px",
          display: "flex", flexDirection: "column", alignItems: "center",
        }}
      >
        {editing && (
          <>
            <EmpxMultiWidget
              engine="v2"
              mode={mode}
              modeOptions={modes}
              onModeChange={(next) => {
                if (scanning) return;
                setMode(next);
                if (next === "one-to-many") setInputs(inputs.slice(0, 1));
                if (next === "multi-to-one" || next === "wallet-liquidator") setOutputs([{ ...outputs[0]!, allocationBps: 10000 }]);
              }}
              modeSubtitle={MODE_LABEL[mode]}
              modeBlurb="Each basket leg is a separate V2 intent: legs are quoted, signed and settled independently, so some may finish while others fail."
              modeExample={[]}
              legCount={legCount}
              maxLegs={10}
              inputs={inputs.map((l) => ({
                id: l.id,
                amount: l.amount,
                chain: chainView(l.chainId),
                token: { ticker: l.ticker, logo: tokenLogoNode(l.chainId, l.ticker, l.token) },
                usdValue: inputUsd(l),
              }))}
              outputs={widgetOutputs}
              onInputAmountChange={(id, amount) => setInputs(inputs.map((l) => (l.id === id ? { ...l, amount } : l)))}
              onSelectInputChain={(id) => setChainTarget({ side: "input", id })}
              onSelectInputToken={(id) => setTokenTarget({ side: "input", id })}
              onRemoveInput={(id) => setInputs(inputs.filter((l) => l.id !== id))}
              onAddInput={() => setInputs([...inputs, { id: crypto.randomUUID(), chainId: 8453, ticker: "ETH", amount: "" }])}
              canAddInput={mode !== "one-to-many" && (inputs.length + 1) * outputs.length <= 10}
              onOutputAllocationChange={(id, pct) =>
                setOutputs(outputs.map((l) => (l.id === id ? { ...l, allocationBps: Math.round(pct * 100) } : l)))
              }
              onSelectOutputChain={(id) => setChainTarget({ side: "output", id })}
              onSelectOutputToken={(id) => setTokenTarget({ side: "output", id })}
              onRemoveOutput={(id) => setOutputs(outputs.filter((l) => l.id !== id))}
              onAddOutput={() => setOutputs([...outputs, { id: crypto.randomUUID(), chainId: 42161, ticker: "USDC", allocationBps: 0 }])}
              canAddOutput={usesAllocation && inputs.length * (outputs.length + 1) <= 10}
              onOutputRecipientChange={(id, recipient) => setOutputs(outputs.map((l) => (l.id === id ? { ...l, recipient } : l)))}
              scanRows={scanAssets.map(a => ({
                id: a.id,
                token: { ticker: a.ticker, logo: tokenLogoNode(a.chainId, a.ticker, assetInfo(a.id)?.address, 30) },
                chainName: v2ChainById(a.chainId)?.name ?? String(a.chainId),
                amount: a.amount,
                usdValue: a.usd,
                selected: selected.includes(a.id),
              }))}
              onToggleScanRow={id => { if (!scanning) setSelected(selected.includes(id) ? selected.filter(a => a !== id) : [...selected, id]); }}
              onRescan={() => { if (scanChains.length) void scan(); }}
              scanning={scanning}
              totalFeeUSD={totalFeeUSD}
              feeBps={feeBps}
              estimatedTime={allQuoted ? formatEta(slowest) : undefined}
              etaNote={etaNote}
              blockedReason={scanning ? "Scanning or quoting…" : busy ? "Planning basket…" : blockedReason}
              walletConnected={!!sender}
              onConnect={() => setShowWallet(true)}
              onReview={() => {
                if (!sender || busy) return;
                if (mode === "wallet-liquidator") { void liquidate(); return; }
                try {
                  setFormError(null);
                  const request = buildV2BasketRequest({ mode, wallet: sender, inputs, outputs, slippageBps, maxTier: 3 });
                  setPlannedTo(Object.fromEntries(request.legs.map((l) => [l.legId!, l.toAsset])));
                  void basket.plan(request);
                } catch (e) {
                  setFormError(e instanceof Error ? e.message : String(e));
                }
              }}
            />

            <div style={columnStyle}>
              {preview.legs.filter((l) => l.error).map((l) => (
                <Note key={l.legId} tone="warn">Leg {Number(l.legId.replace(/\D/g, "")) + 1}: {l.error}</Note>
              ))}
              {mode === "wallet-liquidator" && (
                <>
                  <div style={{ height: 1, background: wk.border, margin: "8px 0 0" }} />
                  <Disclosure label={`Scan chains · ${scanChains.length} of ${evmChains.length}`}>
                    <div style={{ display: "flex", gap: 5, flexWrap: "wrap", marginBottom: 10 }}>
                      {evmChains.map(c => (
                        <ConstraintChip
                          key={c.id}
                          disabled={scanning}
                          active={scanChains.includes(c.id)}
                          onClick={() => {
                            setScanChains(scanChains.includes(c.id) ? scanChains.filter(id => id !== c.id) : [...scanChains, c.id].slice(0, 10));
                            setScanRequest(null); setScanAssets([]); setSelected([]);
                          }}
                        >
                          {chainLogoNode(c.id, 14)}{c.name}
                        </ConstraintChip>
                      ))}
                    </div>
                    <p style={{ margin: 0, fontSize: 9.5, color: wk.t3, lineHeight: 1.6 }}>
                      Scans native balances and the first 50 listed tokens per chain, up to 200 tokens and 10 chains. Unpriced balances
                      need explicit selection. Native gas reserves are kept.
                    </p>
                  </Disclosure>
                </>
              )}
              <div style={{ height: 1, background: wk.border, margin: "8px 0 0" }} />
              <Disclosure label={`Constraints · ${(slippageBps / 100).toFixed(2)}% slippage`}>
                <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 8 }}>
                  <span style={{ fontSize: 10.5, color: wk.t3 }}>Slippage tolerance</span>
                  <span style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 10.5, color: wk.t2, fontVariantNumeric: "tabular-nums" }}>{slippageBps} bps</span>
                </div>
                <div style={{ display: "flex", gap: 5, flexWrap: "wrap", alignItems: "center" }}>
                  {SLIPPAGE_BPS_PRESETS.map((bps) => (
                    <ConstraintChip key={bps} active={slippageBps === bps} onClick={() => setSlippageBps(bps)}>{bps / 100}%</ConstraintChip>
                  ))}
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                    <input
                      type="number"
                      step={0.1}
                      min={0}
                      max={100}
                      value={slippageBps / 100}
                      onChange={(e) => setSlippageBps(Math.round(Math.max(0, Math.min(100, Number(e.target.value))) * 100))}
                      aria-label="Custom slippage percent"
                      style={{
                        width: 56, padding: "5px 7px", borderRadius: 4, outline: "none", background: "rgba(255,255,255,.035)",
                        border: "1px solid transparent", color: wk.t1, fontFamily: "'Space Grotesk', sans-serif", fontSize: 10.5, textAlign: "right",
                      }}
                    />
                    <span style={{ fontSize: 10.5, color: wk.t3 }}>%</span>
                  </span>
                </div>
                <p style={{ margin: "12px 0 0", fontSize: 9.5, color: wk.t3, lineHeight: 1.6 }}>Applies to every leg. Max 10 legs per basket.</p>
              </Disclosure>
              {resumable.length > 0 && (
                <div style={{ marginTop: 14 }}>
                  <MicroLabel>Open baskets</MicroLabel>
                  {resumable.map((b) => (
                    <div key={b.basketId} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, padding: "9px 0", borderBottom: `1px solid ${wk.border}` }}>
                      <span style={{ display: "flex", flexDirection: "column", gap: 2, minWidth: 0 }}>
                        <span style={{ fontSize: 11, color: wk.t1, fontFamily: "'Space Grotesk', sans-serif", overflow: "hidden", textOverflow: "ellipsis" }}>{b.basketId}</span>
                        <span style={{ fontSize: 9.5, color: wk.t3 }}>{new Date(b.createdAt).toLocaleString()}</span>
                      </span>
                      <SmallButton disabled={busy} onClick={() => void basket.resume(b.basketId)}>Resume</SmallButton>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
        <div style={columnStyle}>
          {(formError || basket.error) && <Note tone="error" role="alert">{formError ?? basket.error}</Note>}
          {scanMessages.map(message => <Note tone="warn" role="status" key={message}>{message}</Note>)}
          {skipped.length > 0 && (
            <section aria-label="Skipped sweep balances" style={{ marginTop: 12 }}>
              <MicroLabel>Skipped balances</MicroLabel>
              {skipped.map(s => (
                <Note key={s.asset}>{assetInfo(s.asset) ? `${assetInfo(s.asset)!.ticker} on ${v2ChainById(assetInfo(s.asset)!.chainId)?.name ?? s.asset}` : s.asset}: {s.reason}</Note>
              ))}
            </section>
          )}
        </div>
        {basket.view && (basket.phase === "review" || basket.view.status === "quoted") && (
          <BasketV2Review
            view={basket.view}
            toAssetOf={toAssetOf}
            busy={busy}
            canBegin={!!wallet && basket.view.legs.some((l) => l.state !== "skipped" && l.state !== "cancelled")}
            onBegin={() => void basket.begin()}
            onCancel={() => void basket.cancel()}
            onRequote={(legId) => void basket.requote(legId)}
          />
        )}
        {basket.view && basket.phase !== "review" && basket.view.status !== "quoted" && (
          <BasketV2Progress
            view={basket.view}
            client={client}
            wallet={sender}
            busy={busy}
            onRequote={basket.requote}
            onRunLeg={basket.runLeg}
            toAssetOf={toAssetOf}
          />
        )}
      </main>
      {sender && walletState.status === "connected" && (
        <AccountModal
          open={showAccount}
          onClose={() => setShowAccount(false)}
          address={sender}
          providerName={walletState.providerName}
          chainName={walletState.chain?.name}
          chainColor={walletState.chain?.color}
          activityAvailable={false}
          onCopy={() => toast.success("Address copied")}
          onSwitchWallet={() => { setShowAccount(false); setShowWallet(true); }}
          onDisconnect={() => { setShowAccount(false); disconnect(); toast.info("Wallet disconnected"); }}
        />
      )}
      <WalletModal
        open={showWallet}
        onClose={() => setShowWallet(false)}
        wallets={walletOptions}
        onSelect={(w) => {
          setShowWallet(false);
          onSelectWallet(w);
        }}
      />
      <DappFooter />
      <Toaster />
      {chainTarget && (
        <ChainPicker
          open
          onClose={() => setChainTarget(null)}
          mode="cross"
          chains={v2Chains()}
          onSelect={(chain) => {
            const token = v2Tokens(chain.id)[0];
            if (!token) return;
            if (chainTarget.side === "input")
              setInputs(
                inputs.map((l) =>
                  l.id === chainTarget.id
                    ? { ...l, chainId: chain.id, ticker: token.ticker, token: token.address, decimals: token.decimals }
                    : l,
                ),
              );
            else
              setOutputs(
                outputs.map((l) =>
                  l.id === chainTarget.id
                    ? { ...l, chainId: chain.id, ticker: token.ticker, token: token.address, decimals: token.decimals }
                    : l,
                ),
              );
            setChainTarget(null);
          }}
        />
      )}
      {tokenTarget && tokenLeg && (
        <TokenPicker
          open
          onClose={() => setTokenTarget(null)}
          tokens={pickerTokens}
          recent={pickerTokens.slice(0, 4)}
          selected={tokenLeg.ticker}
          onSelect={(t) => {
            const token = v2Tokens(tokenLeg.chainId).find((entry) => entry.ticker === t.ticker);
            if (!token) return;
            if (tokenTarget.side === "input")
              setInputs(
                inputs.map((l) =>
                  l.id === tokenTarget.id ? { ...l, ticker: token.ticker, token: token.address, decimals: token.decimals } : l,
                ),
              );
            else
              setOutputs(
                outputs.map((l) =>
                  l.id === tokenTarget.id ? { ...l, ticker: token.ticker, token: token.address, decimals: token.decimals } : l,
                ),
              );
            setTokenTarget(null);
          }}
        />
      )}
    </div>
  );
}
