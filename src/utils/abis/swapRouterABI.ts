const TRADE_COMPONENTS = [
  { internalType: "uint256", name: "amountIn", type: "uint256" },
  { internalType: "uint256", name: "amountOut", type: "uint256" },
  { internalType: "address[]", name: "path", type: "address[]" },
  { internalType: "address[]", name: "adapters", type: "address[]" },
] as const;

export const SWAP_ROUTER_ABI = [
  {
    type: "function",
    stateMutability: "nonpayable",
    name: "swapNoSplit",
    outputs: [],
    inputs: [
      {
        internalType: "struct Trade",
        name: "_trade",
        type: "tuple",
        components: TRADE_COMPONENTS,
      },
      { internalType: "address", name: "_to", type: "address" },
      { internalType: "uint256", name: "_fee", type: "uint256" },
    ],
  },
  {
    type: "function",
    stateMutability: "payable",
    name: "swapNoSplitFromPLS",
    outputs: [],
    inputs: [
      {
        internalType: "struct Trade",
        name: "_trade",
        type: "tuple",
        components: TRADE_COMPONENTS,
      },
      { internalType: "address", name: "_to", type: "address" },
      { internalType: "uint256", name: "_fee", type: "uint256" },
    ],
  },
  {
    type: "function",
    stateMutability: "nonpayable",
    name: "swapNoSplitToPLS",
    outputs: [],
    inputs: [
      {
        internalType: "struct Trade",
        name: "_trade",
        type: "tuple",
        components: TRADE_COMPONENTS,
      },
      { internalType: "address", name: "_to", type: "address" },
      { internalType: "uint256", name: "_fee", type: "uint256" },
    ],
  },
  {
    type: "function",
    stateMutability: "payable",
    name: "swapNoSplitFromETH",
    outputs: [],
    inputs: [
      {
        internalType: "struct Trade",
        name: "_trade",
        type: "tuple",
        components: TRADE_COMPONENTS,
      },
      { internalType: "address", name: "_to", type: "address" },
      { internalType: "uint256", name: "_fee", type: "uint256" },
    ],
  },
  {
    type: "function",
    stateMutability: "nonpayable",
    name: "swapNoSplitToETH",
    outputs: [],
    inputs: [
      {
        internalType: "struct Trade",
        name: "_trade",
        type: "tuple",
        components: TRADE_COMPONENTS,
      },
      { internalType: "address", name: "_to", type: "address" },
      { internalType: "uint256", name: "_fee", type: "uint256" },
    ],
  },
] as const;

export const SWAP_ROUTER_INTEGRATOR_ABI = [
  {
    type: "function",
    stateMutability: "nonpayable",
    name: "swapNoSplit",
    outputs: [],
    inputs: [
      {
        internalType: "struct Trade",
        name: "_trade",
        type: "tuple",
        components: TRADE_COMPONENTS,
      },
      { internalType: "address", name: "_to", type: "address" },
      { internalType: "uint256", name: "_fee", type: "uint256" },
      { internalType: "bytes32", name: "_integratorId", type: "bytes32" },
    ],
  },
  {
    type: "function",
    stateMutability: "payable",
    name: "swapNoSplitFromPLS",
    outputs: [],
    inputs: [
      {
        internalType: "struct Trade",
        name: "_trade",
        type: "tuple",
        components: TRADE_COMPONENTS,
      },
      { internalType: "address", name: "_to", type: "address" },
      { internalType: "uint256", name: "_fee", type: "uint256" },
      { internalType: "bytes32", name: "_integratorId", type: "bytes32" },
    ],
  },
  {
    type: "function",
    stateMutability: "nonpayable",
    name: "swapNoSplitToPLS",
    outputs: [],
    inputs: [
      {
        internalType: "struct Trade",
        name: "_trade",
        type: "tuple",
        components: TRADE_COMPONENTS,
      },
      { internalType: "address", name: "_to", type: "address" },
      { internalType: "uint256", name: "_fee", type: "uint256" },
      { internalType: "bytes32", name: "_integratorId", type: "bytes32" },
    ],
  },
  {
    type: "function",
    stateMutability: "payable",
    name: "swapNoSplitFromETH",
    outputs: [],
    inputs: [
      {
        internalType: "struct Trade",
        name: "_trade",
        type: "tuple",
        components: TRADE_COMPONENTS,
      },
      { internalType: "address", name: "_to", type: "address" },
      { internalType: "uint256", name: "_fee", type: "uint256" },
      { internalType: "bytes32", name: "_integratorId", type: "bytes32" },
    ],
  },
  {
    type: "function",
    stateMutability: "nonpayable",
    name: "swapNoSplitToETH",
    outputs: [],
    inputs: [
      {
        internalType: "struct Trade",
        name: "_trade",
        type: "tuple",
        components: TRADE_COMPONENTS,
      },
      { internalType: "address", name: "_to", type: "address" },
      { internalType: "uint256", name: "_fee", type: "uint256" },
      { internalType: "bytes32", name: "_integratorId", type: "bytes32" },
    ],
  },
] as const;
