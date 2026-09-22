import { crossApiFetch } from "../../cross/api/client";
import type {
  BasketCapabilities,
  BasketExecutionPlan,
  BasketPlanRequest,
  BasketQuote,
  BasketQuoteRequest,
  BasketRetryRequest,
  BasketRetryResponse,
  BasketStatus,
  BasketSubmittedRequest,
  BasketSubmittedResponse,
  SignedBasketAction,
  WalletScanRequest,
  WalletScanResult,
} from "./contracts";

function encodeSignedQuery(signed: SignedBasketAction): string {
  const params = new URLSearchParams({
    wallet: signed.wallet,
    timestamp: String(signed.timestamp),
    expiresAt: String(signed.expiresAt),
    signature: signed.signature,
  });
  return params.toString();
}

export const basketApi = {
  getCapabilities: () =>
    crossApiFetch<BasketCapabilities>("/api/v1/basket/capabilities"),

  quote: (payload: BasketQuoteRequest) =>
    crossApiFetch<BasketQuote>("/api/v1/basket/quote", {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  plan: (basketId: string, payload: BasketPlanRequest, idempotencyKey: string) =>
    crossApiFetch<BasketExecutionPlan>(
      `/api/v1/basket/${encodeURIComponent(basketId)}/plan`,
      {
        method: "POST",
        headers: { "Idempotency-Key": idempotencyKey },
        body: JSON.stringify(payload),
      },
    ),

  acknowledgeSubmitted: (
    basketId: string,
    legId: string,
    payload: BasketSubmittedRequest,
    idempotencyKey: string,
  ) =>
    crossApiFetch<BasketSubmittedResponse>(
      `/api/v1/basket/${encodeURIComponent(basketId)}/legs/${encodeURIComponent(legId)}/submitted`,
      {
        method: "POST",
        headers: { "Idempotency-Key": idempotencyKey },
        body: JSON.stringify(payload),
      },
    ),

  retryLeg: (
    basketId: string,
    legId: string,
    payload: BasketRetryRequest,
    idempotencyKey: string,
  ) =>
    crossApiFetch<BasketRetryResponse>(
      `/api/v1/basket/${encodeURIComponent(basketId)}/legs/${encodeURIComponent(legId)}/retry`,
      {
        method: "POST",
        headers: { "Idempotency-Key": idempotencyKey },
        body: JSON.stringify(payload),
      },
    ),

  getStatus: (basketId: string, signed: SignedBasketAction) =>
    crossApiFetch<BasketStatus>(
      `/api/v1/basket/${encodeURIComponent(basketId)}/status?${encodeSignedQuery(signed)}`,
    ),

  scanWallet: (payload: WalletScanRequest) =>
    crossApiFetch<WalletScanResult>("/api/v1/wallet/scan", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
};
