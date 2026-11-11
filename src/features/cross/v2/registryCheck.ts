// Checks an EMPX order plan against the published deployment (deployments.ts), not against itself: the order is signed for the registered
// Permit2 or router, pays the registered fee recipient, and leaves and lands through registered rails and settlers. Mirrors the parts of the
// server verifier (packages/verify typedData.ts, orderFields.ts) a wallet prompt depends on. Plans without an EMPX order are not checked here.
import { EMPX_DEPLOYMENTS, PERMIT2_DOMAIN_NAME, ROUTER_DOMAIN, type EmpxChainDeployment } from "./deployments";
import type { WirePlan, WireStep } from "./types";

const eq = (a: unknown, b: unknown) => typeof a === "string" && typeof b === "string" && a.toLowerCase() === b.toLowerCase();
const isObj = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);
const anyRail = (d: EmpxChainDeployment, key: "rail" | "settler", v: unknown) => Object.values(d.rails).some((r) => eq(r[key], v));

const WETH_DEPOSIT = "0xd0e30db0";
const isNativeEth = (asset: string) => /\/slip44:60$/.test(asset);

/** The ERC-20 an order spends: the sent token, or the canonical WETH a native-ETH input is wrapped into first. */
export function orderInputToken(fromAsset: string, srcId: number): string | null {
  if (isNativeEth(fromAsset)) return EMPX_DEPLOYMENTS[srcId]?.wrappedNative ?? null;
  return /\/erc20:(0x[0-9a-fA-F]{40})$/.exec(fromAsset)?.[1] ?? null;
}

/** A native-ETH order's one wallet wrap: WETH.deposit() for exactly the input, first, with nothing depending on anything else first. */
export function isNativeWrap(plan: WirePlan, s: WireStep, srcId: number): boolean {
  const weth = EMPX_DEPLOYMENTS[srcId]?.wrappedNative;
  return (
    s.type === "tx" && Boolean(weth) && isNativeEth(plan.journey.from.asset) && plan.journey.from.decimals === 18 && eq(s.to, weth) &&
    s.data.toLowerCase() === WETH_DEPOSIT && s.value === plan.journey.from.amount && s.dependsOn.length === 0 &&
    (plan.steps as WireStep[]).filter((x) => x.type === "tx").length === 1
  );
}

/** Problems found; empty when the plan has no EMPX order or every bound contract is the published one. */
export function registryProblems(plan: WirePlan, srcId: number, sourceToken: string | null): string[] {
  const orders = (plan.steps as WireStep[]).filter(
    (s): s is Extract<WireStep, { type: "typed_sign" }> => s.type === "typed_sign" && s.purpose === "empx-order" && s.walletMode !== "server",
  );
  if (orders.length === 0) return [];
  const out: string[] = [];
  const bad = (m: string) => void out.push(m);
  const src = EMPX_DEPLOYMENTS[srcId];
  if (!src) return [`EMPX has no published deployment on chain ${srcId}`];
  if (plan.fees.feeRecipient !== undefined && !eq(plan.fees.feeRecipient, src.feeRecipient)) bad("the plan's fee recipient is not EMPX's");

  for (const s of orders) {
    const domain = s.domain as { name?: unknown; version?: unknown; chainId?: unknown; verifyingContract?: unknown };
    const msg = s.message;
    let order: Record<string, unknown> | null = null;
    if (src.mode === "permit2") {
      if (s.primaryType !== "PermitWitnessTransferFrom") bad(`signature ${s.id} is not a Permit2 witness, which this chain's router takes`);
      if (domain.name !== PERMIT2_DOMAIN_NAME || !eq(domain.verifyingContract, src.permit2) || Number(domain.chainId) !== srcId)
        bad(`signature ${s.id} is not bound to the published Permit2`);
      if (!eq(msg.spender, src.router)) bad(`signature ${s.id} lets a contract other than the EMPX router pull the funds`);
      const permitted = msg.permitted as { token?: unknown } | undefined;
      if (sourceToken && !eq(permitted?.token, sourceToken)) bad(`signature ${s.id} permits a token other than the one being sent`);
      order = isObj(msg.witness) ? msg.witness : null;
    } else {
      if (s.primaryType !== "Order") bad(`signature ${s.id} is not a plain Order, which this chain's router takes`);
      if (domain.name !== ROUTER_DOMAIN.name || domain.version !== ROUTER_DOMAIN.version || !eq(domain.verifyingContract, src.router) || Number(domain.chainId) !== srcId)
        bad(`signature ${s.id} is not bound to the published EMPX router`);
      order = msg;
    }
    if (!order) {
      bad(`signature ${s.id} carries no order`);
      continue;
    }
    const source = isObj(order.source) ? order.source : {};
    const dest = isObj(order.destination) ? order.destination : {};
    const fees = isObj(order.fees) ? order.fees : {};
    if (!anyRail(src, "rail", source.rail)) bad(`signature ${s.id} leaves through a rail EMPX does not publish on chain ${srcId}`);
    if (sourceToken && !eq(source.token, sourceToken)) bad(`signature ${s.id} spends a token other than the one being sent`);
    const dst = EMPX_DEPLOYMENTS[Number(dest.chainId)];
    if (!dst) bad(`signature ${s.id} settles on a chain where EMPX has no published deployment`);
    else if (!anyRail(dst, "settler", dest.settler)) bad(`signature ${s.id} settles through a contract EMPX does not publish`);
    if (!eq(fees.feeRecipient, src.feeRecipient)) bad(`signature ${s.id} pays fees to an address that is not EMPX's`);
  }

  // An approval in an EMPX order plan is for Permit2 (permit2 mode) or the router (allowance mode), nothing else.
  const spender = src.mode === "permit2" ? src.permit2 : src.router;
  for (const s of plan.steps as WireStep[]) {
    if (s.type === "approve" && s.walletMode !== "server" && !eq(s.spender, spender)) bad(`approve ${s.id} is not for the published ${src.mode === "permit2" ? "Permit2" : "EMPX router"}`);
  }
  return out;
}
