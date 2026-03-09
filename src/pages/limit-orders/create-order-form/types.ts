import type { OrderStrategy, StatusMessage } from "../schema";

export enum OrderMode {
  STANDARD = "standard",
  BRACKET = "bracket",
  POSITION = "position",
}

export interface CreateOrderFormProps {
  onStatusMessage: (message: StatusMessage) => void;
  onOrderCreated: (details: {
    orderId: string;
    txHash: string;
    strategy: OrderStrategy;
  }) => void;
  slippage: number;
  onOpenSlippage?: () => void;
}
