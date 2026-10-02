// EVM chains reachable through the LayerZero Value Transfer API that the
// wallet must be able to switch to and sign on. Only chains with a viem
// definition are listed; LayerZero EVM chains without one stay unexecutable
// (see isWalletChain). Snapshot of LayerZero's chain list, 2026-10-02.
import {
  flare,
  cronos,
  telos,
  xdc,
  fuse,
  redbellyMainnet,
  manta,
  xLayer,
  tac,
  fantom,
  fraxtal,
  orderly,
  hedera,
  zkSync,
  astar,
  flowMainnet,
  subtensorEvm,
  stable,
  confluxESpace,
  metis,
  coreDao,
  vana,
  story,
  gravity,
  injective,
  soneium,
  kava,
  goat,
  abstract,
  morph,
  peaq,
  citrea,
  tempo,
  megaeth,
  beam,
  robinhood,
  mantle,
  somnia,
  arc,
  nibiru,
  kaia,
  iota,
  plasma,
  zeroGMainnet,
  apeChain,
  mode,
  eduChain,
  celo,
  etherlink,
  hemi,
  zircuit,
  superposition,
  bob,
  codex,
  blast,
  chiliz,
  scroll,
  gensyn,
  katana,
} from "viem/chains";

export const layerZeroWalletChains = [
  flare, // flare (14)
  cronos, // cronosevm (25)
  telos, // telos (40)
  xdc, // xdc (50)
  fuse, // fuse (122)
  redbellyMainnet, // redbelly (151)
  manta, // manta (169)
  xLayer, // xlayer (196)
  tac, // tac (239)
  fantom, // fantom (250)
  fraxtal, // fraxtal (252)
  orderly, // orderly (291)
  hedera, // hedera (295)
  zkSync, // zksync (324)
  astar, // astar (592)
  flowMainnet, // flow (747)
  subtensorEvm, // subtensorevm (964)
  stable, // stable (988)
  confluxESpace, // conflux (1030)
  metis, // metis (1088)
  coreDao, // coredao (1116)
  vana, // islander (1480)
  story, // story (1514)
  gravity, // gravity (1625)
  injective, // injectiveevm (1776)
  soneium, // soneium (1868)
  kava, // kava (2222)
  goat, // goat (2345)
  abstract, // abstract (2741)
  morph, // morph (2818)
  peaq, // peaq (3338)
  citrea, // citrea (4114)
  tempo, // tempo (4217)
  megaeth, // megaeth (4326)
  beam, // beam (4337)
  robinhood, // robinhood (4663)
  mantle, // mantle (5000)
  somnia, // somnia (5031)
  arc, // arc (5042)
  nibiru, // nibiru (6900)
  kaia, // klaytn (8217)
  iota, // iota (8822)
  plasma, // plasma (9745)
  zeroGMainnet, // og (16661)
  apeChain, // ape (33139)
  mode, // mode (34443)
  eduChain, // edu (41923)
  celo, // celo (42220)
  etherlink, // etherlink (42793)
  hemi, // hemi (43111)
  zircuit, // zircuit (48900)
  superposition, // superposition (55244)
  bob, // bob (60808)
  codex, // codex (81224)
  blast, // blast (81457)
  chiliz, // chiliz (88888)
  scroll, // scroll (534352)
  gensyn, // gensyn (685689)
  katana, // katana (747474)
] as const;
