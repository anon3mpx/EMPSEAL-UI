import pulsechainAdapters from './pulsechain.json';
import ethwAdapters from './ethw.json';
import sonicAdapters from './sonic.json';
import baseAdapters from './base.json';
import seiAdapters from './sei.json';
import berachainAdapters from './berachain.json';
import rootstockAdapters from './rootstock.json';

export const CHAIN_ADAPTERS: Record<number, any[]> = {
  369: pulsechainAdapters,
  10001: ethwAdapters,
  146: sonicAdapters,
  8453: baseAdapters,
  1329: seiAdapters,
  80094: berachainAdapters,
  30: rootstockAdapters,
};
