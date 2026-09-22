import { isAddress } from "viem";
import type { BasketInput, BasketMode, BasketOutput, BasketQuoteRequest } from "../api/contracts";
import { canonicalNativeTokenAddress, resolveBasketToken, toBaseUnitAmount } from "../utils/amounts";

export interface BasketUiInput {
  chainId: number;
  ticker: string;
  amount: string;
  token?: string;
  decimals?: number;
  amountBase?: string;
}

export interface BasketUiOutput {
  chainId: number;
  ticker: string;
  allocationBps: number;
  recipient?: string;
}

export function normalizeBasketRecipient(recipient?: string): string | undefined {
  const trimmed = recipient?.trim();
  if (!trimmed) return undefined;
  if (!isAddress(trimmed)) {
    throw new Error(`Recipient ${trimmed} is not a valid address.`);
  }
  return trimmed;
}

export function buildBasketQuoteRequest(input: {
  mode: BasketMode;
  wallet: string;
  inputs: BasketUiInput[];
  outputs: BasketUiOutput[];
  slippageBps: number;
  deadlineSeconds: number;
}): BasketQuoteRequest {
  const inputs: BasketInput[] = input.inputs.map((leg) => {
    if (leg.token) {
      const decimals = leg.decimals;
      if (decimals == null && !leg.amountBase) {
        const token = resolveBasketToken(leg.chainId, leg.ticker);
        return {
          chainId: leg.chainId,
          token: canonicalNativeTokenAddress(leg.token),
          amount: toBaseUnitAmount(leg.amount, token.decimals),
          wallet: input.wallet,
          slippageBps: input.slippageBps,
        };
      }
      return {
        chainId: leg.chainId,
        token: canonicalNativeTokenAddress(leg.token),
        amount: leg.amountBase ?? toBaseUnitAmount(leg.amount, decimals ?? 18),
        wallet: input.wallet,
        slippageBps: input.slippageBps,
      };
    }
    const token = resolveBasketToken(leg.chainId, leg.ticker);
    return {
      chainId: leg.chainId,
      token: token.address,
      amount: toBaseUnitAmount(leg.amount, token.decimals),
      wallet: input.wallet,
      slippageBps: input.slippageBps,
    };
  });
  const outputs: BasketOutput[] = input.outputs.map((leg) => {
    const token = resolveBasketToken(leg.chainId, leg.ticker);
    const recipient = normalizeBasketRecipient(leg.recipient);
    return {
      chainId: leg.chainId,
      token: token.address,
      allocationBps: leg.allocationBps,
      ...(recipient ? { recipient } : {}),
    };
  });

  return {
    mode: input.mode,
    inputs,
    outputs,
    constraints: {
      slippageBps: input.slippageBps,
      deadlineSeconds: input.deadlineSeconds,
    },
  };
}

export function basketEditorFingerprint(input: {
  mode: BasketMode;
  inputs: BasketUiInput[];
  outputs: BasketUiOutput[];
  slippageBps: number;
  deadlineSeconds: number;
}): string {
  return JSON.stringify({
    mode: input.mode,
    slippageBps: input.slippageBps,
    deadlineSeconds: input.deadlineSeconds,
    inputs: input.inputs.map((leg) => ({
      chainId: leg.chainId,
      ticker: leg.ticker,
      token: leg.token,
      amount: leg.amount.trim(),
      amountBase: leg.amountBase,
    })),
    outputs: input.outputs.map((leg) => ({
      chainId: leg.chainId,
      ticker: leg.ticker,
      allocationBps: leg.allocationBps,
      recipient: leg.recipient?.trim() ?? "",
    })),
  });
}
