import { useEffect, useRef, useState } from "react";
import { formatUnits } from "viem";
import { getV2Chain } from "../../../design-system/data/v2ChainView";
import { tickerForAsset } from "./assets";
import type { CrossV2Client } from "./client";
import { errText } from "./errors";
import type { DepositInstruction } from "./planCheck";
import { btcTxidValid, depositReferenceNeeded } from "./providerReference";
import { useV2Intent } from "./useV2Intent";
import { adapters } from "@/lib/wallet/adapters/impl/bitcoin";
import { NON_EVM_CHAIN_IDS } from "@/lib/wallet/chainKind";
import { recommendedBtcFeeRate, sendBitcoinDeposit } from "../execution/bitcoinDeposit";

export interface DepositInstructionsProps {
  instruction: DepositInstruction;
  rail: string;
  intentId: string;
  client: CrossV2Client;
  sourceAddress?: string;
}

export default function DepositInstructions({ instruction: i, rail, intentId, client, sourceAddress }: DepositInstructionsProps) {
  const [now, setNow] = useState(() => Math.floor(Date.now() / 1000));
  const [reference, setReference] = useState("");
  const [linked, setLinked] = useState(false);
  const [linking, setLinking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const sendingRef = useRef(false);
  const [txid, setTxid] = useState<string | null>(null);
  // Set once a signed deposit is handed to the network: from then on the wallet button never re-enables, even on an error.
  const [broadcast, setBroadcast] = useState(false);
  const broadcastRef = useRef(false);
  const [feeFallback, setFeeFallback] = useState(false);
  const intent = useV2Intent(client, undefined, null, errText);
  const track = intent.track;
  useEffect(() => {
    track({ intentId, createdAt: Date.now(), fromChain: i.chain, toChain: "", toAsset: "", sourceTxs: [] });
  }, [track, intentId, i.chain]);
  useEffect(() => {
    const timer = setInterval(() => setNow(Math.floor(Date.now() / 1000)), 1000);
    return () => clearInterval(timer);
  }, []);
  const chain = i.chainId === undefined ? undefined : getV2Chain(i.chainId);
  const amount = formatUnits(BigInt(i.amount), i.decimals);
  const ticker = tickerForAsset(i.asset) ?? chain?.ticker ?? i.asset;
  const seconds = Math.max(0, i.expiresAt - now);

  async function link() {
    if (linking || linked || !btcTxidValid(reference.trim())) return;
    setLinking(true);
    setError(null);
    try {
      await client.attachReference(intentId, reference.trim());
      setLinked(true);
    } catch (e) {
      setError(errText(e));
    } finally {
      setLinking(false);
    }
  }

  async function send(adapter: (typeof adapters)[number]) {
    if (sendingRef.current || broadcastRef.current || txid || linked || !sourceAddress || Date.now() >= i.expiresAt * 1000) return;
    sendingRef.current = true;
    setSending(true);
    setError(null);
    try {
      const connected = await adapter.connect();
      if (connected.address !== sourceAddress) throw new Error(`Connect the wallet for ${sourceAddress}; this quote refunds to it.`);
      const fee = await recommendedBtcFeeRate();
      setFeeFallback(fee.fallback);
      if (Date.now() >= i.expiresAt * 1000) throw new Error("Deposit quote expired; do not send funds.");
      const hash = await sendBitcoinDeposit({
        depositAddress: i.address,
        amountSats: BigInt(i.amount),
        memo: i.memo,
        sourceAddress,
        providerName: adapter.brand === "Unisat" ? "unisat" : "phantom",
        feeRateSatsPerVb: fee.rate,
        onBroadcasting: () => {
          broadcastRef.current = true;
          setBroadcast(true);
        },
      });
      setTxid(hash);
      setReference(hash);
      if (depositReferenceNeeded(rail)) {
        await client.attachReference(intentId, hash);
        setLinked(true);
      }
    } catch (e) {
      setError(
        broadcastRef.current
          ? `${errText(e)} The wallet may already have sent this deposit. Check your wallet or mempool.space before paying again; if it was sent, paste its transaction ID below.`
          : errText(e),
      );
    } finally {
      sendingRef.current = false;
      setSending(false);
    }
  }

  return (
    <section aria-label="Deposit instructions" style={{ display: "grid", gap: 10, overflowWrap: "anywhere" }}>
      <h3>Deposit on {chain?.name ?? i.chain}</h3>
      {i.chainId === NON_EVM_CHAIN_IDS.BTC &&
        adapters
          .filter((a) => (a.brand === "Unisat" || a.brand === "Phantom") && a.isInstalled())
          .map((adapter) => (
            <button
              key={adapter.brand}
              type="button"
              disabled={sending || broadcast || linking || linked || Boolean(txid) || seconds === 0 || !sourceAddress}
              onClick={() => void send(adapter)}
            >
              Send with {adapter.brand === "Unisat" ? "UniSat" : adapter.brand}
            </button>
          ))}
      {feeFallback && <p role="note">Fee estimate unavailable; using 8 sat/vB.</p>}
      {txid && (
        <a href={`https://mempool.space/tx/${encodeURIComponent(txid.replace(/^0x/, ""))}`} target="_blank" rel="noreferrer">
          {txid}
        </a>
      )}
      <div>
        {amount} {ticker}{" "}
        <button
          type="button"
          aria-label="Copy amount"
          onClick={() => void navigator.clipboard.writeText(amount).catch((e) => setError(errText(e)))}
        >
          Copy
        </button>
      </div>
      <div>
        {i.address}{" "}
        <button
          type="button"
          aria-label="Copy address"
          onClick={() => void navigator.clipboard.writeText(i.address).catch((e) => setError(errText(e)))}
        >
          Copy address
        </button>
      </div>
      {i.memo !== undefined && (
        <div>
          <div>
            {i.memo}{" "}
            <button
              type="button"
              aria-label="Copy memo"
              onClick={() => void navigator.clipboard.writeText(i.memo!).catch((e) => setError(errText(e)))}
            >
              Copy memo
            </button>
          </div>
          <p role="note">Include this memo or the funds cannot be matched</p>
        </div>
      )}
      <p role="timer">
        {seconds > 0
          ? `Expires in ${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`
          : "Deposit quote expired; do not send funds."}
      </p>
      {depositReferenceNeeded(rail) && (
        <div>
          <label htmlFor={`deposit-reference-${intentId}`}>Transaction ID</label>
          <input
            id={`deposit-reference-${intentId}`}
            value={reference}
            onChange={(e) => setReference(e.target.value)}
            disabled={linked || linking || sending}
          />
          <button type="button" onClick={() => void link()} disabled={linked || linking || sending || !btcTxidValid(reference.trim())}>
            {linked ? "Transaction linked" : "Link transaction"}
          </button>
        </div>
      )}
      {intent.status && <p>Status: {intent.status.status}</p>}
      {(error || intent.pollError) && <p role="alert">{error ?? intent.pollError}</p>}
    </section>
  );
}
