import { describe, expect, it } from "vitest";
import * as routerIntent from "./routerIntent";

describe("router intent execution helpers", () => {
  it("adds a 2% buffer to payable router-intent executions", () => {
    expect(
      (routerIntent as any).toSendTransactionArgs({
        contractAddress: "0x10c9db3761056d752bc41ac817f730f9e4348bb0",
        calldata: "0xdeadbeef",
        value: "35602447135001",
      }),
    ).toEqual({
      to: "0x10c9db3761056d752bc41ac817f730f9e4348bb0",
      data: "0xdeadbeef",
      value: 36314496077702n,
    });
  });

  it("does not change zero native value for router-intent executions", () => {
    expect(
      (routerIntent as any).toSendTransactionArgs({
        contractAddress: "0x10c9db3761056d752bc41ac817f730f9e4348bb0",
        calldata: "0xdeadbeef",
        value: "0",
      }),
    ).toEqual({
      to: "0x10c9db3761056d752bc41ac817f730f9e4348bb0",
      data: "0xdeadbeef",
      value: 0n,
    });
  });

  it("builds an ERC-20 approval request for router-backed intents", () => {
    expect(typeof (routerIntent as any).getRequiredRouterIntentApproval).toBe(
      "function",
    );

    const approval = (routerIntent as any).getRequiredRouterIntentApproval({
      quote: {
        tokenIn: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
        amountIn: "250000",
        srcChainId: 8453,
      },
      integration: {
        mode: "router_intent",
        integration: {
          contractAddress: "0x10c9db3761056d752bc41ac817f730f9e4348bb0",
          calldata: "0xdeadbeef",
          value: "0",
        },
      },
    });

    expect(approval).toEqual({
      tokenAddress: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
      spender: "0x10c9db3761056d752bc41ac817f730f9e4348bb0",
      amount: 250000n,
      chainId: 8453,
    });
  });

  it("skips approval for native-token router intents", () => {
    expect(typeof (routerIntent as any).getRequiredRouterIntentApproval).toBe(
      "function",
    );

    const approval = (routerIntent as any).getRequiredRouterIntentApproval({
      quote: {
        tokenIn: "0x0000000000000000000000000000000000000000",
        amountIn: "1000000000000000",
        srcChainId: 8453,
      },
      integration: {
        mode: "router_intent",
        integration: {
          contractAddress: "0x10c9db3761056d752bc41ac817f730f9e4348bb0",
          calldata: "0xdeadbeef",
          value: "1000000000000000",
        },
      },
    });

    expect(approval).toBeNull();
  });

  it("detects expired router-intent payloads from nested integration metadata", () => {
    expect(typeof (routerIntent as any).isRouterIntentExpired).toBe(
      "function",
    );

    expect(
      (routerIntent as any).isRouterIntentExpired(
        {
          mode: "router_intent",
          integration: {
            contractAddress: "0x10c9db3761056d752bc41ac817f730f9e4348bb0",
            calldata: "0xdeadbeef",
            value: "0",
            expiresAt: 1_740_000_000_000,
          },
        },
        1_740_000_000_001,
      ),
    ).toBe(true);

    expect(
      (routerIntent as any).isRouterIntentExpired(
        {
          mode: "router_intent",
          integration: {
            contractAddress: "0x10c9db3761056d752bc41ac817f730f9e4348bb0",
            calldata: "0xdeadbeef",
            value: "0",
            expiresAt: 1_740_000_000_000,
          },
        },
        1_739_999_999_999,
      ),
    ).toBe(false);
  });

  it("treats second-based router-intent expiries as valid future timestamps", () => {
    expect(
      (routerIntent as any).getRouterIntentExpiresAt({
        mode: "router_intent",
        integration: {
          expiresAt: 1_740_000_000,
        },
      }),
    ).toBe(1_740_000_000_000);

    expect(
      (routerIntent as any).isRouterIntentExpired(
        {
          mode: "router_intent",
          integration: {
            expiresAt: 1_740_000_000,
          },
        },
        1_739_999_999_000,
      ),
    ).toBe(false);
  });
});
