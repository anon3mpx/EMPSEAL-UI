import { describe, expect, it, vi } from "vitest";

import { fetchSplitQuote, parseCliArgs, runCli } from "./quoteSplitSwap.mjs";

const tokenIn = "0xaf88d065e77c8cC2239327C5EDb3A432268e5831";
const tokenOut = "0x82af49447d8a07e3bd95bd0d56f35241523fbab1";
const recipient = "0x000000000000000000000000000000000000dEaD";

describe("quoteSplitSwap CLI", () => {
  it("forces split-only preview routing and returns a genuine split quote", async () => {
    const quote = {
      routing: "split",
      tradeInfo: {
        quoteId: "split-1",
        amountIn: "1500000",
        amountOut: "500",
        validUntil: 61_000,
        sdkVersion: "2.3.0",
      },
      splits: [
        {
          shareBps: 6000,
          amountIn: "900000",
          expectedOut: "310",
          minAmountOut: "300",
          path: [tokenIn, tokenOut],
          adapters: ["0x1111111111111111111111111111111111111111"],
        },
        {
          shareBps: 4000,
          amountIn: "600000",
          expectedOut: "210",
          minAmountOut: "200",
          path: [tokenIn, tokenOut],
          adapters: ["0x2222222222222222222222222222222222222222"],
        },
      ],
      splitSavingsBps: 12,
      executable: false,
      validationStatus: "not_validated",
      validUntil: 61_000,
    };
    const router = {
      getTokenDecimals: vi.fn().mockResolvedValue(6),
      quoteSplitSwap: vi.fn().mockResolvedValue(quote),
    };
    const createRouter = vi.fn().mockReturnValue(router);

    const result = await fetchSplitQuote(
      {
        chainId: 42161,
        tokenIn,
        tokenOut,
        amount: "1.5",
        recipient,
        rpcUrl: "https://arb.example",
      },
      { createRouter },
    );

    expect(createRouter).toHaveBeenCalledWith(42161, "https://arb.example");
    expect(router.quoteSplitSwap).toHaveBeenCalledWith(
      1_500_000n,
      tokenIn,
      tokenOut,
      recipient,
      expect.objectContaining({
        routing: "split",
        maxSplits: 3,
        minSavingsBps: 1,
        splitSearchTimeoutMs: 15_000,
      }),
    );
    expect(result).toMatchObject({
      kind: "split_quote",
      chainId: 42161,
      amountRaw: "1500000",
      quote,
    });
  });

  it("parses the reusable chain and token CLI options", () => {
    expect(
      parseCliArgs([
        "--chain",
        "42161",
        "--token-in",
        tokenIn,
        "--token-out",
        tokenOut,
        "--amount",
        "25.5",
        "--recipient",
        recipient,
        "--rpc",
        "https://arb.example",
        "--slippage-bps",
        "100",
        "--min-savings-bps",
        "20",
        "--split-search-timeout-ms",
        "25000",
      ]),
    ).toMatchObject({
      chainId: 42161,
      tokenIn,
      tokenOut,
      amount: "25.5",
      recipient,
      rpcUrl: "https://arb.example",
      slippageBps: 100,
      minSavingsBps: 20,
      splitSearchTimeoutMs: 25_000,
      timeoutMs: 60_000,
    });
  });

  it("defaults exploratory searches to the recommended 2.4 split settings", () => {
    expect(
      parseCliArgs([
        "--chain",
        "42161",
        "--token-in",
        tokenIn,
        "--token-out",
        tokenOut,
        "--amount",
        "1",
      ]),
    ).toMatchObject({
      maxSplits: 3,
      minSavingsBps: 1,
      splitSearchTimeoutMs: 15_000,
      timeoutMs: 60_000,
    });
  });

  it("rejects max-steps values outside the SDK-supported range", () => {
    expect(() =>
      parseCliArgs([
        "--chain",
        "42161",
        "--token-in",
        tokenIn,
        "--token-out",
        tokenOut,
        "--amount",
        "1",
        "--max-steps",
        "5",
      ]),
    ).toThrow("--max-steps must be an integer between 1 and 4");
  });

  it("rejects a non-split response instead of printing a single fallback", async () => {
    const router = {
      getTokenDecimals: vi.fn().mockResolvedValue(6),
      quoteSplitSwap: vi.fn().mockResolvedValue({
        routing: "single",
        tradeInfo: { quoteId: "single-1" },
      }),
    };

    await expect(
      fetchSplitQuote(
        {
          chainId: 42161,
          tokenIn,
          tokenOut,
          amount: "1",
          recipient,
        },
        { createRouter: () => router },
      ),
    ).rejects.toMatchObject({ code: "NO_SPLIT_QUOTE" });
  });

  it("prints progress while waiting and split quote JSON to stdout", async () => {
    let stdout = "";
    let stderr = "";
    const fetchQuote = vi.fn().mockResolvedValue({
      kind: "split_quote",
      chainId: 42161,
      amountRaw: "1000000",
      quote: { routing: "split", splits: [{}, {}] },
    });

    const exitCode = await runCli(
      [
        "--chain",
        "42161",
        "--token-in",
        tokenIn,
        "--token-out",
        tokenOut,
        "--amount",
        "1",
      ],
      {
        fetchSplitQuote: fetchQuote,
        stdout: { write: (value) => { stdout += value; } },
        stderr: { write: (value) => { stderr += value; } },
      },
    );

    expect(exitCode).toBe(0);
    expect(JSON.parse(stdout)).toMatchObject({
      kind: "split_quote",
      quote: { routing: "split" },
    });
    expect(stderr).toContain("searching for a split quote");
    expect(stderr).toContain("completed in");
    expect(fetchQuote).toHaveBeenCalledTimes(1);
  });

  it("times out a slow SDK quote and destroys the owned provider", async () => {
    const destroy = vi.fn();
    const router = {
      provider: { destroy },
      getTokenDecimals: vi.fn().mockResolvedValue(6),
      quoteSplitSwap: vi.fn(() => new Promise(() => {})),
    };

    await expect(
      fetchSplitQuote(
        {
          chainId: 42161,
          tokenIn,
          tokenOut,
          amount: "1",
          recipient,
          timeoutMs: 10,
        },
        { createRouter: () => router },
      ),
    ).rejects.toMatchObject({ code: "REQUEST_TIMEOUT" });
    expect(destroy).toHaveBeenCalledTimes(1);
  });

  it("reports elapsed time when the SDK finds no beneficial split", async () => {
    let stderr = "";
    const error = new Error("No split route met the configured savings threshold");
    error.code = "SPLIT_NOT_BENEFICIAL";

    const exitCode = await runCli(
      [
        "--chain",
        "42161",
        "--token-in",
        tokenIn,
        "--token-out",
        tokenOut,
        "--amount",
        "100",
      ],
      {
        fetchSplitQuote: vi.fn().mockRejectedValue(error),
        stdout: { write: vi.fn() },
        stderr: { write: (value) => { stderr += value; } },
      },
    );

    expect(exitCode).toBe(2);
    expect(stderr).toContain("stopped after");
    expect(stderr).toContain('"code": "SPLIT_NOT_BENEFICIAL"');
  });
});
