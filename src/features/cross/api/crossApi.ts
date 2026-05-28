import type { QuoteRequest } from "./contracts";
import { crossApiFetch } from "./client";

export const crossApi = {
  quote: (payload: QuoteRequest) =>
    crossApiFetch("/api/v1/quote", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  selectOffer: (payload: {
    offerSetId: string;
    offerId: string;
    userAddress: string;
  }) =>
    crossApiFetch("/api/v1/quote/select", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  selectComposed: (payload: {
    offerSetId: string;
    primaryTransferOfferId: string;
    gasZipDestinationGasOfferId: string;
    userAddress: string;
  }) =>
    crossApiFetch("/api/v1/quote/select-composed", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  getIntent: (intentId: string) => crossApiFetch(`/api/v1/intent/${intentId}`),
  getComposedIntent: (primaryIntentId: string, gasZipIntentId: string) =>
    crossApiFetch(
      `/api/v1/intent/composed/${primaryIntentId}/${gasZipIntentId}`,
    ),
  markSubmitted: (intentId: string, payload: any) =>
    crossApiFetch(`/api/v1/intent/${intentId}/submitted`, {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  markLayerZeroSubmitted: (intentId: string, payload: any) =>
    crossApiFetch(
      `/api/v1/layerzero-value-transfer-api/intents/${intentId}/submitted`,
      {
        method: "POST",
        body: JSON.stringify(payload),
      },
    ),
  rebuildLayerZeroUserSteps: (intentId: string) =>
    crossApiFetch(
      `/api/v1/layerzero-value-transfer-api/intents/${intentId}/build-user-steps`,
      {
        method: "POST",
      },
    ),
  submitLayerZeroSignatures: (
    intentId: string,
    payload: { signatures: string[] },
  ) =>
    crossApiFetch(
      `/api/v1/layerzero-value-transfer-api/intents/${intentId}/submit-signature`,
      {
        method: "POST",
        body: JSON.stringify(payload),
      },
    ),
};
