import { describe, expect, it, vi } from "vitest";
import {
  executeProviderApprovals,
  findMissingProviderApprovals,
  readProviderApprovalRequests,
} from "./approvals";

const TOKEN = "0x1111111111111111111111111111111111111111";
const SPENDER = "0x2222222222222222222222222222222222222222";

describe("provider-direct approvals", () => {
  it("uses the exact approval amount returned by the selected integration", () => {
    expect(
      readProviderApprovalRequests(
        {
          mode: "provider_direct",
          approvals: [{ token: TOKEN, spender: SPENDER, amount: "900" }],
          tx: {
            to: SPENDER,
            data: "0x",
            value: "0",
            chainId: 8453,
          },
        },
        8453,
      ),
    ).toEqual([
      {
        tokenAddress: TOKEN,
        spender: SPENDER,
        amount: 900n,
        chainId: 8453,
      },
    ]);
  });

  it("rejects malformed approval requests instead of silently executing", () => {
    expect(() =>
      readProviderApprovalRequests(
        {
          mode: "provider_direct",
          approvals: [{ token: "not-an-address", spender: SPENDER, amount: "1" }],
        },
        8453,
      ),
    ).toThrow(/invalid provider approval token/i);
  });

  it("uses the source chain from an action-nested provider transaction", () => {
    expect(
      readProviderApprovalRequests(
        {
          mode: "provider_direct",
          approvals: [{ token: TOKEN, spender: SPENDER, amount: "900" }],
          action: {
            kind: "hyperlane_transfer_remote",
            tx: {
              to: SPENDER,
              data: "0x",
              value: "0",
              chainId: 42161,
            },
          },
        },
        8453,
      ),
    ).toEqual([
      {
        tokenAddress: TOKEN,
        spender: SPENDER,
        amount: 900n,
        chainId: 42161,
      },
    ]);
  });

  it("checks every allowance and returns only missing approvals", async () => {
    const readAllowance = vi
      .fn()
      .mockResolvedValueOnce(899n)
      .mockResolvedValueOnce(1_000n);
    const requests = [
      { tokenAddress: TOKEN, spender: SPENDER, amount: 900n, chainId: 8453 },
      {
        tokenAddress: "0x3333333333333333333333333333333333333333",
        spender: SPENDER,
        amount: 900n,
        chainId: 8453,
      },
    ];

    await expect(
      findMissingProviderApprovals(requests, "0x4444444444444444444444444444444444444444", readAllowance),
    ).resolves.toEqual([requests[0]]);
    expect(readAllowance).toHaveBeenCalledTimes(2);
  });

  it("waits for exact approvals before allowing provider execution", async () => {
    const events: string[] = [];
    const request = {
      tokenAddress: TOKEN,
      spender: SPENDER,
      amount: 900n,
      chainId: 8453,
    };

    await executeProviderApprovals([request], {
      ensureChain: async () => events.push("chain"),
      approve: async (approval) => {
        expect(approval.amount).toBe(900n);
        events.push("approve");
        return "0xhash";
      },
      waitForConfirmation: async () => events.push("confirmed"),
    });

    expect(events).toEqual(["chain", "approve", "confirmed"]);
  });
});
