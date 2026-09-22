import * as bitcoin from "bitcoinjs-lib";
import { describe, expect, it, vi } from "vitest";
import { executeGardenBitcoinIntent, type UniSatBtcProvider } from "./bitcoinGarden";

function p2wpkh(byte: number) {
  return bitcoin.payments.p2wpkh({
    hash: new Uint8Array(20).fill(byte),
    network: bitcoin.networks.bitcoin,
  });
}

describe("executeGardenBitcoinIntent", () => {
  const owner = p2wpkh(1);
  const deposit = p2wpkh(2);
  const txid = "a".repeat(64);
  const inputValue = 150000n;
  const depositAmount = 100000n;
  const fee = 2000n;
  const change = inputValue - depositAmount - fee;

  function gardenIntegration() {
    const psbt = new bitcoin.Psbt({ network: bitcoin.networks.bitcoin });
    psbt.addInput({
      hash: txid,
      index: 0,
      witnessUtxo: { script: owner.output!, value: inputValue },
    });
    psbt.addOutput({ address: deposit.address!, value: depositAmount });
    psbt.addOutput({ address: owner.address!, value: change });

    return {
      mode: "provider_direct" as const,
      action: { kind: "garden_htlc_order" as const },
      nativeFunding: {
        runtime: "bitcoin" as const,
        unsignedTransaction: psbt.toBase64(),
        depositAddress: deposit.address!,
        depositAmount: depositAmount.toString(),
        changeAtomic: change.toString(),
        feeAtomic: fee.toString(),
        fundingInputs: [
          {
            txid,
            vout: 0,
            valueSats: inputValue.toString(),
            scriptPubKey: Buffer.from(owner.output!).toString("hex"),
          },
        ],
      },
    };
  }

  it("rejects Taproot source wallets before signing", async () => {
    await expect(
      executeGardenBitcoinIntent({
        integration: gardenIntegration(),
        sourceAddress: owner.address!,
        addressType: "p2tr",
        providerName: "Unisat",
        provider: {
          signPsbt: vi.fn(),
          pushPsbt: vi.fn(),
        },
      }),
    ).rejects.toThrow(/Native SegWit \(bc1q\)/);
  });

  it("verifies, signs, and broadcasts a Garden BTC PSBT with UniSat", async () => {
    const pushedTxid = "d".repeat(64);
    const provider: UniSatBtcProvider = {
      getNetwork: vi.fn().mockResolvedValue("livenet"),
      getAccounts: vi.fn().mockResolvedValue([owner.address!]),
      signPsbt: vi.fn().mockImplementation(async (psbtHex) => psbtHex),
      pushPsbt: vi.fn().mockResolvedValue(pushedTxid),
    };

    await expect(
      executeGardenBitcoinIntent({
        integration: gardenIntegration(),
        sourceAddress: owner.address!,
        addressType: "p2wpkh",
        providerName: "Unisat",
        provider,
      }),
    ).resolves.toBe(pushedTxid);
    expect(provider.signPsbt).toHaveBeenCalled();
    expect(provider.pushPsbt).toHaveBeenCalled();
  });
});
