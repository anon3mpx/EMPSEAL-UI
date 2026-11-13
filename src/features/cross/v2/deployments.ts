// EMPX's own mainnet deployment, as a reviewed static copy: the plan names a router, a Permit2, rails and settlers, and the page believes none
// of them unless they are listed here (mirrors the server verifier's registry, ruflo empx-core packages/verify registry.ts).
// Source: ruflo empx-core/config/deployments.mainnet.json, profileRevision 3776067 (generated 2026-11-04); wrappedNative from
// empx-core/server/packages/chain-profile/src/native.ts. Update by hand, with review,
// whenever that file changes: a stale copy refuses routes rather than accepting the wrong contracts.

export type EmpxContractRail = "cctp" | "ccip" | "layerzero";

export interface EmpxChainDeployment {
  chainId: number;
  router: string;
  permit2: string;
  /** `permit2`: the user signs a Permit2 witness; `allowance`: a plain Order in the router's own domain. */
  mode: "permit2" | "allowance";
  feeRecipient: string;
  /** Canonical wrapped native token: a native-ETH order wraps into it first (chain-profile native.ts). */
  wrappedNative: string;
  rails: Readonly<Record<EmpxContractRail, { rail: string; settler: string }>>;
  /** EMPX aggregator: the only contract a provider plan's source swap may call (`aggregator` in deployments.mainnet.json). */
  aggregator: string;
}

const ROUTER = "0x848dE3C533f70E24a5d6E637B1f7f995228E704F";
const PERMIT2 = "0x000000000022D473030F116dDEE9F6B43aC78BA3";
const FEE_RECIPIENT = "0x9A611d7a2dc613661213Ea9D1163285f450c495B";
const RAILS: EmpxChainDeployment["rails"] = {
  cctp: { rail: "0x07989D8A8f1B2555b18d3657d84cFFaC361f731E", settler: "0x65d055fBAD2F19BEDf78b6fc95f82851BAeb1417" },
  ccip: { rail: "0x1Ea2EcF43aEDA18Ceb9633ED712D4A5747a95E43", settler: "0xe2fC27Bc817209060328D477Ac4796b070E9D111" },
  layerzero: { rail: "0xCd3d6236DD407437631BEe426219e49B4DBBfBf5", settler: "0xE7E60c405fA983ef95Aa4246043DE61dAFa8924D" },
};

export const EMPX_DEPLOYMENTS: Readonly<Record<number, EmpxChainDeployment>> = {
  10: { chainId: 10, router: ROUTER, permit2: PERMIT2, mode: "permit2", feeRecipient: FEE_RECIPIENT, wrappedNative: "0x4200000000000000000000000000000000000006", rails: RAILS, aggregator: "0x686c652d079A370eC97F93B2b4805Ee06aE25d04" },
  8453: { chainId: 8453, router: ROUTER, permit2: PERMIT2, mode: "permit2", feeRecipient: FEE_RECIPIENT, wrappedNative: "0x4200000000000000000000000000000000000006", rails: RAILS, aggregator: "0xB12b7C117434B58B7623f994F4D0b4af7BC0Ac37" },
  42161: { chainId: 42161, router: ROUTER, permit2: PERMIT2, mode: "permit2", feeRecipient: FEE_RECIPIENT, wrappedNative: "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1", rails: RAILS, aggregator: "0xA7772cDBA7739F19dcaE85fe0357929790FD23F9" },
};

/** EIP-712 domain names the router and Permit2 declare (`EIP712("EMPX Router", "2")`). */
export const ROUTER_DOMAIN = { name: "EMPX Router", version: "2" } as const;
export const PERMIT2_DOMAIN_NAME = "Permit2";
