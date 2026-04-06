import pulsechainTokens from './pulsechain.json';
import ethwTokens from './ethw.json';
import sonicTokens from './sonic.json';
import baseTokens from './base.json';
import seiTokens from './sei.json';
import berachainTokens from './berachain.json';
import rootstockTokens from './rootstock.json';
import bscTokens from './bsc.json';
import monadTokens from './monad.json';
import arbitrumTokens from './arbitrum.json';
import optimismTokens from './optimism.json';
import polygonTokens from './polygon.json';
import avalancheTokens from './avalanche.json';
import hyperEVMTokens from './hyperEVM.json';

export const CHAIN_TOKENS: Record<number, any[]> = {
  369: pulsechainTokens,
  10001: ethwTokens,
  146: sonicTokens,
  8453: baseTokens,
  1329: seiTokens,
  80094: berachainTokens,
  30: rootstockTokens,
  56: bscTokens,
  143: monadTokens,
  42161: arbitrumTokens,
  10: optimismTokens,
  137: polygonTokens,
  43114: avalancheTokens,
  999: hyperEVMTokens,
};
