// ─── wagmi (viem) ↔ ethers v6 adapter ────────────────────────────────────────
//
// The UI uses wagmi v2 + viem.  The empx-swap-sdk uses ethers v6.  They speak
// the same EIP-1193 transport layer underneath, so the bridge is a thin
// shim that wraps wagmi's WalletClient transport into an ethers BrowserProvider
// + JsonRpcSigner.
//
// Pattern adapted from the canonical wagmi docs ("Migration from Ethers v5/v6")
// — see https://wagmi.sh/react/guides/ethers
//
// Used by useEmpxRouter to turn the wagmi-connected wallet into the
// ethers.Signer the SDK's `createRouter(chainId, signer, ...)` expects.

import { BrowserProvider, JsonRpcSigner } from "ethers";
import type { Account, Chain, Client, Transport } from "viem";

/**
 * Convert a wagmi/viem WalletClient into an ethers v6 JsonRpcSigner.
 *
 * @param walletClient — typically from `useWalletClient()` (wagmi)
 * @returns ethers Signer or null when walletClient is undefined (still connecting)
 */
export function walletClientToEthersSigner(
  walletClient: Client<Transport, Chain, Account> | undefined | null,
): JsonRpcSigner | null {
  if (!walletClient) return null;
  const { account, chain, transport } = walletClient;
  if (!account || !chain) return null;

  const network = {
    chainId: chain.id,
    name: chain.name,
    ensAddress:
      (chain as { contracts?: { ensRegistry?: { address?: string } } })
        .contracts?.ensRegistry?.address,
  };
  // ethers' BrowserProvider accepts any EIP-1193-compatible transport.
  // viem's transport is EIP-1193 compatible.
  const provider = new BrowserProvider(
    transport as unknown as ConstructorParameters<typeof BrowserProvider>[0],
    network,
  );
  return new JsonRpcSigner(provider, account.address);
}
