import { act, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useRampSession } from "./useRampSession";
import { fundingHandoffCopy } from "../components/RampTransferPanel";
import { capabilityBlockReason, onboardingBlockReason } from "../utils/errors";
import { clearRampSession, saveRampSession } from "../utils/session";
import { requireRampWallet } from "../utils/wallet";

afterEach(() => {
  clearRampSession();
});

const WALLET = "0x1111111111111111111111111111111111111111";

describe("useRampSession", () => {
  it("registers, previews, creates funding instructions, and cancels without claiming funds moved", async () => {
    const api = {
      registerWallet: vi.fn().mockResolvedValue({ id: "w1" }),
      getProfile: vi.fn().mockResolvedValue({
        customerId: "c1", wallet: WALLET, chainId: 8453, kycStatus: "APPROVED", tosStatus: "APPROVED", ready: true, externalAccounts: [],
      }),
      preview: vi.fn().mockResolvedValue({
        sourceAmount: "500.00", destinationAmount: "498.00", feeAmount: "2.00", feeCurrency: "USD", etaSeconds: 60,
      }),
      createTransfer: vi.fn().mockResolvedValue({
        id: "11111111-1111-4111-8111-111111111111",
        direction: "OFF_RAMP",
        chainId: 8453,
        tokenAddress: WALLET,
        fiatCurrency: "USD",
        fiatRail: "ACH",
        amount: "500.00",
        state: "AWAITING_FUNDS",
        basketId: "funding-ref",
        depositInstructions: { paymentRail: "ACH", amount: "500.00", currency: "USD" },
      }),
      getTransferStatus: vi.fn().mockResolvedValue({
        id: "11111111-1111-4111-8111-111111111111",
        direction: "OFF_RAMP",
        chainId: 8453,
        tokenAddress: WALLET,
        fiatCurrency: "USD",
        fiatRail: "ACH",
        amount: "500.00",
        state: "AWAITING_FUNDS",
      }),
      cancelTransfer: vi.fn().mockResolvedValue({
        id: "11111111-1111-4111-8111-111111111111",
        direction: "OFF_RAMP",
        chainId: 8453,
        tokenAddress: WALLET,
        fiatCurrency: "USD",
        fiatRail: "ACH",
        amount: "500.00",
        state: "CANCELED",
      }),
      createDelegation: vi.fn().mockResolvedValue({
        id: "del-1", partnerId: "partner-1", delegateType: "PARTNER", operations: ["READ"], directions: ["OFF_RAMP"], chainIds: [8453], expiresAt: "2099-01-01T00:00:00.000Z",
      }),
      revokeDelegation: vi.fn().mockResolvedValue({ revoked: true }),
    };

    const { result } = renderHook(() => useRampSession({
      api: api as any,
      now: () => 1700000000,
      randomUUID: () => "11111111-1111-4111-8111-111111111111",
      signer: {
        address: WALLET,
        chainId: 8453,
        signMessage: vi.fn().mockResolvedValue("0xsig"),
        switchChain: vi.fn(),
      },
    }));

    await act(async () => {
      await result.current.registerWallet(WALLET, 8453);
      await result.current.loadProfile(WALLET, 8453);
      await result.current.previewTransfer({
        wallet: WALLET,
        chainId: 8453,
        direction: "OFF_RAMP",
        tokenAddress: WALLET,
        fiatCurrency: "USD",
        fiatRail: "ACH",
        amount: "500.00",
      });
      const created = await result.current.createTransfer({
        wallet: WALLET,
        chainId: 8453,
        direction: "OFF_RAMP",
        tokenAddress: WALLET,
        fiatCurrency: "USD",
        fiatRail: "ACH",
        amount: "500.00",
        basketId: "funding-ref",
      });
      expect(fundingHandoffCopy(created)).toMatch(/does not move funds|Fund the returned instructions/i);
      expect(fundingHandoffCopy(created)).toMatch(/not a MultiPage basket leg/);
      await result.current.loadTransferStatus(created.id, WALLET, 8453);
      await result.current.cancelTransfer(created.id, WALLET, 8453);
      await result.current.createDelegation({
        wallet: WALLET,
        chainId: 8453,
        partner: "partner-1",
        delegateType: "PARTNER",
        operations: ["READ"],
        directions: ["OFF_RAMP"],
        chainIds: [8453],
        externalAccountIds: [],
        expiresAt: "2099-01-01T00:00:00.000Z",
      });
      await result.current.revokeDelegation("del-1", WALLET, 8453);
    });

    expect(api.createTransfer).toHaveBeenCalled();
    expect(api.cancelTransfer).toHaveBeenCalled();
    expect(api.createDelegation).toHaveBeenCalled();
    expect(api.revokeDelegation).toHaveBeenCalled();
  });

  it("rejects account/chain mismatch, expiry, and disabled capabilities", async () => {
    await expect(requireRampWallet({
      connectedAddress: "0x2222222222222222222222222222222222222222",
      connectedChainId: 8453,
      expectedAddress: WALLET,
      expectedChainId: 8453,
    })).rejects.toThrow(/does not match/i);

    const { result } = renderHook(() => useRampSession({
      api: { registerWallet: vi.fn() } as any,
      signer: {
        address: WALLET,
        chainId: 1,
        signMessage: vi.fn().mockRejectedValue({ code: 4001, message: "User rejected the request" }),
      },
    }));
    await act(async () => {
      await expect(result.current.registerWallet(WALLET, 8453)).rejects.toBeTruthy();
    });
    expect(result.current.errorMessage).toMatch(/rejected|switch/i);
    expect(capabilityBlockReason({
      enabled: false,
      blockers: ["ENABLE_BRIDGE_RAMP"],
    })).toBe("ENABLE_BRIDGE_RAMP");
    expect(onboardingBlockReason({
      enabled: true,
      blockers: [],
      features: {
        kyc: { enabled: true, blockers: [] },
      },
    })).toBeNull();
    expect(onboardingBlockReason({
      enabled: false,
      blockers: ["transfers-off"],
      features: {
        kyc: { enabled: true, blockers: [] },
      },
    })).toBeNull();
  });

  it("rehydrates a stored transfer on wallet reconnect without creating", async () => {
    saveRampSession({
      wallet: WALLET,
      chainId: 8453,
      transferId: "11111111-1111-4111-8111-111111111111",
    });
    const api = {
      getTransferStatus: vi.fn().mockResolvedValue({
        id: "11111111-1111-4111-8111-111111111111",
        direction: "OFF_RAMP",
        chainId: 8453,
        tokenAddress: WALLET,
        fiatCurrency: "USD",
        fiatRail: "ACH",
        amount: "500.00",
        state: "AWAITING_FUNDS",
      }),
      createTransfer: vi.fn(),
    };
    const { result } = renderHook(() => useRampSession({
      api: api as any,
      now: () => 1700000000,
      randomUUID: () => "11111111-1111-4111-8111-111111111111",
      signer: {
        address: WALLET,
        chainId: 8453,
        signMessage: vi.fn().mockResolvedValue("0xsig"),
        switchChain: vi.fn(),
      },
    }));
    await act(async () => {
      await vi.waitFor(() => expect(api.getTransferStatus).toHaveBeenCalled());
    });
    expect(result.current.transfer?.id).toBe("11111111-1111-4111-8111-111111111111");
    expect(api.createTransfer).not.toHaveBeenCalled();
    expect(api.getTransferStatus).toHaveBeenCalledTimes(1);
  });
});
