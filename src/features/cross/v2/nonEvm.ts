// Mirrors ruflo empx-core/server packages/chain-profile/src/l1.ts.
import { NON_EVM_CHAIN_IDS as IDS, chainKindFor, isNonEvmChain } from "@/lib/wallet/chainKind";
import { validateForKind } from "@/lib/wallet/validators";

const CHAINS = [
  { caip2: "bip122:000000000019d6689c085ae165831e93", chainId: IDS.BTC, slip44: 0, decimals: 8 },
  { caip2: "bip122:12a765e31ffd4059bada1e25190f6e98", chainId: IDS.LTC, slip44: 2, decimals: 8 },
  { caip2: "bip122:1a91e3dace36e2be3bf030a65679fe82", chainId: IDS.DOGE, slip44: 3, decimals: 8 },
  { caip2: "tron:728126428", chainId: IDS.TRON, slip44: 195, decimals: 6 },
  { caip2: "cosmos:cosmoshub-4", chainId: IDS.COSMOS, slip44: 118, decimals: 6 },
  { caip2: "monero:418015bb9ae982a1975da7d79277c270", chainId: IDS.XMR, slip44: 128, decimals: 12 },
  { caip2: "xrpl:0", chainId: IDS.XRP, slip44: 144, decimals: 6 },
  { caip2: "solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp", chainId: IDS.SOL, slip44: 501, decimals: 9 },
];

export function chainIdOfCaip2(caip2: string): number | undefined {
  if (/^eip155:[1-9]\d*$/.test(caip2)) {
    const id = Number(caip2.slice(7));
    return Number.isSafeInteger(id) && !isNonEvmChain(id) ? id : undefined;
  }
  return CHAINS.find((row) => row.caip2 === caip2)?.chainId;
}

export function caip2OfChainId(id: number): string | undefined {
  return (
    CHAINS.find((row) => row.chainId === id)?.caip2 ??
    (Number.isSafeInteger(id) && id > 0 && !Object.values(IDS).some((pseudoId) => pseudoId === id) ? `eip155:${id}` : undefined)
  );
}

export function nativeAssetOf(id: number): string | undefined {
  const row = CHAINS.find((row) => row.chainId === id);
  return row ? `${row.caip2}/slip44:${row.slip44}` : undefined;
}

export function nativeDecimals(id: number): number | undefined {
  return CHAINS.find((row) => row.chainId === id)?.decimals;
}

export function addressValidFor(chainId: number, address: string): boolean {
  const kind = chainKindFor(chainId);
  return kind !== null && validateForKind(kind, address.trim()).valid;
}
