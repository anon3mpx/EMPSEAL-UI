import type { SelectedOfferIntegration } from "../api/contracts";
import {
  decodeSolanaTransactionBytes,
  deserializeSolanaTransaction,
} from "./solanaTransaction";

export const GARDEN_SOLANA_TRANSACTION_EXPIRED = "GARDEN_SOLANA_TRANSACTION_EXPIRED";

interface PhantomSolanaProvider {
  publicKey?: { toString(): string } | null;
  signAndSendTransaction?: (
    transaction: unknown,
    options?: unknown,
  ) => Promise<{ signature?: string } | string>;
}

interface PhantomWindow {
  phantom?: { solana?: PhantomSolanaProvider };
  solana?: PhantomSolanaProvider & { isPhantom?: boolean };
}

export interface ExecuteGardenSolanaInput {
  integration: SelectedOfferIntegration;
  expectedSignerAddress: string;
  provider?: PhantomSolanaProvider | null;
  deserializeTransaction?: (bytes: Uint8Array) => Promise<unknown>;
}

export async function executeGardenSolanaIntent({
  integration,
  expectedSignerAddress,
  provider,
  deserializeTransaction = deserializeSolanaTransaction,
}: ExecuteGardenSolanaInput): Promise<string> {
  const nativeFunding = readGardenSolanaFunding(integration);
  const expectedAccount =
    nativeFunding.signingRequest?.account ?? nativeFunding.sourceOwner;
  const expectedFeePayer = nativeFunding.signingRequest?.feePayer;
  const executionProvider = provider ?? getPhantomSolanaProvider();
  if (!executionProvider?.signAndSendTransaction) {
    throw new Error("Phantom Solana does not support transaction signing in this browser.");
  }

  const connectedSigner = executionProvider.publicKey?.toString();
  const requiredSigner = expectedAccount || expectedSignerAddress;
  if (connectedSigner && requiredSigner && connectedSigner !== requiredSigner) {
    throw new Error("Connected Solana wallet does not match the Garden route signer.");
  }
  if (
    connectedSigner &&
    expectedFeePayer &&
    connectedSigner !== expectedFeePayer &&
    requiredSigner !== expectedFeePayer
  ) {
    throw new Error("Connected Solana wallet does not match the Garden fee payer.");
  }
  if (expectedSignerAddress && requiredSigner && expectedSignerAddress !== requiredSigner) {
    throw new Error("Connected Solana wallet does not match the prepared Garden account.");
  }

  const transaction = await deserializeTransaction(
    decodeSolanaTransactionBytes(nativeFunding.unsignedTransaction, "base64"),
  );

  try {
    const result = await executionProvider.signAndSendTransaction(transaction);
    const signature = typeof result === "string" ? result : result?.signature;
    if (!signature) {
      throw new Error("Phantom did not return a Solana transaction signature.");
    }
    return signature;
  } catch (error) {
    throw mapGardenSolanaSendError(error);
  }
}

function readGardenSolanaFunding(integration: SelectedOfferIntegration) {
  if (integration.mode !== "provider_direct" || integration.action.kind !== "garden_htlc_order") {
    throw new Error("Selected route is not a Garden Solana provider-direct action.");
  }
  const nativeFunding = integration.nativeFunding;
  if (!nativeFunding || nativeFunding.runtime !== "solana") {
    throw new Error("Garden Solana native funding is missing.");
  }
  if (
    typeof nativeFunding.unsignedTransaction !== "string" ||
    !nativeFunding.unsignedTransaction.trim()
  ) {
    throw new Error("Garden Solana unsigned transaction is missing.");
  }
  return nativeFunding;
}

function getPhantomSolanaProvider(): PhantomSolanaProvider | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as PhantomWindow;
  return w.phantom?.solana ?? (w.solana?.isPhantom ? w.solana : null) ?? null;
}

function mapGardenSolanaSendError(error: unknown): Error {
  const message = readErrorMessage(error);
  if (isSolanaTransactionExpired(message)) {
    return new Error(
      `${GARDEN_SOLANA_TRANSACTION_EXPIRED}: Garden Solana transaction expired. Request a new quote.`,
    );
  }
  if (error instanceof Error) return error;
  return new Error(message || "Garden Solana transaction failed.");
}

function isSolanaTransactionExpired(message: string): boolean {
  const normalized = message.toLowerCase();
  return (
    normalized.includes("expired") ||
    normalized.includes("blockhashnotfound") ||
    normalized.includes("blockhash not found") ||
    normalized.includes("block height exceeded") ||
    normalized.includes("transactionexpired")
  );
}

function readErrorMessage(error: unknown): string {
  if (!error) return "";
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;
  if (typeof error === "object" && "message" in error) {
    const message = (error as { message?: unknown }).message;
    return typeof message === "string" ? message : "";
  }
  return String(error);
}
