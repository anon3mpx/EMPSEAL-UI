const COLLATERAL_BRIDGE_ABI = [
  {
    inputs: [
      {
        internalType: "uint32",
        name: "_destChainId",
        type: "uint32",
      },
      {
        internalType: "address",
        name: "_recipient",
        type: "address",
      },
      {
        internalType: "uint256",
        name: "_amount",
        type: "uint256",
      },
    ],
    name: "bridge",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "uint32",
        name: "_chainId",
        type: "uint32",
      },
      {
        internalType: "address",
        name: "_remoteContract",
        type: "address",
      },
      {
        internalType: "address",
        name: "_wrappedGasToken",
        type: "address",
      },
      {
        internalType: "uint256",
        name: "_protocolFee",
        type: "uint256",
      },
      {
        internalType: "uint256",
        name: "_viaSourceFee",
        type: "uint256",
      },
      {
        internalType: "uint256",
        name: "_viaDestGas",
        type: "uint256",
      },
      {
        internalType: "bool",
        name: "_supported",
        type: "bool",
      },
    ],
    name: "configureChain",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "_messageV3",
        type: "address",
      },
      {
        internalType: "uint256[]",
        name: "_chains",
        type: "uint256[]",
      },
      {
        internalType: "address[]",
        name: "_endpoints",
        type: "address[]",
      },
      {
        internalType: "uint16[]",
        name: "_confirmations",
        type: "uint16[]",
      },
    ],
    name: "configureClient",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "_messageV3",
        type: "address",
      },
      {
        internalType: "uint256[]",
        name: "_chainIds",
        type: "uint256[]",
      },
      {
        internalType: "address[]",
        name: "_endpoints",
        type: "address[]",
      },
      {
        internalType: "uint16[]",
        name: "_confirmations",
        type: "uint16[]",
      },
    ],
    name: "configureMessageClient",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "_collateralToken",
        type: "address",
      },
      {
        internalType: "address",
        name: "_feeToken",
        type: "address",
      },
      {
        internalType: "address",
        name: "_messageV3Address",
        type: "address",
      },
      {
        internalType: "address",
        name: "_treasury",
        type: "address",
      },
      {
        internalType: "address",
        name: "_owner",
        type: "address",
      },
    ],
    stateMutability: "nonpayable",
    type: "constructor",
  },
  {
    inputs: [],
    name: "ChainNotConfigured",
    type: "error",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "_messageV3",
        type: "address",
      },
      {
        internalType: "uint256[]",
        name: "_chains",
        type: "uint256[]",
      },
      {
        internalType: "bytes[]",
        name: "_endpoints",
        type: "bytes[]",
      },
      {
        internalType: "uint16[]",
        name: "_confirmations",
        type: "uint16[]",
      },
    ],
    name: "configureClientExtended",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "_featureGateway",
        type: "address",
      },
    ],
    name: "configureFeatureGateway",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [],
    name: "InsufficientFeeTokenBalance",
    type: "error",
  },
  {
    inputs: [],
    name: "InsufficientGasTokenBalance",
    type: "error",
  },
  {
    inputs: [],
    name: "InvalidAmount",
    type: "error",
  },
  {
    inputs: [],
    name: "InvalidConfiguration",
    type: "error",
  },
  {
    inputs: [],
    name: "InvalidRecipient",
    type: "error",
  },
  {
    inputs: [],
    name: "UnauthorizedSourceChain",
    type: "error",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "uint32",
        name: "chainId",
        type: "uint32",
      },
      {
        indexed: true,
        internalType: "address",
        name: "remoteContract",
        type: "address",
      },
      {
        indexed: false,
        internalType: "address",
        name: "wrappedGasToken",
        type: "address",
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "protocolFee",
        type: "uint256",
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "viaSourceFee",
        type: "uint256",
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "viaDestGas",
        type: "uint256",
      },
      {
        indexed: false,
        internalType: "bool",
        name: "supported",
        type: "bool",
      },
    ],
    name: "ChainConfigured",
    type: "event",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "_token",
        type: "address",
      },
      {
        internalType: "uint256",
        name: "_amount",
        type: "uint256",
      },
      {
        internalType: "address",
        name: "_to",
        type: "address",
      },
    ],
    name: "emergencyWithdraw",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "uint32",
        name: "chainId",
        type: "uint32",
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "protocolFee",
        type: "uint256",
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "viaSourceFee",
        type: "uint256",
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "viaDestGas",
        type: "uint256",
      },
    ],
    name: "FeesUpdated",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: false,
        internalType: "address",
        name: "previousOwner",
        type: "address",
      },
      {
        indexed: false,
        internalType: "address",
        name: "newOwner",
        type: "address",
      },
    ],
    name: "MessageOwnershipTransferred",
    type: "event",
  },
  {
    inputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
      {
        internalType: "uint256",
        name: "_sourceChainId",
        type: "uint256",
      },
      {
        internalType: "address",
        name: "_sender",
        type: "address",
      },
      {
        internalType: "address",
        name: "",
        type: "address",
      },
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
      {
        internalType: "bytes",
        name: "_data",
        type: "bytes",
      },
    ],
    name: "messageProcess",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "address",
        name: "previousOwner",
        type: "address",
      },
      {
        indexed: true,
        internalType: "address",
        name: "newOwner",
        type: "address",
      },
    ],
    name: "OwnershipTransferred",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: false,
        internalType: "address",
        name: "account",
        type: "address",
      },
    ],
    name: "Paused",
    type: "event",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "_token",
        type: "address",
      },
      {
        internalType: "uint256",
        name: "_amount",
        type: "uint256",
      },
    ],
    name: "recoverToken",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: false,
        internalType: "address",
        name: "owner",
        type: "address",
      },
      {
        indexed: false,
        internalType: "address",
        name: "token",
        type: "address",
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "amount",
        type: "uint256",
      },
    ],
    name: "RecoverToken",
    type: "event",
  },
  {
    inputs: [],
    name: "renounceOwnership",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: false,
        internalType: "uint256",
        name: "txId",
        type: "uint256",
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "destinationChainId",
        type: "uint256",
      },
      {
        indexed: false,
        internalType: "uint32",
        name: "featureId",
        type: "uint32",
      },
      {
        indexed: false,
        internalType: "bytes",
        name: "featureData",
        type: "bytes",
      },
    ],
    name: "SendMessageWithFeature",
    type: "event",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "_signer",
        type: "address",
      },
    ],
    name: "setExsig",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: false,
        internalType: "address",
        name: "owner",
        type: "address",
      },
      {
        indexed: false,
        internalType: "address",
        name: "exsig",
        type: "address",
      },
    ],
    name: "SetExsig",
    type: "event",
  },
  {
    inputs: [
      {
        internalType: "uint256",
        name: "_maxFee",
        type: "uint256",
      },
    ],
    name: "setMaxfee",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: false,
        internalType: "address",
        name: "owner",
        type: "address",
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "maxfee",
        type: "uint256",
      },
    ],
    name: "SetMaxfee",
    type: "event",
  },
  {
    inputs: [
      {
        internalType: "uint256",
        name: "_maxGas",
        type: "uint256",
      },
    ],
    name: "setMaxgas",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: false,
        internalType: "address",
        name: "owner",
        type: "address",
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "maxGas",
        type: "uint256",
      },
    ],
    name: "SetMaxgas",
    type: "event",
  },
  {
    inputs: [
      {
        internalType: "bool",
        name: "_paused",
        type: "bool",
      },
    ],
    name: "setPaused",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "address",
        name: "sender",
        type: "address",
      },
      {
        indexed: true,
        internalType: "uint32",
        name: "destChainId",
        type: "uint32",
      },
      {
        indexed: true,
        internalType: "address",
        name: "recipient",
        type: "address",
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "amount",
        type: "uint256",
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "protocolFee",
        type: "uint256",
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "viaSourceFee",
        type: "uint256",
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "viaDestGas",
        type: "uint256",
      },
    ],
    name: "TokensLocked",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "uint256",
        name: "sourceChainId",
        type: "uint256",
      },
      {
        indexed: true,
        internalType: "address",
        name: "recipient",
        type: "address",
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "amount",
        type: "uint256",
      },
    ],
    name: "TokensUnlocked",
    type: "event",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "_newMessageOwner",
        type: "address",
      },
    ],
    name: "transferMessageOwnership",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "newOwner",
        type: "address",
      },
    ],
    name: "transferOwnership",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "address",
        name: "oldTreasury",
        type: "address",
      },
      {
        indexed: true,
        internalType: "address",
        name: "newTreasury",
        type: "address",
      },
    ],
    name: "TreasuryUpdated",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: false,
        internalType: "address",
        name: "account",
        type: "address",
      },
    ],
    name: "Unpaused",
    type: "event",
  },
  {
    stateMutability: "payable",
    type: "fallback",
  },
  {
    inputs: [
      {
        internalType: "uint32",
        name: "_chainId",
        type: "uint32",
      },
      {
        internalType: "uint256",
        name: "_protocolFee",
        type: "uint256",
      },
      {
        internalType: "uint256",
        name: "_viaSourceFee",
        type: "uint256",
      },
      {
        internalType: "uint256",
        name: "_viaDestGas",
        type: "uint256",
      },
    ],
    name: "updateFees",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "_newTreasury",
        type: "address",
      },
    ],
    name: "updateTreasury",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    stateMutability: "payable",
    type: "receive",
  },
  {
    inputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    name: "CHAINS",
    outputs: [
      {
        internalType: "address",
        name: "endpoint",
        type: "address",
      },
      {
        internalType: "bytes",
        name: "endpointExtended",
        type: "bytes",
      },
      {
        internalType: "uint16",
        name: "confirmations",
        type: "uint16",
      },
      {
        internalType: "bool",
        name: "extended",
        type: "bool",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "collateralToken",
    outputs: [
      {
        internalType: "contract IERC20",
        name: "",
        type: "address",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "FEATURE_GATEWAY",
    outputs: [
      {
        internalType: "contract IFeatureGateway",
        name: "",
        type: "address",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
      {
        internalType: "uint32",
        name: "",
        type: "uint32",
      },
    ],
    name: "FEATURES",
    outputs: [
      {
        internalType: "address",
        name: "endpoint",
        type: "address",
      },
      {
        internalType: "bytes",
        name: "endpointExtended",
        type: "bytes",
      },
      {
        internalType: "uint16",
        name: "confirmations",
        type: "uint16",
      },
      {
        internalType: "bool",
        name: "extended",
        type: "bool",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "FEE_TOKEN",
    outputs: [
      {
        internalType: "contract IERC20cl",
        name: "",
        type: "address",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "feeToken",
    outputs: [
      {
        internalType: "contract IERC20",
        name: "",
        type: "address",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "uint32",
        name: "_destChainId",
        type: "uint32",
      },
    ],
    name: "getBridgeFees",
    outputs: [
      {
        internalType: "uint256",
        name: "protocolFee",
        type: "uint256",
      },
      {
        internalType: "uint256",
        name: "viaSourceFee",
        type: "uint256",
      },
      {
        internalType: "uint256",
        name: "viaDestGas",
        type: "uint256",
      },
      {
        internalType: "uint256",
        name: "totalUsdcRequired",
        type: "uint256",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "uint32",
        name: "_chainId",
        type: "uint32",
      },
    ],
    name: "getChainStats",
    outputs: [
      {
        internalType: "uint256",
        name: "volume",
        type: "uint256",
      },
      {
        internalType: "uint256",
        name: "protocolFeesCollected",
        type: "uint256",
      },
      {
        internalType: "uint256",
        name: "viaFeesPaid",
        type: "uint256",
      },
      {
        internalType: "uint256",
        name: "protocolFee",
        type: "uint256",
      },
      {
        internalType: "uint256",
        name: "viaSourceFee",
        type: "uint256",
      },
      {
        internalType: "uint256",
        name: "viaDestGas",
        type: "uint256",
      },
      {
        internalType: "address",
        name: "remoteContract",
        type: "address",
      },
      {
        internalType: "address",
        name: "wrappedGasToken",
        type: "address",
      },
      {
        internalType: "bool",
        name: "supported",
        type: "bool",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "uint32",
        name: "_destChainId",
        type: "uint32",
      },
    ],
    name: "getWrappedGasToken",
    outputs: [
      {
        internalType: "address",
        name: "",
        type: "address",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "_sender",
        type: "address",
      },
      {
        internalType: "uint256",
        name: "_sourceChainId",
        type: "uint256",
      },
    ],
    name: "isAuthorized",
    outputs: [
      {
        internalType: "bool",
        name: "",
        type: "bool",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "uint32",
        name: "_chainId",
        type: "uint32",
      },
    ],
    name: "isChainConfigured",
    outputs: [
      {
        internalType: "bool",
        name: "",
        type: "bool",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "_sender",
        type: "address",
      },
      {
        internalType: "uint256",
        name: "_sourceChainId",
        type: "uint256",
      },
    ],
    name: "isSelf",
    outputs: [
      {
        internalType: "bool",
        name: "",
        type: "bool",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "MESSAGE_OWNER",
    outputs: [
      {
        internalType: "address",
        name: "",
        type: "address",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "MESSAGEv3",
    outputs: [
      {
        internalType: "contract IMessageV3",
        name: "",
        type: "address",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "owner",
    outputs: [
      {
        internalType: "address",
        name: "",
        type: "address",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "paused",
    outputs: [
      {
        internalType: "bool",
        name: "",
        type: "bool",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "uint32",
        name: "",
        type: "uint32",
      },
    ],
    name: "protocolFeePerChain",
    outputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "uint32",
        name: "",
        type: "uint32",
      },
    ],
    name: "protocolFeesCollectedPerChain",
    outputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "uint32",
        name: "",
        type: "uint32",
      },
    ],
    name: "remoteSyntheticContracts",
    outputs: [
      {
        internalType: "address",
        name: "",
        type: "address",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "uint32",
        name: "",
        type: "uint32",
      },
    ],
    name: "supportedChains",
    outputs: [
      {
        internalType: "bool",
        name: "",
        type: "bool",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "totalLocked",
    outputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "treasury",
    outputs: [
      {
        internalType: "address",
        name: "",
        type: "address",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "uint32",
        name: "",
        type: "uint32",
      },
    ],
    name: "viaDestinationGasPerChain",
    outputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "uint32",
        name: "",
        type: "uint32",
      },
    ],
    name: "viaFeesPaidPerChain",
    outputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "uint32",
        name: "",
        type: "uint32",
      },
    ],
    name: "viaSourceFeePerChain",
    outputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "uint32",
        name: "",
        type: "uint32",
      },
    ],
    name: "volumePerChain",
    outputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "uint32",
        name: "",
        type: "uint32",
      },
    ],
    name: "wrappedGasTokenPerChain",
    outputs: [
      {
        internalType: "contract IERC20",
        name: "",
        type: "address",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
] as const;

export default COLLATERAL_BRIDGE_ABI;
