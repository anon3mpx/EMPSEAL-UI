import { describe, expect, it } from "vitest";
import type { CrossExecutionSession } from "../api/contracts";
import { buildCrossTrackingLinks } from "./trackingLinks";

const baseSession: CrossExecutionSession = {
  mode: "single",
  status: "SUBMITTED",
  intentId: "0xintent",
  selectedOfferId: "0xoffer",
  offerSetId: "0xset",
  sourceChainId: 8453,
  lastTxHash: "0xsrc",
  quote: {
    intentId: "0xintent",
    srcChainId: 8453,
    dstChainId: 42161,
    tokenIn: "USDC",
    tokenOut: "USDC",
    amountIn: "1000000",
    estimatedOut: "990000",
    minAmountOut: "985000",
    rail: "LAYERZERO",
    expiresAt: 1_900_000_000_000,
    executionMode: "provider_direct",
  },
  integration: {
    mode: "provider_direct",
    action: {
      kind: "layerzero_value_transfer_api",
      userSteps: [],
    },
  },
};

describe("buildCrossTrackingLinks", () => {
  it("builds native source and destination transaction explorer links", () => {
    const links = buildCrossTrackingLinks({
      session: baseSession,
      tracking: {
        srcTxHash: "0xsrc",
        dstTxHash: "0xdst",
      },
      sourceChainId: 8453,
      destinationChainId: 42161,
      getExplorerTxUrl: (chainId, hash) => `https://explorer.example/${chainId}/tx/${hash}`,
    });

    expect(links.sourceTx).toEqual({
      hash: "0xsrc",
      url: "https://explorer.example/8453/tx/0xsrc",
    });
    expect(links.destinationTx).toEqual({
      hash: "0xdst",
      url: "https://explorer.example/42161/tx/0xdst",
    });
  });

  it("adds a LayerZero tracker from the source transaction hash", () => {
    const links = buildCrossTrackingLinks({
      session: baseSession,
      tracking: { srcTxHash: "0xlz" },
      sourceChainId: 8453,
      destinationChainId: 42161,
      getExplorerTxUrl: () => null,
    });

    expect(links.railLinks).toContainEqual({
      label: "LayerZero",
      url: "https://layerzeroscan.com/tx/0xlz",
    });
  });

  it("adds provider-specific tracker links when identifiers are present", () => {
    const links = buildCrossTrackingLinks({
      session: {
        ...baseSession,
        quote: { ...baseSession.quote, rail: "DEBRIDGE" },
        integration: {
          mode: "provider_direct",
          action: {
            kind: "debridge_dln_order",
            orderId: "0xorder",
          },
        },
      },
      tracking: {},
      sourceChainId: 8453,
      destinationChainId: 42161,
      getExplorerTxUrl: () => null,
    });

    expect(links.railLinks).toContainEqual({
      label: "deBridge",
      url: "https://app.debridge.com/order?orderId=0xorder",
    });
  });

  it("encodes CCTP Range ids from known source chains and source tx hashes", () => {
    const links = buildCrossTrackingLinks({
      session: {
        ...baseSession,
        quote: { ...baseSession.quote, rail: "CCTP", srcChainId: 43114 },
        sourceChainId: 43114,
        lastTxHash: undefined,
      },
      tracking: { srcTxHash: "0xcctp" },
      sourceChainId: 43114,
      destinationChainId: 8453,
      getExplorerTxUrl: () => null,
    });

    expect(links.railLinks).toContainEqual({
      label: "CCTP",
      url: "https://usdc.range.org/status?id=YXZheC8weGNjdHA=",
    });
  });
});
