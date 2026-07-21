import { describe, expect, it } from 'vitest';
import { buildGasQuotePath, isGasBridgeTerminalStatus } from './useGasBridgeAPI';

describe('useGasBridgeAPI helpers', () => {
  it('stops polling for every terminal Gas.zip status', () => {
    expect(isGasBridgeTerminalStatus('CONFIRMED')).toBe(true);
    expect(isGasBridgeTerminalStatus('CANCELLED')).toBe(true);
    expect(isGasBridgeTerminalStatus('ERROR')).toBe(true);
    expect(isGasBridgeTerminalStatus('PENDING')).toBe(false);
  });

  it('builds simple quotes for exactly one destination chain', () => {
    expect(buildGasQuotePath(42161, '1000000000000000', 8453)).toBe(
      '/quotes/42161/1000000000000000/8453',
    );
    expect(() => buildGasQuotePath(42161, '1000000000000000', [8453, 10])).toThrow(
      'Gas bridge quotes require exactly one destination chain',
    );
  });
});
