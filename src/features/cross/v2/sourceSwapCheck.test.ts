import { encodeFunctionData, parseAbi } from "viem";
import { describe, expect, it } from "vitest";
import { EMPX_DEPLOYMENTS } from "./deployments";
import { checkOffer, planHashOf } from "./planCheck";
import type { WireOffer, WireStep } from "./types";
import { CTX, FROM_ASSET, makeOffer, NOW, SENDER } from "./v2Fixtures";

const AGG = EMPX_DEPLOYMENTS[8453]!.aggregator;
const PROVIDER = "0x6666666666666666666666666666666666666666";
const WETH = "0x4200000000000000000000000000000000000006";
const RAIL_ASSET = `eip155:8453/erc20:${WETH}`;
const USDC = FROM_ASSET.split("erc20:")[1]!;
const SWAP = parseAbi(["function swapNoSplit((uint256 amountIn, uint256 amountOut, address[] path, address[] adapters) _trade, address _to, uint256 _fee)"]);
const step = (over: Partial<WireStep> & Record<string, unknown>) =>
  ({ dependsOn: [], walletMode: "evm-signer", expiresAt: NOW + 600, readiness: "executable", chain: "eip155:8453", ...over }) as WireStep;
const swapData = (o: { amountIn?: bigint; min?: bigint; to?: string; last?: string } = {}) =>
  encodeFunctionData({
    abi: SWAP,
    functionName: "swapNoSplit",
    args: [{ amountIn: o.amountIn ?? 1_000_000n, amountOut: o.min ?? 900n, path: [USDC as `0x${string}`, (o.last ?? WETH) as `0x${string}`], adapters: [PROVIDER] }, (o.to ?? SENDER) as `0x${string}`, 30n],
  });

/** The server's swap-first provider plan: approve + swap on the aggregator, then the rail's approve of the swapped token and its transfer. */
function swapFirstOffer(o: { data?: string; railApprove?: string; swapTo?: string } = {}): WireOffer {
  const offer = makeOffer();
  const plan = offer.execution.plan;
  plan.compiled = { rail: "hyperlane", shape: "B" };
  plan.verify = { allowedTargets: [PROVIDER, o.swapTo ?? AGG], allowedSpenders: [PROVIDER, AGG], expectedRecipient: plan.verify.expectedRecipient };
  plan.valueLegs = [{ leg: "source_swap", input: { asset: FROM_ASSET, amount: "1000000", decimals: 6 }, output: { asset: RAIL_ASSET, amount: "950", decimals: 18 } }];
  plan.steps = [
    step({ id: "source-approve", type: "approve", token: FROM_ASSET, spender: AGG, amount: "1000000" }),
    step({ id: "source-swap", type: "tx", dependsOn: ["source-approve"], to: o.swapTo ?? AGG, data: o.data ?? swapData(), value: "0" }),
    step({ id: "approve", type: "approve", dependsOn: ["source-swap"], token: RAIL_ASSET, spender: PROVIDER, amount: o.railApprove ?? "900" }),
    step({ id: "transfer-remote", type: "tx", dependsOn: ["approve"], to: PROVIDER, data: "0x1234", value: "0" }),
    step({ id: "wait", type: "wait", dependsOn: ["transfer-remote"], walletMode: "server", readiness: "informational", until: "delivered" }),
  ];
  plan.hash = planHashOf(plan);
  offer.journey.hops[0]!.planHash = plan.hash;
  return offer;
}
const problems = (o: WireOffer) => checkOffer(o, CTX).problems.join("; ");

describe("swap-first provider plans", () => {
  it("accepts a swap on EMPX's aggregator followed by an approval of the swapped token up to the swap's minimum", () => {
    expect(checkOffer(swapFirstOffer(), CTX)).toMatchObject({ ok: true, problems: [] });
  });
  it("refuses a swap that pays another address, spends a different amount, or ends in another token", () => {
    expect(problems(swapFirstOffer({ data: swapData({ to: PROVIDER }) }))).toMatch(/pays someone other than the connected wallet/);
    expect(problems(swapFirstOffer({ data: swapData({ amountIn: 999_999n }) }))).toMatch(/does not spend exactly/);
    expect(problems(swapFirstOffer({ data: swapData({ last: PROVIDER }) }))).toMatch(/does not end in the token the plan bridges/);
  });
  it("refuses an approval of the swapped token above the swap's minimum", () => {
    expect(problems(swapFirstOffer({ railApprove: "901" }))).toMatch(/approve approve is not an exact amount/);
  });
  it("refuses a source swap on a contract that is not EMPX's aggregator", () => {
    expect(problems(swapFirstOffer({ swapTo: PROVIDER }))).toMatch(/not one swap on EMPX's aggregator/);
  });
});
