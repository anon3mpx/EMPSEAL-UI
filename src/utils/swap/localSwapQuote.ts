import { readContract } from "@wagmi/core";

import { config } from "../../Wagmi/config";
import { RouterABI } from "../../pages/swap/routerAbi";
import { getChainConfig } from "../getChainConfig";

interface LocalSwapQuoteInput {
  chainId: number;
  amountIn: bigint;
  tokenIn: string;
  tokenOut: string;
  maxSteps: number;
}

interface LocalSwapQuoteResult {
  amounts: bigint[];
  path: string[];
  adapters: string[];
  gasEstimate: string;
}

export async function readLocalSwapQuote(
  input: LocalSwapQuoteInput,
): Promise<LocalSwapQuoteResult> {
  const { routerAddress } = getChainConfig(input.chainId);
  const result = await readContract(config, {
    abi: RouterABI,
    address: routerAddress,
    chainId: input.chainId,
    functionName: "findBestPath",
    args: [
      input.amountIn,
      input.tokenIn,
      input.tokenOut,
      BigInt(input.maxSteps),
    ],
  });
  const quote = result as unknown as {
    amounts: bigint[];
    path: string[];
    adapters: string[];
    gasEstimate?: bigint | string;
  };

  return {
    amounts: Array.from(quote.amounts ?? []),
    path: Array.from(quote.path ?? []),
    adapters: Array.from(quote.adapters ?? []),
    gasEstimate: String(quote.gasEstimate ?? 0n),
  };
}
