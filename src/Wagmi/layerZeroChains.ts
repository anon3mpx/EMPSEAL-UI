// EVM chains reachable through the LayerZero Value Transfer API that the
// wallet must be able to switch to and sign on. Chains with a viem definition
// use it; the V2 server's chains viem lacks are defined below. Snapshot of
// LayerZero's chain list, 2026-10-02 (extended 2026-11-26).
import { defineChain } from "viem";
import {
  opBNB,
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

/** Chains the V2 server routes (LayerZero Value Transfer) that viem has no definition for. Name and native symbol from LayerZero's
 *  chain list, RPC from the server's config/provider-chains.mainnet.json; each RPC answered eth_chainId with its id on 2026-11-26. */
const lzOnly = (id: number, name: string, symbol: string, rpc: string) =>
  defineChain({ id, name, nativeCurrency: { name: symbol, symbol, decimals: 18 }, rpcUrls: { default: { http: [rpc] } } });
const opn = lzOnly(222, "OPN", "IOPN", "https://mainnet-rpc.iopn.tech");
const pharos = lzOnly(1672, "Pharos", "PROS", "https://rpc.pharos.xyz");
const kite = lzOnly(2366, "Kite", "KITE", "https://rpc.gokite.ai");
const anubis = lzOnly(6714, "Anubis", "DAI", "https://rpc.anubispace.org");
const apexFusionNexus = lzOnly(9069, "Apex Fusion Nexus", "AP3X", "https://rpc.nexus.mainnet.apexfusion.org");
const gateLayer = lzOnly(10088, "Gate Layer", "GT", "https://gatelayer-mainnet.gatenode.cc");
const rayls = lzOnly(72957, "Rayls", "USDr", "https://mainnet-rpc.rayls.com");
const doma = lzOnly(97477, "Doma", "ETH", "https://doma.drpc.org");

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
  opBNB, // opbnb (204)
  opn, // opn (222)
  pharos, // pharos (1672)
  kite, // kite (2366)
  anubis, // anubis (6714)
  apexFusionNexus, // apexfusionnexus (9069)
  gateLayer, // gatelayer (10088)
  rayls, // rayls (72957)
  doma, // doma (97477)
] as const;
