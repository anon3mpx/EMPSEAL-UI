import type { RampPreview, RampTransfer } from "../api/contracts";

export function fundingHandoffCopy(transfer: RampTransfer | null): string {
  if (!transfer) return "Creating a transfer returns funding instructions. It does not move funds.";
  const basket = transfer.basketId
    ? ` Funding reference ${transfer.basketId} is not a MultiPage basket leg.`
    : "";
  return `Transfer ${transfer.id} is ${transfer.state}. Fund the returned instructions from a bank or wallet you control.${basket}`;
}

export function RampTransferPanel({
  preview,
  transfer,
  disabledReason,
  busy,
  onPreview,
  onCreate,
  onStatus,
  onCancel,
  canCreate = false,
}: {
  preview: RampPreview | null;
  transfer: RampTransfer | null;
  disabledReason: string | null;
  busy: boolean;
  onPreview: () => void;
  onCreate: () => void;
  onStatus: () => void;
  onCancel: () => void;
  canCreate?: boolean;
}) {
  return (
    <section style={{ display: "flex", flexDirection: "column", gap: 8, width: "100%", maxWidth: 480 }}>
      <p style={{ margin: 0, fontSize: 10, letterSpacing: "0.40em", color: "rgba(255,255,255,0.50)", textTransform: "uppercase", fontWeight: 700 }}>
        Preview and transfer
      </p>
      {preview && (
        <p style={{ margin: 0, fontSize: 11.5, color: "rgba(255,255,255,0.70)" }}>
          Preview source {preview.sourceAmount} → destination {preview.destinationAmount} · fee {preview.feeAmount} {preview.feeCurrency}
        </p>
      )}
      <p style={{ margin: 0, fontSize: 11.5, color: "rgba(255,255,255,0.70)", lineHeight: 1.5 }}>
        {fundingHandoffCopy(transfer)}
      </p>
      {transfer?.depositInstructions && (
        <p style={{ margin: 0, fontSize: 11.5, color: "#FFB347", lineHeight: 1.5 }}>
          {transfer.depositInstructions.paymentRail} {transfer.depositInstructions.amount} {transfer.depositInstructions.currency}
          {transfer.depositInstructions.memo ? ` · memo ${transfer.depositInstructions.memo}` : ""}
        </p>
      )}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
        <button type="button" disabled={busy || Boolean(disabledReason)} onClick={onPreview}>Preview</button>
        <button type="button" disabled={busy || Boolean(disabledReason) || !canCreate} onClick={onCreate}>Create funding instructions</button>
        <button type="button" disabled={busy || !transfer} onClick={onStatus}>Refresh status</button>
        <button type="button" disabled={busy || !transfer} onClick={onCancel}>Cancel awaiting-funds</button>
      </div>
    </section>
  );
}
