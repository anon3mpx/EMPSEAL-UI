import { Address, erc20Abi } from "viem";
import {
  readContract,
  writeContract,
  waitForTransactionReceipt,
} from "@wagmi/core";
import { toast } from "../utils/toastHelper";
import { SwapStatus, TradeInfo } from "../utils/types/interface";
import { WPLS } from "../utils/abis/wplsABI";
import { WSONIC } from "../utils/abis/wsonicABI";
import { WETH } from "../utils/abis/wethBaseABI";
import { WMON } from "../utils/abis/wmonABI";
import { config } from "../Wagmi/config";
import {
  SWAP_ROUTER_ABI,
  SWAP_ROUTER_INTEGRATOR_ABI,
} from "../utils/abis/swapRouterABI";
import { getWidgetChainById } from "./chains";

type WidgetRuntimeOptions = {
  integratorId?: string | null;
};

// Get the wrapped token ABI based on chain ID
const getWrappedTokenABI = (chainId: number) => {
  switch (chainId) {
    case 146: // Sonic
      return WSONIC;
    case 8453: // Base
      return WETH;
    case 143: // Monad
      return WMON;
    case 369: // Pulsechain
    default:
      return WPLS;
  }
};

const getCurrentChainConfig = (chainId: number) => {
  const chainConfig = getWidgetChainById(chainId);
  if (!chainConfig) {
    throw new Error(`Unsupported widget chain: ${chainId}`);
  }
  return chainConfig;
};

const BYTES_32_REGEX = /^0x[0-9a-fA-F]{64}$/;

const getValidIntegratorId = (
  integratorId?: string | null,
): `0x${string}` | undefined => {
  if (!integratorId) return undefined;
  const trimmed = integratorId.trim();
  if (!trimmed || !BYTES_32_REGEX.test(trimmed)) {
    return undefined;
  }
  return trimmed as `0x${string}`;
};

export const EMPTY_ADDRESS: Address = "0x0000000000000000000000000000000000000000";

const normalizeAddress = (address?: string | null) => address?.toLowerCase() ?? "";
const isSameAddress = (a?: string | null, b?: string | null) =>
  normalizeAddress(a) === normalizeAddress(b);

const getResolvedRuntimeConfig = (
  chainId: number,
) => {
  const chainConfig = getCurrentChainConfig(chainId);
  return {
    routerAddress: chainConfig.routerAddress,
    wethAddress: chainConfig.wethAddress,
  };
};

export const checkAllowance = async (
  chainId: number,
  tokenInAddress: string,
  userAddress: Address,
) => {
  try {
    const { routerAddress } = getResolvedRuntimeConfig(chainId);
    let result = await readContract(config, {
      abi: erc20Abi,
      address: tokenInAddress as Address,
      functionName: "allowance",
      args: [userAddress, routerAddress],
    });
    return {
      success: true,
      data: result,
    };
  } catch (e: any) {
    throw e;
  }
};

export const callApprove = async (
  chainId: number,
  tokenInAddress: string,
  amountIn: bigint,
) => {
  try {
    const { routerAddress } = getResolvedRuntimeConfig(chainId);
    let result = await writeContract(config, {
      abi: erc20Abi,
      address: tokenInAddress as Address,
      functionName: "approve",
      args: [routerAddress, amountIn],
    });
    await waitForTransaction(result);
    return {
      success: true,
      data: result,
    };
  } catch (e: any) {
    throw e;
  }
};

const swapFromEth = async (
  chainId: number,
  tradeInfo: TradeInfo,
  userAddress: Address,
  protocolFee: number,
  integratorId?: `0x${string}`,
) => {
  try {
    const { routerAddress } = getResolvedRuntimeConfig(chainId);
    const routerABI = integratorId ? SWAP_ROUTER_INTEGRATOR_ABI : SWAP_ROUTER_ABI;
    const fee = BigInt(protocolFee.toString());
    let result = await writeContract(config, {
      abi: routerABI,
      address: routerAddress,
      functionName: chainId === 369 ? "swapNoSplitFromPLS" : "swapNoSplitFromETH",
      args: integratorId
        ? [
            {
              adapters: tradeInfo.adapters,
              amountIn: tradeInfo.amountIn,
              amountOut: tradeInfo.amountOut,
              path: tradeInfo.path,
            },
            userAddress,
            fee,
            integratorId,
          ]
        : [
            {
              adapters: tradeInfo.adapters,
              amountIn: tradeInfo.amountIn,
              amountOut: tradeInfo.amountOut,
              path: tradeInfo.path,
            },
            userAddress,
            fee,
          ],
      value: tradeInfo.amountIn,
    });
    await waitForTransaction(result);
    return {
      success: true,
      data: result,
    };
  } catch (e: any) {
    console.log("error", e);
    throw e;
  }
};

const swapToEth = async (
  chainId: number,
  tradeInfo: TradeInfo,
  userAddress: Address,
  protocolFee: number,
  integratorId?: `0x${string}`,
) => {
  try {
    const { routerAddress } = getResolvedRuntimeConfig(chainId);
    const routerABI = integratorId ? SWAP_ROUTER_INTEGRATOR_ABI : SWAP_ROUTER_ABI;
    const fee = BigInt(protocolFee.toString());
    let result = await writeContract(config, {
      abi: routerABI,
      address: routerAddress,
      functionName: chainId === 369 ? "swapNoSplitToPLS" : "swapNoSplitToETH",
      args: integratorId
        ? [
            {
              adapters: tradeInfo.adapters,
              amountIn: tradeInfo.amountIn,
              amountOut: tradeInfo.amountOut,
              path: tradeInfo.path,
            },
            userAddress,
            fee,
            integratorId,
          ]
        : [
            {
              adapters: tradeInfo.adapters,
              amountIn: tradeInfo.amountIn,
              amountOut: tradeInfo.amountOut,
              path: tradeInfo.path,
            },
            userAddress,
            fee,
          ],
    });
    await waitForTransaction(result);
    return {
      success: true,
      data: result,
    };
  } catch (e: any) {
    throw e;
  }
};

const swapNoSplitToEth = async (
  chainId: number,
  tradeInfo: TradeInfo,
  userAddress: Address,
) => {
  try {
    const { wethAddress } = getResolvedRuntimeConfig(chainId);
    const wrappedTokenABI = getWrappedTokenABI(chainId);
    let result = await writeContract(config, {
      abi: wrappedTokenABI,
      address: wethAddress,
      functionName: "withdraw",
      args: [tradeInfo.amountIn],
    });
    await waitForTransaction(result);
    return {
      success: true,
      data: result,
    };
  } catch (e: any) {
    throw e;
  }
};

const swapNoSplitFromEth = async (
  chainId: number,
  tradeInfo: TradeInfo,
  userAddress: Address,
) => {
  try {
    const { wethAddress } = getResolvedRuntimeConfig(chainId);
    const wrappedTokenABI = getWrappedTokenABI(chainId);
    let result = await writeContract(config, {
      abi: wrappedTokenABI,
      address: wethAddress,
      functionName: "deposit",
      args: [],
      value: tradeInfo.amountIn,
    });
    await waitForTransaction(result);
    return {
      success: true,
      data: result,
    };
  } catch (e: any) {
    throw e;
  }
};

const swap = async (
  chainId: number,
  tradeInfo: TradeInfo,
  userAddress: Address,
  protocolFee: number,
  integratorId?: `0x${string}`,
) => {
  try {
    const { routerAddress } = getResolvedRuntimeConfig(chainId);
    const routerABI = integratorId ? SWAP_ROUTER_INTEGRATOR_ABI : SWAP_ROUTER_ABI;
    const fee = BigInt(protocolFee.toString());
    let result = await writeContract(config, {
      abi: routerABI,
      address: routerAddress,
      functionName: "swapNoSplit",
      args: integratorId
        ? [
            {
              adapters: tradeInfo.adapters,
              amountIn: tradeInfo.amountIn,
              amountOut: tradeInfo.amountOut,
              path: tradeInfo.path,
            },
            userAddress,
            fee,
            integratorId,
          ]
        : [
            {
              adapters: tradeInfo.adapters,
              amountIn: tradeInfo.amountIn,
              amountOut: tradeInfo.amountOut,
              path: tradeInfo.path,
            },
            userAddress,
            fee,
          ],
    });
    await waitForTransaction(result);
    return {
      success: true,
      data: result,
    };
  } catch (e: any) {
    throw e;
  }
};

const waitForTransaction = async (hash: Address) => {
  try {
    const transactionReceipt = await waitForTransactionReceipt(config, {
      confirmations: 2,
      hash,
    });
    if (transactionReceipt.status === "success") {
      return {
        success: true,
        data: transactionReceipt,
      };
    }
    throw transactionReceipt.status;
  } catch (e: any) {
    throw e;
  }
};

export const swapTokens = async (
  setStatus: (status: SwapStatus) => void,
  setSwapHash: (hash: string) => void,
  tokenInAddress: Address,
  tokenOutAddress: Address,
  userAddress: Address,
  tradeInfo: TradeInfo,
  chainId: number,
  protocolFee: number = 28,
  options?: WidgetRuntimeOptions,
) => {
  try {
    const validatedIntegratorId = getValidIntegratorId(options?.integratorId);
    if (options?.integratorId && !validatedIntegratorId) {
      console.warn("Ignoring invalid integratorId. Expected bytes32 hex string.");
    }

    const { wethAddress } = getResolvedRuntimeConfig(chainId);
    const isTokenInNative = isSameAddress(tokenInAddress, EMPTY_ADDRESS);
    const isTokenOutNative = isSameAddress(tokenOutAddress, EMPTY_ADDRESS);
    const isTokenInWrapped = isSameAddress(tokenInAddress, wethAddress);
    const isTokenOutWrapped = isSameAddress(tokenOutAddress, wethAddress);

    const defaultResponse = {
      success: false,
      data: EMPTY_ADDRESS,
    };
    let swapResponse = defaultResponse;
    if (isTokenInNative && isTokenOutWrapped) {
      swapResponse = await swapNoSplitFromEth(
        chainId,
        tradeInfo,
        userAddress,
      );
    } else if (isTokenInWrapped && isTokenOutNative) {
      swapResponse = await swapNoSplitToEth(
        chainId,
        tradeInfo,
        userAddress,
      );
    } else if (isTokenInNative) {
      swapResponse = await swapFromEth(
        chainId,
        tradeInfo,
        userAddress,
        protocolFee,
        validatedIntegratorId,
      );
    } else if (isTokenOutNative) {
      swapResponse = await swapToEth(
        chainId,
        tradeInfo,
        userAddress,
        protocolFee,
        validatedIntegratorId,
      );
    } else {
      swapResponse = await swap(
        chainId,
        tradeInfo,
        userAddress,
        protocolFee,
        validatedIntegratorId,
      );
      toast.success("Transaction Successful");
    }
    setStatus("SWAPPED");
    setSwapHash(swapResponse.data);
    return swapResponse;
  } catch (error) {
    if (
      error.message &&
      error.message.includes("EmpsealRouter: Insufficient output amount")
    ) {
      setStatus("ERROR");
      toast.error("Output amount too high. Adjust slippage and retry.");
    } else {
      setStatus("ERROR");
      toast.error("Transaction rejected");
    }
    throw error;
  }
};

export const createWidgetContractApi = (integratorId?: string | null) => ({
  checkAllowance,
  callApprove,
  swapTokens: (
    setStatus: (status: SwapStatus) => void,
    setSwapHash: (hash: string) => void,
    tokenInAddress: Address,
    tokenOutAddress: Address,
    userAddress: Address,
    tradeInfo: TradeInfo,
    chainId: number,
    protocolFee: number = 28,
  ) =>
    swapTokens(
      setStatus,
      setSwapHash,
      tokenInAddress,
      tokenOutAddress,
      userAddress,
      tradeInfo,
      chainId,
      protocolFee,
      { integratorId },
    ),
});
