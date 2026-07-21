import { renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { useEmpxRouter } from "./useEmpxRouter";

const mocks = vi.hoisted(() => ({
  createRouter: vi.fn(),
  signer: { sendTransaction: vi.fn() },
  walletClient: { account: { address: "0x1111111111111111111111111111111111111111" } },
}));

vi.mock("wagmi", () => ({
  useAccount: () => ({ address: mocks.walletClient.account.address }),
  useChainId: () => 42161,
  useWalletClient: () => ({ data: mocks.walletClient }),
}));

vi.mock("empx-swap-sdk", () => ({
  createRouter: mocks.createRouter,
}));

vi.mock("../../utils/swap/wagmiEthersAdapter", () => ({
  walletClientToEthersSigner: () => mocks.signer,
}));

describe("useEmpxRouter", () => {
  beforeEach(() => {
    mocks.createRouter.mockReset();
    mocks.createRouter.mockReturnValue({ provider: { name: "sdk-provider" } });
  });

  it("keeps the wallet signer separate from the SDK read router", () => {
    const { result } = renderHook(() => useEmpxRouter({ chainId: 42161 }));

    expect(mocks.createRouter).toHaveBeenCalledWith(
      42161,
      undefined,
      expect.objectContaining({ pairTypeFees: {} }),
    );
    expect(result.current.router).toEqual({
      provider: { name: "sdk-provider" },
    });
    expect(result.current.signer).toBe(mocks.signer);
  });
});
