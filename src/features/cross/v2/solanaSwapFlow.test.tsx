import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import CrossV2Flow from "./CrossV2Flow";
import { makeOffer, NOW } from "./v2Fixtures";
import { planHashOf } from "./planCheck";
import { NON_EVM_CHAIN_IDS } from "@/lib/wallet/chainKind";
import type * as ComponentsModule from "../../../design-system/components";
import type { V2QuoteState } from "./useV2Quote";
const mocks = vi.hoisted(() => ({ quote: null as V2QuoteState | null, commit: vi.fn(), submit: vi.fn(), sign: vi.fn(), sender: "" }));
vi.mock("./client", () => ({ createCrossV2Client: () => ({ commit: mocks.commit, submitSolana: mocks.submit, solanaBalance: async () => ({ asset: "", amount: "0", decimals: null }) }) }));
vi.mock("./useV2Quote", () => ({ useV2Quote: () => mocks.quote }));
vi.mock("wagmi", () => ({ useBalance: () => ({}) }));
vi.mock("../../../design-system/hooks/useWalletConnection", () => ({ useWalletConnection: () => ({ walletState: { status: "disconnected" }, walletOptions: [], onSelectWallet: vi.fn(), disconnect: vi.fn() }) }));
vi.mock("../../../design-system/hooks/useAccountSnapshot", () => ({ useAccountSnapshot: () => ({}) }));
vi.mock("../../../design-system/hooks/useV2Balances", () => ({ useV2Balances: () => ({}) }));
vi.mock("../../../design-system/hooks/useUnifiedPrice", () => ({ useUnifiedPrice: () => null }));
vi.mock("./useV2WalletPort", () => ({ useV2WalletPort: () => null }));
vi.mock("./useV2Intent", () => ({ useV2Intent: () => ({ clear: vi.fn(), track: vi.fn(), history: [] }), claimTx: () => null }));
vi.mock("./useV2TwoHopFlow", () => ({ useV2TwoHopFlow: () => ({}) }));
vi.mock("./useSolanaSender", () => ({ useSolanaSender: () => ({ isSolana: true, sender: mocks.sender, wallet: { publicKey: () => mocks.sender, signTransaction: mocks.sign }, connect: vi.fn() }) }));
vi.mock("./useV2Corridors", () => ({ useV2Corridors: () => ({ sources: [{ id: NON_EVM_CHAIN_IDS.SOL, name: "Solana", ticker: "SOL", kind: "solana", color: "#999" }], destinationsFor: () => [{ id: NON_EVM_CHAIN_IDS.SOL, name: "Solana", ticker: "SOL", kind: "solana", color: "#999" }] }) }));
vi.mock("../../../design-system/components", async original => ({
  ...(await original<typeof ComponentsModule>()), DappNavbar: () => null, DappFooter: () => null, WalletModal: () => null, WalletButton: () => null, Toaster: () => null,
}));
afterEach(() => { vi.restoreAllMocks(); vi.clearAllMocks(); });
it("renders a Solana same-chain offer with its plan minimum and executes once through submitSolana", async () => {
  vi.spyOn(Date, "now").mockReturnValue(NOW * 1000);
  mocks.sender = "AKnL4NNf3DGWZJS6cPknBuEGnVsV4A4m5tgebLHaRSZ9";
  const chain = "solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp";
  const from = { asset: `${chain}/token:EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v`, amount: "10000000", decimals: 6 };
  const out = { asset: `${chain}/slip44:501`, amount: "9900000", decimals: 9 };
  const min = { ...out, amount: "9850000" };
  // Locally serialized unsigned v0 message with the fixture sender as fee payer.
  const payload = "AQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACAAQAAAYqI4910CfGV/VLbLTy6XXLKZwm/HZQSG/N0iAG0D29cAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA==";
  const o = makeOffer({ plan: {
    compiled: { rail: "jupiter", shape: "C" }, journey: { from, toAsset: out.asset, sender: mocks.sender, recipient: mocks.sender }, amounts: { quoted: out, minimum: min }, delivers: { asset: out.asset, minAmount: min.amount, isRequested: true }, verify: { allowedTargets: [], allowedSpenders: [], expectedRecipient: mocks.sender },
    steps: [{ id: "swap", type: "native_tx", dependsOn: [], walletMode: "solana-signer", readiness: "executable", chain, format: "solana-versioned-tx", payload, submitVia: { kind: "jupiter-execute", requestId: "jup-1" }, expiresAt: NOW + 60 }],
  } });
  o.execution.plan.hash = planHashOf(o.execution.plan);
  Object.assign(o.journey, { input: from, toAsset: out.asset, recipient: mocks.sender, expectedOutput: out, minimumOutput: min, hops: [{ order: 1, planId: o.execution.plan.id, planHash: o.execution.plan.hash, rail: "jupiter", expiresAt: NOW + 60 }] });
  mocks.quote = { state: "ready", offers: [{ offer: o, check: { ok: true, plan: o.execution.plan, sourceChainId: NON_EVM_CHAIN_IDS.SOL, problems: [] } }], gasTopUp: null, withheld: [], substitutes: [], belowMinimum: [], unfunded: null, noneReason: null, twoHop: null, degraded: false, issuedAt: null, validMs: null, error: null, forNewInput: false, streaming: false, refresh: vi.fn() };
  mocks.commit.mockResolvedValue({ intentId: "jup-intent", kind: "provider-direct" });
  mocks.sign.mockResolvedValue("signed"); mocks.submit.mockResolvedValue({ signature: "jup-signature", replayed: false });
  render(<CrossV2Flow />);
  await screen.findAllByText("Swap on Solana via Jupiter");
  expect(screen.queryByText("Pick two different chains for a cross-chain transfer.")).toBeNull();
  expect(screen.getAllByText(/0.00985 SOL/).length).toBeGreaterThan(0);
  // Select SOL as output; both chain pickers already resolved to Solana from live corridor state.
  const tokenButtons = screen.getAllByRole("button", { name: /USDC/ });
  fireEvent.click(tokenButtons[tokenButtons.length - 1]!);
  fireEvent.click(await screen.findByRole("button", { name: /SOL logo SOL Solana/ }));
  fireEvent.click(screen.getByRole("button", { name: "Review route" }));
  fireEvent.click(await screen.findByRole("button", { name: "Confirm trade" }));
  await waitFor(() => expect(mocks.submit).toHaveBeenCalledTimes(1));
  expect(mocks.sign).toHaveBeenCalledTimes(1);
  expect(mocks.submit).toHaveBeenCalledWith("jup-intent", "signed", undefined);
});
