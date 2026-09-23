import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import GasPage from "./GasPage";

const wallet = vi.hoisted(() => ({ send: vi.fn(), balance: 1000000000000000000n }));
vi.mock("wagmi", () => ({
  useBalance: () => ({ data: { value: wallet.balance, formatted: "1" } }),
  useAccount: () => ({ chainId: 42161 }),
  useWalletClient: () => ({ data: {} }),
  useSwitchChain: () => ({ switchChainAsync: vi.fn() }),
  useSendTransaction: () => ({ sendTransactionAsync: wallet.send, isPending: false }),
  useWaitForTransactionReceipt: () => ({}),
}));
vi.mock("../hooks/useWalletConnection", () => ({ useWalletConnection: () => ({
  walletState: { status: "connected", address: "0x1111111111111111111111111111111111111111", chain: { id: 42161, name: "Arbitrum", color: "#28A0F0" } }, walletOptions: [],
}) }));
vi.mock("../hooks/useV2Balances", () => ({ useV2Balances: () => ({ tokenBalances: {} }) }));
vi.mock("../hooks/useAccountSnapshot", () => ({ useAccountSnapshot: () => ({ status: "ready", balanceUSD: 0, tokens: [], networks: [] }) }));
vi.mock("../../hooks/useGasBridgeAPI", () => {
  const data = { transaction: { to: "0x2222222222222222222222222222222222222222", data: "0x1234", value: "1578200000000000" } };
  const chains = [{ chain: 42161, name: "Arbitrum", symbol: "ETH", inbound: true }, { chain: 8453, name: "Base", symbol: "ETH", inbound: true }];
  return {
    useGetChains: () => ({ data: chains }),
    useGetCalldataQuote: () => ({ data }),
    useGetUserHistory: () => ({}),
    useSearchTransaction: () => ({}),
  };
});
vi.mock("../components", async (importOriginal) => ({
  ...await importOriginal<any>(),
  DappNavbar: () => null,
  DappFooter: () => null,
  useIsMobile: () => false,
}));

async function confirm() {
  fireEvent.click(screen.getAllByRole("button", { name: /Send gas to/i })[0]);
  await act(async () => { fireEvent.click(screen.getByRole("button", { name: "Confirm trade" })); });
}

describe("GasPage wallet handoff", () => {
  beforeEach(() => { wallet.send.mockReset(); wallet.balance = 1000000000000000000n; });

  it("renders source and destination chain identities instead of empty frames", () => {
    render(<GasPage />);
    const arbitrum = screen.getAllByRole("img", { name: "ARB logo" });
    const base = screen.getAllByRole("img", { name: "BAS logo" });
    expect(arbitrum.length).toBeGreaterThan(0);
    expect(base.length).toBeGreaterThan(0);
    expect(arbitrum[0]).toHaveAttribute("src", "/icons/arbitrum.svg");
    expect(base[0]).toHaveAttribute("src", "/icons/base.svg");
    expect(screen.getAllByText("Base").length).toBeGreaterThan(0);
  });

  it("keeps the send form while awaiting the wallet and opens lookup only after submission", async () => {
    let resolve!: (hash: string) => void;
    wallet.send.mockImplementation(() => new Promise<string>((done) => { resolve = done; }));
    render(<GasPage />);
    await confirm();
    expect(screen.getByText("Confirm gas top-up")).toBeInTheDocument();
    await act(async () => { resolve(`0x${"a".repeat(64)}`); });
    await waitFor(() => expect(screen.queryByText("Confirm gas top-up")).not.toBeInTheDocument());
    expect(screen.getByDisplayValue(`0x${"a".repeat(64)}`)).toBeInTheDocument();
  });

  it("shows wallet errors and keeps the send form available for retry", async () => {
    wallet.send.mockRejectedValue(new Error("Insufficient funds for gas"));
    render(<GasPage />);
    await confirm();
    await waitFor(() => expect(screen.getByText("Insufficient funds for gas")).toBeInTheDocument());
    expect(screen.getByText("Confirm gas top-up")).toBeInTheDocument();
  });

  it("explains an insufficient source balance before requesting the wallet", async () => {
    wallet.balance = 780000000000000n;
    render(<GasPage />);
    fireEvent.click(screen.getAllByRole("button", { name: /Send gas to/i })[0]);
    expect(await screen.findByText(/Insufficient ETH balance/i)).toBeInTheDocument();
    expect(wallet.send).not.toHaveBeenCalled();
  });
});
