import { describe, expect, it } from "vitest";
import {
  getChainCapability,
  getOfferCapability,
  getRailCapability,
} from "./capabilities";

describe("getChainCapability", () => {
  it("marks Base as full-swap supported", () => {
    expect(getChainCapability(8453).fullSwapSupported).toBe(true);
  });

  it("leaves BSC quoteable but not full-swap enabled", () => {
    expect(getChainCapability(56)).toEqual({
      fullSwapSupported: false,
      sourceExecution: "evm",
    });
  });
});

describe("cross-chain rail capability policy", () => {
  it("maps canonical backend rails to rollout-safe labels and statuses", () => {
    expect(getRailCapability("HYPERLANE_NEXUS")).toMatchObject({
      label: "Hyperlane Nexus",
      status: "executable",
      providerApprovalMayBeRequired: true,
      selectable: true,
    });
    expect(getRailCapability("OPTIMISM_NATIVE_BRIDGE")).toMatchObject({
      label: "Optimism Native Bridge",
      status: "executable",
    });
    expect(getRailCapability("CHAINFLIP")).toMatchObject({
      label: "Chainflip",
      status: "quote_only",
      selectable: false,
    });
    expect(getRailCapability("MAYA")).toMatchObject({
      label: "Maya",
      status: "restricted",
      requiredSourceWallet: "bitcoin",
      selectable: false,
    });
  });

  it("disables inactive rails and Optimism withdrawals", () => {
    for (const rail of ["TELESWAP", "VIA_LABS", "AXELAR"]) {
      expect(getRailCapability(rail).status).toBe("disabled");
      expect(getRailCapability(rail).selectable).toBe(false);
    }

    expect(
      getOfferCapability({
        rail: "OPTIMISM_NATIVE_BRIDGE",
        srcChainId: 10,
        dstChainId: 1,
      }),
    ).toMatchObject({
      status: "disabled",
      selectable: false,
    });
  });

  it("enables the active Wormhole, deBridge, and Garden rail expansion", () => {
    for (const rail of ["WORMHOLE", "DEBRIDGE", "GARDEN"]) {
      expect(getRailCapability(rail)).toMatchObject({
        status: "executable",
        selectable: true,
      });
    }
  });

  it("accepts the expanded Hyperlane chain families", () => {
    expect(
      getOfferCapability({
        rail: "HYPERLANE_NEXUS",
        srcChainId: 1,
        dstChainId: 57073,
        routeAsset: {
          canonicalAssetId: "USDC",
          providerAssetId: "USDC",
          decimals: 6,
          assetKind: "erc20",
        },
      }),
    ).toMatchObject({ status: "executable", selectable: true });

    expect(
      getOfferCapability({
        rail: "HYPERLANE_NEXUS",
        srcChainId: 57073,
        dstChainId: 1,
        routeAsset: {
          canonicalAssetId: "USDC",
          providerAssetId: "USDC",
          decimals: 6,
          assetKind: "erc20",
        },
      }),
    ).toMatchObject({ status: "executable", selectable: true });
  });

  it("keeps LayerZero native Stargate offers hidden", () => {
    expect(
      getOfferCapability({
        rail: "LAYERZERO",
        offerType: "lz_stargate_native",
        srcChainId: 8453,
        dstChainId: 42161,
      } as any),
    ).toMatchObject({ status: "disabled", selectable: false });
  });

  it("allows THORChain BTC source execution with a Bitcoin wallet", () => {
    expect(
      getOfferCapability({
        rail: "THORCHAIN",
        srcChainId: 0,
        dstChainId: 1,
        offerType: "thor_api_direct",
      }),
    ).toMatchObject({
      status: "executable",
      selectable: true,
      requiredSourceWallet: "bitcoin",
    });
  });

  it("restricts unknown non-EVM source actions even when a provider returns an offer", () => {
    expect(
      getOfferCapability({
        rail: "MAYA",
        srcChainId: 0,
        dstChainId: 1,
      }),
    ).toMatchObject({
      status: "restricted",
      selectable: false,
      requiredSourceWallet: "bitcoin",
    });
  });

  it("rejects Hyperlane assets outside the enabled USDC and USDT catalog", () => {
    expect(
      getOfferCapability({
        rail: "HYPERLANE_NEXUS",
        srcChainId: 8453,
        dstChainId: 42161,
        routeAsset: {
          canonicalAssetId: "DAI",
          providerAssetId: "DAI",
          decimals: 18,
          assetKind: "erc20",
        },
      }),
    ).toMatchObject({
      status: "disabled",
      selectable: false,
    });
  });
});
