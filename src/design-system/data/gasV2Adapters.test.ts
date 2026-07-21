import { describe, expect, it } from "vitest";
import {
  buildGasDestinationDisplays,
  buildGasQuoteSummary,
  buildGasTxRequest,
  formatGasHistoryRows,
  formatGasLookupResult,
  normalizeGasChains,
  resolveGasSourceAmount,
  resolveSingleGasDestinationChain,
  shortHash,
  swapSingleGasChains,
} from "./gasV2Adapters";

describe("gasV2Adapters", () => {
  it("falls back to the estimated source amount while a live quote has no value", () => {
    expect(resolveGasSourceAmount("0", "0.00315641")).toBe(0.00315641);
    expect(resolveGasSourceAmount("0.004", "0.00315641")).toBe(0.004);
  });

  it("swaps source and destination only when the destination supports inbound transfers", () => {
    expect(swapSingleGasChains(42161, 8453, [{ id: 42161 }, { id: 8453 }])).toEqual({
      sourceChainId: 8453,
      destinationChainId: 42161,
    });
    expect(swapSingleGasChains(42161, 8453, [{ id: 42161 }])).toBeNull();
  });

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

  it("filters testnets and chains that cannot accept inbound deposits", () => {
    const chains = [
      { chain: 42161, name: "Arbitrum", symbol: "ETH", mainnet: true, inbound: true },
      { chain: 8453, name: "Base", symbol: "ETH", mainnet: true, inbound: false },
      { chain: 11155111, name: "Sepolia", symbol: "sETH", mainnet: false, inbound: true },
    ];

    expect(normalizeGasChains(chains).map((chain) => chain.id)).toEqual([42161, 8453]);
    expect(normalizeGasChains(chains, { requireInbound: true }).map((chain) => chain.id)).toEqual([42161]);
  });

  it("keeps one valid destination when the source chain changes", () => {
    const chains = [{ id: 42161 }, { id: 8453 }, { id: 10 }];

    expect(resolveSingleGasDestinationChain(42161, 8453, chains)).toBe(8453);
    expect(resolveSingleGasDestinationChain(8453, 8453, chains)).toBe(42161);
    expect(resolveSingleGasDestinationChain(42161, 999999, chains)).toBe(8453);
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
          speed: 90,
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

  it("builds a direct-deposit transaction from the documented calldata response", () => {
    const quote = {
      calldata: "0x010039",
      quotes: [{ expected: "599131010000000", gas: "868990000000", speed: 7, usd: 2.078004 }],
    };

    expect(buildGasQuoteSummary(quote, "ETH")).toMatchObject({
      expectedAmount: "0.00059913101",
      estimatedTimeSeconds: 7,
      ready: true,
    });
    expect(buildGasTxRequest(quote, 600000000000000n)).toEqual({
      to: "0x391E7C679d29bD940d63be94AD22A25d25b5A604",
      data: "0x010039",
      value: 600000000000000n,
    });
  });

  it("uses the documented transaction time field in history and lookup rows", () => {
    const time = 1780000000;
    const history = [{
      deposit: {
        hash: "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
        time,
        status: "CANCELLED",
        chain: 42161,
      },
      txs: [],
    }];

    const [row] = formatGasHistoryRows(history, []);
    const lookup = formatGasLookupResult(history[0], []);

    expect(row.seenLabel).toBe(new Date(time * 1000).toLocaleString());
    expect(row.status).toBe("failed");
    expect(lookup?.sentAt).toBe(new Date(time * 1000).toLocaleString());
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
      },
      {
        id: "b",
        chain: { id: 137, name: "Polygon", ticker: "POL", color: "#7B3FE4" },
        usd: 7.056,
        nativeOut: 9.8,
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
