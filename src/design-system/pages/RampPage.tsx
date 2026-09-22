// ─── RampPage — public /api/v1/ramp/* composition ─────────────────────────
// Hosted KYC, bank-link, and funding instructions are handoffs. Creating a
// transfer does not move funds. A returned basketId is a funding reference only.

import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { type Address } from "viem";
import { useChainId, useSignMessage, useSwitchChain } from "wagmi";
import {
  AccountModal,
  ChainPicker,
  DappNavbar,
  DappFooter,
  NetworkSelector,
  Pill,
  Toaster,
  TokenPicker,
  WalletButton,
  WalletModal,
  useIsMobile,
  toast,
  type PickerChain,
  type PickerToken,
  type WalletOption,
} from "../components";
import EmpxRampWidget, { type RampFeeLine } from "../EmpxRampWidget";
import { WidgetKitKeyframes, type RailCardData } from "../widgetKit";
import { tokenLogoUrl } from "../data/logoRegistry";
import { useWalletConnection } from "../hooks/useWalletConnection";
import { useV2Balances } from "../hooks/useV2Balances";
import { getExplorerAddressUrl } from "../data/explorers";
import { getTokensForChain } from "../data/v2TokenView";
import {
  RampDelegationPanel,
  RampOnboardingPanel,
  RampTransferPanel,
  buildRampTransferFields,
  canPreviewRampRoute,
  capabilityBlockReason,
  coerceFiatRail,
  exchangeAfterPlaidLink,
  onboardingBlockReason,
  rampApi,
  railsForDirection,
  rampRouteSnapshot,
  RAMP_CHAIN_IDS,
  RAMP_TOKEN_TICKER,
  useRampSession,
  type RampFiatRail,
} from "../../features/ramp";

const DEST_CHAINS: { id: number; name: string; color: string; ticker: string }[] = [
  { id: 1,    name: "Ethereum", color: "#627EEA", ticker: "ETH" },
  { id: 137,  name: "Polygon",  color: "#7B3FE4", ticker: "POL" },
  { id: 8453, name: "Base",     color: "#0052FF", ticker: "ETH" },
];

const FIAT_CURRENCIES: PickerToken[] = [
  { ticker: "USD", name: "US Dollar" },
];

const FIAT_FLAGS: Record<string, string> = { USD: "🇺🇸" };

export default function RampPage() {
  const isMobile = useIsMobile();
  const { walletState, walletOptions, onSelectWallet, disconnect } = useWalletConnection();
  const connectedBalance = useV2Balances();
  const connectedChainId = useChainId();
  const { switchChainAsync } = useSwitchChain();
  const { signMessageAsync } = useSignMessage();
  const [showWalletModal, setShowWalletModal] = useState(false);
  const [showAccountModal, setShowAccountModal] = useState(false);
  const [chainPickerOpen, setChainPickerOpen] = useState(false);
  const [tokenPickerOpen, setTokenPickerOpen] = useState(false);
  const [currencyPickerOpen, setCurrencyPickerOpen] = useState(false);

  const [direction, setDirection] = useState<"BUY" | "SELL">("SELL");
  const [fiatCurrency, setFiatCurrency] = useState("USD");
  const [fiatAmount, setFiatAmount] = useState("500");
  const [cryptoAmountInput, setCryptoAmountInput] = useState("250");
  const [chainId, setChainId] = useState(8453);
  const [ticker, setTicker] = useState(RAMP_TOKEN_TICKER);
  const [fiatRail, setFiatRail] = useState<RampFiatRail>("ACH");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [publicToken, setPublicToken] = useState("");
  const [showTokenFallback, setShowTokenFallback] = useState(false);
  const [bankSession, setBankSession] = useState<{ sessionId: string; linkToken: string; expiresAt: string } | null>(null);
  const [partnerId, setPartnerId] = useState("");
  const [externalAccountId, setExternalAccountId] = useState("");
  const [previewSnapshot, setPreviewSnapshot] = useState<string | null>(null);

  const connectedAddress = walletState.status === "connected" ? walletState.address : undefined;
  const rampSigner = useMemo(() => ({
    address: connectedAddress,
    chainId: connectedChainId,
    signMessage: (message: string) => signMessageAsync({ account: connectedAddress as Address, message }),
    switchChain: (id: number) => switchChainAsync({ chainId: id as any }),
  }), [connectedAddress, connectedChainId, signMessageAsync, switchChainAsync]);
  const capsQuery = useQuery({
    queryKey: ["ramp-capabilities"],
    queryFn: rampApi.getCapabilities,
    retry: 1,
    staleTime: 30_000,
  });
  const capabilities = capsQuery.data ?? null;
  const feature = direction === "BUY" ? capabilities?.features.onRamp : capabilities?.features.offRamp;
  const transferDisabledReason = capabilityBlockReason(capabilities, feature)
    ?? (capsQuery.error ? "Ramp capabilities are unavailable." : null);
  const kycDisabledReason = onboardingBlockReason(capabilities)
    ?? (capsQuery.error ? "Ramp capabilities are unavailable." : null);

  const ramp = useRampSession({
    signer: rampSigner,
  });

  const chain = useMemo(
    () => DEST_CHAINS.find((c) => c.id === chainId) ?? DEST_CHAINS[0],
    [chainId],
  );
  const token = getTokensForChain(chainId).find((entry) => entry.ticker.toUpperCase() === RAMP_TOKEN_TICKER);
  const amount = direction === "BUY" ? fiatAmount.trim() : cryptoAmountInput.trim();
  const activeAccounts = ramp.accounts.filter((account) => account.active);
  const routeKey = rampRouteSnapshot({
    direction,
    chainId,
    ticker,
    fiatRail,
    amount,
    externalAccountId,
  });
  const previewMatches = Boolean(ramp.preview && previewSnapshot === routeKey);
  const offRampBlocked = direction === "SELL" && !canPreviewRampRoute({ direction, externalAccountId });
  const disabledReason = transferDisabledReason
    ?? (offRampBlocked ? "Select an active external account before off-ramp preview or create." : null);

  const clearPreview = ramp.clearPreview;
  useEffect(() => {
    clearPreview();
    setPreviewSnapshot(null);
  }, [clearPreview, routeKey]);

  useEffect(() => {
    if (externalAccountId && activeAccounts.some((account) => account.id === externalAccountId)) return;
    const next = activeAccounts[0]?.id ?? "";
    setExternalAccountId(next);
  }, [activeAccounts, externalAccountId]);

  const feeRows: RampFeeLine[] = ramp.preview
    ? [
        { label: "Source amount", value: ramp.preview.sourceAmount },
        { label: "Destination amount", value: ramp.preview.destinationAmount },
        { label: "Fee", value: `${ramp.preview.feeAmount} ${ramp.preview.feeCurrency}`, accent: true },
        { label: "Rail", value: coerceFiatRail(direction, fiatRail) },
        { label: "Figures", value: "Live preview — creating a transfer does not move funds" },
      ]
    : [{ label: "Figures", value: disabledReason ?? "Preview required from /api/v1/ramp/preview" }];

  const providerCards: RailCardData[] = ramp.preview
    ? [{ name: "Bridge", mode: "B", outAmount: ramp.preview.destinationAmount, eta: `~${Math.round(ramp.preview.etaSeconds / 60)}m`, tag: "LIVE", isActive: true }]
    : [];

  const chainPickerList: PickerChain[] = DEST_CHAINS
    .filter((c) => (RAMP_CHAIN_IDS as readonly number[]).includes(c.id))
    .filter((c) => !capabilities || capabilities.supportedChainIds.includes(c.id))
    .map((c) => ({ id: c.id, name: c.name, ticker: c.ticker, color: c.color }));

  const tokenPickerList: PickerToken[] = getTokensForChain(chainId)
    .filter((t) => t.ticker.toUpperCase() === RAMP_TOKEN_TICKER)
    .map((t) => ({
      ticker: t.ticker,
      name: t.name,
      chainId,
      chainName: chain.name,
      chainColor: chain.color,
    }));

  const requireWallet = () => {
    if (walletState.status !== "connected" || !connectedAddress) {
      setShowWalletModal(true);
      return false;
    }
    return true;
  };

  const transferPayload = () => {
    if (!connectedAddress) throw new Error("Wallet not connected.");
    if (!token?.address) throw new Error("Select USDC on Ethereum, Polygon, or Base.");
    if (!/^(0|[1-9]\d*)(\.\d+)?$/.test(amount) || amount === "0") {
      throw new Error("Amount must be a positive decimal string.");
    }
    if (direction === "SELL" && !externalAccountId) {
      throw new Error("Select an active external account for off-ramp.");
    }
    return buildRampTransferFields({
      wallet: connectedAddress,
      chainId,
      direction,
      tokenAddress: token.address,
      fiatRail,
      amount,
      externalAccountId,
    });
  };

  const onPreview = () => {
    if (!requireWallet() || !connectedAddress) return;
    if (disabledReason) {
      toast.error(disabledReason);
      return;
    }
    void (async () => {
      try {
        await ramp.previewTransfer(transferPayload());
        setPreviewSnapshot(routeKey);
        toast.info("Preview ready. Creating a transfer will return funding instructions, not a completed payment.");
      } catch (error) {
        toast.error(ramp.errorMessage ?? (error instanceof Error ? error.message : "Ramp request failed"));
      }
    })();
  };

  const onCreate = () => {
    if (!requireWallet() || !connectedAddress) return;
    if (disabledReason) {
      toast.error(disabledReason);
      return;
    }
    if (!previewMatches) {
      toast.error("Preview the current route before creating funding instructions.");
      return;
    }
    void (async () => {
      try {
        const created = await ramp.createTransfer(transferPayload());
        toast.info(`Funding instructions ready for ${created.id}. Funds have not moved.`);
      } catch (error) {
        toast.error(ramp.errorMessage ?? (error instanceof Error ? error.message : "Ramp request failed"));
      }
    })();
  };

  return (
    <div style={{ minHeight: "100vh", background: "#05050c", color: "#fff", fontFamily: "Inter, sans-serif" }}>
      <DappNavbar
        activeHref="/ramp-v2"
        controls={
          <>
            <NetworkSelector
              name={chain.name}
              color={chain.color}
              onClick={() => setChainPickerOpen(true)}
            />
            <WalletButton
              connected={walletState.status === "connected"}
              address={walletState.status === "connected" ? walletState.address : undefined}
              onConnect={() => setShowWalletModal(true)}
              onClick={() => setShowAccountModal(true)}
            />
          </>
        }
      />

      <WidgetKitKeyframes />

      <main
        style={{
          maxWidth: 480 + (isMobile ? 32 : 40),
          margin: "0 auto",
          padding: isMobile ? "24px 16px 40px" : "38px 20px 48px",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 16,
        }}
      >
        <div style={{ width: "100%", maxWidth: 480, display: "flex", justifyContent: "flex-end" }}>
          <Pill variant={capabilities?.enabled ? "success" : "ghost"}>
            {capabilities?.enabled ? "Live capabilities" : "Ramp disabled"}
          </Pill>
        </div>

        <EmpxRampWidget
          direction={direction}
          onDirectionChange={(d) => {
            setDirection(d);
            setFiatRail((rail) => coerceFiatRail(d, rail));
          }}
          fiatCurrency={fiatCurrency}
          fiatCurrencyName={FIAT_CURRENCIES.find((f) => f.ticker === fiatCurrency)?.name}
          fiatRailsLabel={railsForDirection(direction).join(" · ")}
          fiatFlag={FIAT_FLAGS[fiatCurrency]}
          fiatAmount={fiatAmount}
          onFiatAmountChange={setFiatAmount}
          onSelectCurrency={() => setCurrencyPickerOpen(true)}
          chain={chain}
          tokenTicker={ticker}
          tokenName={ticker}
          tokenLogoUrl={tokenLogoUrl(chainId, ticker) ?? undefined}
          cryptoAmount={cryptoAmountInput}
          onCryptoAmountChange={setCryptoAmountInput}
          onSelectToken={() => setTokenPickerOpen(true)}
          onSelectChain={() => setChainPickerOpen(true)}
          balance={direction === "SELL" && walletState.status === "connected" ? connectedBalance.nativeBalance : undefined}
          providerName="Bridge"
          providerCount={providerCards.length}
          providers={providerCards}
          settlementTicker={ticker}
          settlementChainName={chain.name}
          estimatedTime={ramp.preview ? `~${Math.round(ramp.preview.etaSeconds / 60)} min` : undefined}
          etaNote="Live preview when available"
          feeRows={feeRows}
          noProvider={!capabilities?.enabled}
          kycRequired={Boolean(ramp.profile && !ramp.profile.ready)}
          walletConnected={walletState.status === "connected"}
          onConnect={() => setShowWalletModal(true)}
          onSubmit={onPreview}
          submitLabel="Preview route"
          blockedReason={disabledReason ?? undefined}
        />

        <label style={{ width: "100%", maxWidth: 480, fontSize: 11.5, color: "rgba(255,255,255,0.70)" }}>
          Fiat rail
          <select value={coerceFiatRail(direction, fiatRail)} onChange={(e) => setFiatRail(e.target.value as RampFiatRail)} style={{ marginLeft: 8 }}>
            {railsForDirection(direction).map((rail) => <option key={rail} value={rail}>{rail}</option>)}
          </select>
        </label>
        {direction === "SELL" && (
          <label style={{ width: "100%", maxWidth: 480, fontSize: 11.5, color: "rgba(255,255,255,0.70)" }}>
            External account
            <select value={externalAccountId} onChange={(e) => setExternalAccountId(e.target.value)} style={{ marginLeft: 8 }}>
              <option value="">Select account</option>
              {activeAccounts.map((account) => (
                <option key={account.id} value={account.id}>
                  {account.bankName ?? "Account"} {account.lastFour ? `••••${account.lastFour}` : account.id}
                </option>
              ))}
            </select>
          </label>
        )}
        <label style={{ width: "100%", maxWidth: 480, fontSize: 11.5, color: "rgba(255,255,255,0.70)" }}>
          Legal name
          <input value={fullName} onChange={(e) => setFullName(e.target.value)} style={{ marginLeft: 8, width: "70%" }} />
        </label>
        <label style={{ width: "100%", maxWidth: 480, fontSize: 11.5, color: "rgba(255,255,255,0.70)" }}>
          Email
          <input value={email} onChange={(e) => setEmail(e.target.value)} style={{ marginLeft: 8, width: "70%" }} />
        </label>
        {showTokenFallback && (
          <label style={{ width: "100%", maxWidth: 480, fontSize: 11.5, color: "rgba(255,255,255,0.70)" }}>
            Bank public token fallback
            <input value={publicToken} onChange={(e) => setPublicToken(e.target.value)} style={{ marginLeft: 8, width: "60%" }} />
          </label>
        )}
        <label style={{ width: "100%", maxWidth: 480, fontSize: 11.5, color: "rgba(255,255,255,0.70)" }}>
          Partner id
          <input value={partnerId} onChange={(e) => setPartnerId(e.target.value)} style={{ marginLeft: 8, width: "70%" }} />
        </label>

        <RampOnboardingPanel
          profile={ramp.profile}
          kyc={ramp.kyc}
          bankLink={bankSession}
          accounts={ramp.accounts}
          disabledReason={kycDisabledReason}
          busy={ramp.busy}
          onRegister={() => { if (requireWallet() && connectedAddress) void ramp.registerWallet(connectedAddress, chainId).then(() => toast.success("Wallet registered")).catch(() => toast.error(ramp.errorMessage ?? "Register failed")); }}
          onProfile={() => { if (requireWallet() && connectedAddress) void ramp.loadProfile(connectedAddress, chainId).catch(() => toast.error(ramp.errorMessage ?? "Profile failed")); }}
          onKyc={() => {
            if (!requireWallet() || !connectedAddress) return;
            void ramp.createKycLink({
              wallet: connectedAddress,
              chainId,
              fullName,
              email,
              type: "individual",
              redirectUri: `${window.location.origin}/ramp-v2`,
            }).then((handoff) => {
              toast.info("Hosted KYC/ToS links are handoffs. They do not move funds.");
              if (handoff.kycUrl) window.open(handoff.kycUrl, "_blank", "noopener,noreferrer");
              if (handoff.tosUrl) window.open(handoff.tosUrl, "_blank", "noopener,noreferrer");
            }).catch(() => toast.error(ramp.errorMessage ?? "KYC link failed"));
          }}
          onRefreshKyc={() => { if (requireWallet() && connectedAddress) void ramp.refreshKyc(connectedAddress, chainId).catch(() => toast.error(ramp.errorMessage ?? "KYC refresh failed")); }}
          onBankLink={() => {
            if (!requireWallet() || !connectedAddress) return;
            void ramp.createBankLink(connectedAddress, chainId).then(async (session) => {
              setBankSession(session);
              try {
                await exchangeAfterPlaidLink({
                  linkToken: session.linkToken,
                  exchange: (token) => {
                    setPublicToken(token);
                    return ramp.exchangeBankLink({
                      wallet: connectedAddress,
                      chainId,
                      sessionId: session.sessionId,
                      publicToken: token,
                    });
                  },
                });
                toast.info("Bank account linked. Completing the handoff does not move funds.");
              } catch (error) {
                setShowTokenFallback(true);
                toast.info("Complete bank link in the hosted Plaid window. Paste is only a fallback if the handoff did not return a token.");
                toast.error(ramp.errorMessage ?? (error instanceof Error ? error.message : "Bank link failed"));
              }
            }).catch(() => toast.error(ramp.errorMessage ?? "Bank link failed"));
          }}
          onExchange={() => {
            if (!requireWallet() || !connectedAddress || !bankSession || !publicToken) return;
            void ramp.exchangeBankLink({
              wallet: connectedAddress,
              chainId,
              sessionId: bankSession.sessionId,
              publicToken,
            }).catch(() => toast.error(ramp.errorMessage ?? "Bank exchange failed"));
          }}
          onSyncAccounts={() => { if (requireWallet() && connectedAddress) void ramp.syncAccounts(connectedAddress, chainId).catch(() => toast.error(ramp.errorMessage ?? "Account sync failed")); }}
        />

        <RampTransferPanel
          preview={ramp.preview}
          transfer={ramp.transfer}
          disabledReason={disabledReason}
          busy={ramp.busy}
          canCreate={previewMatches}
          onPreview={onPreview}
          onCreate={onCreate}
          onStatus={() => {
            if (!ramp.transfer || !connectedAddress) return;
            void ramp.loadTransferStatus(ramp.transfer.id, connectedAddress, chainId).catch(() => toast.error(ramp.errorMessage ?? "Status failed"));
          }}
          onCancel={() => {
            if (!ramp.transfer || !connectedAddress) return;
            void ramp.cancelTransfer(ramp.transfer.id, connectedAddress, chainId).then(() => toast.info("Cancel requested for an awaiting-funds transfer.")).catch(() => toast.error(ramp.errorMessage ?? "Cancel failed"));
          }}
        />

        <RampDelegationPanel
          delegation={ramp.delegation}
          disabledReason={capabilityBlockReason(capabilities, capabilities?.features.delegatedActions)}
          busy={ramp.busy}
          onCreate={() => {
            if (!requireWallet() || !connectedAddress) return;
            void ramp.createDelegation({
              wallet: connectedAddress,
              chainId,
              partner: partnerId,
              delegateType: "PARTNER",
              operations: ["READ", "PREVIEW"],
              directions: [direction === "BUY" ? "ON_RAMP" : "OFF_RAMP"],
              chainIds: [chainId],
              externalAccountIds: ramp.accounts.map((account) => account.id),
              expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
            }).then(() => toast.success("Delegation created")).catch(() => toast.error(ramp.errorMessage ?? "Delegation failed"));
          }}
          onRevoke={() => {
            if (!ramp.delegation || !connectedAddress) return;
            void ramp.revokeDelegation(ramp.delegation.id, connectedAddress, chainId).then(() => toast.info("Delegation revoked")).catch(() => toast.error(ramp.errorMessage ?? "Revoke failed"));
          }}
        />
      </main>

      <DappFooter />

      <WalletModal
        open={showWalletModal}
        onClose={() => setShowWalletModal(false)}
        wallets={walletOptions as WalletOption[]}
        onSelect={(w) => {
          setShowWalletModal(false);
          onSelectWallet(w);
          toast.success("Wallet connected");
        }}
      />

      <ChainPicker
        open={chainPickerOpen}
        onClose={() => setChainPickerOpen(false)}
        chains={chainPickerList}
        selectedId={chainId}
        onSelect={(c) => {
          setChainId(c.id);
          setTicker(RAMP_TOKEN_TICKER);
          setChainPickerOpen(false);
        }}
      />

      <TokenPicker
        open={tokenPickerOpen}
        onClose={() => setTokenPickerOpen(false)}
        tokens={tokenPickerList}
        onSelect={(t) => { setTicker(t.ticker); setTokenPickerOpen(false); }}
      />

      <TokenPicker
        open={currencyPickerOpen}
        onClose={() => setCurrencyPickerOpen(false)}
        tokens={FIAT_CURRENCIES}
        onSelect={(t) => { setFiatCurrency(t.ticker); setCurrencyPickerOpen(false); }}
      />

      {walletState.status === "connected" && (
        <AccountModal
          open={showAccountModal}
          onClose={() => setShowAccountModal(false)}
          address={walletState.address}
          providerName={walletState.providerName}
          chainName={chain.name}
          chainColor={chain.color}
          balanceUSD={connectedBalance.nativeBalanceUSD ?? undefined}
          nativeBalance={connectedBalance.nativeBalance}
          nativeTicker={connectedBalance.nativeTicker}
          explorerUrl={getExplorerAddressUrl(chainId, walletState.address) ?? undefined}
          onCopy={() => toast.success("Address copied")}
          onSwitchNetwork={() => { setShowAccountModal(false); setChainPickerOpen(true); }}
          onSwitchWallet={() => { setShowAccountModal(false); setShowWalletModal(true); }}
          onDisconnect={() => { setShowAccountModal(false); disconnect(); toast.info("Wallet disconnected"); }}
        />
      )}

      <Toaster />
    </div>
  );
}
