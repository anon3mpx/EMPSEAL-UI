import * as bitcoin from "bitcoinjs-lib";

const BTC_DUST_SATS = 546n;
const MAX_MEMO_BYTES = 80;
const DEFAULT_FEE_RATE_SATS_PER_VBYTE = 8;
type BtcUtxo = {
  txid: string;
  vout: number;
  value: bigint;
};

export type UniSatBtcProvider = {
  getNetwork?: () => Promise<string>;
  getAccounts?: () => Promise<string[]>;
  getBitcoinUtxos?: () => Promise<unknown[]>;
  getUnspentOutputs?: () => Promise<unknown[]>;
  signPsbt: (
    psbtHex: string,
    options?: {
      autoFinalized?: boolean;
      toSignInputs?: Array<{
        index: number;
        address?: string;
        useTweakedSigner?: boolean;
      }>;
    },
  ) => Promise<string>;
  pushPsbt: (psbtHex: string) => Promise<string>;
};

type PhantomBtcAccount = {
  address: string;
  purpose?: "payment" | "ordinals" | string;
};

export type PhantomBtcProvider = {
  requestAccounts?: () => Promise<PhantomBtcAccount[]>;
  signPSBT: (
    psbt: Uint8Array,
    options: {
      inputsToSign: Array<{
        address: string;
        signingIndexes: number[];
        sigHash?: number;
      }>;
    },
  ) => Promise<Uint8Array>;
};

type BtcExecutionProvider = UniSatBtcProvider | PhantomBtcProvider;
declare global {
  interface Window {
    unisat?: UniSatBtcProvider;
    phantom?: {
      bitcoin?: PhantomBtcProvider;
    };
  }
}

export interface BitcoinDepositInput {
  depositAddress: string;
  amountSats: bigint;
  memo?: string;
  feeRateSatsPerVb: number;
  sourceAddress: string;
  providerName: "unisat" | "phantom";
  provider?: UniSatBtcProvider | PhantomBtcProvider;
  loadUtxos?: (address: string) => Promise<unknown[]>;
  finalizeSignedPsbt?: (signedPsbt: Uint8Array) => string;
  broadcastRawTransaction?: (rawTxHex: string) => Promise<string>;
  /** Preserve a V1 provider's quoted dust threshold. */
  dustThresholdSats?: bigint;
  /** Called just before the signed transaction is broadcast. After this, a thrown error does not mean nothing was sent. */
  onBroadcasting?: () => void;
}

export async function sendBitcoinDeposit({
  depositAddress,
  amountSats,
  memo: memoText,
  feeRateSatsPerVb,
  sourceAddress,
  providerName,
  provider,
  loadUtxos = fetchBitcoinUtxos,
  finalizeSignedPsbt = finalizeBitcoinPsbt,
  broadcastRawTransaction = broadcastBitcoinRawTransaction,
  dustThresholdSats = BTC_DUST_SATS,
  onBroadcasting,
}: BitcoinDepositInput): Promise<string> {
  if (amountSats <= 0n) throw new Error("BTC deposit amount must be greater than zero.");
  if (!Number.isFinite(feeRateSatsPerVb) || feeRateSatsPerVb <= 0) throw new Error("BTC fee rate must be positive.");
  const sourceScript = getWitnessSourceScript(sourceAddress);
  const inputVBytes = estimateWitnessInputVBytes(sourceScript);
  const memo = Uint8Array.from(new TextEncoder().encode(memoText ?? ""));
  if (memo.length > MAX_MEMO_BYTES) {
    throw new Error("Bitcoin memo is too large for a standard OP_RETURN output.");
  }

  const walletKind = providerName;

  const executionProvider = provider ?? getDefaultBtcProvider(walletKind);
  let uniSatProvider: UniSatBtcProvider | undefined;
  let phantomProvider: PhantomBtcProvider | undefined;
  let rawUtxos: unknown[];
  if (walletKind === "unisat") {
    if (!isUniSatProvider(executionProvider)) {
      throw new Error("UniSat is required to sign and broadcast the BTC deposit.");
    }
    uniSatProvider = executionProvider;
    await assertMainnet(uniSatProvider);
    await assertUniSatProviderOwnsAddress(uniSatProvider, sourceAddress);
    rawUtxos = await readProviderUtxos(uniSatProvider);
  } else {
    if (!isPhantomProvider(executionProvider)) {
      throw new Error("Phantom BTC is required to sign the BTC deposit.");
    }
    phantomProvider = executionProvider;
    await assertPhantomProviderOwnsAddress(phantomProvider, sourceAddress);
    rawUtxos = await loadUtxos(sourceAddress);
  }

  const utxos = normalizeUtxos(rawUtxos).sort((a, b) => (a.value > b.value ? -1 : a.value < b.value ? 1 : 0));
  const selected = selectUtxos({
    utxos,
    amount: amountSats,
    dust: dustThresholdSats,
    feeRate: feeRateSatsPerVb,
    inputVBytes,
    memoBytes: memoText === undefined ? undefined : memo.length,
  });

  const psbt = new bitcoin.Psbt({ network: bitcoin.networks.bitcoin });
  for (const utxo of selected.utxos) {
    psbt.addInput({
      hash: utxo.txid,
      index: utxo.vout,
      witnessUtxo: {
        script: sourceScript,
        value: utxo.value,
      },
    });
  }

  psbt.addOutput({
    address: depositAddress,
    value: amountSats,
  });

  if (memoText !== undefined) {
    const memoOutput = bitcoin.payments.embed({ data: [memo] }).output;
    if (!memoOutput) throw new Error("Unable to build Bitcoin memo output.");
    psbt.addOutput({ script: memoOutput, value: 0n });
  }

  if (selected.change > 0n) {
    psbt.addOutput({
      address: sourceAddress,
      value: selected.change,
    });
  }

  const isTaproot = sourceScript.length === 34 && sourceScript[0] === 0x51;
  if (walletKind === "unisat") {
    if (!uniSatProvider) {
      throw new Error("UniSat is required to sign and broadcast the BTC deposit.");
    }
    const signedPsbt = await uniSatProvider.signPsbt(psbt.toHex(), {
      autoFinalized: true,
      toSignInputs: selected.utxos.map((_, index) => ({
        index,
        address: sourceAddress,
        ...(isTaproot ? { useTweakedSigner: true } : {}),
      })),
    });
    onBroadcasting?.();
    const txid = await uniSatProvider.pushPsbt(signedPsbt);
    if (typeof txid !== "string" || !txid.trim()) {
      throw new Error("UniSat broadcast did not return a BTC transaction id.");
    }
    return txid.trim();
  }

  if (!phantomProvider) {
    throw new Error("Phantom BTC is required to sign the BTC deposit.");
  }
  const signedPsbt = await phantomProvider.signPSBT(psbt.toBuffer(), {
    inputsToSign: [
      {
        address: sourceAddress,
        signingIndexes: selected.utxos.map((_, index) => index),
      },
    ],
  });
  const raw = finalizeSignedPsbt(signedPsbt);
  onBroadcasting?.();
  const txid = await broadcastRawTransaction(raw);
  if (typeof txid !== "string" || !txid.trim()) {
    throw new Error("Bitcoin broadcaster did not return a BTC transaction id.");
  }
  return txid.trim();
}

export async function recommendedBtcFeeRate(fetcher: typeof fetch = fetch): Promise<{ rate: number; fallback: boolean }> {
  try {
    const response = await fetcher("https://mempool.space/api/v1/fees/recommended");
    if (!response.ok) throw new Error("BTC fee rate unavailable");
    const payload: unknown = await response.json();
    const fastest = payload && typeof payload === "object" && "fastestFee" in payload ? payload.fastestFee : undefined;
    if (typeof fastest !== "number" || !Number.isFinite(fastest) || fastest <= 0) throw new Error("Invalid BTC fee rate");
    return { rate: Math.max(fastest, DEFAULT_FEE_RATE_SATS_PER_VBYTE), fallback: false };
  } catch {
    return { rate: DEFAULT_FEE_RATE_SATS_PER_VBYTE, fallback: true };
  }
}
function getDefaultBtcProvider(kind: "unisat" | "phantom"): BtcExecutionProvider | undefined {
  if (typeof window === "undefined") return undefined;
  return kind === "unisat" ? window.unisat : window.phantom?.bitcoin;
}

function isUniSatProvider(provider: BtcExecutionProvider | undefined): provider is UniSatBtcProvider {
  return Boolean(provider && "signPsbt" in provider && "pushPsbt" in provider);
}

function isPhantomProvider(provider: BtcExecutionProvider | undefined): provider is PhantomBtcProvider {
  return Boolean(provider && "signPSBT" in provider);
}

async function assertMainnet(provider: UniSatBtcProvider) {
  const network = await provider.getNetwork?.();
  if (!network) return;
  const normalized = network.toLowerCase();
  if (normalized !== "livenet" && normalized !== "mainnet") {
    throw new Error(`Switch UniSat to Bitcoin mainnet before executing. Current network: ${network}.`);
  }
}

async function assertUniSatProviderOwnsAddress(provider: UniSatBtcProvider, sourceAddress: string) {
  const accounts = await provider.getAccounts?.();
  if (!accounts?.length) return;
  if (!accounts.includes(sourceAddress)) {
    throw new Error("Connected UniSat account does not match the BTC source wallet for this quote.");
  }
}

async function assertPhantomProviderOwnsAddress(provider: PhantomBtcProvider, sourceAddress: string) {
  const accounts = await provider.requestAccounts?.();
  if (!accounts?.length) return;
  const payment = accounts.find((account) => account.purpose === "payment") ?? accounts[0];
  if (payment?.address !== sourceAddress) {
    throw new Error("Connected Phantom BTC account does not match the BTC source wallet for this quote.");
  }
}

async function readProviderUtxos(provider: UniSatBtcProvider): Promise<unknown[]> {
  if (provider.getBitcoinUtxos) return provider.getBitcoinUtxos();
  if (provider.getUnspentOutputs) return provider.getUnspentOutputs();
  throw new Error("UniSat does not expose spendable BTC UTXOs in this browser session.");
}

function normalizeUtxos(raw: unknown[]): BtcUtxo[] {
  return raw.map((entry, index) => {
    const item = entry && typeof entry === "object" ? (entry as Record<string, unknown>) : {};
    const txid = readString(item.txid ?? item.txId ?? item.tx_hash ?? item.txHash, `UTXO ${index} txid`);
    if (!/^[0-9a-fA-F]{64}$/.test(txid)) {
      throw new Error(`UTXO ${index} txid is not a 32-byte hex transaction id.`);
    }
    const voutRaw = item.vout ?? item.outputIndex ?? item.index;
    const vout = Number(voutRaw);
    if (!Number.isSafeInteger(vout) || vout < 0) {
      throw new Error(`UTXO ${index} vout is invalid.`);
    }
    const value = readRequiredBigInt(item.satoshis ?? item.value ?? item.amount, `UTXO ${index} value`);
    if (value <= 0n) {
      throw new Error(`UTXO ${index} value must be greater than zero.`);
    }
    return { txid, vout, value };
  });
}

function getWitnessSourceScript(address: string): Uint8Array {
  const script = bitcoin.address.toOutputScript(address, bitcoin.networks.bitcoin);
  estimateWitnessInputVBytes(script);
  return script;
}

function estimateWitnessInputVBytes(script: Uint8Array): number {
  if (script.length === 22 && script[0] === 0x00 && script[1] === 0x14) {
    return 68;
  }
  if (script.length === 34 && script[0] === 0x51 && script[1] === 0x20) {
    return 58;
  }
  throw new Error("BTC execution supports native SegWit UniSat accounts only (bc1q or bc1p).");
}

function selectUtxos(input: { utxos: BtcUtxo[]; amount: bigint; dust: bigint; feeRate: number; inputVBytes: number; memoBytes?: number }) {
  let total = 0n;
  const selected: BtcUtxo[] = [];

  for (const utxo of input.utxos) {
    selected.push(utxo);
    total += utxo.value;
    const withChangeFee = estimateFee({
      inputs: selected.length,
      outputs: input.memoBytes === undefined ? 2 : 3,
      feeRate: input.feeRate,
      inputVBytes: input.inputVBytes,
      memoBytes: input.memoBytes,
    });
    const change = total - input.amount - withChangeFee;
    if (change >= input.dust) {
      return { utxos: selected, fee: withChangeFee, change };
    }

    const noChangeFee = estimateFee({
      inputs: selected.length,
      outputs: input.memoBytes === undefined ? 1 : 2,
      feeRate: input.feeRate,
      inputVBytes: input.inputVBytes,
      memoBytes: input.memoBytes,
    });
    if (total >= input.amount + noChangeFee) {
      return { utxos: selected, fee: noChangeFee, change: 0n };
    }
  }

  throw new Error("Insufficient BTC balance after deposit amount and network fee.");
}

function estimateFee(input: { inputs: number; outputs: number; feeRate: number; inputVBytes: number; memoBytes?: number }): bigint {
  const baseVBytes = 10;
  const paymentOutputVBytes = 43;
  const memoOutputVBytes = input.memoBytes === undefined ? 0 : 11 + input.memoBytes;
  const outputVBytes = (input.outputs - (input.memoBytes === undefined ? 0 : 1)) * paymentOutputVBytes + memoOutputVBytes;
  const vbytes = baseVBytes + input.inputs * input.inputVBytes + outputVBytes;
  return BigInt(Math.ceil(vbytes * input.feeRate));
}

async function fetchBitcoinUtxos(address: string): Promise<unknown[]> {
  const response = await fetch(`https://mempool.space/api/address/${encodeURIComponent(address)}/utxo`, {
    headers: {
      Accept: "application/json",
    },
  });
  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(`Unable to fetch BTC UTXOs (${response.status}): ${body || response.statusText}`);
  }
  const payload = await response.json();
  if (!Array.isArray(payload)) {
    throw new Error("BTC UTXO endpoint returned an invalid response.");
  }
  return payload;
}

function finalizeBitcoinPsbt(signedPsbt: Uint8Array): string {
  const psbt = bitcoin.Psbt.fromBuffer(signedPsbt, {
    network: bitcoin.networks.bitcoin,
  });
  psbt.finalizeAllInputs();
  return psbt.extractTransaction().toHex();
}

async function broadcastBitcoinRawTransaction(rawTxHex: string): Promise<string> {
  const response = await fetch("https://mempool.space/api/tx", {
    method: "POST",
    headers: {
      "Content-Type": "text/plain",
      Accept: "text/plain",
    },
    body: rawTxHex,
  });
  const body = await response.text();
  if (!response.ok) {
    throw new Error(`Unable to broadcast BTC transaction (${response.status}): ${body || response.statusText}`);
  }
  return body.trim();
}

function readString(value: unknown, label: string): string {
  if (typeof value !== "string" || !value.trim()) throw new Error(`${label} is required.`);
  return value.trim();
}
function readRequiredBigInt(value: unknown, label: string): bigint {
  if ((typeof value === "bigint" && value > 0n) || (typeof value === "number" && Number.isSafeInteger(value) && value > 0))
    return BigInt(value);
  if (typeof value === "string" && /^[0-9]+$/.test(value.trim()) && BigInt(value.trim()) > 0n) return BigInt(value.trim());
  throw new Error(`${label} must be a positive integer string.`);
}
