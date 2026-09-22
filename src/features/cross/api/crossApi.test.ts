import { afterEach, describe, expect, it, vi } from "vitest";
import { InvalidSelectionResponseError, parseSelectionResponse } from "./contracts";
import { crossApi } from "./crossApi";

afterEach(() => {
  vi.unstubAllGlobals();
});

const sequentialPayload = {
  intentId: "intent-seq",
  quote: {
    intentId: "intent-seq",
    srcChainId: 8453,
    dstChainId: 42161,
    tokenIn: "0x1111111111111111111111111111111111111111",
    tokenOut: "0x2222222222222222222222222222222222222222",
    amountIn: "100",
    estimatedOut: "99",
    minAmountOut: "98",
    rail: "CCTP",
    expiresAt: 1_900_000_000,
  },
  executionPlan: {
    planId: "plan-seq",
    intentId: "intent-seq",
    mode: "sequential_wallet",
    status: "PLANNED",
    version: 1,
    atomic: false,
    currentStep: 0,
    steps: [],
    expiresAt: 1_900_000_000,
  },
  currentAction: {
    tx: {
      to: "0x1111111111111111111111111111111111111111",
      data: "0x1234",
      value: "0",
      chainId: 8453,
    },
  },
  integration: {
    mode: "sequential_wallet",
    planId: "plan-seq",
    stepId: "step-0",
    expectedVersion: 1,
    tx: {
      to: "0x1111111111111111111111111111111111111111",
      data: "0x1234",
      value: "0",
      chainId: 8453,
    },
    approvals: [],
  },
};

describe("parseSelectionResponse", () => {
  it("accepts a valid sequential selection", () => {
    const parsed = parseSelectionResponse(sequentialPayload);
    expect(parsed.integration.mode).toBe("sequential_wallet");
    if (parsed.integration.mode === "sequential_wallet") {
      expect(parsed.integration.planId).toBe("plan-seq");
      expect(parsed.integration.tx.chainId).toBe(8453);
    }
  });

  it("rejects null integration and missing transactions", () => {
    expect(() => parseSelectionResponse({
      ...sequentialPayload,
      integration: null,
    })).toThrow(InvalidSelectionResponseError);

    expect(() => parseSelectionResponse({
      ...sequentialPayload,
      integration: { ...sequentialPayload.integration, tx: undefined },
    })).toThrow(InvalidSelectionResponseError);
  });

  it("rejects invalid chain IDs and plan/step IDs", () => {
    expect(() => parseSelectionResponse({
      ...sequentialPayload,
      integration: { ...sequentialPayload.integration, tx: { ...sequentialPayload.integration.tx, chainId: 0 } },
    })).toThrow(InvalidSelectionResponseError);

    expect(() => parseSelectionResponse({
      ...sequentialPayload,
      integration: { ...sequentialPayload.integration, planId: "" },
    })).toThrow(InvalidSelectionResponseError);
  });

  it("accepts valid non-sequential router integrations", () => {
    const parsed = parseSelectionResponse({
      intentId: "intent-router",
      quote: sequentialPayload.quote,
      integration: {
        mode: "router_intent",
        integration: {
          contractAddress: "0x1111111111111111111111111111111111111111",
          calldata: "0x1234",
          value: "0",
          expiresAt: 1,
        },
      },
    });
    expect(parsed.integration.mode).toBe("router_intent");
  });
});

describe("crossApi.selectOffer", () => {
  it("parses sequential responses before returning them", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(
      new Response(JSON.stringify(sequentialPayload), { status: 200 }),
    ));
    const result = await crossApi.selectOffer({
      offerSetId: "set",
      offerId: "offer",
      userAddress: "0x2222222222222222222222222222222222222222",
    });
    expect(result.integration.mode).toBe("sequential_wallet");
  });

  it("forwards Garden native source funding on select", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({
        intentId: "intent-garden",
        quote: sequentialPayload.quote,
        nativeCallbackAuth: { submissionToken: "submit-token", recoveryToken: "refund-token" },
        integration: {
          mode: "provider_direct",
          action: { kind: "garden_htlc_order" },
          nativeFunding: { runtime: "bitcoin", unsignedTransaction: "cHNidP8=" },
        },
      }), { status: 200 }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const funding = {
      runtime: "bitcoin" as const,
      utxos: [{
        txid: "a".repeat(64),
        vout: 0,
        valueSats: "150000",
        scriptPubKey: "0014" + "11".repeat(20),
        confirmations: 3,
      }],
      feeRateSatVbyte: 8,
      replaceByFee: true as const,
      changeAddress: "bc1qowner",
    };

    const result = await crossApi.selectOffer({
      offerSetId: "set",
      offerId: "garden-offer",
      userAddress: "bc1qowner",
      gardenNativeSourceFunding: funding,
    });

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("/api/v1/quote/select"),
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({
          offerSetId: "set",
          offerId: "garden-offer",
          userAddress: "bc1qowner",
          gardenNativeSourceFunding: funding,
        }),
      }),
    );
    expect(result.nativeCallbackAuth?.submissionToken).toBe("submit-token");
  });
});

describe("crossApi.markGardenSubmitted", () => {
  it("posts the public Garden submitted callback", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response("{}", { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    await crossApi.markGardenSubmitted("intent-garden", {
      userAddress: "bc1qowner",
      sourceTxHash: "a".repeat(64),
      submissionToken: "submit-token",
    });

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("/api/v1/garden/intents/intent-garden/submitted"),
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({
          userAddress: "bc1qowner",
          sourceTxHash: "a".repeat(64),
          submissionToken: "submit-token",
        }),
      }),
    );
  });
});
