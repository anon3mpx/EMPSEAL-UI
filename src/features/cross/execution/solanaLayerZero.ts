import {
  getLayerZeroSolanaSerializedTransaction,
  isLayerZeroSolanaStep,
} from "./providerDirect";
import {
  decodeSolanaTransactionBytes,
  deserializeSolanaTransaction,
} from "./solanaTransaction";

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

function getPhantomSolanaProvider(): PhantomSolanaProvider | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as PhantomWindow;
  return w.phantom?.solana ?? (w.solana?.isPhantom ? w.solana : null) ?? null;
}

export async function sendLayerZeroSolanaTransaction(
  step: unknown,
  expectedSignerAddress?: string,
): Promise<string> {
  if (!isLayerZeroSolanaStep(step)) {
    throw new Error("LayerZero step is not a Solana transaction step.");
  }

  const serialized = getLayerZeroSolanaSerializedTransaction(step);
  if (!serialized) {
    throw new Error("LayerZero Solana step is missing a serialized transaction.");
  }

  const provider = getPhantomSolanaProvider();
  if (!provider?.signAndSendTransaction) {
    throw new Error("Phantom Solana does not support transaction signing in this browser.");
  }

  const connectedSigner = provider.publicKey?.toString();
  if (
    expectedSignerAddress &&
    connectedSigner &&
    connectedSigner !== expectedSignerAddress
  ) {
    throw new Error("Connected Solana wallet does not match the prepared route signer.");
  }

  const transaction = await deserializeSolanaTransaction(
    decodeSolanaTransactionBytes(
      serialized.serializedTransaction,
      serialized.encoding,
    ),
  );
  const result = await provider.signAndSendTransaction(transaction);
  const signature = typeof result === "string" ? result : result?.signature;
  if (!signature) {
    throw new Error("Phantom did not return a Solana transaction signature.");
  }
  return signature;
}
