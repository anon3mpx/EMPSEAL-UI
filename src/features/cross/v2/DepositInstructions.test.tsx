import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import DepositInstructions from "./DepositInstructions";
import type { CrossV2Client } from "./client";
import type { DepositInstruction } from "./planCheck";

const mocks = vi.hoisted(() => ({ attach: vi.fn(), copy: vi.fn(), send: vi.fn(), fee: vi.fn(), connect: vi.fn(), installed: false }));
vi.mock("./useV2Intent", () => ({ useV2Intent: () => ({ status: { status: "created" }, track: vi.fn() }) }));
vi.mock("../execution/bitcoinDeposit", () => ({ sendBitcoinDeposit: mocks.send, recommendedBtcFeeRate: mocks.fee }));
vi.mock("@/lib/wallet/adapters/impl/bitcoin", () => ({
  adapters: [
    { brand: "Unisat", isInstalled: () => mocks.installed, connect: mocks.connect },
    { brand: "Phantom", isInstalled: () => mocks.installed, connect: mocks.connect },
  ],
}));
const instruction: DepositInstruction = {
  stepId: "deposit",
  chain: "bip122:000000000019d6689c085ae165831e93",
  chainId: 0,
  address: "bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq",
  asset: "bip122:000000000019d6689c085ae165831e93/slip44:0",
  amount: "12345",
  decimals: 8,
  expiresAt: 2000000000,
};
const client = { attachReference: mocks.attach } as unknown as CrossV2Client;
beforeEach(() => {
  vi.clearAllMocks();
  mocks.installed = false;
  mocks.connect.mockReset().mockResolvedValue({ address: instruction.address });
  mocks.send.mockReset().mockResolvedValue("cd".repeat(32));
  mocks.fee.mockReset().mockResolvedValue({ rate: 8, fallback: false });
  mocks.attach.mockResolvedValue({});
  mocks.copy.mockResolvedValue(undefined);
  Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText: mocks.copy } });
});
afterEach(cleanup);
describe("deposit instructions", () => {
  it("copies the exact amount", () => {
    render(<DepositInstructions instruction={instruction} rail="garden" intentId="int_1" client={client} />);
    expect(screen.getByText("0.00012345 BTC")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Copy amount" }));
    expect(mocks.copy).toHaveBeenCalledWith("0.00012345");
  });
  it("thorchain asks for the txid", async () => {
    render(<DepositInstructions instruction={instruction} rail="thorchain" intentId="int_1" client={client} />);
    const input = screen.getByLabelText("Transaction ID");
    fireEvent.change(input, { target: { value: "abc" } });
    expect((screen.getByRole("button", { name: "Link transaction" }) as HTMLButtonElement).disabled).toBe(true);
    const txid = "ab".repeat(32);
    fireEvent.change(input, { target: { value: txid } });
    fireEvent.click(screen.getByRole("button", { name: "Link transaction" }));
    await waitFor(() => expect(mocks.attach).toHaveBeenCalledWith("int_1", txid));
  });
  it("garden needs no txid", () => {
    render(<DepositInstructions instruction={instruction} rail="garden" intentId="int_1" client={client} />);
    expect(screen.queryByLabelText("Transaction ID")).toBeNull();
  });
});

describe("BTC wallet sends", () => {
  function show(over: Partial<DepositInstruction> = {}, rail = "thorchain") {
    mocks.installed = true;
    render(
      <DepositInstructions
        instruction={{ ...instruction, memo: "=:BTC.BTC:refund", ...over }}
        rail={rail}
        intentId="int_1"
        client={client}
        sourceAddress={instruction.address}
      />,
    );
  }
  it("sends the exact instruction", async () => {
    show();
    fireEvent.click(screen.getByRole("button", { name: "Send with UniSat" }));
    await waitFor(() =>
      expect(mocks.send).toHaveBeenCalledWith({
        depositAddress: instruction.address,
        amountSats: 12345n,
        memo: "=:BTC.BTC:refund",
        sourceAddress: instruction.address,
        providerName: "unisat",
        feeRateSatsPerVb: 8,
        onBroadcasting: expect.any(Function),
      }),
    );
  });
  it("wrong wallet address stops", async () => {
    mocks.connect.mockResolvedValue({ address: "bc1qother" });
    show();
    fireEvent.click(screen.getByRole("button", { name: "Send with UniSat" }));
    await screen.findByRole("alert");
    expect(mocks.send).not.toHaveBeenCalled();
    expect(screen.getByRole("alert").textContent).toContain(`Connect the wallet for ${instruction.address}; this quote refunds to it.`);
  });
  it("thorchain txid is attached", async () => {
    show();
    fireEvent.click(screen.getByRole("button", { name: "Send with Phantom" }));
    await waitFor(() => expect(mocks.attach).toHaveBeenCalledWith("int_1", "cd".repeat(32)));
    expect(mocks.attach).toHaveBeenCalledTimes(1);
    expect((screen.getByRole("link", { name: "cd".repeat(32) }) as HTMLAnchorElement).href).toBe(
      `https://mempool.space/tx/${"cd".repeat(32)}`,
    );
  });
  it("no second send", async () => {
    show();
    fireEvent.click(screen.getByRole("button", { name: "Send with UniSat" }));
    await screen.findByRole("link", { name: "cd".repeat(32) });
    const button = screen.getByRole("button", { name: "Send with UniSat" }) as HTMLButtonElement;
    expect(button.disabled).toBe(true);
    fireEvent.click(button);
    expect(mocks.send).toHaveBeenCalledTimes(1);
  });
  it("expired quote cannot be sent", () => {
    show({ expiresAt: 1 });
    expect((screen.getByRole("button", { name: "Send with UniSat" }) as HTMLButtonElement).disabled).toBe(true);
    expect(mocks.send).not.toHaveBeenCalled();
  });
  it("reference failure never enables another deposit", async () => {
    mocks.attach.mockRejectedValue(new Error("reference offline"));
    show();
    fireEvent.click(screen.getByRole("button", { name: "Send with UniSat" }));
    await screen.findByRole("alert");
    expect((screen.getByRole("button", { name: "Send with UniSat" }) as HTMLButtonElement).disabled).toBe(true);
    expect(screen.getByRole("link", { name: "cd".repeat(32) })).toBeTruthy();
  });
  it("an error after broadcast never enables another send", async () => {
    mocks.send.mockImplementation(async (input: { onBroadcasting?: () => void }) => {
      input.onBroadcasting?.();
      throw new Error("UniSat broadcast did not return a BTC transaction id.");
    });
    show();
    fireEvent.click(screen.getByRole("button", { name: "Send with UniSat" }));
    expect((await screen.findByRole("alert")).textContent).toContain("may already have sent this deposit");
    const button = screen.getByRole("button", { name: "Send with UniSat" }) as HTMLButtonElement;
    expect(button.disabled).toBe(true);
    fireEvent.click(button);
    expect(mocks.send).toHaveBeenCalledTimes(1);
  });
  it("an error before broadcast allows a retry", async () => {
    mocks.send.mockRejectedValueOnce(new Error("Insufficient BTC balance after deposit amount and network fee."));
    show();
    fireEvent.click(screen.getByRole("button", { name: "Send with UniSat" }));
    expect((await screen.findByRole("alert")).textContent).not.toContain("may already have sent");
    expect((screen.getByRole("button", { name: "Send with UniSat" }) as HTMLButtonElement).disabled).toBe(false);
  });
});
