interface CrossTrackingPanelProps {
  tracking: any;
  session: any;
  isCancelling: boolean;
  isRefunding: boolean;
  onCancel: () => void;
  onRefund: () => void;
}

export function CrossTrackingPanel({
  tracking,
  session,
  isCancelling,
  isRefunding,
  onCancel,
  onRefund,
}: CrossTrackingPanelProps) {
  if (!session) return null;

  const status =
    tracking?.status ??
    tracking?.primaryTransfer?.status ??
    tracking?.primary?.status ??
    session.status ??
    "SELECTED";

  return (
    <div className="border border-white/[0.05] bg-white/[0.02] p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-white">
            Tracking
          </p>
          <p className="mt-1 text-[10px] text-white/35">
            Polling the API lifecycle state.
          </p>
        </div>
        <span className="border border-[#FF8A00]/20 bg-[#FF8A00]/10 px-2 py-1 text-[9px] font-semibold text-[#FF8A00]">
          {status}
        </span>
      </div>

      <div className="mt-4 space-y-2 text-sm text-white/70">
        {session.selectedOfferId ? (
          <div className="flex justify-between gap-4">
            <span className="text-white/35">Selected Offer</span>
            <span className="break-all text-right">{session.selectedOfferId}</span>
          </div>
        ) : null}
        {session.offerSetId ? (
          <div className="flex justify-between gap-4">
            <span className="text-white/35">Offer Set</span>
            <span className="break-all text-right">{session.offerSetId}</span>
          </div>
        ) : null}
        <div className="flex justify-between gap-4">
          <span className="text-white/35">Intent</span>
          <span className="break-all text-right">
            {session.mode === "single"
              ? session.intentId
              : `${session.composedIds?.primary ?? "—"} / ${session.composedIds?.gas ?? "—"}`}
          </span>
        </div>
        <div className="flex justify-between gap-4">
          <span className="text-white/35">Source Tx</span>
          <span className="break-all text-right">
            {tracking?.srcTxHash ?? tracking?.sourceTxHash ?? session.lastTxHash ?? "Pending"}
          </span>
        </div>
        <div className="flex justify-between gap-4">
          <span className="text-white/35">Destination Tx</span>
          <span className="break-all text-right">
            {tracking?.dstTxHash ?? "Pending"}
          </span>
        </div>
        <div className="flex justify-between gap-4">
          <span className="text-white/35">ETA</span>
          <span>{tracking?.etaSeconds ? `${tracking.etaSeconds}s` : "—"}</span>
        </div>
      </div>

      {session.mode === "single" ? (
        <div className="mt-4 flex gap-3">
          <button
            type="button"
            onClick={onCancel}
            disabled={
              isCancelling || !(tracking?.canCancel || tracking?.canCancelInWallet)
            }
            className={`flex-1 px-4 py-3 text-[11px] font-bold uppercase tracking-[0.08em] ${
              isCancelling || !(tracking?.canCancel || tracking?.canCancelInWallet)
                ? "cursor-not-allowed bg-white/[0.06] text-white/25"
                : "bg-white text-[#03030a]"
            }`}
          >
            {isCancelling ? "Cancelling..." : "Cancel"}
          </button>
          <button
            type="button"
            onClick={onRefund}
            disabled={isRefunding || !tracking?.canRequestRefund}
            className={`flex-1 px-4 py-3 text-[11px] font-bold uppercase tracking-[0.08em] ${
              isRefunding || !tracking?.canRequestRefund
                ? "cursor-not-allowed bg-white/[0.06] text-white/25"
                : "bg-[#FF8A00] text-[#03030a]"
            }`}
          >
            {isRefunding ? "Requesting..." : "Request Refund"}
          </button>
        </div>
      ) : null}
    </div>
  );
}
