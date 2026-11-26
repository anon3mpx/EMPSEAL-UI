// One guided checklist for the ramp: always shows the single next step, worked out from server state.
import { useEffect, useRef, type ReactNode } from "react";
import type { RampExternalAccount, RampKycHandoff, RampProfile, RampTransfer } from "../api/contracts";
import type { RampSigner } from "../execution/rampSigning";
import { CryptoLeg } from "./RampTransferPanel";
import {
  RampActions, RampButton, RampCard, RampCopyRow, RampField, RampStep, RampText, rampInput, type RampStepStatus,
} from "./rampUi";

const OPEN_STATES = ["CREATED", "AWAITING_FUNDS", "UNDERFUNDED"];
const MOVING_STATES = ["FUNDS_RECEIVED", "IN_REVIEW", "PAYMENT_SUBMITTED"];
const FAILED_STATES = ["FAILED", "RETURNING", "REFUNDED", "CANCELED", "DEACTIVATED", "ACTION_REQUIRED"];
const FOCUS_CHECK_MS = 15_000;

export function isOpenTransfer(transfer: RampTransfer | null): boolean {
  return Boolean(transfer && OPEN_STATES.includes(transfer.state));
}

function statusWord(value: string | undefined): string {
  const v = (value ?? "").toUpperCase();
  if (v === "APPROVED") return "approved";
  if (v === "REJECTED") return "rejected";
  if (!v || v === "NOT_STARTED") return "not started";
  return "in review";
}

function failureCopy(state: string): string {
  if (state === "CANCELED") return "This transfer was canceled.";
  if (state === "REFUNDED") return "Bridge refunded this transfer.";
  if (state === "RETURNING") return "Bridge is returning the funds.";
  if (state === "ACTION_REQUIRED") return "Bridge needs more information. Contact support.";
  return "Bridge couldn't complete this transfer.";
}

export interface RampGuidedFlowProps {
  direction: "BUY" | "SELL";
  signer: RampSigner;
  profile: RampProfile | null;
  kyc: RampKycHandoff | null;
  accounts: RampExternalAccount[];
  transfer: RampTransfer | null;
  busy: boolean;
  error: string | null;
  blockReason: string | null;
  fullName: string;
  email: string;
  onFullName: (v: string) => void;
  onEmail: (v: string) => void;
  /** Rail and account choices, shown in the review step. */
  reviewExtras?: ReactNode;
  /** Plaid fallback field, shown in the bank step. */
  bankExtras?: ReactNode;
  onConnect: () => void;
  onStart: () => void;
  onStartKyc: () => void;
  onCheckKyc: () => void;
  onLinkBank: () => void;
  onSyncAccounts: () => void;
  onCheckStatus: () => void;
  onCancel: () => void;
}

export function RampGuidedFlow(p: RampGuidedFlowProps) {
  const sell = p.direction === "SELL";
  const connected = Boolean(p.signer.address);
  const ready = Boolean(p.profile?.ready);
  const active = p.accounts.filter((a) => a.active);
  const bankDone = active.length > 0;
  const transfer = p.transfer && (p.transfer.direction === "OFF_RAMP") === sell ? p.transfer : null;
  const open = isOpenTransfer(transfer);
  const kycStatus = p.profile?.kycStatus ?? p.kyc?.kycStatus;
  const tosStatus = p.profile?.tosStatus ?? p.kyc?.tosStatus;
  const off = p.busy || Boolean(p.blockReason);

  // Coming back from the Bridge tab (or a bank app) checks once, at most every 15 s.
  const lastCheck = useRef(0);
  const latest = useRef(p);
  latest.current = p;
  useEffect(() => {
    const onFocus = () => {
      const q = latest.current;
      if (q.busy || Date.now() - lastCheck.current < FOCUS_CHECK_MS) return;
      if (q.kyc && !q.profile?.ready) { lastCheck.current = Date.now(); q.onCheckKyc(); return; }
      const t = q.transfer;
      if (t && t.state !== "COMPLETED" && !FAILED_STATES.includes(t.state)) { lastCheck.current = Date.now(); q.onCheckStatus(); }
    };
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, []);

  const identity: RampStepStatus = ready ? "done" : kycStatus === "REJECTED" ? "error" : "active";
  const bank: RampStepStatus = !ready ? "todo" : bankDone ? "done" : "active";
  const review: RampStepStatus = !ready || (sell && !bankDone) ? "todo" : transfer ? "done" : "active";
  const pay: RampStepStatus = open ? "active" : transfer ? "done" : "todo";
  const failed = transfer && FAILED_STATES.includes(transfer.state);
  const track: RampStepStatus = !transfer || open ? "todo" : failed ? "error" : transfer.state === "COMPLETED" ? "done" : "active";
  const account = active[0];
  let n = 0;

  return (
    <RampCard title={sell ? "Sell USDC" : "Buy USDC"} note="Bridge, our banking partner, handles identity checks and bank payments. EMPX never sees your documents.">
      {p.blockReason && <RampText tone="bad">{p.blockReason}</RampText>}

      <RampStep index={++n} title="Verify your identity" status={identity} summary={ready ? "Verified" : connected && p.profile ? `ID ${statusWord(kycStatus)} · terms ${statusWord(tosStatus)}` : undefined}>
        {!connected ? (
          <><RampText>Connect the wallet that will send or receive USDC.</RampText>
            <RampActions><RampButton primary onClick={p.onConnect}>Connect wallet</RampButton></RampActions></>
        ) : !p.profile ? (
          <><RampText>We'll check whether this wallet is already verified. Your wallet asks you to sign; this is free.</RampText>
            <RampActions><RampButton primary disabled={off} onClick={p.onStart}>{p.busy ? "Checking…" : "Get started"}</RampButton></RampActions></>
        ) : kycStatus === "REJECTED" ? (
          <RampText tone="bad">Bridge couldn't verify this identity. Contact support to continue.</RampText>
        ) : !p.kyc ? (
          <><div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <RampField label="Legal name"><input style={rampInput} value={p.fullName} onChange={(e) => p.onFullName(e.target.value)} autoComplete="name" /></RampField>
              <RampField label="Email"><input style={rampInput} type="email" value={p.email} onChange={(e) => p.onEmail(e.target.value)} autoComplete="email" /></RampField>
            </div>
            <RampText>Bridge opens in a new tab to check your ID and ask you to accept its terms.</RampText>
            <RampActions><RampButton primary disabled={off || !p.fullName.trim() || !/^\S+@\S+\.\S+$/.test(p.email)} onClick={p.onStartKyc}>Start verification</RampButton></RampActions></>
        ) : (
          <><RampText>Finish both Bridge tabs: the ID check and the terms. This page checks again when you come back.</RampText>
            <RampActions>
              <RampButton primary disabled={off} onClick={p.onCheckKyc}>{p.busy ? "Checking…" : "Check status"}</RampButton>
              {statusWord(kycStatus) !== "approved" && p.kyc.kycUrl && <RampButton onClick={() => window.open(p.kyc!.kycUrl, "_blank", "noopener,noreferrer")}>Reopen ID check</RampButton>}
              {statusWord(tosStatus) !== "approved" && p.kyc.tosUrl && <RampButton onClick={() => window.open(p.kyc!.tosUrl, "_blank", "noopener,noreferrer")}>Reopen terms</RampButton>}
            </RampActions></>
        )}
      </RampStep>

      {sell && (
        <RampStep index={++n} title="Link your bank" status={bank} summary={account ? `${account.bankName ?? "Bank"}${account.lastFour ? ` ••••${account.lastFour}` : ""}` : undefined}>
          <RampText>Choose the bank account that will receive the dollars.</RampText>
          <RampActions>
            <RampButton primary disabled={off} onClick={p.onLinkBank}>Link bank</RampButton>
            <RampButton disabled={off} onClick={p.onSyncAccounts}>Already linked? Refresh</RampButton>
          </RampActions>
          {p.bankExtras}
        </RampStep>
      )}

      <RampStep index={++n} title="Choose an amount" status={review} summary={transfer ? `${transfer.amount} ${sell ? "USDC → USD" : "USD → USDC"}` : undefined}>
        <RampText>Enter the amount in the box above, then press Continue. Fees are shown with your payment instructions.</RampText>
        {p.reviewExtras}
      </RampStep>

      <RampStep index={++n} title={sell ? "Send USDC to Bridge" : "Pay from your bank"} status={pay} summary={transfer && !open ? "Done" : undefined}>
        {transfer && (sell ? (
          p.signer.address ? <CryptoLeg key={transfer.id} transfer={transfer} signer={p.signer} onStatus={p.onCheckStatus} /> : null
        ) : (
          <BankInstructions transfer={transfer} />
        ))}
        <RampActions>
          <RampButton disabled={p.busy} onClick={p.onCheckStatus}>Check status</RampButton>
          {transfer && ["CREATED", "AWAITING_FUNDS"].includes(transfer.state) && <RampButton disabled={p.busy} onClick={p.onCancel}>Cancel transfer</RampButton>}
        </RampActions>
      </RampStep>

      <RampStep index={++n} title="Track" status={track} summary={transfer?.state === "COMPLETED" ? "Completed" : undefined}>
        {transfer && <TrackBody transfer={transfer} sell={sell} signer={p.signer} busy={p.busy} onCheckStatus={p.onCheckStatus} />}
      </RampStep>
      {transfer?.state === "COMPLETED" && <TrackBody transfer={transfer} sell={sell} signer={p.signer} busy={p.busy} onCheckStatus={p.onCheckStatus} />}

      {p.error && <RampText tone="bad" role="alert">{p.error}</RampText>}
    </RampCard>
  );
}

function BankInstructions({ transfer }: { transfer: RampTransfer }) {
  const d = transfer.depositInstructions;
  if (!d) return <RampText tone="bad">Bridge returned no payment instructions. Don't send money; check status or cancel.</RampText>;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <RampText>Send exactly this amount by {d.paymentRail === "wire" ? "wire" : "ACH"} from a bank account in your own name.</RampText>
      <RampCopyRow label="Amount" value={d.amount ?? transfer.amount} display={`${d.amount ?? transfer.amount} ${d.currency ?? "USD"}`} />
      {d.bankName && <RampCopyRow label="Bank" value={d.bankName} />}
      {d.accountNumberLastFour && <RampCopyRow label="Account" value={d.accountNumberLastFour} display={`••••${d.accountNumberLastFour}`} copy={false} />}
      {d.routingNumberLastFour && <RampCopyRow label="Routing" value={d.routingNumberLastFour} display={`••••${d.routingNumberLastFour}`} copy={false} />}
      {d.memo && <RampCopyRow label="Memo" value={d.memo} />}
      {d.memo && <RampText tone="strong">Put this memo in the payment reference, or Bridge can't match your payment.</RampText>}
      <RampText>Full account and routing numbers aren't shown here yet.</RampText>
    </div>
  );
}

function TrackBody({ transfer, sell, signer, busy, onCheckStatus }: {
  transfer: RampTransfer; sell: boolean; signer: RampSigner; busy: boolean; onCheckStatus: () => void;
}) {
  const state = transfer.state;
  if (FAILED_STATES.includes(state)) {
    return <><RampText tone="bad">{failureCopy(state)}</RampText>
      <RampActions><RampButton disabled={busy} onClick={onCheckStatus}>Check status</RampButton></RampActions></>;
  }
  const stage = OPEN_STATES.includes(state) ? 0 : MOVING_STATES.includes(state) ? 1 : state === "COMPLETED" ? 2 : 1;
  const labels = sell ? ["Waiting for USDC", "Bridge received it", "Paid to your bank"] : ["Waiting for your payment", "Bridge received it", "USDC sent to your wallet"];
  const move = !sell && state === "COMPLETED" && Boolean(transfer.leg2?.suggestedQuote);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <ol style={{ margin: 0, padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 6 }}>
        {labels.map((label, i) => (
          <li key={label} style={{ fontSize: 11.5, color: i <= stage ? "rgba(255,255,255,.94)" : "rgba(255,255,255,.36)" }}>
            {i < stage || stage === 2 ? "✓" : i === stage ? "●" : "○"} {label}
          </li>
        ))}
      </ol>
      {state === "COMPLETED" ? (
        <RampText tone="strong">{sell ? "Done. The dollars are on their way to your bank." : `Done. ${transfer.settledAmount ?? transfer.amount} USDC is in your wallet.`} To start another, enter an amount above and press Continue.</RampText>
      ) : (
        <RampActions><RampButton disabled={busy} onClick={onCheckStatus}>Check status</RampButton></RampActions>
      )}
      {move && signer.address && (
        <details>
          <summary style={{ cursor: "pointer", fontSize: 11.5, color: "rgba(255,255,255,.58)" }}>Move this USDC to another chain or token</summary>
          <div style={{ marginTop: 12 }}><CryptoLeg key={`${transfer.id}:${transfer.leg2?.intentId ?? ""}`} transfer={transfer} signer={signer} onStatus={onCheckStatus} /></div>
        </details>
      )}
    </div>
  );
}
