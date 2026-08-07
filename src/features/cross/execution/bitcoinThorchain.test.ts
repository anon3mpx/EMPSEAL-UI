import { describe, expect, it, vi } from "vitest";
import * as bitcoin from "bitcoinjs-lib";
import {
  executeBitcoinThorchainIntent,
  type PhantomBtcProvider,
  type UniSatBtcProvider,
} from "./bitcoinThorchain";

function p2wpkhAddress(byte: number) {
  return bitcoin.payments.p2wpkh({
    hash: new Uint8Array(20).fill(byte),
    network: bitcoin.networks.bitcoin,
  }).address!;
}

describe("executeBitcoinThorchainIntent", () => {
  it("builds a THORChain BTC PSBT, signs it with UniSat, and broadcasts it", async () => {
    const sourceAddress = p2wpkhAddress(1);
    const depositAddress = p2wpkhAddress(2);
    const pushedTxid = "c".repeat(64);
    let unsignedPsbtHex = "";
    let signOptions: any;

    const provider: UniSatBtcProvider = {
      getNetwork: vi.fn().mockResolvedValue("livenet"),
      getAccounts: vi.fn().mockResolvedValue([sourceAddress]),
      getBitcoinUtxos: vi.fn().mockResolvedValue([
        {
          txid: "a".repeat(64),
          vout: 0,
          satoshis: "125000",
        },
      ]),
      signPsbt: vi.fn().mockImplementation(async (psbtHex, options) => {
        unsignedPsbtHex = psbtHex;
        signOptions = options;
        return psbtHex;
      }),
      pushPsbt: vi.fn().mockResolvedValue(pushedTxid),
    };

    await expect(
      executeBitcoinThorchainIntent({
        sourceAddress,
        providerName: "Unisat",
        provider,
        integration: {
          mode: "provider_direct",
          action: {
            kind: "thorchain_swap",
            depositAddress,
            memo: "=:e:0x1111111111111111111111111111111111111111",
            amountIn: "100000",
            recommendedGasRate: "4",
          },
        },
      }),
    ).resolves.toBe(pushedTxid);

    const psbt = bitcoin.Psbt.fromHex(unsignedPsbtHex, {
      network: bitcoin.networks.bitcoin,
    });
    expect(psbt.inputCount).toBe(1);
    expect(psbt.txOutputs[0].address).toBe(depositAddress);
    expect(psbt.txOutputs[0].value).toBe(100000n);
    expect(psbt.txOutputs[1].script[0]).toBe(0x6a);
    expect(psbt.txOutputs[2].address).toBe(sourceAddress);
    expect(signOptions).toEqual({
      autoFinalized: true,
      toSignInputs: [{ index: 0, address: sourceAddress }],
    });
    expect(provider.pushPsbt).toHaveBeenCalledWith(unsignedPsbtHex);
  });

  it("builds a THORChain BTC PSBT, signs it with Phantom, and broadcasts the finalized transaction", async () => {
    const sourceAddress = p2wpkhAddress(1);
    const depositAddress = p2wpkhAddress(2);
    const broadcastTxid = "d".repeat(64);
    let unsignedPsbtBytes: Uint8Array | undefined;
    let signOptions: any;

    const provider: PhantomBtcProvider = {
      signPSBT: vi.fn().mockImplementation(async (psbtBytes, options) => {
        unsignedPsbtBytes = psbtBytes;
        signOptions = options;
        return Uint8Array.from([1, 2, 3]);
      }),
    };
    const loadUtxos = vi.fn().mockResolvedValue([
      {
        txid: "b".repeat(64),
        vout: 1,
        value: "130000",
      },
    ]);
    const finalizeSignedPsbt = vi.fn().mockReturnValue("0200000000");
    const broadcastRawTransaction = vi.fn().mockResolvedValue(broadcastTxid);

    await expect(
      executeBitcoinThorchainIntent({
        sourceAddress,
        providerName: "Phantom",
        provider,
        loadUtxos,
        finalizeSignedPsbt,
        broadcastRawTransaction,
        integration: {
          mode: "provider_direct",
          action: {
            kind: "thorchain_swap",
            depositAddress,
            memo: "=:e:0x1111111111111111111111111111111111111111",
            amountIn: "100000",
            recommendedGasRate: "4",
          },
        },
      }),
    ).resolves.toBe(broadcastTxid);

    expect(loadUtxos).toHaveBeenCalledWith(sourceAddress);
    expect(unsignedPsbtBytes).toBeInstanceOf(Uint8Array);
    const psbt = bitcoin.Psbt.fromBuffer(unsignedPsbtBytes!, {
      network: bitcoin.networks.bitcoin,
    });
    expect(psbt.inputCount).toBe(1);
    expect(psbt.txOutputs[0].address).toBe(depositAddress);
    expect(psbt.txOutputs[0].value).toBe(100000n);
    expect(psbt.txOutputs[1].script[0]).toBe(0x6a);
    expect(psbt.txOutputs[2].address).toBe(sourceAddress);
    expect(signOptions).toEqual({
      inputsToSign: [{ address: sourceAddress, signingIndexes: [0] }],
    });
    expect(finalizeSignedPsbt).toHaveBeenCalledWith(Uint8Array.from([1, 2, 3]));
    expect(broadcastRawTransaction).toHaveBeenCalledWith("0200000000");
  });

  it("fails closed for unsupported BTC wallets", async () => {
    await expect(
      executeBitcoinThorchainIntent({
        sourceAddress: p2wpkhAddress(1),
        providerName: "Xverse",
        provider: {
          signPsbt: vi.fn(),
          pushPsbt: vi.fn(),
        },
        integration: {
          mode: "provider_direct",
          action: {
            kind: "thorchain_swap",
            depositAddress: p2wpkhAddress(2),
            memo: "=:e:0x1111111111111111111111111111111111111111",
            amountIn: "100000",
          },
        },
      }),
    ).rejects.toThrow(/unsupported BTC wallet/i);
  });
});
