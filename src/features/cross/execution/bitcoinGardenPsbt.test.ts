import * as bitcoin from "bitcoinjs-lib";
import { describe, expect, it } from "vitest";
import { verifyGardenBitcoinPsbt } from "./bitcoinGardenPsbt";

function p2wpkh(byte: number) {
  return bitcoin.payments.p2wpkh({
    hash: new Uint8Array(20).fill(byte),
    network: bitcoin.networks.bitcoin,
  });
}

function buildFundingPsbt(input: {
  owner: bitcoin.Payment;
  deposit: bitcoin.Payment;
  txid: string;
  inputValue: bigint;
  depositAmount: bigint;
  change: bigint;
  extraOutput?: { address: string; value: bigint };
}) {
  const psbt = new bitcoin.Psbt({ network: bitcoin.networks.bitcoin });
  psbt.addInput({
    hash: input.txid,
    index: 0,
    witnessUtxo: {
      script: input.owner.output!,
      value: input.inputValue,
    },
  });
  psbt.addOutput({ address: input.deposit.address!, value: input.depositAmount });
  if (input.change > 0n) {
    psbt.addOutput({ address: input.owner.address!, value: input.change });
  }
  if (input.extraOutput) {
    psbt.addOutput(input.extraOutput);
  }
  return psbt;
}

describe("verifyGardenBitcoinPsbt", () => {
  const owner = p2wpkh(1);
  const deposit = p2wpkh(2);
  const txid = "a".repeat(64);
  const inputValue = 150000n;
  const depositAmount = 100000n;
  const fee = 2000n;
  const change = inputValue - depositAmount - fee;

  const nativeFunding = {
    runtime: "bitcoin" as const,
    unsignedTransaction: "",
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
  };

  it("accepts a deposit-plus-change PSBT funded by the selected P2WPKH set", () => {
    const psbt = buildFundingPsbt({
      owner,
      deposit,
      txid,
      inputValue,
      depositAmount,
      change,
    });

    expect(
      verifyGardenBitcoinPsbt({
        psbtBase64: psbt.toBase64(),
        ownerAddress: owner.address!,
        nativeFunding: { ...nativeFunding, unsignedTransaction: psbt.toBase64() },
      }).inputCount,
    ).toBe(1);
  });

  it("rejects a PSBT with an extra output", () => {
    const psbt = buildFundingPsbt({
      owner,
      deposit,
      txid,
      inputValue,
      depositAmount,
      change: change - 1000n,
      extraOutput: { address: p2wpkh(3).address!, value: 1000n },
    });

    expect(() =>
      verifyGardenBitcoinPsbt({
        psbtBase64: psbt.toBase64(),
        ownerAddress: owner.address!,
        nativeFunding: {
          ...nativeFunding,
          unsignedTransaction: psbt.toBase64(),
          changeAtomic: (change - 1000n).toString(),
          feeAtomic: fee.toString(),
        },
      }),
    ).toThrow(/deposit and at most one change output/i);
  });

  it("rejects a PSBT whose witness script is not the connected P2WPKH output", () => {
    const other = p2wpkh(9);
    const psbt = new bitcoin.Psbt({ network: bitcoin.networks.bitcoin });
    psbt.addInput({
      hash: txid,
      index: 0,
      witnessUtxo: { script: other.output!, value: inputValue },
    });
    psbt.addOutput({ address: deposit.address!, value: depositAmount });
    psbt.addOutput({ address: owner.address!, value: change });

    expect(() =>
      verifyGardenBitcoinPsbt({
        psbtBase64: psbt.toBase64(),
        ownerAddress: owner.address!,
        nativeFunding: { ...nativeFunding, unsignedTransaction: psbt.toBase64() },
      }),
    ).toThrow(/Native SegWit/i);
  });

  it("rejects a fee mismatch", () => {
    const psbt = buildFundingPsbt({
      owner,
      deposit,
      txid,
      inputValue,
      depositAmount,
      change,
    });

    expect(() =>
      verifyGardenBitcoinPsbt({
        psbtBase64: psbt.toBase64(),
        ownerAddress: owner.address!,
        nativeFunding: {
          ...nativeFunding,
          unsignedTransaction: psbt.toBase64(),
          feeAtomic: "1",
        },
      }),
    ).toThrow(/fee does not match/i);
  });
});
