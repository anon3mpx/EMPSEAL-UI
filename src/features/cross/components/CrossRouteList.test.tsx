import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { CrossRouteList } from "./CrossRouteList";

describe("CrossRouteList", () => {
  it("renders the best route badge and ETA", () => {
    render(
      <CrossRouteList
        offers={[
          {
            offerId: "offer-1",
            rail: "cctp",
            estimatedOut: "99.5",
            economics: { settlementTimeSeconds: 120 },
            isBest: true,
            deliveryShape: "src_and_dst_swap_required",
          } as any,
        ]}
        selectedOfferId="offer-1"
        onSelect={() => {}}
        expiresAt={1740000000000}
      />,
    );

    expect(screen.getByText("BEST")).toBeInTheDocument();
    expect(screen.getByText(/~2 min/i)).toBeInTheDocument();
  });

  it("shows route-unavailable copy when there are no offers", () => {
    render(
      <CrossRouteList
        offers={[]}
        selectedOfferId={null}
        onSelect={() => {}}
        expiresAt={null}
      />,
    );

    expect(screen.getByText(/route unavailable/i)).toBeInTheDocument();
  });

  it("reveals a review panel for the selected route", () => {
    render(
      <CrossRouteList
        offers={[
          {
            offerId: "offer-1",
            rail: "cctp",
            railVariant: "CCTP_FAST",
            estimatedOut: "995000",
            minAmountOut: "990000",
            economics: {
              settlementTimeSeconds: 120,
              providerFeeUSD: "0.12",
              protocolFeeUSD: "0.03",
            },
            deliveryShape: "src_and_dst_swap_required",
            routeAsset: "USDC",
            sourceSettlementAsset: "USDC",
            destinationSettlementAsset: "USDC",
          } as any,
        ]}
        selectedOfferId="offer-1"
        onSelect={() => {}}
        expiresAt={1740000000000}
        tokenOutDecimals={6}
        tokenOutSymbol="USDC"
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /details/i }));

    expect(screen.getByText(/route asset/i)).toBeInTheDocument();
    expect(screen.getByText(/cctp_fast/i)).toBeInTheDocument();
    expect(screen.getByText(/minimum receive/i)).toBeInTheDocument();
    expect(screen.getByText(/0.99 usdc/i)).toBeInTheDocument();
  });

  it("renders a dedicated destination gas rail selector", () => {
    const onSelectGasOffer = vi.fn();
    const onIncludeDestinationGasChange = vi.fn();

    render(
      <CrossRouteList
        offers={[
          {
            offerId: "offer-1",
            rail: "cctp",
            economics: { settlementTimeSeconds: 120 },
          } as any,
        ]}
        selectedOfferId="offer-1"
        onSelect={() => {}}
        expiresAt={1740000000000}
        gasOffers={[
          {
            offerId: "gas-1",
            rail: "GASZIP",
            executionMode: "provider_direct",
            estimatedOut: "800000000000000",
            economics: { settlementTimeSeconds: 7, providerFeeUSD: "0.00" },
          } as any,
        ]}
        selectedGasOfferId="gas-1"
        includeDestinationGas={false}
        destinationGasAmount="0.001"
        onSelectGasOffer={onSelectGasOffer}
        onIncludeDestinationGasChange={onIncludeDestinationGasChange}
      />,
    );

    expect(screen.getByText(/destination gas rail/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /gas\.zip/i }));
    expect(onSelectGasOffer).toHaveBeenCalledWith("gas-1");
    expect(onIncludeDestinationGasChange).toHaveBeenCalledWith(true);
  });

  it("keeps gas toggle visible before gas offers are returned", () => {
    const onIncludeDestinationGasChange = vi.fn();

    render(
      <CrossRouteList
        offers={[
          {
            offerId: "offer-1",
            rail: "cctp",
            economics: { settlementTimeSeconds: 120 },
          } as any,
        ]}
        selectedOfferId="offer-1"
        onSelect={() => {}}
        expiresAt={1740000000000}
        gasOffers={[]}
        includeDestinationGas={false}
        onIncludeDestinationGasChange={onIncludeDestinationGasChange}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /add gas/i }));
    expect(onIncludeDestinationGasChange).toHaveBeenCalledWith(true);
  });

  it("shows THORChain provider-direct review detail", () => {
    render(
      <CrossRouteList
        offers={[
          {
            offerId: "offer-1",
            rail: "THORCHAIN",
            executionMode: "provider_direct",
            estimatedOut: "995000",
            minAmountOut: "990000",
            economics: {
              settlementTimeSeconds: 180,
              providerFeeUSD: "0.18",
            },
            deliveryShape: "direct",
            routeAsset: "ETH.ETH",
            sourceSettlementAsset: "ETH.ETH",
            destinationSettlementAsset: "BTC.BTC",
          } as any,
        ]}
        selectedOfferId="offer-1"
        onSelect={() => {}}
        expiresAt={1740000000000}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /details/i }));

    expect(screen.getAllByText(/provider direct/i).length).toBeGreaterThan(0);
    expect(
      screen.getByText(/thorchain direct deposit flow with provider memo/i),
    ).toBeInTheDocument();
  });

  it("prefers explicit output amounts from the new API contract", () => {
    render(
      <CrossRouteList
        offers={[
          {
            offerId: "offer-1",
            rail: "CCTP",
            executionMode: "router_intent",
            estimatedOut: "1196038",
            minAmountOut: "1194841",
            amounts: {
              output: {
                token: "0xfd086bc7cd5c481dcc9c85ebe478a1c0b69fcbb9",
                amount: "1196038",
              },
              minimumOutput: {
                token: "0xfd086bc7cd5c481dcc9c85ebe478a1c0b69fcbb9",
                amount: "1194841",
              },
            },
            legs: {
              bridge: {
                amountOut: "1197960",
                tokenOutDecimals: 6,
                tokenInSymbol: "USDC",
                tokenOutSymbol: "USDC",
              },
              destinationSwap: {
                amountOut: "1196038",
                tokenOutDecimals: 6,
                tokenInSymbol: "USDC",
                tokenOutSymbol: "USDT",
              },
            },
            economics: {
              settlementTimeSeconds: 8,
              providerFeeUSD: "0.00024",
            },
            deliveryShape: "dst_swap_required",
            routeAsset: { canonicalAssetId: "USDC", decimals: 6 },
            destinationSettlementAsset: {
              decimals: 6,
              canonicalAssetId: "USDC",
            },
          } as any,
        ]}
        selectedOfferId="offer-1"
        onSelect={() => {}}
        expiresAt={1740000000000}
        tokenOutDecimals={6}
        tokenOutSymbol="USDT"
      />,
    );

    expect(
      screen.getByText((content) => content.replace(/\s+/g, " ").trim() === "1.196038 USDT"),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /details/i }));
    expect(screen.getByText(/destination swap/i)).toBeInTheDocument();
    expect(screen.queryByText(/quote-unit mismatch detected/i)).not.toBeInTheDocument();
  });

  it("flags quote-unit mismatches for destination-swap routes", () => {
    render(
      <CrossRouteList
        offers={[
          {
            offerId: "offer-1",
            rail: "CCTP",
            executionMode: "router_intent",
            estimatedOut: "993809",
            minAmountOut: "992815",
            economics: {
              settlementTimeSeconds: 8,
              providerFeeUSD: "0.0002",
            },
            deliveryShape: "dst_swap_required",
            routeAsset: { decimals: 6 },
            destinationSettlementAsset: {
              decimals: 6,
              canonicalAssetId: "USDC",
            },
          } as any,
        ]}
        selectedOfferId="offer-1"
        onSelect={() => {}}
        expiresAt={1740000000000}
        tokenOutDecimals={18}
        tokenOutSymbol="AIXBT"
      />,
    );

    expect(
      screen.getByText((content) => content.replace(/\s+/g, " ").trim() === "0.993809* AIXBT"),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /details/i }));
    expect(screen.getByText(/quote-unit mismatch detected from the api/i)).toBeInTheDocument();
  });

  it("hides malformed src-swap quotes that come back in source-token units", () => {
    render(
      <CrossRouteList
        offers={[
          {
            offerId: "offer-1",
            srcChainId: 8453,
            tokenIn: "0x4200000000000000000000000000000000000006",
            amountIn: "1000000000000000000",
            rail: "LAYERZERO",
            executionMode: "router_intent",
            estimatedOut: "994009000000000000",
            minAmountOut: "990000000000000000",
            tokenOut: "0x4200000000000000000000000000000000000007",
            economics: {
              settlementTimeSeconds: 300,
              providerFeeUSD: "0.35",
            },
            deliveryShape: "src_and_dst_swap_required",
            execution: {
              quote: {
                minSettlementAmount: "1988018000",
                legs: {
                  sourceSwap: {
                    amountOut: "1988018000000000000",
                    minimumAmountOut: "1980000000000000000",
                    tokenOutDecimals: 18,
                    tokenInSymbol: "WETH",
                    tokenOutSymbol: "WETH",
                  },
                },
              },
            },
            routeAsset: { decimals: 6, canonicalAssetId: "USDC" },
            destinationSettlementAsset: {
              tokenAddress: "0x4200000000000000000000000000000000000007",
              decimals: 6,
              canonicalAssetId: "USDC",
            },
          } as any,
        ]}
        selectedOfferId="offer-1"
        onSelect={() => {}}
        expiresAt={1740000000000}
        tokenOutDecimals={6}
        tokenOutSymbol="USDC"
      />,
    );

    expect(screen.getByText("—")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /details/i }));
    expect(
      screen.getByText(/api returned a malformed output amount for this route/i),
    ).toBeInTheDocument();
  });
});
