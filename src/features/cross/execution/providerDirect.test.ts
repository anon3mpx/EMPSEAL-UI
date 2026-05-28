import { describe, expect, it } from "vitest";
import {
  classifyProviderDirectAction,
  mergeLayerZeroUserSteps,
} from "./providerDirect";

describe("classifyProviderDirectAction", () => {
  it("accepts tx-based EVM provider-direct payloads nested under action", () => {
    expect(
      classifyProviderDirectAction({
        action: {
          kind: "gaszip_transfer",
          tx: { to: "0x1", data: "0x", value: "0" },
        },
      }),
    ).toBe("evm_tx");
  });

  it("accepts tx-based EVM provider-direct payloads returned at the top level", () => {
    expect(
      classifyProviderDirectAction({
        action: {
          kind: "gaszip_transfer",
        },
        tx: { to: "0x1", data: "0x", value: "0" },
      }),
    ).toBe("evm_tx");
  });

  it("flags non-EVM source steps as unsupported in phase 1", () => {
    expect(
      classifyProviderDirectAction({
        action: {
          kind: "layerzero_value_transfer_api",
          userSteps: [{ type: "svm_send_transaction" }],
        },
      }),
    ).toBe("unsupported");
  });

  it("rejects LayerZero steps that do not expose a wallet tx or signable message", () => {
    expect(
      classifyProviderDirectAction({
        action: {
          kind: "layerzero_value_transfer_api",
          userSteps: [{ type: "evm_unknown_step", payload: { foo: "bar" } }],
        },
      }),
    ).toBe("unsupported");
  });

  it("accepts refreshed LayerZero tx envelopes before execution", () => {
    const integration = mergeLayerZeroUserSteps(
      {
        mode: "provider_direct",
        action: {
          kind: "layerzero_value_transfer_api",
          requiresFreshUserSteps: true,
          userSteps: [],
        },
      },
      {
        userSteps: [
          {
            type: "evm_send_transaction",
            payload: {
              transaction: { to: "0x1", data: "0x", value: "0" },
            },
          },
        ],
      },
    );

    expect(classifyProviderDirectAction(integration)).toBe("layerzero_steps");
  });

  it("accepts LayerZero EVM steps when the transaction is nested under encoded", () => {
    expect(
      classifyProviderDirectAction({
        mode: "provider_direct",
        action: {
          kind: "layerzero_value_transfer_api",
          userSteps: [
            {
              type: "TRANSACTION",
              chainType: "EVM",
              transaction: {
                encoded: {
                  to: "0x7e07A9148E9149e430C6412b79A675028595Ff1f",
                  data: "0x571d3dc7",
                  value: "222235909405157",
                  chainId: 8453,
                },
              },
            },
          ],
        },
      }),
    ).toBe("layerzero_steps");
  });
});
