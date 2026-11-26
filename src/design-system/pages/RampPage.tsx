// Bridge fiat settles to/from the user's wallet; crypto routing uses ordinary V2 orders.

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
import { useAccountSnapshot } from "../hooks/useAccountSnapshot";
import { useV2Balances } from "../hooks/useV2Balances";
import { RampActions, RampButton, RampField, rampInput, rampSelect } from "../../features/ramp/components/rampUi";
import { getExplorerAddressUrl } from "../data/explorers";
import { getTokensForChain } from "../data/v2TokenView";
import {
  RampGuidedFlow,
  isOpenTransfer,
  mapRampApiError,
  buildRampTransferFields,
  canPreviewRampRoute,
  capabilityBlockReason,
  coerceFiatRail,
  exchangeAfterPlaidLink,
  onboardingBlockReason,
  rampApi,
  railsForDirection,
  rampRouteSnapshot,
  RAMP_TOKEN_TICKER,
  useRampSession,
  type RampFiatRail,
} from "../../features/ramp";

const DEST_CHAINS: { id: number; name: string; color: string; ticker: string }[] = [
  { id: 8453, name: "Base", color: "#0052FF", ticker: "ETH" },
  { id: 42161, name: "Arbitrum", color: "#28A0F0", ticker: "ETH" },
  { id: 10, name: "Optimism", color: "#FF0420", ticker: "ETH" },
];

const FIAT_CURRENCIES: PickerToken[] = [
  { ticker: "USD", name: "US Dollar" },
];
export default function RampPage() {
  const isMobile = useIsMobile();
  const { walletState, walletOptions, onSelectWallet, disconnect } = useWalletConnection();
  const accountSnapshot = useAccountSnapshot(walletState.status === "connected" ? walletState.address : null);
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
  const [fiatAmount, setFiatAmount] = useState("");
  const [cryptoAmountInput, setCryptoAmountInput] = useState("");
  const [chainId, setChainId] = useState(8453);
  const [ticker, setTicker] = useState(RAMP_TOKEN_TICKER);
  const [fiatRail, setFiatRail] = useState<RampFiatRail>("ACH");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [publicToken, setPublicToken] = useState("");
  const [showTokenFallback, setShowTokenFallback] = useState(false);
  const [bankSession, setBankSession] = useState<{ sessionId: string; linkToken: string; expiresAt: string } | null>(null);
  const [externalAccountId, setExternalAccountId] = useState("");

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
  const offRampBlocked = direction === "SELL" && !canPreviewRampRoute({ direction, externalAccountId });
  const disabledReason = transferDisabledReason
    ?? (offRampBlocked ? "Choose the bank account to be paid." : null);

  const clearPreview = ramp.clearPreview;
  useEffect(() => {
    clearPreview();
  }, [clearPreview, routeKey]);

  useEffect(() => {
    if (externalAccountId && activeAccounts.some((account) => account.id === externalAccountId)) return;
    const next = activeAccounts[0]?.id ?? "";
    setExternalAccountId(next);
  }, [activeAccounts, externalAccountId]);

  const openTransfer = isOpenTransfer(ramp.transfer);
  const sameDirection = ramp.transfer ? (ramp.transfer.direction === "OFF_RAMP") === (direction === "SELL") : false;
  const flowBlock = !ramp.profile?.ready
    ? "Verify your identity below first."
    : direction === "SELL" && activeAccounts.length === 0
      ? "Link a bank account below first."
      : openTransfer && sameDirection
        ? "Finish or cancel your current transfer below first."
        : null;
  const feeRows: RampFeeLine[] = [
    { label: "Fees", value: "Shown with your payment instructions" },
    { label: "Rail", value: coerceFiatRail(direction, fiatRail) },
  ];
  const providerCards: RailCardData[] = [];
  const fail = (error: unknown) => toast.error(mapRampApiError(error));

  const chainPickerList: PickerChain[] = DEST_CHAINS
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
    if (!token?.address) throw new Error("Select USDC on a configured settlement chain.");
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

  const onContinue = () => {
    if (!requireWallet() || !connectedAddress) return;
    const blocked = disabledReason ?? flowBlock;
    if (blocked) {
      toast.error(blocked);
      return;
    }
    void (async () => {
      try {
        const payload = transferPayload();
        await ramp.previewTransfer(payload);
        await ramp.createTransfer(payload);
        toast.success(direction === "SELL" ? "Ready. Send the USDC shown below." : "Ready. Pay from your bank using the details below.");
      } catch (error) {
        fail(error);
      }
    })();
  };

  const wallet = () => (requireWallet() && connectedAddress ? connectedAddress : null);
  const onStart = () => {
    const w = wallet();
    if (!w) return;
    void ramp.registerWallet(w, chainId).then(() => ramp.loadProfile(w, chainId)).catch(fail);
  };
  const onStartKyc = () => {
    const w = wallet();
    if (!w) return;
    void ramp.createKycLink({ wallet: w, chainId, fullName, email, type: "individual", redirectUri: `${window.location.origin}/ramp-v2` })
      .then((handoff) => {
        if (handoff.kycUrl) window.open(handoff.kycUrl, "_blank", "noopener,noreferrer");
        if (handoff.tosUrl) window.open(handoff.tosUrl, "_blank", "noopener,noreferrer");
      })
      .catch(fail);
  };
  const onLinkBank = () => {
    const w = wallet();
    if (!w) return;
    void ramp.createBankLink(w, chainId).then(async (session) => {
      setBankSession(session);
      try {
        await exchangeAfterPlaidLink({
          linkToken: session.linkToken,
          exchange: (token) => {
            setPublicToken(token);
            return ramp.exchangeBankLink({ wallet: w, chainId, sessionId: session.sessionId, publicToken: token });
          },
        });
        await ramp.syncAccounts(w, chainId);
        toast.success("Bank account linked.");
      } catch (error) {
        setShowTokenFallback(true);
        fail(error);
      }
    }).catch(fail);
  };
  const onExchangeFallback = () => {
    const w = wallet();
    if (!w || !bankSession || !publicToken) return;
    void ramp.exchangeBankLink({ wallet: w, chainId, sessionId: bankSession.sessionId, publicToken })
      .then(() => ramp.syncAccounts(w, chainId)).catch(fail);
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
              balanceUSD={accountSnapshot.balanceUSD}
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
          fiatAmount={direction === "SELL" ? (sameDirection && ramp.transfer ? ramp.transfer.amount : "") : fiatAmount}
          onFiatAmountChange={setFiatAmount}
          onSelectCurrency={() => setCurrencyPickerOpen(true)}
          chain={chain}
          tokenTicker={ticker}
          tokenName={ticker}
          tokenLogoUrl={tokenLogoUrl(chainId, ticker) ?? undefined}
          cryptoAmount={direction === "BUY" ? (sameDirection && ramp.transfer?.settledAmount ? ramp.transfer.settledAmount : "") : cryptoAmountInput}
          onCryptoAmountChange={setCryptoAmountInput}
          onSelectToken={() => setTokenPickerOpen(true)}
          onSelectChain={() => setChainPickerOpen(true)}
          providerName="Bridge"
          providerCount={1}
          providers={providerCards}
          settlementTicker={ticker}
          settlementChainName={chain.name}
          estimatedTime={fiatRail === "WIRE" ? "~1 day" : "~1 hour"}
          etaNote="After Bridge receives your payment"
          feeRows={feeRows}
          noProvider={!capabilities?.enabled}
          totalCostNote="Shown with your payment instructions"
          walletConnected={walletState.status === "connected"}
          onConnect={() => setShowWalletModal(true)}
          onSubmit={onContinue}
          submitLabel={ramp.busy ? "Working…" : "Continue"}
          blockedReason={disabledReason ?? flowBlock ?? undefined}
        />

        <RampGuidedFlow
          direction={direction}
          signer={rampSigner}
          profile={ramp.profile}
          kyc={ramp.kyc}
          accounts={ramp.accounts}
          transfer={ramp.transfer}
          busy={ramp.busy}
          error={ramp.errorMessage}
          blockReason={kycDisabledReason}
          fullName={fullName}
          email={email}
          onFullName={setFullName}
          onEmail={setEmail}
          onConnect={() => setShowWalletModal(true)}
          onStart={onStart}
          onStartKyc={onStartKyc}
          onCheckKyc={() => { const w = wallet(); if (w) void ramp.refreshKyc(w, chainId).catch(fail); }}
          onLinkBank={onLinkBank}
          onSyncAccounts={() => { const w = wallet(); if (w) void ramp.syncAccounts(w, chainId).catch(fail); }}
          onCheckStatus={() => { const w = wallet(); if (w && ramp.transfer) void ramp.loadTransferStatus(ramp.transfer.id, w, chainId).catch(fail); }}
          onCancel={() => { const w = wallet(); if (w && ramp.transfer) void ramp.cancelTransfer(ramp.transfer.id, w, chainId).then(() => toast.info("Transfer canceled.")).catch(fail); }}
          reviewExtras={
            <div style={{ display: "grid", gridTemplateColumns: direction === "SELL" && activeAccounts.length > 1 && !isMobile ? "1fr 1fr" : "1fr", gap: 12 }}>
              <RampField label={direction === "SELL" ? "Paid out by" : "Pay by"}>
                <select style={rampSelect} value={coerceFiatRail(direction, fiatRail)} onChange={(e) => setFiatRail(e.target.value as RampFiatRail)}>
                  {railsForDirection(direction).map((rail) => <option key={rail} value={rail}>{rail === "WIRE" ? "Wire" : "ACH bank transfer"}</option>)}
                </select>
              </RampField>
              {direction === "SELL" && activeAccounts.length > 1 && (
                <RampField label="To bank account">
                  <select style={rampSelect} value={externalAccountId} onChange={(e) => setExternalAccountId(e.target.value)}>
                    {activeAccounts.map((account) => (
                      <option key={account.id} value={account.id}>{account.bankName ?? "Account"} {account.lastFour ? `••••${account.lastFour}` : ""}</option>
                    ))}
                  </select>
                </RampField>
              )}
            </div>
          }
          bankExtras={showTokenFallback ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <RampField label="Bank token (only if the bank window didn't finish)">
                <input style={rampInput} value={publicToken} onChange={(e) => setPublicToken(e.target.value)} />
              </RampField>
              <RampActions><RampButton disabled={ramp.busy || !publicToken || !bankSession} onClick={onExchangeFallback}>Use this token</RampButton></RampActions>
            </div>
          ) : undefined}
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
          chainName={walletState.chain.name}
          chainColor={walletState.chain.color}
          balanceUSD={accountSnapshot.balanceUSD}
          portfolioStatus={accountSnapshot.status}
          activityAvailable={false}
          tokens={accountSnapshot.tokens}
          networks={accountSnapshot.networks}
          nativeBalance={connectedBalance.nativeBalance}
          nativeTicker={connectedBalance.nativeTicker}
          explorerUrl={getExplorerAddressUrl(walletState.chain.id, walletState.address) ?? undefined}
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
