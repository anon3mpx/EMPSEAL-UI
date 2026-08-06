import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { useSwapQuoteFetch } from "./useSwapQuoteFetch";

const tokenIn = "0x1111111111111111111111111111111111111111";
const tokenOut = "0x2222222222222222222222222222222222222222";
const recipient = "0x3333333333333333333333333333333333333333";

const mocks = vi.hoisted(() => ({
  prepareSwapRoute: vi.fn(),
  prepareSplitSwapRoute: vi.fn(),
  isSplitSwapUiEnabled: vi.fn(),
  router: {
    findBestPath: vi.fn(),
  },
}));

vi.mock("../../config/splitSwapUi", () => ({
  isSplitSwapUiEnabled: mocks.isSplitSwapUiEnabled,
}));

vi.mock("./useEmpxRouter", () => ({
  useEmpxRouter: () => ({ router: mocks.router }),
}));

vi.mock("./swapRoutePreparation", () => ({
  prepareSwapRoute: mocks.prepareSwapRoute,
  prepareSplitSwapRoute: mocks.prepareSplitSwapRoute,
}));

vi.mock("../../utils/swap/localSwapQuote", () => ({
  readLocalSwapQuote: vi.fn(),
}));

function sdkResult(routing, amountOut) {
  return {
    source: "sdk",
    routing,
    sdkResult: {
      routing,
      tradeInfo: {
        amounts: ["1000000", amountOut],
        path: [tokenIn, tokenOut],
        adapters: ["0x4444444444444444444444444444444444444444"],
        gasEstimate: "100000",
      },
    },
    executionRequest: {
      amountIn: 1_000_000n,
      tokenIn,
      tokenOut,
      recipient,
      options: { routing },
    },
  };
}

function hookInput() {
  return {
    chainId: 42161,
    wethAddress: "0x5555555555555555555555555555555555555555",
    maxHops: 3,
    selectedTokenA: { address: tokenIn, decimal: 6 },
    selectedTokenB: { address: tokenOut, decimal: 18 },
    debouncedAmountIn: "1",
    recipient,
    slippageBps: 50,
    pairType: "V/S",
  };
}

describe("useSwapQuoteFetch progressive routing", () => {
  beforeEach(() => {
    mocks.prepareSwapRoute.mockReset();
    mocks.prepareSplitSwapRoute.mockReset();
    mocks.isSplitSwapUiEnabled.mockReset();
    mocks.isSplitSwapUiEnabled.mockReturnValue(true);
    mocks.router.findBestPath.mockReset();
    mocks.router.findBestPath.mockResolvedValue({
      amounts: ["1000000", "2000000"],
      path: [tokenIn, tokenOut],
      adapters: [],
      gasEstimate: "100000",
    });
  });

  it("does not run split discovery while the UI split flag is disabled", async () => {
    const fast = sdkResult("single", "2000000");
    mocks.isSplitSwapUiEnabled.mockReturnValue(false);
    mocks.prepareSwapRoute.mockResolvedValue(fast);

    const { result } = renderHook(() => useSwapQuoteFetch(hookInput()));

    await waitFor(() => {
      expect(result.current.quoteLoading).toBe(false);
      expect(result.current.splitQuoteLoading).toBe(false);
      expect(result.current.routing).toBe("single");
    });
    expect(result.current.preparedRoute).toBe(fast);
    expect(mocks.prepareSplitSwapRoute).not.toHaveBeenCalled();
  });

  it("publishes the single quote before the split preview finishes", async () => {
    let resolveSplit;
    const pendingSplit = new Promise((resolve) => {
      resolveSplit = resolve;
    });
    mocks.prepareSwapRoute.mockResolvedValue(sdkResult("single", "2000000"));
    mocks.prepareSplitSwapRoute.mockReturnValue(pendingSplit);

    const { result } = renderHook(() => useSwapQuoteFetch(hookInput()));

    await waitFor(() => {
      expect(result.current.routing).toBe("single");
      expect(result.current.quoteLoading).toBe(false);
      expect(result.current.splitQuoteLoading).toBe(true);
    });
    expect(result.current.data.amounts.at(-1)).toBe(2_000_000n);
    expect(mocks.router.findBestPath).not.toHaveBeenCalled();

    await act(async () => {
      resolveSplit(sdkResult("split", "2100000"));
      await pendingSplit;
    });

    await waitFor(() => {
      expect(result.current.routing).toBe("split");
      expect(result.current.splitQuoteLoading).toBe(false);
    });
    expect(result.current.data.amounts.at(-1)).toBe(2_100_000n);
    await waitFor(() => {
      expect(mocks.router.findBestPath).toHaveBeenCalledTimes(1);
    });
  });

  it("keeps the fast quote when background auto routing remains single", async () => {
    const fast = sdkResult("single", "2000000");
    mocks.prepareSwapRoute.mockResolvedValue(fast);
    mocks.prepareSplitSwapRoute.mockResolvedValue(
      sdkResult("single", "1900000"),
    );

    const { result } = renderHook(() => useSwapQuoteFetch(hookInput()));

    await waitFor(() => {
      expect(result.current.splitQuoteLoading).toBe(false);
      expect(result.current.routing).toBe("single");
    });
    expect(result.current.preparedRoute).toBe(fast);
    expect(result.current.data.amounts.at(-1)).toBe(2_000_000n);
  });
});
