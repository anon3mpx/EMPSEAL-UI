import * as bitcoin from "bitcoinjs-lib";
import type { SelectedOfferIntegration } from "../api/contracts";
import { GARDEN_BTC_NATIVE_SEGWIT_REASON } from "../model/capabilities";
import { verifyGardenBitcoinPsbt } from "./bitcoinGardenPsbt";

export type UniSatBtcProvider = {
  getNetwork?: () => Promise<string>;
  getAccounts?: () => Promise<string[]>;
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

export interface ExecuteGardenBitcoinInput {
  integration: SelectedOfferIntegration;
  sourceAddress: string;
  addressType?: "p2wpkh" | "p2tr";
  providerName?: string;
  provider?: BtcExecutionProvider;
  finalizeSignedPsbt?: (signedPsbt: Uint8Array) => string;
  broadcastRawTransaction?: (rawTxHex: string) => Promise<string>;
}

export async function executeGardenBitcoinIntent({
  integration,
  sourceAddress,
  addressType,
  providerName,
  provider,
  finalizeSignedPsbt = finalizeBitcoinPsbt,
  broadcastRawTransaction = broadcastBitcoinRawTransaction,
}: ExecuteGardenBitcoinInput): Promise<string> {
  if (addressType === "p2tr") {
    throw new Error(GARDEN_BTC_NATIVE_SEGWIT_REASON);
  }

  const nativeFunding = readGardenBitcoinFunding(integration);
  const psbt = verifyGardenBitcoinPsbt({
    psbtBase64: nativeFunding.unsignedTransaction,
    ownerAddress: sourceAddress,
    nativeFunding,
  });

  const walletKind = normalizeBtcProviderName(providerName);
  if (walletKind !== "unisat" && walletKind !== "phantom") {
    throw new Error(`Unsupported BTC wallet for Garden source execution: ${providerName ?? "unknown"}.`);
  }

  const executionProvider = provider ?? getDefaultBtcProvider(walletKind);
  const signingIndexes = Array.from({ length: psbt.inputCount }, (_, index) => index);

  if (walletKind === "unisat") {
    if (!isUniSatProvider(executionProvider)) {
      throw new Error("UniSat is required to sign and broadcast the Garden BTC deposit.");
    }
    await assertMainnet(executionProvider);
    await assertUniSatProviderOwnsAddress(executionProvider, sourceAddress);
    const signedPsbt = await executionProvider.signPsbt(psbt.toHex(), {
      autoFinalized: true,
      toSignInputs: signingIndexes.map((index) => ({
        index,
        address: sourceAddress,
      })),
    });
    const txid = await executionProvider.pushPsbt(signedPsbt);
    if (typeof txid !== "string" || !txid.trim()) {
      throw new Error("UniSat broadcast did not return a BTC transaction id.");
    }
    return txid.trim();
  }

  if (!isPhantomProvider(executionProvider)) {
    throw new Error("Phantom BTC is required to sign the Garden BTC deposit.");
  }
  await assertPhantomProviderOwnsAddress(executionProvider, sourceAddress);
  const signedPsbt = await executionProvider.signPSBT(psbt.toBuffer(), {
    inputsToSign: [{
      address: sourceAddress,
      signingIndexes,
    }],
  });
  const txid = await broadcastRawTransaction(finalizeSignedPsbt(signedPsbt));
  if (typeof txid !== "string" || !txid.trim()) {
    throw new Error("Bitcoin broadcaster did not return a BTC transaction id.");
  }
  return txid.trim();
}

function readGardenBitcoinFunding(integration: SelectedOfferIntegration) {
  if (integration.mode !== "provider_direct" || integration.action.kind !== "garden_htlc_order") {
    throw new Error("Selected route is not a Garden BTC provider-direct action.");
  }
  const nativeFunding = integration.nativeFunding;
  if (!nativeFunding || nativeFunding.runtime !== "bitcoin") {
    throw new Error("Garden BTC native funding is missing.");
  }
  if (
    typeof nativeFunding.unsignedTransaction !== "string" ||
    !nativeFunding.unsignedTransaction.trim()
  ) {
    throw new Error("Garden BTC unsigned PSBT is missing.");
  }
  return nativeFunding;
}

function normalizeBtcProviderName(providerName?: string): "unisat" | "phantom" | "unknown" {
  const normalized = providerName?.trim().toLowerCase();
  if (!normalized || normalized === "unisat") return "unisat";
  if (normalized === "phantom") return "phantom";
  return "unknown";
}

function getDefaultBtcProvider(kind: "unisat" | "phantom"): BtcExecutionProvider | undefined {
  if (typeof window === "undefined") return undefined;
  const w = window as Window & {
    unisat?: UniSatBtcProvider;
    phantom?: { bitcoin?: PhantomBtcProvider };
  };
  return kind === "unisat" ? w.unisat : w.phantom?.bitcoin;
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
    throw new Error(
      `Unable to broadcast BTC transaction (${response.status}): ${body || response.statusText}`,
    );
  }
  return body.trim();
}
