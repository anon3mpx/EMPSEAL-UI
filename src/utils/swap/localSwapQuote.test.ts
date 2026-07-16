import { beforeEach, describe, expect, it, vi } from "vitest";
import { readContract } from "@wagmi/core";
import { readLocalSwapQuote } from "./localSwapQuote";

vi.mock("@wagmi/core", () => ({ readContract: vi.fn() }));
vi.mock("../../Wagmi/config", () => ({ config: {} }));

describe("readLocalSwapQuote", () => {
  beforeEach(() => vi.mocked(readContract).mockReset());

  it("reads findBestPath from the configured local router", async () => {
    vi.mocked(readContract).mockResolvedValue({
      amounts: [1n, 2n],
      path: [
        "0x1111111111111111111111111111111111111111",
        "0x2222222222222222222222222222222222222222",
      ],
      adapters: [],
      gasEstimate: 3n,
    } as never);

    const result = await readLocalSwapQuote({
      chainId: 42161,
      amountIn: 1n,
      tokenIn: "0x1111111111111111111111111111111111111111",
      tokenOut: "0x2222222222222222222222222222222222222222",
      maxSteps: 3,
    });

    expect(readContract).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        chainId: 42161,
        functionName: "findBestPath",
        args: [
          1n,
          "0x1111111111111111111111111111111111111111",
          "0x2222222222222222222222222222222222222222",
          3n,
        ],
      }),
    );
    expect(result).toEqual(expect.objectContaining({
      amounts: [1n, 2n],
      gasEstimate: "3",
    }));
  });
});
