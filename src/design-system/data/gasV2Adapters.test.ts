import { describe, expect, it } from "vitest";
import {
  buildGasDestinationDisplays,
  buildGasQuoteSummary,
  buildGasTxRequest,
  formatGasHistoryRows,
  formatGasLookupResult,
  normalizeGasChains,
  shortHash,
} from "./gasV2Adapters";

describe("gasV2Adapters", () => {
  it("normalizes live Gas.zip chains into picker-safe V2 chains", () => {
    expect(
      normalizeGasChains([
        { chain: "42161", name: "Arbitrum", symbol: "ETH", gas: "21000", gwei: "100000000", decimals: 18 },
        { chain: 8453, name: "Base", symbol: "ETH", gas: "21000", gwei: "90000000", decimals: 18 },
        { chain: "bad", name: "Bad" },
      ]),
    ).toEqual([
      {
        id: 42161,
        name: "Arbitrum",
        ticker: "ETH",
        color: "#28A0F0",
        nativeUsd: 3184,
        gasUsdPerSwap: 0.28,
        raw: { chain: "42161", name: "Arbitrum", symbol: "ETH", gas: "21000", gwei: "100000000", decimals: 18 },
      },
      {
        id: 8453,
        name: "Base",
        ticker: "ETH",
        color: "#0052FF",
        nativeUsd: 3184,
        gasUsdPerSwap: 0.18,
        raw: { chain: 8453, name: "Base", symbol: "ETH", gas: "21000", gwei: "90000000", decimals: 18 },
      },
    ]);
  });

  it("formats quote and calldata into a send summary", () => {
    const quote = {
      contractDepositTxn: {
        to: "0x1111111111111111111111111111111111111111",
        data: "0xabcdef",
        value: "10000000000000000",
      },
      quotes: [
        {
          expected: "9950000000000000",
          feeUsd: "0.08",
          eta: 90,
        },
      ],
    };

    expect(buildGasQuoteSummary(quote, "ETH")).toMatchObject({
      sourceAmount: "0.01",
      expectedAmount: "0.00995",
      bridgeFeeUSD: 0.08,
      estimatedTimeSeconds: 90,
      ready: true,
    });
    expect(buildGasTxRequest(quote)).toEqual({
      to: "0x1111111111111111111111111111111111111111",
      data: "0xabcdef",
      value: 10000000000000000n,
    });
  });

  it("builds destination display rows from quote expected output", () => {
    expect(
      buildGasDestinationDisplays({
        destinations: [{ id: "a", chainId: 8453, amount: "0.01" }],
        chains: [{ id: 8453, name: "Base", ticker: "ETH", color: "#0052FF", nativeUsd: 3184, gasUsdPerSwap: 0.18 }],
        expectedAmount: "0.00995",
      }),
    ).toEqual([
      {
        id: "a",
        chain: { id: 8453, name: "Base", ticker: "ETH", color: "#0052FF" },
        usd: 31.6808,
        nativeOut: 0.00995,
        swapsBuyable: 176,
      },
    ]);
  });

  it("uses per-destination quote outputs when provided", () => {
    expect(
      buildGasDestinationDisplays({
        destinations: [
          { id: "a", chainId: 8453, amount: "0.01" },
          { id: "b", chainId: 137, amount: "10" },
        ],
        chains: [
          { id: 8453, name: "Base", ticker: "ETH", color: "#0052FF", nativeUsd: 3184, gasUsdPerSwap: 0.18 },
          { id: 137, name: "Polygon", ticker: "POL", color: "#7B3FE4", nativeUsd: 0.72, gasUsdPerSwap: 0.04 },
        ],
        expectedAmount: "0",
        expectedAmounts: ["0.0099", "9.8"],
      }),
    ).toEqual([
      {
        id: "a",
        chain: { id: 8453, name: "Base", ticker: "ETH", color: "#0052FF" },
        usd: 31.5216,
        nativeOut: 0.0099,
        swapsBuyable: 175,
      },
      {
        id: "b",
        chain: { id: 137, name: "Polygon", ticker: "POL", color: "#7B3FE4" },
        usd: 7.056,
        nativeOut: 9.8,
        swapsBuyable: 176,
      },
    ]);
  });

  it("formats wallet history and lookup status from Gas.zip search responses", () => {
    const history = [
      {
        deposit: {
          hash: "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
          seen: 1780000000,
          status: "CONFIRMED",
          value: "0.01 ETH",
          chain: 42161,
        },
        txs: [{ chain: 8453, hash: "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb" }],
      },
    ];

    expect(formatGasHistoryRows(history, [{ id: 42161, name: "Arbitrum", ticker: "ETH", nativeUsd: 3184, gasUsdPerSwap: 0.28 }])).toMatchObject([
      {
        sourceHash: "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
        sourceHashShort: "0xaaaa...aaaa",
        status: "delivered",
        value: "0.01 ETH",
      },
    ]);

    expect(
      formatGasLookupResult(
        {
          deposit: history[0].deposit,
          txs: history[0].txs,
        },
        [
          { id: 42161, name: "Arbitrum", ticker: "ETH", color: "#28A0F0", nativeUsd: 3184, gasUsdPerSwap: 0.28 },
          { id: 8453, name: "Base", ticker: "ETH", color: "#0052FF", nativeUsd: 3184, gasUsdPerSwap: 0.18 },
        ],
      ),
    ).toMatchObject({
      sourceTxShort: "0xaaaa...aaaa",
      deliveries: [
        {
          chain: { name: "Base", color: "#0052FF", ticker: "ETH" },
          status: "delivered",
          txShort: "0xbbbb...bbbb",
        },
      ],
    });
  });

  it("shortens hashes defensively", () => {
    expect(shortHash("0x1234567890abcdef")).toBe("0x1234...cdef");
    expect(shortHash("0x123")).toBe("0x123");
    expect(shortHash()).toBe("");
  });
});
