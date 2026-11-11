// A provider plan may first swap the input into the rail's token in the user's own wallet (server: runtime/src/providerRails/sourceSwap.ts).
// The page accepts that swap only on EMPX's published aggregator, as one swapNoSplit that spends exactly the input, pays the connected
// wallet, and ends in the token the plan then approves and bridges. Anything else is refused before the wallet is asked.
import { decodeFunctionData, parseAbi } from "viem";
import { EMPX_DEPLOYMENTS } from "./deployments";
import type { WirePlan, WireStep } from "./types";

const SWAP_ABI = parseAbi([
  "function swapNoSplit((uint256 amountIn, uint256 amountOut, address[] path, address[] adapters) _trade, address _to, uint256 _fee)",
]);
const eq = (a: unknown, b: unknown) => typeof a === "string" && typeof b === "string" && a.toLowerCase() === b.toLowerCase();

export interface SourceSwap {
  stepId: string;
  /** CAIP-19 of the token the swap delivers (the rail's token). */
  outputAsset: string;
  /** The swap's signed minimum output: the most a later approval of `outputAsset` may cover. */
  minimum: bigint;
}

/** The plan's source swap, or null when it has none. Problems go to `bad`; a malformed swap also returns null. */
export function sourceSwapOf(
  plan: WirePlan,
  ctx: { srcId: number; srcChain: string; input: bigint | null; fromAsset: string; sender: string },
  bad: (m: string) => void,
): SourceSwap | null {
  const agg = EMPX_DEPLOYMENTS[ctx.srcId]?.aggregator;
  const leg = plan.valueLegs?.find((l) => l.leg === "source_swap");
  const calls = (plan.steps as WireStep[]).filter(
    (s): s is Extract<WireStep, { type: "tx" }> => s.type === "tx" && s.walletMode !== "server" && agg !== undefined && eq(s.to, agg),
  );
  if (!leg && calls.length === 0) return null;
  if (!leg || calls.length !== 1) {
    bad("the plan's source swap is not one swap on EMPX's aggregator");
    return null;
  }
  const s = calls[0]!;
  const out = leg.output?.asset;
  if (leg.input?.asset !== ctx.fromAsset) bad("the source swap does not start from the asset being sent");
  if (typeof out !== "string" || !out.startsWith(`${ctx.srcChain}/erc20:`)) {
    bad("the source swap does not deliver a token on the source chain");
    return null;
  }
  let args;
  try {
    args = decodeFunctionData({ abi: SWAP_ABI, data: s.data as `0x${string}` }).args;
  } catch {
    bad(`transaction ${s.id} is not an aggregator swap`);
    return null;
  }
  const [trade, to] = args;
  if (!eq(to, ctx.sender)) bad(`swap ${s.id} pays someone other than the connected wallet`);
  if (ctx.input !== null && trade.amountIn !== ctx.input) bad(`swap ${s.id} does not spend exactly the amount being sent`);
  if (trade.amountOut <= 0n) bad(`swap ${s.id} has no minimum output`);
  if (!eq(trade.path[trade.path.length - 1], out.split("erc20:")[1])) bad(`swap ${s.id} does not end in the token the plan bridges`);
  if (s.value !== "0") bad(`swap ${s.id} sends native value`);
  return { stepId: s.id, outputAsset: out, minimum: trade.amountOut };
}
