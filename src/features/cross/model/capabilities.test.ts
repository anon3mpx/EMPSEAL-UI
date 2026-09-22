import { describe, expect, it } from "vitest";
import {
  getChainCapability,
  getOfferCapability,
  getRailCapability,
} from "./capabilities";

describe("getChainCapability", () => {
  it.each([369, 56, 42161, 8453, 137, 43114, 10, 143, 146, 1329, 80094, 30, 10001, 999])(
    "supports full swap legs on backend aggregator chain %s",
    (chainId) => {
      expect(getChainCapability(chainId)).toEqual({
        fullSwapSupported: true,
        sourceExecution: "evm",
      });
    },
  );

  it.each([1, 130, 480, 57073, 59144, 98866, 0, 99, -1, 123456])(
    "does not claim aggregator support for rail-only, non-EVM, or unknown chain %s",
    (chainId) => {
      expect(getChainCapability(chainId).fullSwapSupported).toBe(false);
    },
  );
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

  it("defers returned Hyperlane route assets to the backend catalog", () => {
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
      status: "executable",
      selectable: true,
    });
  });

  it("does not reject backend Hyperlane routes outside the old UI chain list", () => {
    expect(getOfferCapability({
      rail: "HYPERLANE_NEXUS",
      srcChainId: 80094,
      dstChainId: 143,
    })).toMatchObject({ status: "executable", selectable: true });
  });

  it("enables Garden Solana HTLC as an executable Solana source", () => {
    expect(
      getOfferCapability({
        rail: "GARDEN",
        srcChainId: 99,
        dstChainId: 1,
        offerType: "garden_htlc",
      }),
    ).toMatchObject({
      status: "executable",
      selectable: true,
      requiredSourceWallet: "solana",
    });
    expect(
      getOfferCapability({
        rail: "GARDEN",
        srcChainId: 99,
        dstChainId: 8453,
        actionKind: "garden_htlc_order",
      }),
    ).toMatchObject({
      status: "executable",
      selectable: true,
      requiredSourceWallet: "solana",
    });
  });

  it("enables Garden BTC only for a connected Native SegWit wallet", () => {
    const offer = {
      rail: "GARDEN" as const,
      srcChainId: 0,
      dstChainId: 1,
      offerType: "garden_htlc" as const,
    };

    expect(
      getOfferCapability(offer, {
        sourceWallet: { kind: "bitcoin", addressType: "p2wpkh" },
      }),
    ).toMatchObject({
      status: "executable",
      selectable: true,
      requiredSourceWallet: "bitcoin",
    });
  });

  it("restricts Garden BTC for Taproot or missing address type", () => {
    const offer = {
      rail: "GARDEN" as const,
      srcChainId: 0,
      dstChainId: 1,
      offerType: "garden_htlc" as const,
    };

    expect(
      getOfferCapability(offer, {
        sourceWallet: { kind: "bitcoin", addressType: "p2tr" },
      }),
    ).toMatchObject({
      status: "restricted",
      selectable: false,
      requiredSourceWallet: "bitcoin",
    });
    expect(
      getOfferCapability(offer, {
        sourceWallet: { kind: "bitcoin", addressType: "p2tr" },
      }).reason,
    ).toMatch(/Native SegWit \(bc1q\)/);

    expect(
      getOfferCapability(offer, {
        sourceWallet: { kind: "bitcoin" },
      }),
    ).toMatchObject({
      status: "restricted",
      selectable: false,
    });
  });

  it("restricts Garden BTC when no wallet context is provided", () => {
    expect(
      getOfferCapability({
        rail: "GARDEN",
        srcChainId: 0,
        dstChainId: 1,
        offerType: "garden_htlc",
      }),
    ).toMatchObject({
      status: "restricted",
      selectable: false,
      requiredSourceWallet: "bitcoin",
    });
  });

  it("keeps EVM Garden executable with an EVM wallet", () => {
    expect(
      getOfferCapability(
        {
          rail: "GARDEN",
          srcChainId: 8453,
          dstChainId: 0,
          offerType: "garden_htlc",
        },
        { sourceWallet: { kind: "evm" } },
      ),
    ).toMatchObject({
      status: "executable",
      selectable: true,
      requiredSourceWallet: "evm",
    });
  });
});
