import { describe, expect, it, vi } from "vitest";

vi.mock("../../../design-system/data/v2TokenView", () => ({
  getTokensForChain: (chainId: number) => [
    { chainId, ticker: "USDC", address: "0x2222222222222222222222222222222222222222", decimals: 6 },
    { chainId, ticker: "ETH", address: "0x0000000000000000000000000000000000000000", decimals: 18, isNative: true },
  ],
}));

import { basketEditorFingerprint, buildBasketQuoteRequest } from "./quoteRequest";
import { basketModeConfig } from "../components/modeSupport";

const WALLET = "0x1111111111111111111111111111111111111111";

describe("buildBasketQuoteRequest", () => {
  it("builds integer amounts for all four modes", () => {
    const modes = ["multi-to-one", "one-to-many", "wallet-liquidator", "many-to-many"] as const;
    for (const mode of modes) {
      const request = buildBasketQuoteRequest({
        mode,
        wallet: WALLET,
        inputs: [{ chainId: 8453, ticker: "ETH", amount: "0.5" }],
        outputs: [{ chainId: 42161, ticker: "USDC", allocationBps: 10_000 }],
        slippageBps: 50,
        deadlineSeconds: 600,
      });
      expect(request.mode).toBe(mode);
      expect(request.inputs[0]?.amount).toBe("500000000000000000");
      expect(request.outputs[0]?.token).toBe("0x2222222222222222222222222222222222222222");
      expect(request.inputs[0]?.amount).not.toMatch(/e|\./i);
    }
  });

  it("keeps scan-sourced base units and optional output recipients", () => {
    const request = buildBasketQuoteRequest({
      mode: "wallet-liquidator",
      wallet: WALLET,
      inputs: [{
        chainId: 8453,
        ticker: "ETH",
        amount: "0.5",
        token: "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee",
        decimals: 18,
        amountBase: "500000000000000000",
      }],
      outputs: [{
        chainId: 42161,
        ticker: "USDC",
        allocationBps: 10_000,
        recipient: "0x2222222222222222222222222222222222222222",
      }],
      slippageBps: 50,
      deadlineSeconds: 600,
    });
    expect(request.inputs[0]?.token).toBe("0x0000000000000000000000000000000000000000");
    expect(request.inputs[0]?.amount).toBe("500000000000000000");
    expect(request.outputs[0]?.recipient).toBe("0x2222222222222222222222222222222222222222");
  });

  it("quotes scanned tokens by address without a registry ticker", () => {
    const request = buildBasketQuoteRequest({
      mode: "wallet-liquidator",
      wallet: WALLET,
      inputs: [{
        chainId: 8453,
        ticker: "UNKN",
        amount: "1",
        token: "0x3333333333333333333333333333333333333333",
        decimals: 18,
        amountBase: "1000000000000000000",
      }],
      outputs: [{ chainId: 8453, ticker: "USDC", allocationBps: 10_000 }],
      slippageBps: 50,
      deadlineSeconds: 600,
    });
    expect(request.inputs[0]?.token).toBe("0x3333333333333333333333333333333333333333");
    expect(request.inputs[0]?.amount).toBe("1000000000000000000");
  });

  it("caps each mode without reconstructing routes", () => {
    expect(basketModeConfig("multi-to-one").maxOutputs).toBe(1);
    expect(basketModeConfig("one-to-many").maxInputs).toBe(1);
    expect(basketModeConfig("wallet-liquidator").usesWalletScan).toBe(true);
    expect(basketModeConfig("many-to-many").requireEvenAllocations).toBe(true);
  });

  it("changes fingerprint when amount, token, output, mode, slippage, or deadline changes", () => {
    const base = {
      mode: "multi-to-one" as const,
      inputs: [{ chainId: 8453, ticker: "ETH", amount: "1" }],
      outputs: [{ chainId: 8453, ticker: "USDC", allocationBps: 10_000 }],
      slippageBps: 50,
      deadlineSeconds: 600,
    };
    const original = basketEditorFingerprint(base);
    expect(basketEditorFingerprint({ ...base, inputs: [{ ...base.inputs[0]!, amount: "2" }] })).not.toBe(original);
    expect(basketEditorFingerprint({ ...base, inputs: [{ ...base.inputs[0]!, ticker: "USDC" }] })).not.toBe(original);
    expect(basketEditorFingerprint({ ...base, outputs: [{ ...base.outputs[0]!, ticker: "USDT" }] })).not.toBe(original);
    expect(basketEditorFingerprint({ ...base, mode: "wallet-liquidator" })).not.toBe(original);
    expect(basketEditorFingerprint({ ...base, slippageBps: 100 })).not.toBe(original);
    expect(basketEditorFingerprint({ ...base, deadlineSeconds: 300 })).not.toBe(original);
    expect(basketEditorFingerprint({
      ...base,
      outputs: [{ ...base.outputs[0]!, recipient: WALLET }],
    })).not.toBe(original);
  });

  it("uses live capability limits when provided", () => {
    expect(basketModeConfig("many-to-many", { maxInputs: 2, maxOutputs: 3, maxLegs: 4 })).toMatchObject({
      maxInputs: 2,
      maxOutputs: 3,
      maxLegs: 4,
    });
  });
});
