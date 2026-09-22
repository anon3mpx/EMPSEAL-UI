import type { BasketAction, SignedBasketAction } from "../api/contracts";

const API_DOMAIN = "EMPX-IntentBasket";

export type BasketActionMessageInput = Omit<SignedBasketAction, "signature">;

/**
 * Deterministic EIP-191 plaintext for a basket action. Field order must match
 * Ruflo `buildBasketActionMessage` exactly.
 */
export function buildBasketActionMessage(action: BasketActionMessageInput): string {
  const parts = [
    API_DOMAIN,
    action.action,
    action.basketId,
    action.wallet,
    ...(action.legId ? [action.legId] : []),
    ...(action.planVersion !== undefined ? [String(action.planVersion)] : []),
    ...(action.idempotencyKey ? [action.idempotencyKey] : []),
    String(action.timestamp),
    String(action.expiresAt),
  ];
  return parts.join("\n");
}

export function createUnsignedBasketAction(input: {
  action: BasketAction;
  basketId: string;
  wallet: string;
  timestamp: number;
  expiresAt: number;
  legId?: string;
  planVersion?: number;
  idempotencyKey?: string;
}): BasketActionMessageInput {
  return {
    action: input.action,
    basketId: input.basketId,
    wallet: input.wallet,
    timestamp: input.timestamp,
    expiresAt: input.expiresAt,
    ...(input.legId ? { legId: input.legId } : {}),
    ...(input.planVersion !== undefined ? { planVersion: input.planVersion } : {}),
    ...(input.idempotencyKey ? { idempotencyKey: input.idempotencyKey } : {}),
  };
}
