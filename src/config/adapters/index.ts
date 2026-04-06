import pulsechainAdapters from './pulsechain.json';
import ethwAdapters from './ethw.json';
import sonicAdapters from './sonic.json';
import baseAdapters from './base.json';
import seiAdapters from './sei.json';
import berachainAdapters from './berachain.json';
import rootstockAdapters from './rootstock.json';
import bscAdapters from './bsc.json';
import monadAdapters from './monad.json';
import arbitrumAdapters from './arbitrum.json';
import optimismAdapters from './optimism.json';
import polygonAdapters from './polygon.json';
import avalancheAdapters from './avalanche.json';
import hyperEVMAdapters from './hyperEVM.json';

export const CHAIN_ADAPTERS: Record<number, any[]> = {
  369: pulsechainAdapters,
  10001: ethwAdapters,
  146: sonicAdapters,
  8453: baseAdapters,
  1329: seiAdapters,
  80094: berachainAdapters,
  30: rootstockAdapters,
  56: bscAdapters,
  143: monadAdapters,
  42161: arbitrumAdapters,
  10: optimismAdapters,
  137: polygonAdapters,
  43114: avalancheAdapters,
  999: hyperEVMAdapters,
};
