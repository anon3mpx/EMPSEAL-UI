import { describe, expect, it, vi } from "vitest";
import { prepareSwapRoute } from "./swapRoutePreparation";

const baseInput = {
  chainId: 42161,
  amountIn: 1_000_000n,
  tokenIn: "0x1111111111111111111111111111111111111111",
  tokenOut: "0x2222222222222222222222222222222222222222",
  recipient: "0x3333333333333333333333333333333333333333",
  maxSteps: 3,
  slippageBps: 50,
  pairType: "V/S",
};

describe("prepareSwapRoute", () => {
  it("returns an SDK split route without calling local quote", async () => {
    const splitSwap = vi.fn().mockResolvedValue({
      routing: "split",
      splits: [{ shareBps: 6_000 }, { shareBps: 4_000 }],
    });
    const localQuote = vi.fn();

    const result = await prepareSwapRoute({
      ...baseInput,
      router: { splitSwap },
      localQuote,
    });

    expect(result).toMatchObject({ source: "sdk", routing: "split" });
    expect(splitSwap).toHaveBeenCalledWith(
      baseInput.amountIn,
      baseInput.tokenIn,
      baseInput.tokenOut,
      baseInput.recipient,
      {
        routing: "auto",
        maxSteps: 3,
        slippageBps: 50,
        maxSplits: 3,
        minSavingsBps: 10,
        feeContext: { pairType: "V/S" },
      },
    );
    expect(localQuote).not.toHaveBeenCalled();
  });

  it("returns an SDK single route without calling local quote", async () => {
    const localQuote = vi.fn();
    const result = await prepareSwapRoute({
      ...baseInput,
      router: {
        splitSwap: vi.fn().mockResolvedValue({ routing: "single" }),
      },
      localQuote,
    });

    expect(result).toMatchObject({ source: "sdk", routing: "single" });
    expect(localQuote).not.toHaveBeenCalled();
  });

  it("falls back through configured local hop steps when SDK preparation fails", async () => {
    const sdkError = new Error("SDK RPC failed");
    const localQuote = vi
      .fn()
      .mockRejectedValueOnce(new Error("3-hop failed"))
      .mockResolvedValueOnce({
        amounts: [1n, 2n],
        path: [baseInput.tokenIn, baseInput.tokenOut],
        adapters: [],
      });

    const result = await prepareSwapRoute({
      ...baseInput,
      router: { splitSwap: vi.fn().mockRejectedValue(sdkError) },
      localQuote,
      fallbackPlan: { enabled: true, secondStep: 2n, thirdStep: 1n },
    });

    expect(localQuote.mock.calls.map((call) => call[0].maxSteps)).toEqual([3, 2]);
    expect(result).toMatchObject({ source: "local", routing: "single", sdkError });
  });

  it("uses wrapped token addresses only for the local fallback", async () => {
    const localQuote = vi.fn().mockResolvedValue({
      amounts: [1n, 2n],
      path: ["0x4444444444444444444444444444444444444444", baseInput.tokenOut],
      adapters: [],
    });

    await prepareSwapRoute({
      ...baseInput,
      localTokenIn: "0x4444444444444444444444444444444444444444",
      router: { splitSwap: vi.fn().mockRejectedValue(new Error("sdk")) },
      localQuote,
    });

    expect(localQuote).toHaveBeenCalledWith(expect.objectContaining({
      tokenIn: "0x4444444444444444444444444444444444444444",
    }));
  });

  it("throws one preparation error when SDK and local routes both fail", async () => {
    await expect(
      prepareSwapRoute({
        ...baseInput,
        router: { splitSwap: vi.fn().mockRejectedValue(new Error("sdk")) },
        localQuote: vi.fn().mockRejectedValue(new Error("local")),
      }),
    ).rejects.toMatchObject({ name: "SwapRoutePreparationError" });
  });
});
