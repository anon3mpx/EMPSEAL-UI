import { describe, expect, it } from "vitest";
import { checkOffer, planHashOf } from "./planCheck";
import { registryProblems } from "./registryCheck";
import type { WireOffer, WireStep } from "./types";
import { CTX, makeOffer, NOW, ROUTER } from "./v2Fixtures";

const ATTACKER = "0x5555555555555555555555555555555555555555";
/** Edit the plan, then reseal it so only the edit is under test. */
function edited(edit: (o: WireOffer) => void, offer = makeOffer()): WireOffer {
  edit(offer);
  offer.execution.plan.hash = planHashOf(offer.execution.plan);
  offer.journey.hops[0]!.planHash = offer.execution.plan.hash;
  return offer;
}
const order = (o: WireOffer) => o.execution.plan.steps[1] as Extract<WireStep, { type: "typed_sign" }> & { message: Record<string, any> };
const problems = (o: WireOffer, ctx = CTX) => checkOffer(o, ctx).problems.join("; ");

describe("registry check (EMPX order plans)", () => {
  it("passes the real Permit2 witness shape against the published deployment", () => {
    expect(checkOffer(makeOffer(), CTX)).toMatchObject({ ok: true, sourceChainId: 8453 });
  });

  it("refuses a witness bound to another Permit2 or pulled by another router, even if the plan allows it", () => {
    expect(problems(edited((o) => { order(o).domain.verifyingContract = ATTACKER; }))).toMatch(/not bound to the published Permit2/);
    const router = edited((o) => {
      order(o).message.spender = ATTACKER;
      o.execution.plan.verify.allowedTargets = [ATTACKER];
    });
    expect(problems(router)).toMatch(/other than the EMPX router/);
  });

  it("refuses an unpublished rail, settler or fee recipient", () => {
    expect(problems(edited((o) => { order(o).message.witness.source.rail = ATTACKER; }))).toMatch(/rail EMPX does not publish/);
    expect(problems(edited((o) => { order(o).message.witness.destination.settler = ATTACKER; }))).toMatch(/settles through a contract/);
    expect(problems(edited((o) => { order(o).message.witness.destination.chainId = "137"; }))).toMatch(/no published deployment/);
    expect(problems(edited((o) => { order(o).message.witness.fees.feeRecipient = ATTACKER; }))).toMatch(/not EMPX's/);
  });

  it("refuses an approval to anything but the published Permit2", () => {
    const o = edited((x) => {
      (x.execution.plan.steps[0] as { spender: string }).spender = ROUTER;
      x.execution.plan.verify.allowedSpenders = [ROUTER];
    });
    expect(problems(o)).toMatch(/not for the published Permit2/);
  });

  it("refuses an EMPX order from a chain with no published deployment", () => {
    expect(registryProblems(makeOffer().execution.plan, 137, null)).toEqual(["EMPX has no published deployment on chain 137"]);
  });
});

describe("native ETH input", () => {
  const WETH = "0x4200000000000000000000000000000000000006";
  const NATIVE = "eip155:8453/slip44:60";
  const native = (over: Partial<{ to: string; data: string; value: string }> = {}) =>
    edited((o) => {
      const plan = o.execution.plan;
      plan.journey.from = { asset: NATIVE, amount: "1000000000000000", decimals: 18 };
      o.journey.input = plan.journey.from;
      plan.verify.allowedTargets = [ROUTER, WETH];
      plan.steps = [
        { id: "wrap", type: "tx", dependsOn: [], walletMode: "evm-signer", expiresAt: NOW + 600, readiness: "executable", chain: "eip155:8453", to: WETH, data: "0xd0e30db0", value: "1000000000000000", ...over },
        { ...plan.steps[0]!, dependsOn: ["wrap"], token: `eip155:8453/erc20:${WETH}`, amount: "1000000000000000" } as WireStep,
        plan.steps[1]!,
      ];
      const sign = plan.steps[2] as Extract<WireStep, { type: "typed_sign" }> & { message: Record<string, any> };
      sign.message.permitted = { token: WETH, amount: "1000000000000000" };
      sign.message.witness.source.token = WETH;
      sign.message.witness.source.amount = "1000000000000000";
    });
  const ctx = { ...CTX, fromAsset: NATIVE, amount: "1000000000000000" };

  it("accepts the one WETH deposit for exactly the input, then approve and sign WETH", () => {
    expect(checkOffer(native(), ctx).problems).toEqual([]);
  });
  it("refuses a wrap with another value, target or calldata", () => {
    expect(problems(native({ value: "2000000000000000" }), ctx)).toMatch(/sends native value/);
    expect(problems(native({ data: "0xd0e30db000" }), ctx)).toMatch(/sends native value/);
  });
});

describe("held-back routes", () => {
  const warning = () => edited((o) => { o.journey.assessment = { status: "warning", label: "High fee", reason: "fees above typical", policyVersion: "p1", executableByApiKey: false }; });
  it("pass only when checked as a held-back route", () => {
    expect(problems(warning())).toMatch(/not executable here/);
    expect(checkOffer(warning(), { ...CTX, allowHeldBack: true }).ok).toBe(true);
  });
  it("never pass when blocked", () => {
    const blocked = edited((o) => { o.journey.assessment = { status: "blocked", label: "Blocked", reason: "x", executableByApiKey: false }; });
    expect(checkOffer(blocked, { ...CTX, allowHeldBack: true }).ok).toBe(false);
  });
});

