// ─── BridgePage — bridge UI shell (Via Labs rebuild plugs in here) ────────
//
// The Via Labs bridge is queued per D:/empx/ROADMAP-via-labs-bridge.md.
// This page exists as the production UX SHELL so when the SDK work lands,
// engineers swap a few function calls and the page goes live — no UI
// restructure needed.
//
// What works today (UI only — disconnected from any rail):
//   • Source chain → destination chain picker
//   • Amount input with USD preview
//   • Recipient toggle
//   • Route hop visualization (preview — no live quote)
//   • Explicit preview-only quote/execution slots
//
// Layout: one centred 480px column holding EmpxBridgeWidget, same measure as
// swap / cross / gas. No page header or side panel — the widget carries its
// "Bridge" eyebrow, "Lock & mint" badge, route preview and the disabled CTA
// with its reason.
//
// What WILL plug in when Via Labs rebuild lands:
//   • Chain set sourced from ViaLabsRailPlugin.supportsRoute()
//   • Quote slot → ViaLabsSolver.quote()
//   • Execute slot → buildExecution() + wallet send
//   • Status slot → AsyncIterable<IntentEvent> stream
//
// The "Bridge" action is disabled with a clear label so users understand
// the page is functional UX but not yet executing real transactions.

import { useMemo, useState } from "react";
import {
  AccountModal,
  ChainLogo,
  ChainPicker,
  DappFooter,
  DappNavbar,
  NetworkSelector,
  Toaster,
  TokenPicker,
  WalletButton,
  WalletModal,
  useIsMobile,
  toast,
  type PickerChain,
  type PickerToken,
  type RouteHop,
  type WalletOption,
} from "../components";
import { useWalletConnection } from "../hooks/useWalletConnection";
import { useV2Balances } from "../hooks/useV2Balances";
import { useAccountSnapshot } from "../hooks/useAccountSnapshot";
import EmpxBridgeWidget from "../EmpxBridgeWidget";
import { WidgetKitKeyframes } from "../widgetKit";
import { getExplorerAddressUrl } from "../data/explorers";
import { V2_AGGREGATOR_CHAINS } from "../data/v2ChainView";
import { getTokensForChain } from "../data/v2TokenView";
import { V2_BRIDGE_ROUTE_STATUS } from "../data/v2ProductRoutes";
import {
  tierForChainId,
  tierLabel,
} from "../data/empxRegistry";

// ─── Bridge chain catalog ─────────────────────────────────────────────────
// Reflects the chains the OLD Via Labs bridge served (per
// ROADMAP-via-labs-bridge.md reference material).  When the new SDK lands
// this will be sourced from ViaLabsRailPlugin.supportsRoute().

const BRIDGE_CHAINS = V2_AGGREGATOR_CHAINS;

type ChainPickerTarget = "from" | "to";

export default function BridgePage() {
  const isMobile = useIsMobile();
  const { walletState, walletOptions, onSelectWallet, disconnect, switchChain, currentChain } =
    useWalletConnection();
  const connectedBalance = useV2Balances();
  const accountSnapshot = useAccountSnapshot(walletState.status === "connected" ? walletState.address : null);
  const [showWalletModal, setShowWalletModal] = useState(false);
  const [showAccountModal, setShowAccountModal] = useState(false);

  const [fromChainId, setFromChainId] = useState(369);
  const [toChainId, setToChainId] = useState(42161);
  const [token, setToken] = useState("USDC");
  const [amount, setAmount] = useState("100");

  const [useDifferentRecipient, setUseDifferentRecipient] = useState(false);
  const [recipient, setRecipient] = useState("");

  const [chainPickerTarget, setChainPickerTarget] = useState<ChainPickerTarget | null>(null);
  const [tokenPickerOpen, setTokenPickerOpen] = useState(false);

  const fromChain = useMemo(() => BRIDGE_CHAINS.find((c) => c.id === fromChainId) ?? BRIDGE_CHAINS[0], [fromChainId]);
  const toChain   = useMemo(() => BRIDGE_CHAINS.find((c) => c.id === toChainId) ?? BRIDGE_CHAINS[1], [toChainId]);
  const tokenPickerTokens: PickerToken[] = useMemo(() => {
    const tokens = getTokensForChain(fromChainId);
    const source = tokens.length > 0
      ? tokens
      : [{ ticker: fromChain.ticker, name: fromChain.ticker, badge: undefined }];
    return source.slice(0, 12).map((t) => ({
      ticker: t.ticker,
      name: t.name,
      chainName: fromChain.name,
      chainColor: fromChain.color,
      badge: t.badge === "WARNING" ? undefined : t.badge,
    }));
  }, [fromChain, fromChainId]);

  const amountNum = Number(amount.replace(/,/g, "")) || 0;
  const recipientValid = !useDifferentRecipient || /^0x[0-9a-fA-F]{40}$/.test(recipient.trim());

  const chainPickerList: PickerChain[] = useMemo(
    () =>
      BRIDGE_CHAINS.map((c) => {
        const tier = tierForChainId(c.id);
        return {
          id: c.id,
          name: c.name,
          ticker: c.ticker,
          color: c.color,
          tier,
          tierLabel: tierLabel(tier),
        };
      }),
    [],
  );

  const routeHops: RouteHop[] = useMemo(
    () => [
      { ticker: token, chainName: fromChain.name, chainColor: fromChain.color, via: "Lock on source" },
      { ticker: token, chainName: toChain.name,   chainColor: toChain.color,   via: "Mint on destination" },
    ],
    [fromChain, toChain, token],
  );

  const flip = () => {
    const fc = fromChainId;
    setFromChainId(toChainId);
    setToChainId(fc);
  };

  return (
    <div style={{ minHeight: "100vh", background: "#05050c", color: "#fff", fontFamily: "Inter, sans-serif" }}>
      <DappNavbar
        activeHref="/bridge-v2"
        controls={
          <>
            <NetworkSelector
              name={fromChain.name}
              color={fromChain.color}
              onClick={() => setChainPickerTarget("from")}
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

      {/* Single centred 480px column — identical desktop and mobile. */}
      <main
        style={{
          maxWidth: 480 + (isMobile ? 32 : 40),
          margin: "0 auto",
          padding: isMobile ? "24px 16px 40px" : "38px 20px 48px",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
        }}
      >
        <EmpxBridgeWidget
          fromChain={{
            id: fromChain.id,
            name: fromChain.name,
            color: fromChain.color,
            logo: <ChainLogo chainId={fromChain.id} symbol={fromChain.name.slice(0, 3).toUpperCase()} bg={fromChain.color} size={17} />,
          }}
          fromToken={{ ticker: token }}
          fromAmount={amount}
          fromBalance={undefined}
          fromUsdValue={amountNum}
          onFromAmountChange={setAmount}
          onSelectFromToken={() => setTokenPickerOpen(true)}
          onSelectFromChain={() => setChainPickerTarget("from")}
          onPercentClick={undefined}

          toChain={{
            id: toChain.id,
            name: toChain.name,
            color: toChain.color,
            logo: <ChainLogo chainId={toChain.id} symbol={toChain.name.slice(0, 3).toUpperCase()} bg={toChain.color} size={17} />,
          }}
          toToken={{ ticker: token }}
          toAmount="—"
          toUsdValue={null}
          onSelectToToken={() => setTokenPickerOpen(true)}
          onSelectToChain={() => setChainPickerTarget("to")}

          routeHops={routeHops}

          swapDisabled={!V2_BRIDGE_ROUTE_STATUS.executionEnabled}
          swapLabel={V2_BRIDGE_ROUTE_STATUS.primaryActionLabel}
          comingSoonHint="Skeleton is preserved, but quotes and execution stay disabled until the rail SDK is wired."
          onSwap={() => toast.info("Bridge preview only — rail SDK required")}
          onFlip={flip}

          walletConnected={walletState.status === "connected"}
          onConnect={() => setShowWalletModal(true)}
        />
      </main>

      <WalletModal
        open={showWalletModal}
        onClose={() => setShowWalletModal(false)}
        wallets={walletOptions}
        onSelect={(w) => {
          setShowWalletModal(false);
          onSelectWallet(w);
        }}
      />

      {chainPickerTarget && (
        <ChainPicker
          open={!!chainPickerTarget}
          onClose={() => setChainPickerTarget(null)}
          chains={chainPickerList}
          selectedId={chainPickerTarget === "from" ? fromChainId : toChainId}
          mode="swap"
          onSelect={(c) => {
            if (chainPickerTarget === "from") setFromChainId(c.id);
            else setToChainId(c.id);
            setChainPickerTarget(null);
          }}
        />
      )}

      {/* Token picker — same token list on both source + destination (lock-and-mint) */}
      <TokenPicker
        open={tokenPickerOpen}
        onClose={() => setTokenPickerOpen(false)}
        tokens={tokenPickerTokens}
        recent={tokenPickerTokens.slice(0, 4)}
        selected={token}
        onSelect={(t) => { setToken(t.ticker); setTokenPickerOpen(false); toast.info(`Token → ${t.ticker}`); }}
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
          onSwitchNetwork={() => { setShowAccountModal(false); setChainPickerTarget("from"); }}
          onSwitchWallet={() => { setShowAccountModal(false); setShowWalletModal(true); }}
          onDisconnect={() => { setShowAccountModal(false); disconnect(); toast.info("Wallet disconnected"); }}
        />
      )}

      <DappFooter />
      <Toaster />
    </div>
  );
}
