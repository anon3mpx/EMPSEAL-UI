import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { useSwapExecution } from "./useSwapExecution";

const mocks = vi.hoisted(() => ({
  routerState: { current: { router: null, signer: null } },
  toastError: vi.fn(),
  toastSuccess: vi.fn(),
  isSplitSwapUiEnabled: vi.fn(() => true),
}));

vi.mock("../../config/splitSwapUi", () => ({
  isSplitSwapUiEnabled: mocks.isSplitSwapUiEnabled,
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

function buildExecutionRequest() {
  return {
    amountIn: 1_000_000n,
    tokenIn,
    tokenOut,
    recipient: owner,
    options: {
      routing: "auto",
      maxSteps: 3,
      slippageBps: 50,
      maxSplits: 3,
      minSavingsBps: 10,
      feeContext: { pairType: "V/S" },
    },
  };
}

describe("useSwapExecution", () => {
  beforeEach(() => {
    mocks.toastError.mockReset();
    mocks.toastSuccess.mockReset();
    mocks.isSplitSwapUiEnabled.mockReset();
    mocks.isSplitSwapUiEnabled.mockReturnValue(true);
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
      executionRequest: buildExecutionRequest(),
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

  it("approves, reprepares, validates, and then submits a fresh split route", async () => {
    const events = [];
    const approvalWait = vi.fn().mockResolvedValue({ status: 1 });
    const swapWait = vi.fn().mockResolvedValue({ status: 1 });
    const signer = {
      sendTransaction: vi
        .fn(async ({ data }) => {
          if (data === "0xapprove") {
            events.push("approve");
            return { hash: "0xapprove", wait: approvalWait };
          }
          events.push("send");
          return { hash: "0xswap", wait: swapWait };
        }),
    };
    const executableRoute = {
      routing: "split",
      tradeInfo: { timestamp: Date.now(), validUntil: Date.now() + 60_000 },
      calldata: { to: tokenOut, data: "0xfresh", value: "0" },
      splits: [{ shareBps: 6_000 }, { shareBps: 4_000 }],
    };
    const router = {
      checkSplitAllowance: vi.fn().mockResolvedValue({ approved: true, allowance: "1000000" }),
      getSplitApprovalCalldataForAmount: vi.fn().mockReturnValue({
        to: tokenIn,
        data: "0xapprove",
        value: "0",
      }),
      splitSwap: vi.fn(async () => {
        events.push("prepare");
        return executableRoute;
      }),
      validateSplitSwap: vi.fn(async () => {
        events.push("validate");
        return { valid: true };
      }),
    };
    mocks.routerState.current = { router, signer };
    const onSwapSubmitted = vi.fn();
    const preparedRoute = {
      source: "sdk",
      routing: "split",
      tradeInfo: { timestamp: Date.now(), validUntil: Date.now() + 60_000 },
      recipient: owner,
      executionRequest: buildExecutionRequest(),
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
      data: "0xfresh",
      value: 0n,
    });
    expect(events).toEqual(["approve", "prepare", "validate", "send"]);
    expect(router.splitSwap).toHaveBeenCalledWith(
      1_000_000n,
      tokenIn,
      tokenOut,
      owner,
      expect.objectContaining({ routing: "auto", sender: owner }),
    );
    expect(router.validateSplitSwap).toHaveBeenCalledWith(
      expect.objectContaining({ calldata: executableRoute.calldata }),
      owner,
    );
    expect(result.current.swapStatus).toBe("SWAPPED");
    expect(result.current.swapHash).toBe("0xswap");
    expect(onSwapSubmitted).toHaveBeenCalledTimes(1);
  });

  it("blocks SDK preparation when the signer is connected to another chain", async () => {
    const signer = {
      provider: {
        getNetwork: vi.fn().mockResolvedValue({ chainId: 1n }),
      },
      getAddress: vi.fn().mockResolvedValue(owner),
      sendTransaction: vi.fn(),
    };
    const router = {
      checkSplitAllowance: vi.fn().mockResolvedValue({ approved: true }),
      splitSwap: vi.fn(),
    };
    mocks.routerState.current = { router, signer };
    const preparedRoute = {
      source: "sdk",
      routing: "split",
      tradeInfo: { timestamp: Date.now(), validUntil: Date.now() + 60_000 },
      recipient: owner,
      executionRequest: buildExecutionRequest(),
    };
    const { result } = renderHook(() =>
      useSwapExecution(buildProps(preparedRoute)),
    );

    await act(async () => {
      await result.current.confirmSwap();
    });

    expect(router.splitSwap).not.toHaveBeenCalled();
    expect(signer.sendTransaction).not.toHaveBeenCalled();
    expect(result.current.swapStatus).toBe("ERROR");
  });

  it("blocks SDK preparation when the signer account no longer matches", async () => {
    const signer = {
      provider: {
        getNetwork: vi.fn().mockResolvedValue({ chainId: 42161n }),
      },
      getAddress: vi
        .fn()
        .mockResolvedValue("0x4444444444444444444444444444444444444444"),
      sendTransaction: vi.fn(),
    };
    const router = {
      checkSplitAllowance: vi.fn().mockResolvedValue({ approved: true }),
      splitSwap: vi.fn(),
    };
    mocks.routerState.current = { router, signer };
    const preparedRoute = {
      source: "sdk",
      routing: "split",
      tradeInfo: { timestamp: Date.now(), validUntil: Date.now() + 60_000 },
      recipient: owner,
      executionRequest: buildExecutionRequest(),
    };
    const { result } = renderHook(() =>
      useSwapExecution(buildProps(preparedRoute)),
    );

    await act(async () => {
      await result.current.confirmSwap();
    });

    expect(router.splitSwap).not.toHaveBeenCalled();
    expect(signer.sendTransaction).not.toHaveBeenCalled();
    expect(result.current.swapStatus).toBe("ERROR");
  });
});
