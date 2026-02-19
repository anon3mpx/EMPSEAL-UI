import pulsechainTokens from './pulsechain.json';
import ethwTokens from './ethw.json';
import sonicTokens from './sonic.json';
import baseTokens from './base.json';
import seiTokens from './sei.json';
import berachainTokens from './berachain.json';
import rootstockTokens from './rootstock.json';

export const CHAIN_TOKENS: Record<number, any[]> = {
  369: pulsechainTokens,
  10001: ethwTokens,
  146: sonicTokens,
  8453: baseTokens,
  1329: seiTokens,
  80094: berachainTokens,
  30: rootstockTokens,
};
