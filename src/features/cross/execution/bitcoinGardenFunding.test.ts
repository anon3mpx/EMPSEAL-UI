import * as bitcoin from "bitcoinjs-lib";
import { describe, expect, it } from "vitest";
import { collectGardenBitcoinSourceFunding } from "./bitcoinGardenFunding";

function p2wpkhAddress(byte: number) {
  return bitcoin.payments.p2wpkh({
    hash: new Uint8Array(20).fill(byte),
    network: bitcoin.networks.bitcoin,
  }).address!;
}

describe("collectGardenBitcoinSourceFunding", () => {
  it("omits unconfirmed UTXOs and returns confirmed P2WPKH funding", async () => {
    const ownerAddress = p2wpkhAddress(1);
    const confirmedTxid = "a".repeat(64);
    const unconfirmedTxid = "b".repeat(64);
    const funding = await collectGardenBitcoinSourceFunding({
      ownerAddress,
      loadUtxos: async () => [
        {
          txid: confirmedTxid,
          vout: 0,
          value: 150000,
          status: { confirmed: true, block_height: 800000 },
        },
        {
          txid: unconfirmedTxid,
          vout: 1,
          value: 80000,
          status: { confirmed: false },
        },
        {
          txid: "c".repeat(64),
          vout: 2,
          satoshis: "90000",
          confirmations: 0,
        },
      ],
      loadFeeRate: async () => 12.4,
    });

    expect(funding).toEqual({
      runtime: "bitcoin",
      utxos: [
        {
          txid: confirmedTxid,
          vout: 0,
          valueSats: "150000",
          scriptPubKey: Buffer.from(
            bitcoin.address.toOutputScript(ownerAddress, bitcoin.networks.bitcoin),
          ).toString("hex"),
          confirmations: 1,
        },
      ],
      feeRateSatVbyte: 12,
      replaceByFee: true,
      changeAddress: ownerAddress,
    });
  });
});
