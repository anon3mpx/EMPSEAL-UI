const FEE_MANAGER_ABI = [
  {
    inputs: [],
    name: "getProtocolFee",
    outputs: [
      {
        name: "fee",
        type: "uint256",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "getBalance",
    outputs: [
      {
        name: "balance",
        type: "uint256",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "getStats",
    outputs: [
      {
        name: "_totalFees",
        type: "uint256",
      },
      {
        name: "_totalTx",
        type: "uint256",
      },
      {
        name: "_currentBalance",
        type: "uint256",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
];

export default FEE_MANAGER_ABI;
