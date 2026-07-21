import { describe, expect, it } from "vitest";
import {
  getOfferMinimumOutputAmount,
  getOfferOutputAmount,
  getQuotedOutputDisplay,
} from "./amounts";

describe("cross amount helpers", () => {
  it("does not use source-leg values as final output for src-swap routes", () => {
    const offer = {
      srcChainId: 8453,
      tokenIn: "0x4200000000000000000000000000000000000006",
      amountIn: "1000000000000000000",
      estimatedOut: "994009000000000000",
      minAmountOut: "990000000000000000",
      deliveryShape: "src_and_dst_swap_required",
      tokenOut: "0x4200000000000000000000000000000000000007",
      destinationSettlementAsset: {
        tokenAddress: "0x4200000000000000000000000000000000000007",
        decimals: 6,
      },
      execution: {
        quote: {
          minSettlementAmount: "1988018000",
          legs: {
            sourceSwap: {
              amountOut: "1988018000000000000",
              minimumAmountOut: "1980000000000000000",
            },
          },
        },
      },
    };

    const display = getQuotedOutputDisplay(getOfferOutputAmount(offer), 6, offer);

    expect(getOfferOutputAmount(offer)).toBe("994009000000000000");
    expect(getOfferMinimumOutputAmount(offer)).toBe("990000000000000000");
    expect(display.display).toBe("—");
    expect(display.invalidQuote).toBe(true);
  });

  it("uses destination-swap leg amounts when they are the only final-output fields available", () => {
    const offer = {
      estimatedOut: "994009000000000",
      minAmountOut: "990000000000000",
      deliveryShape: "src_and_dst_swap_required",
      execution: {
        quote: {
          legs: {
            destinationSwap: {
              amountOut: "1994009",
              minimumAmountOut: "1989000",
            },
          },
        },
      },
    };

    expect(getOfferOutputAmount(offer)).toBe("1994009");
    expect(getOfferMinimumOutputAmount(offer)).toBe("1989000");
    expect(getQuotedOutputDisplay(getOfferOutputAmount(offer), 6, offer).display).toBe(
      "1.994009",
    );
  });

  it("does not replace final output with settlement amount when tokenOut differs from settlement asset", () => {
    const offer = {
      estimatedOut: "996638596881812867",
      minAmountOut: "995641958284931054",
      deliveryShape: "src_and_dst_swap_required",
      tokenOut: "0x82af49447d8a07e3bd95bd0d56f35241523fbab1",
      destinationSettlementAsset: {
        tokenAddress: "0xaf88d065e77c8cc2239327c5edb3a432268e5831",
        decimals: 6,
      },
      execution: {
        quote: {
          minSettlementAmount: "2107582405",
        },
      },
    };

    expect(getQuotedOutputDisplay(getOfferOutputAmount(offer), 18, offer).display).toBe(
      "0.996639",
    );
  });
});
