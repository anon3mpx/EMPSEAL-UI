// Matches 'Hop' struct in Solidity
export type Hop = {
  adapter: `0x${string}`;
  proportion: number; // Base 10000 (e.g., 5000 = 50%)
  data: `0x${string}`; // Usually "0x"
};

// Matches 'ConvergeTrade' struct in Solidity
export type ConvergeTrade = {
  tokenIn: `0x${string}`;
  intermediate: `0x${string}`;
  tokenOut: `0x${string}`;
  amountIn: bigint;
  inputHops: Hop[];
  outputHop: Hop;
};

// Matches 'SplitPath' struct in Solidity
export type SplitPath = {
  path: `0x${string}`[];
  adapters: `0x${string}`[];
  proportion: number;
};

// NEW type for WRAP/UNWRAP payload
export type WrapUnwrapTrade = {
  tokenIn: `0x${string}`;
  tokenOut: `0x${string}`;
  amountIn: bigint;
};

// Internal type for the Router result
export type BestRouteResult = {
  type: "CONVERGE" | "SPLIT" | "WRAP" | "UNWRAP" | "NOSPLIT";
  amountOut: bigint;
  payload: ConvergeTrade | SplitPath[] | WrapUnwrapTrade; // The data to pass to the contract write function
  gasEstimate: bigint;
};
