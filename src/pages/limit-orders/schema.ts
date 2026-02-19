import { z } from "zod";

export enum OrderStrategy {
  BUY = "BUY",
  SELL = "SELL",
  BRACKET = "BRACKET",
}

export enum GroupType {
  None = 0,
  Entry = 1,
  StopLoss = 2,
  TakeProfit = 3,
}

// Order data structure matching the smart contract
export interface Order {
  id: string;
  user: string;
  tokenIn: string;
  tokenOut: string;
  amountIn: string;
  minAmountOut: string;
  limitPrice: string;
  deadline: string;
  fillMode: number;
  maxSplits: number;
  allowPartialFill: boolean;
  filledAmount: string;
  fillCount: number;
  status: string;
  txHash?: string;
  strategy: OrderStrategy;
  tokenOutDecimals?: number;
  fundsDeposited?: boolean;
  groupId?: string;
  groupRole?: GroupType;
}

export interface OrderGroup {
  id: string;
  user: string;
  entryOrderId: string;
  stopLossOrderId: string;
  takeProfitOrderId: string;
  isActive: boolean;
  entryFilled: boolean;
  escrowToken: string;
  escrowAmount: string;
}

// Form data for creating a new order
export const createOrderSchema = z.object({
  tokenIn: z
    .string()
    .min(42)
    .max(42)
    .regex(/^0x[a-fA-F0-9]{40}$/, "Invalid Ethereum address"),
  tokenOut: z
    .string()
    .min(42)
    .max(42)
    .regex(/^0x[a-fA-F0-9]{40}$/, "Invalid Ethereum address"),
  amountIn: z
    .string()
    .min(1, "Amount is required")
    .regex(/^\d+\.?\d*$/, "Must be a valid number"),
  minAmountOut: z
    .string()
    .min(1, "Minimum amount is required")
    .regex(/^\d+\.?\d*$/, "Must be a valid number"),
  limitPrice: z
    .string()
    .min(1, "Limit price is required")
    .regex(/^\d+\.?\d*$/, "Must be a valid number"),
  deadline: z.string().min(1, "Deadline is required"),
  strategy: z.nativeEnum(OrderStrategy).default(OrderStrategy.SELL),
});

export type CreateOrderInput = z.infer<typeof createOrderSchema>;

// Wallet connection state
export interface WalletState {
  isConnected: boolean;
  address: string | null;
  chainId: number | null;
  chainName: string | null;
  provider: any;
  signer: any;
  contract: any;
}

// Status message types
export type StatusType = "info" | "success" | "warning" | "error";

export interface StatusMessage {
  type: StatusType;
  message: string;
  txHash?: string;
}
