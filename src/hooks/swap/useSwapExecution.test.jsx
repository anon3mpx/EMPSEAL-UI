import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { useSwapExecution } from "./useSwapExecution";

const mocks = vi.hoisted(() => ({
  routerState: { current: { router: null, signer: null } },
  toastError: vi.fn(),
  toastSuccess: vi.fn(),
}));

vi.mock("./useEmpxRouter", () => ({
  useEmpxRouter: () => mocks.routerState.current,
}));

vi.mock("../../utils/toastHelper", () => ({
  toast: {
    error: mocks.toastError,
    success: mocks.toastSuccess,
  },
}));

const owner = "0x3333333333333333333333333333333333333333";
const tokenIn = "0x1111111111111111111111111111111111111111";
const tokenOut = "0x2222222222222222222222222222222222222222";

function buildProps(preparedRoute, onSwapSubmitted = vi.fn()) {
  return {
    chainId: 42161,
    address: owner,
    selectedTokenA: { address: tokenIn, decimal: 6 },
    selectedTokenB: { address: tokenOut, decimal: 18 },
    amountIn: "1",
    debouncedAmountIn: "1",
    tradeInfo: preparedRoute.tradeInfo,
    preparedRoute,
    protocolFee: 28,
    isRefreshingQuote: false,
    executionMode: "sdk",
    onSwapSubmitted,
  };
}

describe("useSwapExecution", () => {
  beforeEach(() => {
    mocks.toastError.mockReset();
    mocks.toastSuccess.mockReset();
  });

  it("blocks expired prepared calldata before asking the signer to submit", async () => {
    const signer = { sendTransaction: vi.fn() };
    mocks.routerState.current = {
      router: { checkSplitAllowance: vi.fn().mockResolvedValue({ approved: true }) },
      signer,
    };
    const preparedRoute = {
      source: "sdk",
      routing: "split",
      tradeInfo: { timestamp: Date.now() - 60_000, validUntil: Date.now() - 1 },
      calldata: { to: tokenOut, data: "0x1234", value: "0" },
      recipient: owner,
    };
    const { result } = renderHook(() => useSwapExecution(buildProps(preparedRoute)));

    await act(async () => {
      await result.current.confirmSwap();
    });

    expect(signer.sendTransaction).not.toHaveBeenCalled();
    expect(result.current.swapStatus).toBe("ERROR");
    expect(result.current.executionError).toBe(
      "Quote expired. Refresh the quote and try again.",
    );
  });

  it("preserves automatic approval to swap execution for a fresh split route", async () => {
    const approvalWait = vi.fn().mockResolvedValue({ status: 1 });
    const swapWait = vi.fn().mockResolvedValue({ status: 1 });
    const signer = {
      sendTransaction: vi
        .fn()
        .mockResolvedValueOnce({ hash: "0xapprove", wait: approvalWait })
        .mockResolvedValueOnce({ hash: "0xswap", wait: swapWait }),
    };
    const router = {
      checkSplitAllowance: vi.fn().mockResolvedValue({ approved: true, allowance: "1000000" }),
      getSplitApprovalCalldataForAmount: vi.fn().mockReturnValue({
        to: tokenIn,
        data: "0xapprove",
        value: "0",
      }),
    };
    mocks.routerState.current = { router, signer };
    const onSwapSubmitted = vi.fn();
    const preparedRoute = {
      source: "sdk",
      routing: "split",
      tradeInfo: { timestamp: Date.now(), validUntil: Date.now() + 60_000 },
      calldata: { to: tokenOut, data: "0xswap", value: "0" },
      recipient: owner,
    };
    const { result } = renderHook(() =>
      useSwapExecution(buildProps(preparedRoute, onSwapSubmitted)),
    );

    await act(async () => {
      await result.current.handleApprove();
    });

    expect(signer.sendTransaction).toHaveBeenCalledTimes(2);
    expect(signer.sendTransaction.mock.calls[1][0]).toEqual({
      to: tokenOut,
      data: "0xswap",
      value: 0n,
    });
    expect(result.current.swapStatus).toBe("SWAPPED");
    expect(result.current.swapHash).toBe("0xswap");
    expect(onSwapSubmitted).toHaveBeenCalledTimes(1);
  });
});
