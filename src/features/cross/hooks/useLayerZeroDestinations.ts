import { useQuery } from '@tanstack/react-query';
import { crossApi } from '../api/crossApi';
import type { LayerZeroValueTransferApiToken } from '../api/contracts';

type Chain = { chainKey?: string; chainType?: string };
type Token = { address?: string; providerAssetId?: string };
const NATIVE = '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE';
function providerAddress(address: string, chainType?: string): string {
  if (chainType?.toUpperCase() !== 'EVM') return address.trim();
  return /^0x0{40}$/i.test(address.trim()) ? NATIVE : address.trim();
}
function tokenKey(address: string, chainType?: string): string {
  const value = providerAddress(address, chainType);
  return chainType?.toUpperCase() === 'EVM' ? value.toLowerCase() : value;
}

export function useLayerZeroDestinations(source: Chain & { address?: string }) {
  const address = source.address ? providerAddress(source.address, source.chainType) : undefined;
  return useQuery({
    queryKey: ['cross-layerzero-destinations', source.chainKey, source.chainType, address],
    queryFn: ({ signal }) => crossApi.listAllLayerZeroTokens({
      transferrableFromChainKey: source.chainKey,
      transferrableFromTokenAddress: address,
    }, signal),
    enabled: Boolean(source.chainKey && source.chainType && address),
    ...crossApi.layerZeroDiscoveryQueryPolicy,
    retry: false,
  });
}

export function layerZeroDestinationListed(
  reachable: LayerZeroValueTransferApiToken[] | undefined, chain: Chain, address?: string,
): boolean | undefined {
  if (!reachable || !chain.chainKey || !chain.chainType || !address) return undefined;
  return reachable.some(token => token.isSupported !== false && token.chainKey === chain.chainKey &&
    tokenKey(token.address, chain.chainType) === tokenKey(address, chain.chainType));
}

export function filterLayerZeroDestinations<T extends Token>(
  tokens: T[], reachable: LayerZeroValueTransferApiToken[] | undefined,
  chain: Chain, otherRailTokens: T[],
): T[] {
  // Discovery failures/loading are unknown, not evidence that routes are absent.
  if (!reachable || !chain.chainKey || !chain.chainType) return tokens;
  const otherKeys = new Set(otherRailTokens.map(t => tokenKey(t.providerAssetId ?? t.address ?? '', chain.chainType)));
  const reachableKeys = new Set(reachable.filter(t => t.chainKey === chain.chainKey && t.isSupported !== false)
    .map(t => tokenKey(t.address, chain.chainType)));
  return tokens.filter(t => {
    const key = tokenKey(t.providerAssetId ?? t.address ?? '', chain.chainType);
    return otherKeys.has(key) || reachableKeys.has(key);
  });
}
