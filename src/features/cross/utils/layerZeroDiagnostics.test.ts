import { it, expect } from 'vitest';
import { mapCrossApiError, noRoutesMessage, NO_ROUTES_MESSAGE } from './errors';

const noRoute = (code: string): any => ({
  status: 400,
  body: {
    error: 'No route available for this pair',
    providerDiagnostics: [{ provider: 'layerzero_value_transfer_api', code, message: 'upstream' }],
  },
});

it('reports an empty quote as "no routes" without naming a rail', () => {
  for (const code of ['unsupported_route', 'quote_rejected']) {
    expect(mapCrossApiError(noRoute(code))).toBe(NO_ROUTES_MESSAGE);
  }
  expect(mapCrossApiError({ status: 400, body: { error: 'No route available for this pair' } })).toBe(NO_ROUTES_MESSAGE);
});

it('suggests a retry when a provider failed transiently', () => {
  for (const code of ['timeout', 'rate_limited', 'unavailable', 'authentication_failed', 'invalid_response']) {
    const message = mapCrossApiError(noRoute(code));
    expect(message).toMatch(/no routes available/i);
    expect(message).toMatch(/retry/i);
    expect(message).not.toMatch(/layerzero/i);
  }
  expect(noRoutesMessage(undefined)).toBe(NO_ROUTES_MESSAGE);
});
