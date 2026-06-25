import { describe, expect, it } from "vitest";
import {
  buildCrossQuoteRequest,
  buildCrossRouteHops,
  buildCrossTimeline,
  formatCrossOffer,
} from "./crossV2Adapters";

const arbitrum = { id: 42161, name: "Arbitrum", ticker: "ETH", color: "#28A0F0" };
const base = { id: 8453, name: "Base", ticker: "ETH", color: "#0052FF" };

const fromToken = {
  chainId: 42161,
  ticker: "ETH",
  name: "Ether",
  address: "0x0000000000000000000000000000000000000000",
  decimal: 18,
  isNative: true,
};

const toToken = {
  chainId: 8453,
  ticker: "USDC",
  name: "USD Coin",
  address: "0x833589fcd6edb6e08f4c7c32d4f71b54bdA02913",
  decimal: 6,
  isNative: false,
};

describe("crossV2Adapters", () => {
  it("builds backend quote requests from V2 token config", () => {
    expect(
      buildCrossQuoteRequest({
        fromToken,
        toToken,
        fromAmount: "0.5",
        fromChainId: 42161,
        toChainId: 8453,
        userAddress: "0xabc",
        includeDestinationGas: true,
        destinationGasAmount: "0.001",
      }),
    ).toEqual({
      tokenIn: "0x0000000000000000000000000000000000000000",
      tokenOut: "0x833589fcd6edb6e08f4c7c32d4f71b54bdA02913",
      amountIn: "500000000000000000",
      srcChainId: 42161,
      dstChainId: 8453,
      userAddress: "0xabc",
      nativeDstAddress: undefined,
      urgency: "fast",
      destinationGas: [
        {
          provider: "gaszip",
          chainId: 8453,
          amountWei: "1000000000000000",
        },
      ],
    });
  });

  it("formats backend offers for the V2 rail list", () => {
    const offer = {
      offerId: "offer-1",
      offerSetId: "set-1",
      rail: "CCTP",
      executionMode: "router_intent",
      isBest: true,
      amounts: {
        output: { amount: "1196038" },
        minimumOutput: { amount: "1194841" },
      },
      economics: {
        providerFeeUSD: "0.12",
        protocolFeeUSD: "0.03",
        settlementTimeSeconds: 75,
      },
    };

    expect(formatCrossOffer(offer, 6)).toMatchObject({
      offerId: "offer-1",
      railName: "CCTP",
      outputAmount: "1.196038",
      minimumReceived: "1.194841",
      bridgeFeeUSD: 0.12,
      protocolFeeUSD: 0.03,
      estimatedTimeSeconds: 75,
      isBest: true,
    });
  });

  it("builds route hops from backend offer metadata", () => {
    expect(
      buildCrossRouteHops(
        {
          rail: "LAYERZERO",
          routeAsset: { canonicalAssetId: "USDC" },
          legs: {
            sourceSwap: { tokenOutSymbol: "USDC" },
            destinationSwap: { tokenOutSymbol: "USDT" },
          },
        },
        arbitrum,
        base,
        "ETH",
        "USDT",
      ),
    ).toEqual([
      { ticker: "ETH", chainName: "Arbitrum", chainColor: "#28A0F0", via: "Source swap", venueType: "DEX" },
      { ticker: "USDC", chainName: "Arbitrum", chainColor: "#28A0F0", via: "LAYERZERO", venueType: "RAIL" },
      { ticker: "USDC", chainName: "Base", chainColor: "#0052FF", via: "Destination swap", venueType: "DEX" },
      { ticker: "USDT", chainName: "Base", chainColor: "#0052FF" },
    ]);
  });

  it("derives timeline states from tracking and session data", () => {
    expect(
      buildCrossTimeline(
        { status: "DELIVERED", srcTxHash: "0xsource", dstTxHash: "0xdest" },
        { status: "SUBMITTED" },
        "Arbitrum",
        "Base",
        "USDC",
      ),
    ).toEqual([
      { label: "Source confirmation", description: "0xsource", state: "complete" },
      { label: "Rail settlement", description: "DELIVERED", state: "complete" },
      { label: "Destination delivery", description: "0xdest", state: "complete" },
    ]);
  });
});
