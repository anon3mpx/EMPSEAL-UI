import { describe, it, expect, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createElement, type ReactNode } from 'react';
import { crossApi } from '../api/crossApi';
import { filterLayerZeroDestinations, layerZeroDestinationListed, useLayerZeroDestinations } from './useLayerZeroDestinations';

const native = '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE';
const zero = '0x0000000000000000000000000000000000000000';
const chain = { chainKey: 'abstract', chainType: 'EVM' };
const reachable = [{ chainKey: 'abstract', address: native, symbol: 'ETH', name: 'Ether', decimals: 18 }];

describe('LayerZero destination discovery', () => {
  it('filters provider-only destinations but retains other-rail candidates and native aliases', () => {
    const tokens = [{ address: zero }, { address: '0xCHECK' }, { address: '0xOTHER' }];
    expect(filterLayerZeroDestinations(tokens, reachable, chain, [tokens[2]])).toEqual([tokens[0], tokens[2]]);
    expect(filterLayerZeroDestinations(tokens, undefined, chain, [])).toEqual(tokens);
    expect(layerZeroDestinationListed(reachable, chain, zero)).toBe(true);
    expect(layerZeroDestinationListed(reachable, chain, '0xCHECK')).toBe(false);
    expect(layerZeroDestinationListed(undefined, chain, '0xCHECK')).toBeUndefined();
    expect(layerZeroDestinationListed([{ ...reachable[0], chainKey: 'solana', address: 'AbCd' }],
      { chainKey: 'solana', chainType: 'SOLANA' }, 'abcd')).toBe(false);
  });

  it('uses the selected source, normalizes native tokens, and does not reuse old destinations after a source change', async () => {
    const list = vi.spyOn(crossApi, 'listAllLayerZeroTokens').mockImplementation(async (request) => {
      if (request?.transferrableFromTokenAddress === native) return reachable;
      throw new Error('discovery offline');
    });
    const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
    const wrapper = ({ children }: { children: ReactNode }) => createElement(QueryClientProvider, { client }, children);
    const { result, rerender, unmount } = renderHook(({ address }) =>
      useLayerZeroDestinations({ chainKey: 'base', chainType: 'EVM', address }), { wrapper, initialProps: { address: zero } });
    await waitFor(() => expect(result.current.data).toEqual(reachable));
    expect(list.mock.calls[0][0]).toEqual({ transferrableFromChainKey: 'base', transferrableFromTokenAddress: native });
    rerender({ address: '0xOTHER' });
    expect(result.current.data).toBeUndefined();
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.data).toBeUndefined();
    unmount(); client.clear(); list.mockRestore();
  });
});
