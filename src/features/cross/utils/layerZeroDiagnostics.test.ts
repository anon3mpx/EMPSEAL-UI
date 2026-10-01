import { it, expect } from 'vitest';
import { mapCrossApiError, layerZeroDiagnosticMessage, layerZeroQuoteNotice } from './errors';
import { normalizeOfferSet } from '../model/quotes';

it('distinguishes provider quote failures and preserves diagnostics when other routes succeed', () => {
  for (const [code, expected] of [['unsupported_route', /does not support/i], ['timeout', /timed out/i], ['authentication_failed', /authentication/i], ['rate_limited', /rate.limit/i]]) {
    expect(mapCrossApiError({ status: 400, body: { error: 'No route available for this pair', providerDiagnostics: [{ provider: 'layerzero_value_transfer_api', code, message: 'upstream' }] } })).toMatch(expected);
  }
  const providerDiagnostics: any = [{ provider: 'layerzero_value_transfer_api', code: 'quote_rejected', message: 'Insufficient liquidity' }];
  const result = normalizeOfferSet({ offerSet: { offerSetId: 'other-route', expiresAt: 123, offers: [], providerDiagnostics } });
  expect(layerZeroDiagnosticMessage(result.providerDiagnostics)).toMatch(/Insufficient liquidity/);
});

it('hides "no LayerZero route" notices when other rails quoted and LayerZero is not selected', () => {
  const diagnostics = (code: string, message = 'Unsupported token'): any => [{ provider: 'layerzero_value_transfer_api', code, message }];

  for (const code of ['quote_rejected', 'unsupported_route']) {
    expect(layerZeroQuoteNotice(diagnostics(code), { hasOffers: true, layerZeroSelected: false })).toBeNull();
    expect(layerZeroQuoteNotice(diagnostics(code), { hasOffers: false, layerZeroSelected: false })).not.toBeNull();
    expect(layerZeroQuoteNotice(diagnostics(code), { hasOffers: true, layerZeroSelected: true })).not.toBeNull();
  }
  // Operational failures still surface.
  expect(layerZeroQuoteNotice(diagnostics('rate_limited'), { hasOffers: true, layerZeroSelected: false })).toMatch(/rate limiting/i);
  expect(layerZeroQuoteNotice(undefined, { hasOffers: false, layerZeroSelected: false })).toBeNull();
});
