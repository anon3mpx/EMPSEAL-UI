import { paddedBasketLegId } from "../../basket/model/modes";
import type { BasketMode } from "../../basket/api/contracts";
import type { BasketUiInput, BasketUiOutput } from "../../basket/model/quoteRequest";
import { normalizeBasketRecipient } from "../../basket/model/quoteRequest";
import { resolveBasketToken, toBaseUnitAmount } from "../../basket/utils/amounts";
import { assetIdOf } from "./assets";
import type { BasketPlanRequest } from "./basketTypes";

/** Preserves picker-selected catalog metadata; ticker lookup is only a legacy-editor fallback. */
export interface V2BasketUiOutput extends BasketUiOutput {
  token?: string;
  decimals?: number;
}

// Mirrors ruflo empx-core/server packages/basket/src/allocation.ts.
export function allocateBps(total: bigint, bps: readonly number[]): bigint[] {
  if (!bps.length || bps.length > 10) throw new Error("basket: 1 to 10 allocations");
  if (bps.some((b) => !Number.isInteger(b) || b <= 0)) throw new Error("basket: every allocation is a positive integer number of bps");
  if (bps.reduce((s, b) => s + b, 0) !== 10000) throw new Error("basket: allocations must sum to exactly 10000 bps");
  if (total <= 0n) throw new Error("basket: the amount must be positive");
  const parts = bps.map((b) => (total * BigInt(b)) / 10000n);
  let largest = 0;
  bps.forEach((b, i) => {
    if (b > bps[largest]!) largest = i;
  });
  parts[largest] = parts[largest]! + total - parts.reduce((s, p) => s + p, 0n);
  if (parts.some((p) => p <= 0n)) throw new Error("basket: an allocation rounds to zero; use fewer legs or a larger amount");
  return parts;
}

export function buildV2BasketRequest(i: {
  mode: Exclude<BasketMode, "wallet-liquidator">;
  wallet: string;
  recipient?: string;
  inputs: BasketUiInput[];
  outputs: V2BasketUiOutput[];
  slippageBps: number;
  maxTier: 1 | 2 | 3;
}): BasketPlanRequest {
  const inputs = i.mode === "one-to-many" ? i.inputs.slice(0, 1) : i.inputs;
  const outputs = i.mode === "multi-to-one" ? i.outputs.slice(0, 1) : i.outputs;
  const count = inputs.length * outputs.length;
  if (count < 1 || count > 10) throw new Error("A V2 basket has 1 to 10 legs");
  const recipient = normalizeBasketRecipient(i.recipient) ?? i.wallet;
  const legs: BasketPlanRequest["legs"] = [];
  for (const input of inputs) {
    const token =
      input.token && input.decimals !== undefined
        ? { address: input.token, decimals: input.decimals }
        : resolveBasketToken(input.chainId, input.ticker);
    const amount = BigInt(input.amountBase ?? toBaseUnitAmount(input.amount, token.decimals));
    if (amount <= 0n) throw new Error("basket: the amount must be positive");
    const parts =
      i.mode === "multi-to-one"
        ? [amount]
        : allocateBps(
            amount,
            outputs.map((o) => o.allocationBps),
          );
    outputs.forEach((output, index) => {
      // A picker selection stores decimals even for a native token (no address); assetIdOf treats a missing address as native.
      const picked = output.token !== undefined || output.decimals !== undefined;
      const address = picked ? output.token : resolveBasketToken(output.chainId, output.ticker).address;
      const legRecipient = normalizeBasketRecipient(output.recipient);
      legs.push({
        legId: paddedBasketLegId(legs.length),
        from: {
          asset: assetIdOf({ chainId: input.chainId, address: token.address }),
          amount: parts[index]!.toString(),
          decimals: token.decimals,
        },
        toAsset: assetIdOf({ chainId: output.chainId, address }),
        ...(legRecipient ? { recipient: legRecipient } : {}),
      });
    });
  }
  return { sender: i.wallet, recipient, maxTier: i.maxTier, slippageBps: i.slippageBps, legs };
}
