import { describe, expect, it } from "vitest";
import { canonicalize, hashRampPayload, rampActionMessage, unsignedRampAction } from "./signatures";

const WALLET = "0x111111111111111111111111111111111111AaAa";

describe("ramp signatures", () => {
  it("canonicalizes object order and lowercases EVM addresses only", () => {
    expect(
      hashRampPayload({ b: ["1.00", { address: WALLET }], a: 1, omitted: undefined }),
    ).toBe(
      hashRampPayload({ a: 1, b: ["1.00", { address: WALLET.toLowerCase() }] }),
    );
    expect(hashRampPayload({ amount: "1.00" })).not.toBe(hashRampPayload({ amount: "1.0" }));
    expect(canonicalize({ z: WALLET, a: "not-an-address" })).toEqual({
      a: "not-an-address",
      z: WALLET.toLowerCase(),
    });
  });

  it("matches the Ruflo EMPX Ramp v1 plaintext exactly", () => {
    const unsigned = unsignedRampAction({
      action: "REGISTER_WALLET",
      wallet: WALLET,
      chainId: 8453,
      payload: { wallet: WALLET, chainId: 8453 },
      nonce: "nonce-1",
      timestamp: 1700000000,
      expiresAt: 1700000120,
    });
    expect(rampActionMessage(unsigned)).toBe(
      [
        "EMPX Ramp v1",
        "REGISTER_WALLET",
        WALLET.toLowerCase(),
        "8453",
        unsigned.payloadHash,
        "nonce-1",
        "1700000000",
        "1700000120",
      ].join("\n"),
    );
    expect(unsigned.payloadHash).toBe(
      "0x00bd8685c0a47be359f2489e571550b0325f86e1d0ab81bc51bb127b3e78e406",
    );
  });
});
