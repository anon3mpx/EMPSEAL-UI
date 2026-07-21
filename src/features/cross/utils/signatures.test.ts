import { describe, expect, it } from "vitest";
import { buildRefundMessage, buildSubmittedMessage } from "./signatures";

describe("cross signatures", () => {
  it("matches the submitted plaintext contract exactly", () => {
    expect(
      buildSubmittedMessage({
        intentId: "0xintent",
        wallet: "0xWallet",
        timestamp: 1740000000000,
        srcTxHash: "0xhash",
      }),
    ).toBe(
      "EMPX-Cross-Chain intent submitted\nintentId:0xintent\nwallet:0xWallet\ntimestamp:1740000000000\nsrcTxHash:0xhash",
    );
  });

  it("includes the refund reason line", () => {
    expect(
      buildRefundMessage({
        intentId: "0xintent",
        wallet: "0xWallet",
        timestamp: 1740000000000,
        reason: "bridge stuck",
      }),
    ).toContain("reason:bridge stuck");
  });
});
