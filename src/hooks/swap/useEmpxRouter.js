// ─── useEmpxRouter ───────────────────────────────────────────────────────────
//
// Root SDK seam for the swap page.  Returns a memoised EmpxRouter instance
// (from empx-swap-sdk) scoped to the current chain + connected signer.
//
// Design choices (per the C3 audit + locked user decisions):
//   • Hybrid model: SDK is used for WRITES (allowance / approval / swap
//     calldata + USD pricing).  wagmi remains the reactive READ layer
//     (useBalance, useReadContract for block-watched data).  The two
//     coexist; this hook is the SDK side of that line.
//   • file: dep — local SDK build at ../../empx-swap-sdk, picked up via
//     package.json file: path.  Rebuild SDK (`npm run build` in its dir)
//     after edits.
//   • Affiliate config sourced from Vite env vars so the dApp can earn a
//     share of the protocol fee without recompiling.  Two env vars:
//       VITE_EMPX_AFFILIATE_ADDRESS  — payable address
//       VITE_EMPX_AFFILIATE_FEE_BPS  — basis points of the protocol fee
//                                       to redirect (e.g. "2000" = 20%)
//     Both unset → no affiliate; address set but bps unset → defaults to 2000.
//
// Lifecycle:
//   • Disconnected (no signer): router runs in read-only mode against the
//     chain's default RPC.  Read methods (findBestPath, getTokenPriceUSD,
//     checkAllowance) work; write methods (approve, swap) fail.
//   • Connected: router uses the wagmi-derived ethers Signer; full read
//     + write surface available.
//   • Chain switch: router re-created (memo dep on chainId).
//   • Account switch: router re-created (memo dep on address + signer ref).
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

export function useEmpxRouter() {
  const { address } = useAccount();
  const chainId = useChainId();
  const { data: walletClient } = useWalletClient();

  // The signer is freshly derived per render; memoise on its identity-stable
  // dependencies (chain + address).  walletClient itself is a wagmi-managed
  // ref whose contents may mutate between connections.
  const signer = useMemo(
    () => walletClientToEthersSigner(walletClient),
    [walletClient, chainId, address],
  );

  const router = useMemo(() => {
    if (!chainId) return null;
    try {
      // Pass signer when available, otherwise SDK creates a read-only router
      // against the chain's default RPC.
      return createRouter(
        chainId,
        signer ?? undefined,
        AFFILIATE_CONFIG ? { affiliate: AFFILIATE_CONFIG } : undefined,
      );
    } catch (err) {
      // Most likely: chainId not in the SDK's chain registry.  Don't throw
      // upstream — the swap page handles "no router" gracefully via guards.
      console.warn("[useEmpxRouter] failed to create router for chain", chainId, err);
      return null;
    }
  }, [chainId, signer]);

  return {
    router,
    isReady: router !== null,
    signer,
    hasAffiliate: !!AFFILIATE_CONFIG,
  };
}
