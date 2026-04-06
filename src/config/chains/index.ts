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
    quoteHopFallback: {
      strategy: "decrement_to_one",
      minStep: 1,
    },
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
      "0xe15fc38f6d8c56af07bbcbe3baf5708a2bf42392", // USDC
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
  56: {
    chainId: 56,
    name: "BSC",
    symbol: "bsc",
    routerAddress: "0x7b9637C7c8Aa45B679eEdBb4b680642410322df1",
    wethAddress: "0xbb4cdb9cbd36b01bd1cbaebf2de08d9173bc095c",
    priceApi: {
      baseUrl: "https://api.geckoterminal.com/api/v2",
      tokenPriceEndpoint: "simple/networks/bsc/token_price",
      graphEndpoint: "networks/bsc/pools",
    },
    blockExplorer: "https://bscscan.com/tx/",
    blockExplorerName: "BscScan",
    rpcUrl: "https://bsc-rpc.publicnode.com",
    maxHops: 3,
    blockTime: 3,
    stableTokens: [
      "0x55d398326f99059ff775485246999027b3197955", // USDT
      "0x8ac76a51cc950d9822d68b83fe1ad97b32cd580d", // USDC
      "0xe9e7cea3dedca5984780bafc599bd69add087d56", // BUSD
    ],
  },
  // Monad
  143: {
    chainId: 143, 
    name: 'Monad',
    symbol: 'monad',
    routerAddress: '0x867c1fd9341DEC12e4B779C35D7b7C475316b334',
    wethAddress: '0x3bd359C1119dA7Da1D913D1C4D2B7c461115433A',
    // 0x3bd359C1119dA7Da1D913D1C4D2B7c461115433A
    priceApi: {
      baseUrl: 'https://api.geckoterminal.com/api/v2',
      tokenPriceEndpoint: 'simple/networks/monad/token_price',
      graphEndpoint: 'networks/monad/pools',
    },
    blockExplorer: 'https://monadvision.com/tx/',
    blockExplorerName: "Monadvision",
    rpcUrl: 'https://rpc.monad.xyz',
    maxHops: 3,
    blockTime: 2,
    quoteHopFallback: {
      strategy: "decrement_to_one",
      minStep: 1,
    },
    stableTokens: [
      "0x754704Bc059F8C67012fEd69BC8A327a5aafb603",
      "0x00000000eFE302BEAA2b3e6e1b18d08D69a9012a",
      "0xe7cd86e13AC4309349F30B3435a9d337750fC82D",
    ]
  },
  // Arbitrum
  42161: {
    chainId: 42161,
    name: "Arbitrum",
    symbol: "arbitrum",
    routerAddress: "0xA7772cDBA7739F19dcaE85fe0357929790FD23F9",
    wethAddress: "0x82af49447d8a07e3bd95bd0d56f35241523fbab1",
    priceApi: {
      baseUrl: "https://api.geckoterminal.com/api/v2",
      tokenPriceEndpoint: "simple/networks/arbitrum/token_price",
      graphEndpoint: "networks/arbitrum/pools",
    },
    blockExplorer: "https://arbiscan.io/tx/",
    blockExplorerName: "Arbiscan",
    rpcUrl: "https://arb-one.api.pocket.network",
    maxHops: 3,
    blockTime: 2,
    stableTokens: [
      "0xaf88d065e77c8cc2239327c5edb3a432268e5831", // USDC
      "0xfd086bc7cd5c481dcc9c85ebe478a1c0b69fcbb9", // USDT
      "0x6491c05a82219b8d1479057361ff1654749b876b", // USDS
      "0x5d3a1ff2b6bab83b63cd9ad0787074081a52ef34", // USDe
    ],
  },
  // Optimism
  10: {
    chainId: 10,
    name: "Optimism",
    symbol: "optimism",
    routerAddress: "0x686c652d079A370eC97F93B2b4805Ee06aE25d04",
    wethAddress: "0x4200000000000000000000000000000000000006",
    priceApi: {
      baseUrl: "https://api.geckoterminal.com/api/v2",
      tokenPriceEndpoint: "simple/networks/optimism/token_price",
      graphEndpoint: "networks/optimism/pools",
    },
    blockExplorer: "https://optimistic.etherscan.io/tx/",
    blockExplorerName: "Optimistic Etherscan",
    rpcUrl: "https://mainnet.optimism.io",
    maxHops: 3,
    blockTime: 2,
    quoteHopFallback: {
      strategy: "decrement_to_one",
      minStep: 1,
    },
    stableTokens: [
      "0x7f5c764cbc14f9669b88837ca1490cca17c31607", // USDC
      "0x94b008aA00579c1307B0EF2c499aD98a8ce58e58", // USDT
      "0x8c6f28f2F1A3C87F0f93840faE2Eae5a30666eDc", // USDP
      "0xDecaf9CD2367cdbb726E904cD6397eDFcAe6068D", // USDD
    ],
  },
  // Avalanche
  43114: {
    chainId: 43114,
    name: "Avalanche",
    symbol: "avalanche",
    routerAddress: "0xf4e53aAe1D9f27851B03842007D0a8a023317cD2",
    wethAddress: "0xB31f66AA3C1e785363F0875A1B74E27b85FD66c7",
    priceApi: {
      baseUrl: "https://api.geckoterminal.com/api/v2",
      tokenPriceEndpoint: "simple/networks/avalanche/token_price",
      graphEndpoint: "networks/avalanche/pools",
    },
    blockExplorer: "https://snowtrace.io/tx/",
    blockExplorerName: "SnowTrace",
    rpcUrl: "https://api.avax.network/ext/bc/C/rpc",
    maxHops: 3,
    blockTime: 2,
    stableTokens: [
      "0xb97ef9ef8734c71904d8002f8b6bc66dd9c48a6e", // USDC.e
      "0x9702230a8ea53601f5cd2dc00fdbc13d4df4a8c7", // USDT.e
      "0x00000000efe302beaa2b3e6e1b18d08d69a9012a", // AUSD
    ],
  },
  // Polygon
  137: {
    chainId: 137,
    name: "Polygon",
    symbol: "polygon",
    routerAddress: "0x9a64E7a18f5A9edcE3A3728B2C12643FA0cee26B",
    wethAddress: "0x0d500b1d8e8ef31e21c99d1db9a6444d3adf1270",
    priceApi: {
      baseUrl: "https://api.geckoterminal.com/api/v2",
      tokenPriceEndpoint: "simple/networks/polygon_pos/token_price",
      graphEndpoint: "networks/polygon_pos/pools",
    },
    blockExplorer: "https://polygonscan.com/tx/",
    blockExplorerName: "PolygonScan",
    rpcUrl: "https://polygon.drpc.org",
    maxHops: 3,
    blockTime: 2,
    stableTokens: [
      "0x2791bca1f2de4661ed88a30c99a7a9449aa84174", // USDC
      "0xc2132d05d31c914a87c6611c10748aeb04b58e8f", // USDT
      "0x8f3cf7ad23cd3cadbd9735aff958023239c6a063", // DAI
      "0x3c499c542cef5e3811e1192ce70d8cc03d5c3359", // USDC.e
    ], 
  },
  // HyperEVM 
  999: {
    chainId: 999,
    name: "HyperEVM",
    symbol: "hyperevm",
    routerAddress: "0xd3c8153351df63287cCD042ba75f6Be2583d939E",
    wethAddress: "0x5555555555555555555555555555555555555555",
    priceApi: {
      baseUrl: "https://api.geckoterminal.com/api/v2",
      tokenPriceEndpoint: "simple/networks/hyperevm/token_price",
      graphEndpoint: "networks/hyperevm/pools",
    },
    quoteHopFallback: {
      strategy: "decrement_to_one",
      minStep: 1,
    },
    blockExplorer: "https://hyperevmscan.io/tx/",
    blockExplorerName: "HyperEVMScan",
    rpcUrl: "https://rpc.hyperliquid.xyz/evm",
    maxHops: 3,
    blockTime: 1,
     stableTokens: [
      "0xb88339cb7199b77e23db6e890353e22632ba630f", // USDC
      "0xb8ce59fc3717ada4c02eadf9682a9e934f625ebb", // USDTO
      "0x111111a1a0667d36bd57c0a9f569b98057111111", // USDH
    ],
  }
};