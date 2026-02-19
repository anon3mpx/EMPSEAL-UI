import { COLLATERAL_BRIDGE_ABI, SYNTHETIC_BRIDGE_ABI } from "../../../utils/via-bridge-abis/index";

// Icons
import COCK from "../../../assets/icons/cock.webp";
import HOA from "../../../assets/icons/hoa.svg";
import PLSX from "../../../assets/icons/plsx.svg";
import PLS from "../../../assets/icons/pls.svg";
import PHEX from "../../../assets/icons/phex.svg";
import INC from "../../../assets/icons/incentive.png";

export const BRIDGE_CONFIG = {
  // --- PulseChain Mainnet (Collateral Chain) ---
  369: {
    id: "369",
    name: "PulseChain",
    usdcAddress: "0x15D38573d2feeb82e7ad5187aB8c1D52810B1f07",
    wrappedGasTokenAddress: "0xA1077a294dDE1B09bB078844df40758a5D0f9a27",
    explorer: "https://oldscan.gopulse.com/#",
    rpcUrl: "https://369.rpc.vialabs.io/",
    tokens: {
      COCK: {
        id: "COCK",
        address: "0x40b49a9e5B8E3CC137E9CA57A5F4382D1B3dF6FE",
        symbol: "COCK",
        name: "The rise of Cock",
        bridge: "0x12b42e964294dCF79f44E11FB4A9c23698f475d4",
        abiType: "collateral",
        abi: COLLATERAL_BRIDGE_ABI,
        logoURI: COCK,
      },
      HOA: {
        id: "HOA",
        address: "0x7901a3569679AEc3501dbeC59399F327854a70fe",
        symbol: "HOA",
        name: "Hex Orange Address",
        bridge: "0xc7dA00db476E18231079Fbf61D67930314EA5b26",
        abiType: "collateral",
        abi: COLLATERAL_BRIDGE_ABI,
        logoURI: HOA,
      },
      PLSX: {
        id: "PLSX",
        address: "0x95B303987A60C71504D99Aa1b13B4DA07b0790ab",
        symbol: "PLSX",
        name: "PulseX",
        bridge: "0xDe524350F6421842EE39baC52d69c0Db26DD0479",
        abiType: "collateral",
        abi: COLLATERAL_BRIDGE_ABI,
        logoURI: PLSX,
      },
      INC: {
        id: "INC",
        address: "0x2fa878Ab3F87CC1C9737Fc071108F904c0B0C95d",
        symbol: "INC",
        name: "Incentive Token",
        bridge: "0x25f9387AA86a6853C74AD1A14D531d03F8F1619a",
        abiType: "collateral",
        abi: COLLATERAL_BRIDGE_ABI,
        logoURI: INC,
      },
      WPLS: {
        id: "WPLS",
        address: "0xA1077a294dDE1B09bB078844df40758a5D0f9a27",
        symbol: "WPLS",
        name: "Wrapped Pulse",
        bridge: "0xEecBf7a332e16572AB367623E9A05d4d26d2c8C4",
        abiType: "collateral",
        abi: COLLATERAL_BRIDGE_ABI,
        logoURI: PLS,
      },
      pHEX: {
        id: "pHEX",
        address: "0x2b591e99afE9f32eAA6214f7B7629768c40Eeb39",
        symbol: "pHEX",
        name: "PulseChain HEX",
        bridge: "0xa489CeA254e8649F5b4BA1A4708ed348425606BE",
        abiType: "collateral",
        abi: COLLATERAL_BRIDGE_ABI,
        logoURI: PHEX,
      },
    },
  },

  // --- Base Mainnet (Synthetic Chain) ---
  8453: {
    id: "8453",
    name: "Base",
    usdcAddress: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
    wrappedGasTokenAddress: "0x4200000000000000000000000000000000000006", // WETH
    explorer: "https://basescan.org",
    rpcUrl: "https://8453.rpc.vialabs.io/",
    tokens: {
      COCK: {
        id: "COCK",
        address: "0xE78C3473B59156416994b57bC261a51fFbEee4FA",
        symbol: "COCK",
        name: "The rise of Cock",
        bridge: "0xE78C3473B59156416994b57bC261a51fFbEee4FA",
        abiType: "synthetic",
        abi: SYNTHETIC_BRIDGE_ABI,
        logoURI: COCK,
      },
      HOA: {
        id: "HOA",
        address: "0x421b1c25b5Cd1766Aa17d01133a548C28D00b726",
        symbol: "HOA",
        name: "Hex Orange Address",
        bridge: "0x421b1c25b5Cd1766Aa17d01133a548C28D00b726",
        abiType: "synthetic",
        abi: SYNTHETIC_BRIDGE_ABI,
        logoURI: HOA,
      },
      PLSX: {
        id: "PLSX",
        address: "0xF8Ae2Ca61ccAF2e6912d142b797080a3F7439c53",
        symbol: "PLSX",
        name: "PulseX",
        bridge: "0xF8Ae2Ca61ccAF2e6912d142b797080a3F7439c53",
        abiType: "synthetic",
        abi: SYNTHETIC_BRIDGE_ABI,
        logoURI: PLSX,
      },
      INC: {
        id: "INC",
        address: "0x02B7f5Fe7459B6482545f0b1979c61BA22F4CCA5",
        symbol: "INC",
        name: "Incentive Token",
        bridge: "0x02B7f5Fe7459B6482545f0b1979c61BA22F4CCA5",
        abiType: "synthetic",
        abi: SYNTHETIC_BRIDGE_ABI,
        logoURI: INC,
      },
      WPLS: {
        id: "WPLS",
        address: "0x78208aeC3e336c6636AB5E0bA16aB9FEA1710ca5",
        symbol: "WPLS",
        name: "Wrapped Pulse",
        bridge: "0x78208aeC3e336c6636AB5E0bA16aB9FEA1710ca5",
        abiType: "synthetic",
        abi: SYNTHETIC_BRIDGE_ABI,
        logoURI: PLS,
      },
      pHEX: {
        id: "pHEX",
        address: "0xb97A43ae0563670D83f547638a5A89F2210D1a2c",
        symbol: "pHEX",
        name: "PulseChain HEX",
        bridge: "0xb97A43ae0563670D83f547638a5A89F2210D1a2c",
        abiType: "synthetic",
        abi: SYNTHETIC_BRIDGE_ABI,
        logoURI: PHEX,
      },
    },
  },

  // --- Arbitrum Mainnet (Synthetic Chain) ---
  42161: {
    id: "42161",
    name: "Arbitrum",
    usdcAddress: "0xaf88d065e77c8cC2239327C5EDb3A432268e5831",
    wrappedGasTokenAddress: "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1",
    explorer: "https://arbiscan.io",
    rpcUrl: "https://42161.rpc.vialabs.io/",
    tokens: {
      COCK: {
        id: "COCK",
        address: "0x33dD4fEE8555263178a7ffD8bf7522BA2E6C33a3",
        symbol: "COCK",
        name: "The rise of Cock",
        bridge: "0x33dD4fEE8555263178a7ffD8bf7522BA2E6C33a3",
        abiType: "synthetic",
        abi: SYNTHETIC_BRIDGE_ABI,
        logoURI: COCK,
      },
      HOA: {
        id: "HOA",
        address: "0x1F031F7A2652fD6f10F1FB37BEfaac8A69039f08",
        symbol: "HOA",
        name: "Hex Orange Address",
        bridge: "0x1F031F7A2652fD6f10F1FB37BEfaac8A69039f08",
        abiType: "synthetic",
        abi: SYNTHETIC_BRIDGE_ABI,
        logoURI: HOA,
      },
      PLSX: {
        id: "PLSX",
        address: "0xB04d0A850813A867f9e858A04fa11A22c58ff846",
        symbol: "PLSX",
        name: "PulseX",
        bridge: "0xB04d0A850813A867f9e858A04fa11A22c58ff846",
        abiType: "synthetic",
        abi: SYNTHETIC_BRIDGE_ABI,
        logoURI: PLSX,
      },
      INC: {
        id: "INC",
        address: "0x808945fc3ab570f67011e2008E56949ee6899267",
        symbol: "INC",
        name: "Incentive Token",
        bridge: "0x808945fc3ab570f67011e2008E56949ee6899267",
        abiType: "synthetic",
        abi: SYNTHETIC_BRIDGE_ABI,
        logoURI: INC,
      },
      WPLS: {
        id: "WPLS",
        address: "0xA11F758A972e843Fde082BE31Ff1a7cd6e47ac1C",
        symbol: "WPLS",
        name: "Wrapped Pulse",
        bridge: "0xA11F758A972e843Fde082BE31Ff1a7cd6e47ac1C",
        abiType: "synthetic",
        abi: SYNTHETIC_BRIDGE_ABI,
        logoURI: PLS,
      },
      pHEX: {
        id: "pHEX",
        address: "0xf4e53aAe1D9f27851B03842007D0a8a023317cD2",
        symbol: "pHEX",
        name: "PulseChain HEX",
        bridge: "0xf4e53aAe1D9f27851B03842007D0a8a023317cD2",
        abiType: "synthetic",
        abi: SYNTHETIC_BRIDGE_ABI,
        logoURI: PHEX,
      },
    },
  },

  // --- Optimism (Synthetic Chain) ---
  10: {
    id: "10",
    name: "Optimism",
    usdcAddress: "0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85",
    wrappedGasTokenAddress: "0x4200000000000000000000000000000000000006",
    explorer: "https://optimistic.etherscan.io",
    rpcUrl: "https://10.rpc.vialabs.io/",
    tokens: {
      COCK: {
        id: "COCK",
        address: "0xb50Dd86bB594C3d7FBA44045F4a90f8eb12B5935",
        symbol: "COCK",
        name: "The rise of Cock",
        bridge: "0xb50Dd86bB594C3d7FBA44045F4a90f8eb12B5935",
        abiType: "synthetic",
        abi: SYNTHETIC_BRIDGE_ABI,
        logoURI: COCK,
      },
      HOA: {
        id: "HOA",
        address: "0x0AD73370Ca2e1b7667B568d20f25eF0864227bFC",
        symbol: "HOA",
        name: "Hex Orange Address",
        bridge: "0x0AD73370Ca2e1b7667B568d20f25eF0864227bFC",
        abiType: "synthetic",
        abi: SYNTHETIC_BRIDGE_ABI,
        logoURI: HOA,
      },
      PLSX: {
        id: "PLSX",
        address: "0xEab30C23A015942BDc8204bD8dcA2780a5957a8c",
        symbol: "PLSX",
        name: "PulseX",
        bridge: "0xEab30C23A015942BDc8204bD8dcA2780a5957a8c",
        abiType: "synthetic",
        abi: SYNTHETIC_BRIDGE_ABI,
        logoURI: PLSX,
      },
      INC: {
        id: "INC",
        address: "0x1D135C2711f89e6eb70665BF55942E498835b336",
        symbol: "INC",
        name: "Incentive Token",
        bridge: "0x1D135C2711f89e6eb70665BF55942E498835b336",
        abiType: "synthetic",
        abi: SYNTHETIC_BRIDGE_ABI,
        logoURI: INC,
      },
      WPLS: {
        id: "WPLS",
        address: "0x4Ce7a88A512FB0BfbB1F6Fe9cE70F2A98D413BeC",
        symbol: "WPLS",
        name: "Wrapped Pulse",
        bridge: "0x4Ce7a88A512FB0BfbB1F6Fe9cE70F2A98D413BeC",
        abiType: "synthetic",
        abi: SYNTHETIC_BRIDGE_ABI,
        logoURI: PLS,
      },
      pHEX: {
        id: "pHEX",
        address: "0x74b40bAc12a493ab0D9c2daC6B1BCa7A705A6743",
        symbol: "pHEX",
        name: "PulseChain HEX",
        bridge: "0x74b40bAc12a493ab0D9c2daC6B1BCa7A705A6743",
        abiType: "synthetic",
        abi: SYNTHETIC_BRIDGE_ABI,
        logoURI: PHEX,
      },
    },
  },

  // --- BNB Chain (Synthetic Chain) ---
  // need to transfer approx: 0.0003 WBNB for gas on each token address. 
  56: {
    id: "56",
    name: "BNB",
    usdcAddress: "0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d",
    wrappedGasTokenAddress: "0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c",
    explorer: "https://bscscan.com",
    rpcUrl: "https://56.rpc.vialabs.io/",
    tokens: {
      COCK: {
        id: "COCK",
        address: "0xce032ac88ad11E6f8374B3760F5a98a77c6584f0",
        symbol: "COCK",
        name: "The rise of Cock",
        bridge: "0xce032ac88ad11E6f8374B3760F5a98a77c6584f0",
        abiType: "synthetic",
        abi: SYNTHETIC_BRIDGE_ABI,
        logoURI: COCK,
      },
      HOA: {
        id: "HOA",
        address: "0xc1Bb27E7AE8af9164Cb6B5D3A465478415EdEbB7",
        symbol: "HOA",
        name: "Hex Orange Address",
        bridge: "0xc1Bb27E7AE8af9164Cb6B5D3A465478415EdEbB7",
        abiType: "synthetic",
        abi: SYNTHETIC_BRIDGE_ABI,
        logoURI: HOA,
      },
      PLSX: {
        id: "PLSX",
        address: "0xC1d9A1f64291CF47e703eab6b27fA0660cAE7324",
        symbol: "PLSX",
        name: "PulseX",
        bridge: "0xC1d9A1f64291CF47e703eab6b27fA0660cAE7324",
        abiType: "synthetic",
        abi: SYNTHETIC_BRIDGE_ABI,
        logoURI: PLSX,
      },
      INC: {
        id: "INC",
        address: "0x6B7c81207240a38e03E5e9B138C53c4762515cCD",
        symbol: "INC",
        name: "Incentive Token",
        bridge: "0x6B7c81207240a38e03E5e9B138C53c4762515cCD",
        abiType: "synthetic",
        abi: SYNTHETIC_BRIDGE_ABI,
        logoURI: INC,
      },
      WPLS: {
        id: "WPLS",
        address: "0x84B0b1EE6eef971105442Eb9Ab420F3DbB774b46",
        symbol: "WPLS",
        name: "Wrapped Pulse",
        bridge: "0x84B0b1EE6eef971105442Eb9Ab420F3DbB774b46",
        abiType: "synthetic",
        abi: SYNTHETIC_BRIDGE_ABI,
        logoURI: PLS,
      },
      pHEX: {
        id: "pHEX",
        address: "0x5f8Eea46Aaf2b936790495d25806B22c21f92242",
        symbol: "pHEX",
        name: "PulseChain HEX",
        bridge: "0x5f8Eea46Aaf2b936790495d25806B22c21f92242",
        abiType: "synthetic",
        abi: SYNTHETIC_BRIDGE_ABI,
        logoURI: PHEX,
      },
    },
  },

  // --- Polygon (Synthetic Chain) ---
  137: {
    id: "137",
    name: "Polygon",
    usdcAddress: "0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359",
    wrappedGasTokenAddress: "0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270",
    explorer: "https://polygonscan.com",
    rpcUrl: "https://137.rpc.vialabs.io/",
    tokens: {
      COCK: {
        id: "COCK",
        address: "0xd7dDc57fC9eCFd0fb9E0773Eb80276fe62B0Fc93",
        symbol: "COCK",
        name: "The rise of Cock",
        bridge: "0xd7dDc57fC9eCFd0fb9E0773Eb80276fe62B0Fc93",
        abiType: "synthetic",
        abi: SYNTHETIC_BRIDGE_ABI,
        logoURI: COCK,
      },
      HOA: {
        id: "HOA",
        address: "0x6B7c81207240a38e03E5e9B138C53c4762515cCD",
        symbol: "HOA",
        name: "Hex Orange Address",
        bridge: "0x6B7c81207240a38e03E5e9B138C53c4762515cCD",
        abiType: "synthetic",
        abi: SYNTHETIC_BRIDGE_ABI,
        logoURI: HOA,
      },
      PLSX: {
        id: "PLSX",
        address: "0xE18947547EB1f49B725c3Ca4f95bD45A84F6c24A",
        symbol: "PLSX",
        name: "PulseX",
        bridge: "0xE18947547EB1f49B725c3Ca4f95bD45A84F6c24A",
        abiType: "synthetic",
        abi: SYNTHETIC_BRIDGE_ABI,
        logoURI: PLSX,
      },
      INC: {
        id: "INC",
        address: "0x7307FEE834DdC88A716904830C0cb356A4878be1",
        symbol: "INC",
        name: "Incentive Token",
        bridge: "0x7307FEE834DdC88A716904830C0cb356A4878be1",
        abiType: "synthetic",
        abi: SYNTHETIC_BRIDGE_ABI,
        logoURI: INC,
      },
      WPLS: {
        id: "WPLS",
        address: "0x1f5C42FCd0940692d4be52d17CD6bbFDFac9b0ac",
        symbol: "WPLS",
        name: "Wrapped Pulse",
        bridge: "0x1f5C42FCd0940692d4be52d17CD6bbFDFac9b0ac",
        abiType: "synthetic",
        abi: SYNTHETIC_BRIDGE_ABI,
        logoURI: PLS,
      },
      pHEX: {
        id: "pHEX",
        address: "0x9BD3C63e254a3fF7b757c9bad18F3c420e7825B2",
        symbol: "pHEX",
        name: "PulseChain HEX",
        bridge: "0x9BD3C63e254a3fF7b757c9bad18F3c420e7825B2",
        abiType: "synthetic",
        abi: SYNTHETIC_BRIDGE_ABI,
        logoURI: PHEX,
      },
    },
  },

  // --- Avalanche (Synthetic Chain) ---
  43114: {
    id: "43114",
    name: "Avalanche",
    usdcAddress: "0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E",
    wrappedGasTokenAddress: "0xB31f66AA3C1e785363F0875A1B74E27b85FD66c7",
    explorer: "https://snowtrace.io",
    rpcUrl: "https://43114.rpc.vialabs.io/",
    tokens: {
      COCK: {
        id: "COCK",
        address: "0x46763657C2e4845C4f72c7Cce605B3cB3309fd2f",
        symbol: "COCK",
        name: "The rise of Cock",
        bridge: "0x46763657C2e4845C4f72c7Cce605B3cB3309fd2f",
        abiType: "synthetic",
        abi: SYNTHETIC_BRIDGE_ABI,
        logoURI: COCK,
      },
      HOA: {
        id: "HOA",
        address: "0xc14441CBD763FBad2Db823CCa77AFAdeCbcdd0c4",
        symbol: "HOA",
        name: "Hex Orange Address",
        bridge: "0xc14441CBD763FBad2Db823CCa77AFAdeCbcdd0c4",
        abiType: "synthetic",
        abi: SYNTHETIC_BRIDGE_ABI,
        logoURI: HOA,
      },
      PLSX: {
        id: "PLSX",
        address: "0x7e39288d48ae017B1dF2f20523a6A1c7C91D96E2",
        symbol: "PLSX",
        name: "PulseX",
        bridge: "0x7e39288d48ae017B1dF2f20523a6A1c7C91D96E2",
        abiType: "synthetic",
        abi: SYNTHETIC_BRIDGE_ABI,
        logoURI: PLSX,
      },
      INC: {
        id: "INC",
        address: "0x3E8cEA4287b7D1d707FE3FD526a19C3fE2221798",
        symbol: "INC",
        name: "Incentive Token",
        bridge: "0x3E8cEA4287b7D1d707FE3FD526a19C3fE2221798",
        abiType: "synthetic",
        abi: SYNTHETIC_BRIDGE_ABI,
        logoURI: INC,
      },
      WPLS: {
        id: "WPLS",
        address: "0x2271f95dda2b85BefadDe6BdC689C84c63150e04",
        symbol: "WPLS",
        name: "Wrapped Pulse",
        bridge: "0x2271f95dda2b85BefadDe6BdC689C84c63150e04",
        abiType: "synthetic",
        abi: SYNTHETIC_BRIDGE_ABI,
        logoURI: PLS,
      },
      pHEX: {
        id: "pHEX",
        address: "0x762c2206681c4059df13acb9D2eF87fFA4Ee3FEc",
        symbol: "pHEX",
        name: "PulseChain HEX",
        bridge: "0x762c2206681c4059df13acb9D2eF87fFA4Ee3FEc",
        abiType: "synthetic",
        abi: SYNTHETIC_BRIDGE_ABI,
        logoURI: PHEX,
      },
    },
  },
};

// --- Helper Functions ---

/**
 * Get tokens as an array for a given chain ID
 * @param {number|string} chainId
 * @returns {Array} Array of token objects
 */
export const getTokensArray = (chainId) => {
  const chainConfig = BRIDGE_CONFIG[chainId];
  if (!chainConfig || !chainConfig.tokens) return [];
  return Object.values(chainConfig.tokens);
};

/**
 * Get a specific token by its ID from a chain
 * @param {number|string} chainId
 * @param {string} tokenId - The unique token identifier (e.g., "COCK", "HOA")
 * @returns {Object|null} Token object or null if not found
 */
export const getTokenById = (chainId, tokenId) => {
  const chainConfig = BRIDGE_CONFIG[chainId];
  if (!chainConfig || !chainConfig.tokens) return null;
  return chainConfig.tokens[tokenId] || null;
};

/**
 * Get the first available token for a chain
 * @param {number|string} chainId
 * @returns {Object|null} First token object or null
 */
export const getDefaultToken = (chainId) => {
  const tokens = getTokensArray(chainId);
  return tokens.length > 0 ? tokens[0] : null;
};

/**
 * Check if a token exists on a given chain
 * @param {number|string} chainId
 * @param {string} tokenId
 * @returns {boolean}
 */
export const hasToken = (chainId, tokenId) => {
  return getTokenById(chainId, tokenId) !== null;
};

/**
 * Get all chain IDs that support a given token
 * @param {string} tokenId
 * @returns {Array<string>} Array of chain IDs
 */
export const getChainsWithToken = (tokenId) => {
  return Object.keys(BRIDGE_CONFIG).filter((chainId) =>
    hasToken(chainId, tokenId)
  );
};
