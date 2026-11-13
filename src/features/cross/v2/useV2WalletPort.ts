// Adapts wagmi to the executor's WalletPort. The wallet signs and sends; this app holds no key.
import { useMemo } from "react";
import { useConfig } from "wagmi";
import { getTransactionReceipt, getWalletClient, readContract, switchChain } from "wagmi/actions";
import { erc20Abi } from "viem";
import type { WalletPort } from "./execute";
import { reviveTypedMessage } from "./typedData";

export function useV2WalletPort(address: string | undefined): WalletPort | null {
  const config = useConfig();
  return useMemo(() => {
    if (!address) return null;
    const client = (chainId: number) => getWalletClient(config, { chainId });
    return {
      address,
      ensureChain: async (chainId: number) => {
        await switchChain(config, { chainId: chainId as never });
      },
      allowance: (chainId, token, spender) =>
        readContract(config as never, {
          chainId: chainId as never,
          address: token as `0x${string}`,
          abi: erc20Abi,
          functionName: "allowance",
          args: [address as `0x${string}`, spender as `0x${string}`],
        } as never) as Promise<bigint>,
      receiptLogs: async (chainId, hash) => {
        const r = await getTransactionReceipt(config as never, { chainId: chainId as never, hash: hash as `0x${string}` } as never);
        return (r as { logs: Array<{ address: string; topics: readonly string[] }> }).logs.map((l) => ({ address: l.address, topics: l.topics }));
      },
      sendTransaction: async ({ chainId, to, data, value }) => {
        const wc = await client(chainId);
        const hash = await wc.sendTransaction({
          account: address as `0x${string}`,
          chain: wc.chain,
          to: to as `0x${string}`,
          data: data as `0x${string}`,
          value,
        } as never);
        return { hash };
      },
      signTypedData: async ({ domain, types, primaryType, message }) => {
        const chainId = Number((domain as { chainId?: unknown }).chainId);
        const wc = await client(chainId);
        return wc.signTypedData({
          account: address as `0x${string}`,
          domain: { ...domain, chainId } as never,
          types: types as never,
          primaryType: primaryType as never,
          message: reviveTypedMessage(types, primaryType, message) as never,
        } as never);
      },
    } satisfies WalletPort;
  }, [config, address]);
}
