import { Address, erc20Abi, formatUnits, parseGwei } from "viem";
import {
  readContract,
  writeContract,
  waitForTransactionReceipt,
} from "@wagmi/core";
import { toast } from "./toastHelper";
import { SwapStatus, TradeInfo } from "./types/interface";
import { WPLS } from "./abis/wplsABI";
import { WETHW } from "./abis/wethwABI";
import { WSONIC } from "./abis/wsonicABI";
import { WETH } from "./abis/wethBaseABI";
import { WSEI } from "./abis/wseiABI";
import { WBERA } from "./abis/wberaABI";
import { WRBTC } from "./abis/wrbtcABI";
import { config } from "../Wagmi/config";
import { 
  ETHW_ROUTER_ABI, 
  PLS_ROUTER_ABI, 
  SONIC_ROUTER_ABI,
  BASECHAIN_ROUTER_ABI,
  SEI_ROUTER_ABI,
  BERA_ROUTER_ABI,
  ROOTSTOCK_ROUTER_ABI
} from "./abis/empSealRouterAbi";
import Tokens from "../pages/tokenList.json";
import { convertToBigInt } from "./utils";
import { getChainConfig } from "./getChainConfig";
import { useChainId } from 'wagmi';

// Chain-specific router function names
const ROUTER_FUNCTION_NAMES = {
  // Pulsechain (default)
  369: {
    swapFromNative: "swapNoSplitFromPLS",
    swapToNative: "swapNoSplitToPLS",
    swapWithPermit: "swapNoSplitToPLSWithPermit"
  },
  // ETHW
  10001: {
    swapFromNative: "swapNoSplitFromETH",
    swapToNative: "swapNoSplitToETH",
    swapWithPermit: "swapNoSplitToETHWithPermit"
  },
  // Sonic
  146: {
    swapFromNative: "swapNoSplitFromETH",
    swapToNative: "swapNoSplitToETH",
    swapWithPermit: "swapNoSplitToETHWithPermit"
  },
  // Base
  8453: {
    swapFromNative: "swapNoSplitFromETH",
    swapToNative: "swapNoSplitToETH",
    swapWithPermit: "swapNoSplitToETHWithPermit"
  },
  // Sei
  1329: {
    swapFromNative: "swapNoSplitFromETH",
    swapToNative: "swapNoSplitToETH",
    swapWithPermit: "swapNoSplitToETHWithPermit"
  },
  // Berachain
  80094: {
    swapFromNative: "swapNoSplitFromETH",
    swapToNative: "swapNoSplitToETH",
    swapWithPermit: "swapNoSplitToETHWithPermit"
  },
  // Rootstock
  30: {
    swapFromNative: "swapNoSplitFromETH",
    swapToNative: "swapNoSplitToETH",
    swapWithPermit: "swapNoSplitToETHWithPermit"
  }
} as const;

// Create a union type of all possible function names
type RouterFunctionNames = typeof ROUTER_FUNCTION_NAMES[369] | typeof ROUTER_FUNCTION_NAMES[10001] | typeof ROUTER_FUNCTION_NAMES[146];

// Extend the ABI type to include both ETH and PLS function names
type ExtendedRouterABI = typeof ETHW_ROUTER_ABI & typeof SONIC_ROUTER_ABI & typeof PLS_ROUTER_ABI & {
  [K in keyof RouterFunctionNames]: typeof ETHW_ROUTER_ABI[0] | typeof SONIC_ROUTER_ABI[0] | typeof PLS_ROUTER_ABI[0];
};

// Get the wrapped token ABI based on chain ID
const getWrappedTokenABI = (chainId: number) => {
  switch (chainId) {
    case 10001: // ETHW
      return WETHW;
    case 146: // Sonic
      return WSONIC;
    case 8453: // Base
      return WETH;
    case 1329: // Sei
      return WSEI;
    case 80094: // Berachain
      return WBERA;
    case 30: // Rootstock
      return WRBTC;
    case 369: // Pulsechain
    default:
      return WPLS;
  }
};

const getCurrentChainConfig = (chainId: number) => {
  return getChainConfig(chainId);
};

const getRouterABI = (chainId: number) => {
  switch (chainId) {
    case 10001: // ETHW
      return ETHW_ROUTER_ABI;
    case 146: // Sonic
      return SONIC_ROUTER_ABI;
    case 8453: // Base
      return BASECHAIN_ROUTER_ABI;
    case 1329: // Sei
      return SEI_ROUTER_ABI;
    case 80094: // Berachain
      return BERA_ROUTER_ABI;
    case 30: // Rootstock
      return ROOTSTOCK_ROUTER_ABI;
    case 369: // Pulsechain
    default:
      return PLS_ROUTER_ABI;
  }
};

const getRouterFunctionName = (chainId: number, functionType: keyof RouterFunctionNames) => {
  return ROUTER_FUNCTION_NAMES[chainId as keyof typeof ROUTER_FUNCTION_NAMES]?.[functionType] || 
         ROUTER_FUNCTION_NAMES[369][functionType]; // Default to Pulsechain if chain not found
};

export const EMPTY_ADDRESS: Address = "0x0000000000000000000000000000000000000000";

export const checkAllowance = async (chainId: number, tokenInAddress: string, userAddress: Address) => {
  try {
    const {routerAddress} = getCurrentChainConfig(chainId);
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

export const callApprove = async (chainId: number, tokenInAddress: string, amountIn: bigint) => {
  try {
    const {routerAddress} = getCurrentChainConfig(chainId);
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

const swapFromEth = async (chainId: number, tradeInfo: TradeInfo, userAddress: Address, protocolFee: number) => {
  try {
    const {routerAddress} = getCurrentChainConfig(chainId);
    const routerABI = getRouterABI(chainId);
    let result = await writeContract(config, {
      abi: routerABI,
      address: routerAddress,
      functionName: chainId === 369 ? "swapNoSplitFromPLS" : "swapNoSplitFromETH",
      args: [
        {
          adapters: tradeInfo.adapters,
          amountIn: tradeInfo.amountIn,
          amountOut: tradeInfo.amountOut,
          path: tradeInfo.path,
        },
        userAddress,
        BigInt(protocolFee.toString()),
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

const swapToEth = async (chainId: number, tradeInfo: TradeInfo, userAddress: Address, protocolFee: number) => {
  try {
    const {routerAddress} = getCurrentChainConfig(chainId);
    const routerABI = getRouterABI(chainId);
    let result = await writeContract(config, {
      abi: routerABI,
      address: routerAddress,
      functionName: chainId === 369 ? "swapNoSplitToPLS" : "swapNoSplitToETH",
      args: [
        {
          adapters: tradeInfo.adapters,
          amountIn: tradeInfo.amountIn,
          amountOut: tradeInfo.amountOut,
          path: tradeInfo.path,
        },
        userAddress,
        BigInt(protocolFee.toString()),
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

const swapNoSplitToEth = async (chainId: number, tradeInfo: TradeInfo, userAddress: Address) => {
  try {
    const {wethAddress} = getCurrentChainConfig(chainId);
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
  userAddress: Address
) => {
  try {
    const {wethAddress} = getCurrentChainConfig(chainId);
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

const swap = async (chainId: number, tradeInfo: TradeInfo, userAddress: Address, protocolFee: number) => {
  try {
    const {routerAddress} = getCurrentChainConfig(chainId);
    const routerABI = getRouterABI(chainId);
    let result = await writeContract(config, {
      abi: routerABI,
      address: routerAddress,
      functionName: "swapNoSplit",
      args: [
        {
          adapters: tradeInfo.adapters,
          amountIn: tradeInfo.amountIn,
          // amountOut: BigInt("0"),
          amountOut: tradeInfo.amountOut,
          // amounts[tradeInfo.amounts.length - 1],
          // amountOut: (tradeInfo.amountOut * BigInt(10)) / BigInt(10000),
          path: tradeInfo.path,
        },
        userAddress,
        BigInt(protocolFee.toString()),
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
) => {
  try {
    const {wethAddress} = getCurrentChainConfig(chainId);
    const defaultResponse = {
      success: false,
      data: EMPTY_ADDRESS,
    };
    let swapResponse = defaultResponse;
    if (tokenInAddress === EMPTY_ADDRESS && tokenOutAddress === wethAddress) {
      swapResponse = await swapNoSplitFromEth(chainId, tradeInfo, userAddress);
    } else if (
      tokenInAddress === wethAddress &&
      tokenOutAddress === EMPTY_ADDRESS
    ) {
      swapResponse = await swapNoSplitToEth(chainId, tradeInfo, userAddress);
    } else if (tokenInAddress === EMPTY_ADDRESS) {
      swapResponse = await swapFromEth(chainId, tradeInfo, userAddress, protocolFee);
    } else if (tokenOutAddress === EMPTY_ADDRESS) {
      swapResponse = await swapToEth(chainId, tradeInfo, userAddress, protocolFee);
    } else {
      swapResponse = await swap(chainId, tradeInfo, userAddress, protocolFee);
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
