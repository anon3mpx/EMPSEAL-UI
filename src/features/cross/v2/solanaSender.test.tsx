import { act, cleanup, renderHook } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { useSolanaSender } from "./useSolanaSender";
import { createSolanaWallet } from "./solanaWallet";
import { NON_EVM_CHAIN_IDS } from "@/lib/wallet/chainKind";
afterEach(cleanup);
it("Solana sender uses Phantom, not the EVM account; switching back preserves EVM sender", async () => {
  const address = "4vJ9JU1bJJE96FWSJKvHsmmFADCg4gpZQff4P3bkLKi";
  const provider = {
    publicKey: null as { toString(): string } | null,
    connect: async () => {
      provider.publicKey = { toString: () => address };
    },
    signTransaction: vi.fn(),
  };
  const wallet = createSolanaWallet(() => provider);
  const hook = renderHook(({ id }: { id: number }) => useSolanaSender(id, "0x1111111111111111111111111111111111111111", wallet), {
    initialProps: { id: NON_EVM_CHAIN_IDS.SOL },
  });
  expect(hook.result.current.sender).toBeUndefined();
  await act(async () => hook.result.current.connect());
  expect(hook.result.current.sender).toBe(address);
  hook.rerender({ id: 8453 });
  expect(hook.result.current.sender).toBe("0x1111111111111111111111111111111111111111");
});
it("a wallet provider whose event methods throw on access does not crash the Solana sender", async () => {
  const address = "4vJ9JU1bJJE96FWSJKvHsmmFADCg4gpZQff4P3bkLKi";
  const provider = {
    publicKey: null as { toString(): string } | null,
    connect: async () => {
      provider.publicKey = { toString: () => address };
    },
    signTransaction: vi.fn(),
  };
  // Some injected providers are Proxies that throw a TypeError when `on` or `removeListener` is read.
  for (const k of ["on", "removeListener"])
    Object.defineProperty(provider, k, { get: () => { throw new TypeError(`'get' on proxy: property '${k}' is a read-only and non-configurable data property`); } });
  const wallet = createSolanaWallet(() => provider);
  const hook = renderHook(() => useSolanaSender(NON_EVM_CHAIN_IDS.SOL, undefined, wallet));
  await act(async () => hook.result.current.connect());
  expect(hook.result.current.sender).toBe(address);
  hook.unmount();
});
it("with a Solana source and no Phantom, the user can paste a Solana address to see offers", async () => {
  const { render, screen } = await import("@testing-library/react");
  const { default: V2AddressFields } = await import("./V2AddressFields");
  const props = {
    fromChain: { id: NON_EVM_CHAIN_IDS.SOL, name: "Solana" }, toChain: { id: 8453, name: "Base" },
    sourceAddress: "", setSourceAddress: () => {}, recipient: "", setRecipient: () => {}, solana: true,
  };
  const view = render(<V2AddressFields {...props} />);
  expect(screen.getByText(/Your Solana address/)).toBeTruthy();
  view.rerender(<V2AddressFields {...props} solanaSender="4vJ9JU1bJJE96FWSJKvHsmmFADCg4gpZQff4P3bkLKi" />);
  expect(screen.queryByText(/Your Solana address/)).toBeNull();
  expect(screen.getByText(/Solana sender: 4vJ9/)).toBeTruthy();
});
