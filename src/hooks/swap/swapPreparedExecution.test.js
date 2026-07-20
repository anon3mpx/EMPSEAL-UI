import { describe, expect, it, vi } from "vitest";
import {
  checkPreparedAllowance,
  getSwapExecutionErrorMessage,
  getPreparedApproval,
  isPreparedRouteExpired,
  prepareExecutableSdkRoute,
  submitPreparedSdkRoute,
} from "./swapPreparedExecution";

describe("prepared swap execution", () => {
  it("uses split allowance and approval for an SDK split", async () => {
    const router = {
      checkSplitAllowance: vi
        .fn()
        .mockResolvedValue({ approved: false, allowance: "0" }),
      getSplitApprovalCalldataForAmount: vi
        .fn()
        .mockReturnValue({ to: "0x1", data: "0x2", value: "0" }),
      checkAllowance: vi.fn(),
      getApprovalCalldataForAmount: vi.fn(),
    };
    const route = { source: "sdk", routing: "split" };

    await checkPreparedAllowance({
      route,
      router,
      token: "0x3",
      owner: "0x4",
      amount: 5n,
    });
    getPreparedApproval({ route, router, token: "0x3", amount: 5n });

    expect(router.checkSplitAllowance).toHaveBeenCalled();
    expect(router.getSplitApprovalCalldataForAmount).toHaveBeenCalledWith(
      "0x3",
      { mode: "exact", amount: 5n },
    );
    expect(router.checkAllowance).not.toHaveBeenCalled();
    expect(router.getApprovalCalldataForAmount).not.toHaveBeenCalled();
  });

  it("uses ordinary allowance and approval for an SDK single route", async () => {
    const router = {
      checkSplitAllowance: vi.fn(),
      getSplitApprovalCalldataForAmount: vi.fn(),
      checkAllowance: vi.fn().mockResolvedValue({ approved: true, allowance: "5" }),
      getApprovalCalldataForAmount: vi
        .fn()
        .mockReturnValue({ to: "0x1", data: "0x2", value: "0" }),
    };
    const route = { source: "sdk", routing: "single" };

    await checkPreparedAllowance({
      route,
      router,
      token: "0x3",
      owner: "0x4",
      amount: 5n,
    });
    getPreparedApproval({ route, router, token: "0x3", amount: 5n });

    expect(router.checkAllowance).toHaveBeenCalled();
    expect(router.getApprovalCalldataForAmount).toHaveBeenCalledWith("0x3", {
      mode: "exact",
      amount: 5n,
    });
    expect(router.checkSplitAllowance).not.toHaveBeenCalled();
  });

  it("sends the exact confirmed SDK calldata once", async () => {
    const wait = vi.fn().mockResolvedValue({ status: 1 });
    const signer = {
      sendTransaction: vi.fn().mockResolvedValue({ hash: "0xabc", wait }),
    };
    const calldata = {
      to: "0x1111111111111111111111111111111111111111",
      data: "0x1234",
      value: "7",
    };

    const hash = await submitPreparedSdkRoute({
      route: { source: "sdk", routing: "split", calldata },
      signer,
      router: {
        validateSplitSwap: vi.fn().mockResolvedValue({ valid: true }),
      },
      sender: "0x2222222222222222222222222222222222222222",
    });

    expect(hash).toBe("0xabc");
    expect(signer.sendTransaction).toHaveBeenCalledTimes(1);
    expect(signer.sendTransaction).toHaveBeenCalledWith({
      to: calldata.to,
      data: calldata.data,
      value: 7n,
    });
    expect(wait).toHaveBeenCalledTimes(1);
  });

  it("reprepares executable calldata from the preview request with the sender", async () => {
    const previewRoute = {
      source: "sdk",
      routing: "split",
      executionRequest: {
        amountIn: 5n,
        tokenIn: "0x1111111111111111111111111111111111111111",
        tokenOut: "0x2222222222222222222222222222222222222222",
        recipient: "0x3333333333333333333333333333333333333333",
        options: {
          routing: "auto",
          maxSteps: 3,
          slippageBps: 50,
          maxSplits: 3,
          minSavingsBps: 10,
          feeContext: { pairType: "V/S" },
        },
      },
    };
    const prepared = {
      routing: "split",
      tradeInfo: { validUntil: Date.now() + 60_000 },
      calldata: {
        to: "0x4444444444444444444444444444444444444444",
        data: "0x1234",
        value: "0",
      },
    };
    const router = {
      splitSwap: vi.fn().mockResolvedValue(prepared),
    };
    const sender = "0x5555555555555555555555555555555555555555";

    const result = await prepareExecutableSdkRoute({
      route: previewRoute,
      router,
      sender,
    });

    expect(router.splitSwap).toHaveBeenCalledWith(
      5n,
      previewRoute.executionRequest.tokenIn,
      previewRoute.executionRequest.tokenOut,
      previewRoute.executionRequest.recipient,
      {
        ...previewRoute.executionRequest.options,
        sender,
      },
    );
    expect(result).toMatchObject({
      source: "sdk",
      routing: "split",
      recipient: previewRoute.executionRequest.recipient,
      calldata: prepared.calldata,
    });
  });

  it("validates a split immediately before asking the signer to send", async () => {
    const events = [];
    const route = {
      source: "sdk",
      routing: "split",
      calldata: {
        to: "0x1111111111111111111111111111111111111111",
        data: "0x1234",
        value: "0",
      },
    };
    const router = {
      validateSplitSwap: vi.fn(async () => {
        events.push("validate");
        return { valid: true };
      }),
    };
    const signer = {
      sendTransaction: vi.fn(async () => {
        events.push("send");
        return {
          hash: "0xabc",
          wait: vi.fn(async () => {
            events.push("wait");
            return { status: 1 };
          }),
        };
      }),
    };

    await submitPreparedSdkRoute({
      route,
      signer,
      router,
      sender: "0x2222222222222222222222222222222222222222",
    });

    expect(events).toEqual(["validate", "send", "wait"]);
  });

  it("rejects routes that are not SDK prepared calldata", async () => {
    await expect(
      submitPreparedSdkRoute({
        route: { source: "local", routing: "single" },
        signer: { sendTransaction: vi.fn() },
        router: {},
        sender: "0x2222222222222222222222222222222222222222",
      }),
    ).rejects.toThrow("SDK prepared calldata is unavailable");
  });

  it("treats the prepared route validUntil as the execution deadline", () => {
    const route = {
      source: "sdk",
      routing: "split",
      tradeInfo: { timestamp: 1_000, validUntil: 61_000 },
    };

    expect(isPreparedRouteExpired(route, 60_999)).toBe(false);
    expect(isPreparedRouteExpired(route, 61_000)).toBe(true);
  });

  it("does not invent an expiry when route metadata is unavailable", () => {
    expect(isPreparedRouteExpired(undefined, 61_000)).toBe(false);
    expect(isPreparedRouteExpired({ tradeInfo: {} }, 61_000)).toBe(false);
  });

  it("maps the SDK split amountOut revert to an actionable message", () => {
    const error = {
      message: 'missing revert data (action="estimateGas", reason="Insufficient amountOut")',
      info: { error: { message: "execution reverted: Insufficient amountOut" } },
    };

    expect(getSwapExecutionErrorMessage(error)).toBe(
      "Minimum output is no longer available. Refresh the quote or increase slippage, then retry.",
    );
  });

  it("distinguishes wallet rejection from transaction simulation failure", () => {
    expect(
      getSwapExecutionErrorMessage({ code: 4001, message: "User rejected the request" }),
    ).toBe("Transaction rejected in wallet.");
    expect(
      getSwapExecutionErrorMessage({ message: 'missing revert data (action="estimateGas")' }),
    ).toBe("Transaction simulation failed. Refresh the quote and try again.");
  });

  it("surfaces wallet context changes instead of a generic swap failure", () => {
    expect(
      getSwapExecutionErrorMessage({
        message: "Connected wallet network changed. Switch back and try again.",
      }),
    ).toBe("Wallet account or network changed. Review the swap and try again.");
  });

  it("asks for review when executable routing changes after preview", () => {
    expect(
      getSwapExecutionErrorMessage({
        message:
          "SDK route changed during preparation. Refresh and review the new route before swapping.",
      }),
    ).toBe("Route changed while preparing the swap. Refresh and review it before continuing.");
  });
});
