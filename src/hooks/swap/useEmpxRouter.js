// ─── useEmpxRouter ───────────────────────────────────────────────────────────
//
// Root SDK seam for the swap surfaces. Returns a memoised read-only EmpxRouter
// instance (from the published empx-swap-sdk package) for the current chain,
// plus the wallet signer used only for transaction submission.
//
// The SDK prepares auto split/single routes and their exact calldata. Wagmi
// remains the reactive wallet/read layer and powers the local quote fallback.
// Pair-type fees are enabled so each splitSwap feeContext resolves to the same
// V/V, V/S, or S/S rate shown by the UI.
//   • Affiliate config sourced from Vite env vars so the dApp can earn a
//     share of the protocol fee without recompiling.  Two env vars:
//       VITE_EMPX_AFFILIATE_ADDRESS  — payable address
//       VITE_EMPX_AFFILIATE_FEE_BPS  — basis points of the protocol fee
//                                       to redirect (e.g. "2000" = 20%)
//     Both unset → no affiliate; address set but bps unset → defaults to 2000.
//
// Lifecycle:
//   • Router: always runs in read-only mode against the chain's default RPC.
//     This keeps SDK calls inside the SDK's ethers instance.
//   • Connected: the wagmi-derived ethers Signer is returned separately for
//     approval and swap transaction submission.
//   • Chain switch: router re-created (memo dep on chainId).
//   • Account switch: signer changes, but the read router stays stable.
//
// Returns:
//   {
//     router,           // EmpxRouter | null — null while signer is loading
//     isReady,          // boolean — convenience: router !== null
//     signer,           // ethers.Signer | null — for callers that need raw
//     hasAffiliate,     // boolean — surface for analytics / debug overlays
//   }

import { useMemo } from "react";
import { useAccount, useChainId, useWalletClient } from "wagmi";
import { createRouter } from "empx-swap-sdk";
import { walletClientToEthersSigner } from "../../utils/swap/wagmiEthersAdapter";

// Read once at module-load time — env vars don't change at runtime in Vite builds.
const AFFILIATE_ADDRESS = import.meta.env?.VITE_EMPX_AFFILIATE_ADDRESS || "";
const AFFILIATE_FEE_BPS_RAW = import.meta.env?.VITE_EMPX_AFFILIATE_FEE_BPS || "";
const AFFILIATE_FEE_BPS = AFFILIATE_FEE_BPS_RAW
  ? Number.parseInt(AFFILIATE_FEE_BPS_RAW, 10)
  : 2000; // sensible default: 20% of protocol fee if address is set but bps isn't

const AFFILIATE_CONFIG =
  AFFILIATE_ADDRESS && /^0x[a-fA-F0-9]{40}$/.test(AFFILIATE_ADDRESS)
    ? { address: AFFILIATE_ADDRESS, feeBps: AFFILIATE_FEE_BPS }
    : null;

export function useEmpxRouter(options = {}) {
  const { address } = useAccount();
  const connectedChainId = useChainId();
  const chainId = options.chainId ?? connectedChainId;
  const { data: walletClient } = useWalletClient();

  // The signer is freshly derived per render; memoise on its identity-stable
  // dependencies (chain + address).  walletClient itself is a wagmi-managed
  // ref whose contents may mutate between connections.
  const signer = useMemo(
    () => walletClientToEthersSigner(walletClient),
    [walletClient, connectedChainId, address],
  );

  const router = useMemo(() => {
    if (!chainId) return null;
    try {
      const routerConfig = {
        pairTypeFees: {},
        ...(AFFILIATE_CONFIG ? { affiliate: AFFILIATE_CONFIG } : {}),
      };
      // Never pass the app's ethers signer into the SDK. The app and the SDK
      // can resolve different ethers copies, which makes the SDK's
      // `instanceof AbstractSigner` provider detection fail. The signer is
      // returned separately and only used to submit prepared calldata.
      return createRouter(
        chainId,
        undefined,
        routerConfig,
      );
    } catch (err) {
      // Most likely: chainId not in the SDK's chain registry.  Don't throw
      // upstream — the swap page handles "no router" gracefully via guards.
      console.warn("[useEmpxRouter] failed to create router for chain", chainId, err);
      return null;
    }
  }, [chainId]);

  return {
    router,
    isReady: router !== null,
    signer,
    hasAffiliate: !!AFFILIATE_CONFIG,
  };
}
