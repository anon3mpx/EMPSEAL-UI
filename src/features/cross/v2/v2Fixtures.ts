// Test fixture: a sealed direct CCTP offer shaped like the V2 API's /v2/quote answer (Base -> Arbitrum USDC, 1 USDC), with the Permit2
// witness order the CCTP adapter builds (empx-core/server packages/adapters/cctp/src/lib/order.ts permitTypedData) and the published contracts.
import { planHashOf } from "./planCheck";
import { EMPX_DEPLOYMENTS } from "./deployments";
import type { JourneyQuote, WireOffer, WirePlan } from "./types";

export const SENDER = "0x1111111111111111111111111111111111111111";
export const RECIPIENT = "0x2222222222222222222222222222222222222222";
const BASE = EMPX_DEPLOYMENTS[8453]!;
export const ROUTER = BASE.router;
export const PERMIT2 = BASE.permit2;
export const SRC_USDC = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";
export const FROM_ASSET = `eip155:8453/erc20:${SRC_USDC.toLowerCase()}`;
export const TO_ASSET = "eip155:42161/erc20:0xaf88d065e77c8cc2239327c5edb3a432268e5831";
export const NOW = 1_800_000_000;
const amt = (asset: string, amount: string) => ({ asset, amount, decimals: 6 });

export function makeOffer(over: { plan?: Partial<WirePlan>; journey?: Partial<JourneyQuote> } = {}): WireOffer {
  const base: Omit<WirePlan, "hash"> = {
    schemaVersion: 1,
    version: 1,
    id: "plan-1",
    expiresAt: NOW + 600,
    journey: { from: amt(FROM_ASSET, "1000000"), toAsset: TO_ASSET, recipient: RECIPIENT },
    compiled: { rail: "cctp", shape: "A" },
    amounts: { quoted: amt(TO_ASSET, "990000"), minimum: amt(TO_ASSET, "985000") },
    delivers: { asset: TO_ASSET, minAmount: "985000", isRequested: true },
    guarantee: { tier: 1, assumptions: [], settlementGuarantee: "none", output: "firm_minimum" },
    steps: [
      { id: "approve-1", type: "approve", dependsOn: [], walletMode: "evm-signer", expiresAt: NOW + 600, readiness: "executable", chain: "eip155:8453", token: FROM_ASSET, spender: PERMIT2, amount: "1000000" },
      {
        id: "order-1", type: "typed_sign", purpose: "empx-order", dependsOn: ["approve-1"], walletMode: "evm-signer", expiresAt: NOW + 600, readiness: "executable",
        domain: { name: "Permit2", chainId: 8453, verifyingContract: PERMIT2 },
        types: { PermitWitnessTransferFrom: [{ name: "permitted", type: "TokenPermissions" }, { name: "spender", type: "address" }, { name: "witness", type: "Order" }] },
        primaryType: "PermitWitnessTransferFrom",
        message: {
          permitted: { token: SRC_USDC, amount: "1000000" },
          spender: ROUTER,
          nonce: "1",
          deadline: String(NOW + 600),
          witness: {
            user: SENDER,
            recipient: RECIPIENT,
            source: { token: SRC_USDC, amount: "1000000", rail: BASE.rails.cctp.rail },
            destination: { chainId: "42161", settler: EMPX_DEPLOYMENTS[42161]!.rails.cctp.settler },
            fees: { feeRecipient: BASE.feeRecipient },
          },
        },
      },
    ],
    verify: { allowedTargets: [ROUTER], allowedSpenders: [PERMIT2], expectedRecipient: RECIPIENT },
    fees: { maxTotalBps: 100, breakdown: [] },
    ...over.plan,
  };
  const plan = { ...base, hash: "" } as WirePlan;
  plan.hash = planHashOf(plan);
  const journey: JourneyQuote = {
    version: 1,
    mode: "direct",
    input: amt(FROM_ASSET, "1000000"),
    toAsset: TO_ASSET,
    recipient: RECIPIENT,
    expectedOutput: amt(TO_ASSET, "990000"),
    minimumOutput: amt(TO_ASSET, "985000"),
    outputGuarantee: "firm_minimum",
    fallback: null,
    minimumBasis: "journey",
    fees: {
      items: [],
      empx: { amounts: [amt(FROM_ASSET, "3000")], bps: 30, capBps: 100, withinCap: true },
      providerBridge: { amounts: [amt(FROM_ASSET, "5000")], bps: 50 },
      relayerGas: { amounts: [amt(FROM_ASSET, "2000")], bps: 20 },
      allIn: { bps: 100, ceilingBps: 150, hardCeilingBps: 150, withinCeiling: true },
    },
    slippage: { toleranceBps: 50, origin: "default" },
    tier: 1,
    hops: [{ order: 1, planId: plan.id, planHash: plan.hash, rail: "cctp", expiresAt: NOW + 600 }],
    expiresAt: NOW + 600,
    hash: "j".repeat(64),
    assessment: { status: "acceptable", label: "Acceptable", reason: "", executableByApiKey: true },
    etaSec: 60,
    ranking: null,
    ...over.journey,
  };
  return { rank: 1, journey, execution: { plan } };
}
export const CTX = { fromAsset: FROM_ASSET, amount: "1000000", toAsset: TO_ASSET, sender: SENDER, recipient: RECIPIENT, now: NOW };
