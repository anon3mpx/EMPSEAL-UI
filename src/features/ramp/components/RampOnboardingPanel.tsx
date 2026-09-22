import type { RampBankLinkHandoff, RampExternalAccount, RampKycHandoff, RampProfile } from "../api/contracts";

export function RampOnboardingPanel({
  profile,
  kyc,
  bankLink,
  accounts,
  disabledReason,
  busy,
  onRegister,
  onProfile,
  onKyc,
  onRefreshKyc,
  onBankLink,
  onExchange,
  onSyncAccounts,
}: {
  profile: RampProfile | null;
  kyc: RampKycHandoff | null;
  bankLink: RampBankLinkHandoff | null;
  accounts: RampExternalAccount[];
  disabledReason: string | null;
  busy: boolean;
  onRegister: () => void;
  onProfile: () => void;
  onKyc: () => void;
  onRefreshKyc: () => void;
  onBankLink: () => void;
  onExchange: () => void;
  onSyncAccounts: () => void;
}) {
  return (
    <section style={{ display: "flex", flexDirection: "column", gap: 8, width: "100%", maxWidth: 480 }}>
      <p style={{ margin: 0, fontSize: 10, letterSpacing: "0.40em", color: "rgba(255,255,255,0.50)", textTransform: "uppercase", fontWeight: 700 }}>
        Wallet onboarding
      </p>
      {disabledReason && (
        <p style={{ margin: 0, fontSize: 11.5, color: "#F87171", lineHeight: 1.5 }}>{disabledReason}</p>
      )}
      {profile && (
        <p style={{ margin: 0, fontSize: 11.5, color: "rgba(255,255,255,0.70)" }}>
          KYC {profile.kycStatus} · ToS {profile.tosStatus} · {profile.ready ? "ready" : "not ready"}
        </p>
      )}
      {kyc && (
        <p style={{ margin: 0, fontSize: 11.5, color: "rgba(255,255,255,0.70)" }}>
          Hosted KYC and ToS are handoffs. Completing them does not move funds.
          {kyc.kycUrl ? <> KYC: <a href={kyc.kycUrl} target="_blank" rel="noreferrer">{kyc.kycUrl}</a></> : null}
          {kyc.tosUrl ? <> ToS: <a href={kyc.tosUrl} target="_blank" rel="noreferrer">{kyc.tosUrl}</a></> : null}
        </p>
      )}
      {bankLink && (
        <p style={{ margin: 0, fontSize: 11.5, color: "rgba(255,255,255,0.70)" }}>
          Bank-link session {bankLink.sessionId} expires {bankLink.expiresAt}.
        </p>
      )}
      {accounts.length > 0 && (
        <p style={{ margin: 0, fontSize: 11.5, color: "rgba(255,255,255,0.70)" }}>
          {accounts.length} redacted external account{accounts.length === 1 ? "" : "s"} synced.
        </p>
      )}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
        <button type="button" disabled={busy || Boolean(disabledReason)} onClick={onRegister}>Register wallet</button>
        <button type="button" disabled={busy || Boolean(disabledReason)} onClick={onProfile}>Load profile</button>
        <button type="button" disabled={busy || Boolean(disabledReason)} onClick={onKyc}>Hosted KYC</button>
        <button type="button" disabled={busy || Boolean(disabledReason)} onClick={onRefreshKyc}>Refresh KYC</button>
        <button type="button" disabled={busy || Boolean(disabledReason)} onClick={onBankLink}>Bank link</button>
        <button type="button" disabled={busy || Boolean(disabledReason) || !bankLink} onClick={onExchange}>Exchange bank token</button>
        <button type="button" disabled={busy || Boolean(disabledReason)} onClick={onSyncAccounts}>Sync accounts</button>
      </div>
    </section>
  );
}
