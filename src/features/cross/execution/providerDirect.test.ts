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
          tx: {
            to: "0x1111111111111111111111111111111111111111",
            data: "0x",
            value: "0",
            chainId: 8453,
          },
        },
      }),
    ).toBe("evm_transaction");
  });

  it("accepts tx-based EVM provider-direct payloads returned at the top level", () => {
    expect(
      classifyProviderDirectAction({
        action: {
          kind: "gaszip_transfer",
        },
        tx: {
          to: "0x1111111111111111111111111111111111111111",
          data: "0x",
          value: "0",
          chainId: 8453,
        },
      }),
    ).toBe("evm_transaction");
  });

  it("flags non-EVM source steps as requiring a compatible wallet", () => {
    expect(
      classifyProviderDirectAction({
        action: {
          kind: "layerzero_value_transfer_api",
          userSteps: [{ type: "svm_send_transaction" }],
        },
      }),
    ).toBe("non_evm_wallet_required");
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

  it("never classifies a Bitcoin deposit address as an EVM transaction", () => {
    expect(
      classifyProviderDirectAction({
        action: { kind: "maya_swap", depositAddress: "bc1qexample" },
        tx: {
          to: "bc1qexample",
          data: "0x",
          value: "1000",
          chainId: 0,
        },
      }),
    ).toBe("non_evm_wallet_required");
  });

  it("rejects an EVM tx when its chain does not match the selected source", () => {
    expect(
      classifyProviderDirectAction(
        {
          action: { kind: "gaszip_transfer" },
          tx: {
            to: "0x1111111111111111111111111111111111111111",
            data: "0x",
            value: "0",
            chainId: 8453,
          },
        },
        { selectedSourceChainId: 42161 },
      ),
    ).toBe("unsupported");
  });

  it("keeps Chainflip quote-only even if stale helper data contains a tx", () => {
    expect(
      classifyProviderDirectAction({
        action: { kind: "chainflip_deposit" },
        tx: {
          to: "0x1111111111111111111111111111111111111111",
          data: "0x",
          value: "0",
          chainId: 8453,
        },
      }),
    ).toBe("quote_only");
  });

  it("rejects Optimism withdrawals by product policy", () => {
    expect(
      classifyProviderDirectAction({
        action: {
          kind: "optimism_standard_bridge",
          direction: "withdraw",
        },
        tx: {
          to: "0x1111111111111111111111111111111111111111",
          data: "0x",
          value: "0",
          chainId: 10,
        },
      }),
    ).toBe("unsupported");
  });
});
