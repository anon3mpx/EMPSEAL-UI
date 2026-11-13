import * as bitcoin from "bitcoinjs-lib";
import { describe, expect, it, vi } from "vitest";
import { recommendedBtcFeeRate, sendBitcoinDeposit, type UniSatBtcProvider } from "./bitcoinDeposit";

const sourceAddress = bitcoin.payments.p2wpkh({ hash: new Uint8Array(20).fill(1) }).address!;
const depositAddress = bitcoin.payments.p2wpkh({ hash: new Uint8Array(20).fill(2) }).address!;
function setup() {
  let psbtHex = "";
  const provider: UniSatBtcProvider = {
    getNetwork: vi.fn().mockResolvedValue("livenet"),
    getAccounts: vi.fn().mockResolvedValue([sourceAddress]),
    getBitcoinUtxos: vi.fn().mockResolvedValue([{ txid: "ab".repeat(32), vout: 0, value: "125000" }]),
    signPsbt: vi.fn(async (hex) => {
      psbtHex = hex;
      return hex;
    }),
    pushPsbt: vi.fn().mockResolvedValue("cd".repeat(32)),
  };
  return {
    provider,
    psbt: () => bitcoin.Psbt.fromHex(psbtHex),
    input: { depositAddress, amountSats: 12345n, sourceAddress, providerName: "unisat" as const, feeRateSatsPerVb: 8, provider },
  };
}
describe("Bitcoin deposits", () => {
  it("signals broadcasting after signing and before the push", async () => {
    const s = setup();
    const order: string[] = [];
    vi.mocked(s.provider.signPsbt).mockImplementation(async (hex) => (order.push("sign"), hex));
    vi.mocked(s.provider.pushPsbt).mockImplementation(async () => (order.push("push"), "cd".repeat(32)));
    await sendBitcoinDeposit({ ...s.input, onBroadcasting: () => order.push("broadcasting") });
    expect(order).toEqual(["sign", "broadcasting", "push"]);
  });
  it("a rejected signature never signals broadcasting", async () => {
    const s = setup();
    vi.mocked(s.provider.signPsbt).mockRejectedValue(new Error("User rejected"));
    const onBroadcasting = vi.fn();
    await expect(sendBitcoinDeposit({ ...s.input, onBroadcasting })).rejects.toThrow("User rejected");
    expect(onBroadcasting).not.toHaveBeenCalled();
  });
  it("no memo means no OP_RETURN", async () => {
    const s = setup();
    await sendBitcoinDeposit(s.input);
    expect(s.psbt().txOutputs.map((o) => o.address)).toEqual([depositAddress, sourceAddress]);
    expect(s.psbt().txOutputs.some((o) => o.script[0] === 0x6a)).toBe(false);
  });
  it("memo adds one zero-value OP_RETURN", async () => {
    const s = setup();
    await sendBitcoinDeposit({ ...s.input, memo: "=:BTC.BTC:refund" });
    const outputs = s.psbt().txOutputs;
    expect(outputs.map((o) => o.address)).toEqual([depositAddress, undefined, sourceAddress]);
    expect(outputs[1]!.script[0]).toBe(0x6a);
    expect(outputs[1]!.value).toBe(0n);
  });
  it("deposit output pays the exact amount", async () => {
    const s = setup();
    await sendBitcoinDeposit(s.input);
    expect(s.psbt().txOutputs[0]!.value).toBe(12345n);
  });
  it("refuses a non-witness source", async () => {
    const s = setup();
    const legacy = bitcoin.payments.p2pkh({ hash: new Uint8Array(20).fill(3) }).address!;
    await expect(sendBitcoinDeposit({ ...s.input, sourceAddress: legacy })).rejects.toThrow(/SegWit/);
    expect(s.provider.signPsbt).not.toHaveBeenCalled();
  });
  it("refuses memos over 80 bytes", async () => {
    const s = setup();
    await expect(sendBitcoinDeposit({ ...s.input, memo: "a".repeat(81) })).rejects.toThrow(/memo.*large/i);
    expect(s.provider.signPsbt).not.toHaveBeenCalled();
  });
  it("fee rate floor", async () => {
    const fetcher = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ fastestFee: 3 }) });
    expect(await recommendedBtcFeeRate(fetcher)).toEqual({ rate: 8, fallback: false });
    fetcher.mockRejectedValue(new Error("offline"));
    expect(await recommendedBtcFeeRate(fetcher)).toEqual({ rate: 8, fallback: true });
  });
});
