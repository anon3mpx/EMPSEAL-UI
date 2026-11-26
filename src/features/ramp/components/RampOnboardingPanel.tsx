import type { RampBankLinkHandoff, RampExternalAccount, RampKycHandoff, RampProfile } from "../api/contracts";
import { RampActions, RampButton, RampCard, RampText } from "./rampUi";

const link = { color: "#FF8A00", textDecoration: "underline" } as const;

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
  const off = busy || Boolean(disabledReason);
  return (
    <RampCard title="Wallet onboarding" note="Register your wallet, verify your identity, then link a bank account.">
      {disabledReason && <RampText tone="bad">{disabledReason}</RampText>}
      {profile && (
        <RampText tone="strong">
          KYC {profile.kycStatus} · ToS {profile.tosStatus} · {profile.ready ? "ready" : "not ready"}
        </RampText>
      )}
      {kyc && (
        <RampText>
          Hosted KYC and ToS are handoffs. Completing them does not move funds.
          {kyc.kycUrl ? <> KYC: <a style={link} href={kyc.kycUrl} target="_blank" rel="noreferrer">{kyc.kycUrl}</a></> : null}
          {kyc.tosUrl ? <> ToS: <a style={link} href={kyc.tosUrl} target="_blank" rel="noreferrer">{kyc.tosUrl}</a></> : null}
        </RampText>
      )}
      {bankLink && <RampText>Bank-link session {bankLink.sessionId} expires {bankLink.expiresAt}.</RampText>}
      {accounts.length > 0 && (
        <RampText>{accounts.length} redacted external account{accounts.length === 1 ? "" : "s"} synced.</RampText>
      )}
      <RampActions>
        <RampButton disabled={off} onClick={onRegister}>Register wallet</RampButton>
        <RampButton disabled={off} onClick={onProfile}>Load profile</RampButton>
        <RampButton disabled={off} onClick={onKyc}>Hosted KYC</RampButton>
        <RampButton disabled={off} onClick={onRefreshKyc}>Refresh KYC</RampButton>
      </RampActions>
      <RampActions>
        <RampButton disabled={off} onClick={onBankLink}>Bank link</RampButton>
        <RampButton disabled={off || !bankLink} onClick={onExchange}>Exchange bank token</RampButton>
        <RampButton disabled={off} onClick={onSyncAccounts}>Sync accounts</RampButton>
      </RampActions>
    </RampCard>
  );
}
