export interface QuoteRequest {
  tokenIn: string;
  tokenOut: string;
  amountIn: string;
  srcChainId: number;
  dstChainId: number;
  userAddress: string;
  nativeDstAddress?: string;
  urgency?: "normal" | "fast";
  destinationGas?: Array<{
    provider: "gaszip";
    chainId: number;
    amountWei: string;
    recipient?: string;
  }>;
}
