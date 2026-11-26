import { NON_EVM_CHAIN_IDS } from "@/lib/wallet/chainKind";
import type { WireStep } from "./types";

/** Same-chain execution is supported only for swaps on Solana; EVM behavior is unchanged. */
export function allowSameChain(fromChainId: number, toChainId: number): boolean {
  return fromChainId === NON_EVM_CHAIN_IDS.SOL && toChainId === NON_EVM_CHAIN_IDS.SOL;
}

/** Bind each supported Solana rail to its committed server submission mechanism. */
export function solanaSubmissionMatches(rail: string, submitVia: Extract<WireStep, { type: "native_tx" }>["submitVia"] | undefined): boolean {
  return rail === "cctp-from-solana" || rail === "thorchain" ? submitVia?.kind === "rpc"
    : rail === "jupiter" && submitVia?.kind === "jupiter-execute" && typeof submitVia.requestId === "string" && submitVia.requestId.trim().length > 0;
}
