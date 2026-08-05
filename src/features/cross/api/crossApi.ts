import type {
  ComposedSelectionResponse,
  QuoteRequest,
  QuoteResponse,
  SelectionResponse,
  SubmittedRequest,
  LayerZeroValueTransferApiChainsResponse,
  LayerZeroValueTransferApiTokensResponse,
} from "./contracts";
import { crossApiFetch } from "./client";

const LAYERZERO_DISCOVERY_BASE_URL = "https://transfer.layerzero-api.com/v1";

const layerZeroDiscoveryQueryPolicy = {
  staleTime: 10 * 60 * 1000,
  gcTime: 60 * 60 * 1000,
  refetchInterval: 15 * 60 * 1000,
  refetchIntervalInBackground: false,
  refetchOnWindowFocus: false,
} as const;

async function layerZeroDiscoveryFetch<T>(
  path: string,
  signal?: AbortSignal,
): Promise<T> {
  // Discovery is public and CORS-enabled. Avoid Content-Type on GET so the
  // browser can make a simple request without an unnecessary preflight.
  const response = await fetch(`${LAYERZERO_DISCOVERY_BASE_URL}${path}`, {
    headers: { Accept: "application/json" },
    signal,
  });
  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw { status: response.status, body };
  }
  return response.json() as Promise<T>;
}

export const crossApi = {
  layerZeroDiscoveryQueryPolicy,
  quote: (payload: QuoteRequest) =>
    crossApiFetch<QuoteResponse>("/api/v1/quote", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  listLayerZeroChains: (nextToken?: string, signal?: AbortSignal) => {
    const params = new URLSearchParams();
    if (nextToken) params.set("pagination[nextToken]", nextToken);
    const query = params.toString();
    return layerZeroDiscoveryFetch<LayerZeroValueTransferApiChainsResponse>(
      `/chains${query ? `?${query}` : ""}`,
      signal,
    );
  },
  listLayerZeroTokens: (request: {
    transferrableFromChainKey?: string;
    transferrableFromTokenAddress?: string;
    nextToken?: string;
  } = {}, signal?: AbortSignal) => {
    const params = new URLSearchParams();
    if (request.transferrableFromChainKey) {
      params.set("transferrableFromChainKey", request.transferrableFromChainKey);
    }
    if (request.transferrableFromTokenAddress) {
      params.set("transferrableFromTokenAddress", request.transferrableFromTokenAddress);
    }
    if (request.nextToken) params.set("pagination[nextToken]", request.nextToken);
    const query = params.toString();
    return layerZeroDiscoveryFetch<LayerZeroValueTransferApiTokensResponse>(
      `/tokens${query ? `?${query}` : ""}`,
      signal,
    );
  },
  listAllLayerZeroChains: async (signal?: AbortSignal) => {
    const chains: LayerZeroValueTransferApiChainsResponse["chains"] = [];
    let nextToken: string | undefined;
    do {
      const page = await crossApi.listLayerZeroChains(nextToken, signal);
      chains.push(...(page.chains ?? []));
      nextToken = page.pagination?.nextToken;
    } while (nextToken);
    return chains;
  },
  listAllLayerZeroTokens: async (request: {
    transferrableFromChainKey?: string;
    transferrableFromTokenAddress?: string;
  } = {}, signal?: AbortSignal) => {
    const tokens: LayerZeroValueTransferApiTokensResponse["tokens"] = [];
    let nextToken: string | undefined;
    do {
      const page = await crossApi.listLayerZeroTokens({ ...request, nextToken }, signal);
      tokens.push(...(page.tokens ?? []));
      nextToken = page.pagination?.nextToken;
    } while (nextToken);
    return tokens;
  },
  selectOffer: (payload: {
    offerSetId: string;
    offerId: string;
    userAddress: string;
  }) =>
    crossApiFetch<SelectionResponse>("/api/v1/quote/select", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  selectComposed: (payload: {
    offerSetId: string;
    primaryTransferOfferId: string;
    gasZipDestinationGasOfferId: string;
    userAddress: string;
  }) =>
    crossApiFetch<ComposedSelectionResponse>("/api/v1/quote/select-composed", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  getIntent: (intentId: string) => crossApiFetch(`/api/v1/intent/${intentId}`),
  getComposedIntent: (primaryIntentId: string, gasZipIntentId: string) =>
    crossApiFetch(
      `/api/v1/intent/composed/${primaryIntentId}/${gasZipIntentId}`,
    ),
  markSubmitted: (intentId: string, payload: SubmittedRequest) =>
    crossApiFetch<unknown>(`/api/v1/intent/${intentId}/submitted`, {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  markLayerZeroSubmitted: (intentId: string, payload: SubmittedRequest) =>
    crossApiFetch<unknown>(
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
