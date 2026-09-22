import { describe, expect, it, vi } from "vitest";

vi.mock("../../../design-system/data/v2TokenView", () => ({
  getTokensForChain: (chainId: number) => [
    { chainId, ticker: "ETH", address: "0x0000000000000000000000000000000000000000", decimals: 18, isNative: true },
    { chainId, ticker: "USDC", address: "0x2222222222222222222222222222222222222222", decimals: 6 },
  ],
}));

import { mapWalletScanBalances } from "./walletScan";

const WALLET = "0x1111111111111111111111111111111111111111";

describe("mapWalletScanBalances", () => {
  it("maps native 0xeee balances onto the UI native address and drops unsupported chains", () => {
    const mapped = mapWalletScanBalances({
      wallet: WALLET,
      scannedAt: 1,
      skipped: [{ chainId: 1, reason: "no curated token list" }],
      balances: [
        {
          chainId: 8453,
          token: "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee",
          symbol: "ETH",
          decimals: 18,
          balance: "500000000000000000",
        },
        {
          chainId: 1,
          token: "0x2222222222222222222222222222222222222222",
          symbol: "USDC",
          decimals: 6,
          balance: "1000000",
        },
      ],
    }, { supportedChainIds: [8453] });

    expect(mapped).toHaveLength(1);
    expect(mapped[0]).toMatchObject({
      chainId: 8453,
      ticker: "ETH",
      token: "0x0000000000000000000000000000000000000000",
      amount: "0.5",
      amountBase: "500000000000000000",
    });
  });

  it("prices scan balances by token address and leaves provider misses unpriced", () => {
    const pricedToken = "0x3333333333333333333333333333333333333333";
    const unpricedToken = "0x4444444444444444444444444444444444444444";
    const usdPrice = vi.fn((_ticker: string, _chainId: number, token: string) =>
      token.toLowerCase() === pricedToken ? 0.002 : null,
    );

    const mapped = mapWalletScanBalances({
      wallet: WALLET,
      scannedAt: 1,
      skipped: [],
      balances: [
        {
          chainId: 369,
          token: pricedToken,
          symbol: "PRICED",
          decimals: 2,
          balance: "5000",
        },
        {
          chainId: 369,
          token: unpricedToken,
          symbol: "UNKNOWN",
          decimals: 2,
          balance: "5000",
        },
      ],
    }, { usdPrice });

    expect(mapped[0]?.usd).toBe(0.1);
    expect(mapped[1]?.usd).toBeNull();
    expect(usdPrice).toHaveBeenCalledWith("PRICED", 369, pricedToken);
    expect(usdPrice).toHaveBeenCalledWith("UNKNOWN", 369, unpricedToken);
  });
});
