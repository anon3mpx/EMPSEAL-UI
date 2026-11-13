import { useMemo, useState } from "react";
import { isAddress } from "viem";
import EmpxMultiWidget from "../../../design-system/EmpxMultiWidget";
import { ChainPicker, DappFooter, DappNavbar, TokenPicker, WalletButton, WalletModal, Toaster } from "../../../design-system/components";
import { getV2Chain } from "../../../design-system/data/v2ChainView";
import { toMultiPickerToken } from "../../../design-system/data/multiV2Adapters";
import { useWalletConnection } from "../../../design-system/hooks/useWalletConnection";
import { WidgetKitKeyframes } from "../../../design-system/widgetKit";
import { BASKET_MODES, MODE_LABEL } from "../../basket/model/modes";
import type { BasketMode } from "../../basket/api/contracts";
import type { BasketUiInput } from "../../basket/model/quoteRequest";
import { buildV2BasketRequest } from "./basketRequest";
import type { V2BasketUiOutput } from "./basketRequest";
import { createCrossV2Client } from "./client";
import { useV2Basket } from "./useV2Basket";
import { useV2WalletPort } from "./useV2WalletPort";
import { v2Chains, v2Tokens } from "./assets";
import { openBaskets } from "./journeyStore";
import BasketV2Progress from "./BasketV2Progress";

type Mode = Exclude<BasketMode, "wallet-liquidator">;
type Target = { side: "input" | "output"; id: string };
const client = createCrossV2Client();
const modes = BASKET_MODES.filter((m): m is Mode => m !== "wallet-liquidator").map((value) => ({ value, label: MODE_LABEL[value] }));

export default function MultiV2Flow() {
  const { walletState, walletOptions, onSelectWallet, disconnect } = useWalletConnection();
  const sender = walletState.status === "connected" ? walletState.address : undefined;
  const wallet = useV2WalletPort(sender);
  const [showWallet, setShowWallet] = useState(false);
  const [mode, setMode] = useState<Mode>("multi-to-one");
  const [inputs, setInputs] = useState<Array<BasketUiInput & { id: string }>>([{ id: "in-0", chainId: 8453, ticker: "ETH", amount: "" }]);
  const [outputs, setOutputs] = useState<Array<V2BasketUiOutput & { id: string }>>([
    { id: "out-0", chainId: 42161, ticker: "USDC", allocationBps: 10000 },
  ]);
  const [slippageBps, setSlippageBps] = useState(50);
  const [chainTarget, setChainTarget] = useState<Target | null>(null);
  const [tokenTarget, setTokenTarget] = useState<Target | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const ctx = useMemo(
    () => ({ fromAsset: "", amount: "", toAsset: "", sender: sender ?? "", recipient: sender ?? "", now: Math.floor(Date.now() / 1000) }),
    [sender],
  );
  const basket = useV2Basket(client, wallet, ctx);
  const busy = basket.phase === "planning";
  const editing = !basket.view;
  const usesAllocation = mode !== "multi-to-one";
  const legCount = inputs.length * outputs.length;
  const tokenLeg = tokenTarget ? (tokenTarget.side === "input" ? inputs : outputs).find((l) => l.id === tokenTarget.id) : undefined;
  const tokenChain = tokenLeg ? getV2Chain(tokenLeg.chainId) : undefined;
  const pickerTokens = tokenLeg
    ? v2Tokens(tokenLeg.chainId).map((t) => toMultiPickerToken(t, tokenChain ?? { name: `Chain ${tokenLeg.chainId}`, color: "#888" }))
    : [];
  let blockedReason: string | undefined;
  if (legCount > 10) blockedReason = "A V2 basket has 1 to 10 legs";
  else if (inputs.some((i) => !/^(0|[1-9]\d*)(\.\d+)?$/.test(i.amount.trim()))) blockedReason = "Enter an amount for every input";
  else if (usesAllocation && outputs.reduce((s, o) => s + o.allocationBps, 0) !== 10000) blockedReason = "Allocations must sum to 100%";
  else if (outputs.some((o) => o.recipient?.trim() && !isAddress(o.recipient.trim()))) blockedReason = "Enter a valid recipient";

  return (
    <div style={{ minHeight: "100vh", background: "#05050c", color: "#fff", fontFamily: "Inter, sans-serif" }}>
      <DappNavbar
        activeHref="/multi-v2"
        controls={
          <>
            <WalletButton connected={!!sender} address={sender} onConnect={() => setShowWallet(true)} onClick={() => setShowWallet(true)} />
            {sender && <button onClick={() => disconnect()}>Disconnect</button>}
          </>
        }
      />
      <WidgetKitKeyframes />
      <main style={{ maxWidth: 520, margin: "0 auto", padding: "32px 20px" }}>
        {editing && (
          <>
            <EmpxMultiWidget
              mode={mode}
              modeOptions={modes}
              onModeChange={(next) => {
                if (next === "wallet-liquidator") return;
                setMode(next);
                if (next === "one-to-many") setInputs(inputs.slice(0, 1));
                if (next === "multi-to-one") setOutputs([{ ...outputs[0]!, allocationBps: 10000 }]);
              }}
              modeSubtitle={MODE_LABEL[mode]}
              modeBlurb="Each basket leg is a separate V2 intent."
              modeExample={[]}
              legCount={legCount}
              maxLegs={10}
              inputs={inputs.map((l) => ({
                id: l.id,
                amount: l.amount,
                chain: { id: l.chainId, name: getV2Chain(l.chainId)?.name ?? String(l.chainId) },
                token: { ticker: l.ticker },
              }))}
              outputs={outputs.map((l) => ({
                id: l.id,
                allocationBps: l.allocationBps,
                recipient: l.recipient,
                recipientInvalid: !!l.recipient?.trim() && !isAddress(l.recipient.trim()),
                chain: { id: l.chainId, name: getV2Chain(l.chainId)?.name ?? String(l.chainId) },
                token: { ticker: l.ticker },
              }))}
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
              scanRows={[]}
              blockedReason={busy ? "Planning basket…" : blockedReason}
              walletConnected={!!sender}
              onConnect={() => setShowWallet(true)}
              onReview={() => {
                if (!sender || busy) return;
                try {
                  setFormError(null);
                  void basket.plan(buildV2BasketRequest({ mode, wallet: sender, inputs, outputs, slippageBps, maxTier: 3 }));
                } catch (e) {
                  setFormError(e instanceof Error ? e.message : String(e));
                }
              }}
            />
            <label>
              Slippage (bps){" "}
              <input type="number" min={0} max={10000} value={slippageBps} onChange={(e) => setSlippageBps(Number(e.target.value))} />
            </label>
            {sender &&
              openBaskets(sender).map((b) => (
                <p key={b.basketId}>
                  <button onClick={() => void basket.resume(b.basketId)}>Resume {b.basketId}</button>
                </p>
              ))}
          </>
        )}
        {(formError || basket.error) && <p role="alert">{formError ?? basket.error}</p>}
        {basket.view && (basket.phase === "review" || basket.view.status === "quoted") && (
          <section aria-label="Basket review">
            <h1>Review basket</h1>
            <p>Legs settle independently. Some may finish while others fail.</p>
            <p>
              Version {basket.view.version} · Expires {new Date(basket.view.expiresAt * 1000).toLocaleString()}
            </p>
            {[...basket.view.legs]
              .sort((a, b) => Number(b.state === "skipped") - Number(a.state === "skipped"))
              .map((l) => (
                <article key={l.legId} data-testid="basket-review-leg" style={{ margin: "20px 0" }}>
                  <strong>
                    {l.legId} · {l.state}
                  </strong>
                  {l.reason && <p>{l.reason}</p>}
                  {l.input && (
                    <p>
                      Input: {l.input.amount} base units · {l.input.asset}
                    </p>
                  )}
                  {l.state !== "skipped" && (
                    <>
                      <p>Quoted output: {l.quotedOut ?? "Unknown"} base units</p>
                      <p>Minimum output: {l.minimumOut ?? "No guaranteed minimum"} base units</p>
                      <p>Maximum fee: {l.maxFeeBps ?? "Unknown"} bps</p>
                    </>
                  )}
                  {l.nextAction === "requote" && (
                    <button disabled={busy} onClick={() => void basket.requote(l.legId)}>
                      Re-quote
                    </button>
                  )}
                </article>
              ))}
            <button
              disabled={busy || !wallet || !basket.view.legs.some((l) => l.state !== "skipped" && l.state !== "cancelled")}
              onClick={() => void basket.begin()}
            >
              Begin basket
            </button>
          </section>
        )}
        {basket.view && basket.phase !== "review" && basket.view.status !== "quoted" && (
          <BasketV2Progress
            view={basket.view}
            client={client}
            wallet={sender}
            busy={busy}
            onRequote={basket.requote}
            onRunLeg={basket.runLeg}
          />
        )}
        {basket.view?.status === "quoted" && (
          <button disabled={busy} onClick={() => void basket.cancel()}>
            Cancel
          </button>
        )}
      </main>
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
