import { ChainConfig } from "../types";

export const SUPPORTED_CHAINS: Record<number, ChainConfig> = {
  // PulseChain
  369: {
    chainId: 369,
    name: "PulseChain",
    symbol: "pulsechain",
    routerAddress: '0x0Cf6D948Cf09ac83a6bf40C7AD7b44657A9F2A52',
    // routerAddress: "0xea73e1dEbC70770520A68Aa393C1d072a529bea9",
    wethAddress: "0xA1077a294dDE1B09bB078844df40758a5D0f9a27",
    priceApi: {
      baseUrl: "https://api.geckoterminal.com/api/v2",
      tokenPriceEndpoint: "simple/networks/pulsechain/token_price",
      graphEndpoint: "networks/pulsechain/pools",
    },
    blockExplorer: "https://otter.pulsechain.com/tx/",
    blockExplorerName: "Otterscan",
    rpcUrl: "https://rpc.pulsechain.com",
    maxHops: 3,
    blockTime: 10,
    stableTokens: [
      "0x15d38573d2feeb82e7ad5187ab8c1d52810b1f07",
      "0x0cb6f5a34ad42ec934882a05265a7d5f59b51a2f",
      "0xefd766ccb38eaf1dfd701853bfce31359239f305",
    ],
  },
  // ETHW
  10001: {
    chainId: 10001,
    name: "EthereumPOW",
    symbol: "ethw",
    routerAddress: "0x4bF29b3D063BE84a8206fb65050DA3E21239Ff12",
    wethAddress: "0x7Bf88d2c0e32dE92CdaF2D43CcDc23e8Edfd5990",
    priceApi: {
      baseUrl: "https://api.geckoterminal.com/api/v2",
      tokenPriceEndpoint: "simple/networks/ethw/token_price",
      graphEndpoint: "networks/ethw/pools",
    },
    blockExplorer: "https://www.oklink.com/ethereum-pow/tx/",
    blockExplorerName: "Oklink",
    rpcUrl: "https://ethw.public-rpc.com",
    maxHops: 3,
    blockTime: 12,
  },
  //sonic
  146: {
    chainId: 146,
    name: "Sonic",
    symbol: "sonic",
    routerAddress: "0xd8016e376e15b20Fc321a37fD69DC42cfDf951Bb",
    wethAddress: "0x039e2fB66102314Ce7b64Ce5Ce3E5183bc94aD38",
    priceApi: {
      baseUrl: "https://api.geckoterminal.com/api/v2",
      tokenPriceEndpoint: "simple/networks/sonic/token_price",
      graphEndpoint: "networks/sonic/pools",
    },
    blockExplorer: "https://sonicscan.org/tx/",
    blockExplorerName: "sonicscan",
    rpcUrl: "https://rpc.soniclabs.com",
    maxHops: 2,
    blockTime: 1,
    stableTokens: [
      "0x29219dd400f2Bf60E5a23d13Be72B486D4038894", // USDC.e
      "0xd3DCe716f3eF535C5Ff8d041c1A41C3bd89b97aE", // scUSD
      "0x6047828dc181963ba44974801FF68e538dA5eaF9", // USDT
    ],
  },
  //base
  8453: {
    chainId: 8453,
    name: 'Base',
    symbol: "base",
    routerAddress: '0xB12b7C117434B58B7623f994F4D0b4af7BC0Ac37',
    wethAddress: '0x4200000000000000000000000000000000000006',
    priceApi: {
      baseUrl: 'https://api.geckoterminal.com/api/v2',
      tokenPriceEndpoint: 'simple/networks/base/token_price',
      graphEndpoint: 'networks/base/pools',
    },
    blockExplorer: 'https://basescan.org/tx/',
    blockExplorerName: "basescan",
    rpcUrl: 'https://mainnet.base.org',
    maxHops: 3,
    blockTime: 5,
    stableTokens: [
      "0x833589fcd6edb6e08f4c7c32d4f71b54bda02913", // usdc
      "0xEB466342C4d449BC9f53A865D5Cb90586f405215", // axlusdc
      "0xd9aAEc86B65D86f6A7B5B1b0c42FFA531710b6CA", // usdbc
      "0xfde4C96c8593536E31F229EA8f37b2ADa2699bb2", // usdt
    ]
  },
  //sei
  1329: {
    chainId: 1329,
    name: 'Sei',
    symbol: "sei-network",
    routerAddress: '0xb0e99628d884b3f45a312BCFD7A2505Cd711b657',
    wethAddress: '0xe30fedd158a2e3b13e9badaeabafc5516e95e8c7',
    priceApi: {
      baseUrl: 'https://api.geckoterminal.com/api/v2',
      tokenPriceEndpoint: 'simple/networks/sei-network/token_price',
      graphEndpoint: 'networks/sei-network/pools',
    },
    blockExplorer: 'https://seitrace.com/',
    blockExplorerName: "sei trace",
    rpcUrl: 'https://sei.drpc.org',
    maxHops: 3,
    blockTime: 1,
    stableTokens: [
      "0x3894085ef7ff0f0aedf52e2a2704928d1ec074f1", // USDC
      "0xb75d0b03c06a926e488e2659df1a861f860bd3d1", // USDT
      "0x37a4dd9ced2b19cfe8fac251cd727b5787e45269", // fastusd
    ]
  },
  //berachain
  80094: {
    chainId: 80094,
    name: 'Berachain',
    symbol: "berachain",
    routerAddress: '0x365Ac3b1aB01e34339E3Ff1d94934bFEcB7933e0',
    wethAddress: '0x6969696969696969696969696969696969696969',
    priceApi: {
      baseUrl: 'https://api.geckoterminal.com/api/v2',
      tokenPriceEndpoint: 'simple/networks/berachain/token_price',
      graphEndpoint: 'networks/berachain/pools',
    },
    blockExplorer: 'https://berascan.com/tx/',
    blockExplorerName: "berascan",
    rpcUrl: 'https://berachain.drpc.org',
    maxHops: 3,
    blockTime: 5,
    stableTokens: [
      "0x549943e04f40284185054145c6e4e9568c1d3241", // usdc.e
    ]
  },
  //rootstock
  30: {
    chainId: 30,
    name: 'Rootstock',
    symbol: "rootstock",
    routerAddress: '0x1fb42f76f101f8eb2ed7a12ac16b028500907f80',
                // "0x1FB42F76f101f8Eb2ED7a12Ac16B028500907F80"
    wethAddress: '0x542fda317318ebf1d3deaf76e0b632741a7e677d',
    priceApi: {
      baseUrl: 'https://api.geckoterminal.com/api/v2',
      tokenPriceEndpoint: 'simple/networks/rootstock/token_price',
      graphEndpoint: 'networks/rootstock/pools',
    },
    blockExplorer: 'https://explorer.rsk.co/tx/',
    blockExplorerName: "Rootstock Explorer",
    rpcUrl: 'https://public-node.rsk.co',
    maxHops: 3,
    blockTime: 30,
    stableTokens: [
      "0xef213441a85df4d7acbdae0cf78004e1e486bb96", // rUSDC
      "0x74c9f2b00581F1B11AA7ff05aa9F608B7389De67", // usdc.e
    ]
  },
};