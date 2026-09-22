import type { RampDelegation } from "../api/contracts";

export function RampDelegationPanel({
  delegation,
  disabledReason,
  busy,
  onCreate,
  onRevoke,
}: {
  delegation: RampDelegation | null;
  disabledReason: string | null;
  busy: boolean;
  onCreate: () => void;
  onRevoke: () => void;
}) {
  return (
    <section style={{ display: "flex", flexDirection: "column", gap: 8, width: "100%", maxWidth: 480 }}>
      <p style={{ margin: 0, fontSize: 10, letterSpacing: "0.40em", color: "rgba(255,255,255,0.50)", textTransform: "uppercase", fontWeight: 700 }}>
        Partner delegation
      </p>
      <p style={{ margin: 0, fontSize: 11.5, color: "rgba(255,255,255,0.70)", lineHeight: 1.5 }}>
        Wallet-issued delegations never send a Partner API key from the browser.
      </p>
      {delegation && (
        <p style={{ margin: 0, fontSize: 11.5, color: "rgba(255,255,255,0.70)" }}>
          {delegation.delegateType} {delegation.id} expires {delegation.expiresAt}
        </p>
      )}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
        <button type="button" disabled={busy || Boolean(disabledReason)} onClick={onCreate}>Create delegation</button>
        <button type="button" disabled={busy || !delegation} onClick={onRevoke}>Revoke delegation</button>
      </div>
    </section>
  );
}
