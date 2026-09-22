import * as bitcoin from "bitcoinjs-lib";
import type { GardenNativeFunding, GardenNativeUtxo } from "../api/contracts";
import { GARDEN_BTC_NATIVE_SEGWIT_REASON } from "../model/capabilities";

export function verifyGardenBitcoinPsbt(input: {
  psbtBase64: string;
  ownerAddress: string;
  nativeFunding: GardenNativeFunding;
}): bitcoin.Psbt {
  const ownerScript = p2wpkhOutputScript(input.ownerAddress);
  const psbt = parseGardenPsbt(input.psbtBase64);
  const fundingInputs = Array.isArray(input.nativeFunding.fundingInputs)
    ? input.nativeFunding.fundingInputs
    : null;

  if (psbt.inputCount < 1) {
    throw new Error("Garden BTC PSBT has no inputs.");
  }

  let inputSum = 0n;
  for (let index = 0; index < psbt.inputCount; index += 1) {
    const txInput = psbt.txInputs[index];
    const update = psbt.data.inputs[index];
    const witnessScript = update?.witnessUtxo?.script;
    if (!witnessScript || !bytesEqual(witnessScript, ownerScript)) {
      throw new Error("Garden BTC PSBT input is not the connected Native SegWit (bc1q) output.");
    }
    const outpoint = `${txidFromHash(txInput.hash)}:${txInput.index}`;
    if (fundingInputs && !fundingInputs.some((utxo) => matchesOutpoint(utxo, outpoint))) {
      throw new Error(`Garden BTC PSBT input ${outpoint} was not part of the funded UTXO set.`);
    }
    const value = toBigInt(update.witnessUtxo?.value);
    if (value === null || value <= 0n) {
      throw new Error(`Garden BTC PSBT input ${outpoint} is missing a confirmed value.`);
    }
    inputSum += value;
  }

  const outputs = psbt.txOutputs;
  if (outputs.length < 1 || outputs.length > 2) {
    throw new Error("Garden BTC PSBT must pay the deposit and at most one change output.");
  }

  const depositAddress = readRequiredString(
    input.nativeFunding.depositAddress,
    "Garden BTC deposit address",
  );
  const depositAmount = readRequiredBigInt(
    input.nativeFunding.depositAmount,
    "Garden BTC deposit amount",
  );
  const depositOutput = outputs[0];
  if (outputAddress(depositOutput) !== depositAddress || toBigInt(depositOutput.value) !== depositAmount) {
    throw new Error("Garden BTC PSBT does not pay the expected deposit output.");
  }

  const changeAtomic = readOptionalBigInt(input.nativeFunding.changeAtomic) ?? 0n;
  if (changeAtomic === 0n) {
    if (outputs.length !== 1) {
      throw new Error("Garden BTC PSBT includes unexpected change.");
    }
  } else {
    if (outputs.length !== 2) {
      throw new Error("Garden BTC PSBT is missing the owner change output.");
    }
    const changeOutput = outputs[1];
    if (
      outputAddress(changeOutput) !== input.ownerAddress ||
      toBigInt(changeOutput.value) !== changeAtomic
    ) {
      throw new Error("Garden BTC PSBT change must return to the owner for the expected amount.");
    }
  }

  const outputSum = outputs.reduce((sum, output) => sum + (toBigInt(output.value) ?? 0n), 0n);
  const feeAtomic = readRequiredBigInt(input.nativeFunding.feeAtomic, "Garden BTC fee");
  if (inputSum - outputSum !== feeAtomic) {
    throw new Error("Garden BTC PSBT fee does not match the prepared native funding.");
  }

  return psbt;
}

function parseGardenPsbt(psbtBase64: string): bitcoin.Psbt {
  if (typeof psbtBase64 !== "string" || !psbtBase64.trim()) {
    throw new Error("Garden BTC PSBT is missing.");
  }
  try {
    return bitcoin.Psbt.fromBase64(psbtBase64.trim(), { network: bitcoin.networks.bitcoin });
  } catch {
    throw new Error("Garden BTC PSBT is malformed.");
  }
}

function p2wpkhOutputScript(address: string): Uint8Array {
  const script = bitcoin.address.toOutputScript(address, bitcoin.networks.bitcoin);
  if (script.length !== 22 || script[0] !== 0x00 || script[1] !== 0x14) {
    throw new Error(GARDEN_BTC_NATIVE_SEGWIT_REASON);
  }
  return script;
}

function matchesOutpoint(utxo: GardenNativeUtxo, outpoint: string): boolean {
  return `${utxo.txid.toLowerCase()}:${utxo.vout}` === outpoint;
}

function txidFromHash(hash: Uint8Array | Buffer): string {
  return Buffer.from(hash).reverse().toString("hex");
}

function outputAddress(output: { address?: string; script: Uint8Array }): string {
  if (typeof output.address === "string" && output.address) return output.address;
  try {
    return bitcoin.address.fromOutputScript(output.script, bitcoin.networks.bitcoin);
  } catch {
    throw new Error("Garden BTC PSBT output address is invalid.");
  }
}

function bytesEqual(left: Uint8Array, right: Uint8Array): boolean {
  if (left.length !== right.length) return false;
  for (let index = 0; index < left.length; index += 1) {
    if (left[index] !== right[index]) return false;
  }
  return true;
}

function toBigInt(value: unknown): bigint | null {
  if (typeof value === "bigint") return value;
  if (typeof value === "number" && Number.isSafeInteger(value)) return BigInt(value);
  if (typeof value === "string" && /^(0|[1-9]\d*)$/.test(value.trim())) return BigInt(value.trim());
  return null;
}

function readRequiredString(value: unknown, label: string): string {
  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`${label} is required.`);
  }
  return value.trim();
}

function readRequiredBigInt(value: unknown, label: string): bigint {
  const parsed = toBigInt(value);
  if (parsed === null) {
    throw new Error(`${label} is required.`);
  }
  return parsed;
}

function readOptionalBigInt(value: unknown): bigint | null {
  if (value === undefined || value === null || value === "") return null;
  return toBigInt(value);
}
