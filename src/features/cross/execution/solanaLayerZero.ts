import {
  getLayerZeroSolanaSerializedTransaction,
  isLayerZeroSolanaStep,
} from "./providerDirect";

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

function decodeSerializedTransaction(
  serializedTransaction: string,
  encoding: "base64" | "hex",
): Uint8Array {
  const trimmed = serializedTransaction.trim();
  if (!trimmed) {
    throw new Error("LayerZero Solana transaction is empty.");
  }

  if (encoding === "hex") {
    const hex = trimmed.startsWith("0x") ? trimmed.slice(2) : trimmed;
    if (!/^[0-9a-fA-F]+$/.test(hex) || hex.length % 2 !== 0) {
      throw new Error("LayerZero Solana transaction hex is malformed.");
    }
    return Uint8Array.from(
      hex.match(/.{2}/g)!.map((byte) => Number.parseInt(byte, 16)),
    );
  }

  const atobFn = globalThis.atob;
  if (typeof atobFn === "function") {
    const binary = atobFn(trimmed);
    return Uint8Array.from(binary, (char) => char.charCodeAt(0));
  }

  const bufferCtor = (globalThis as unknown as {
    Buffer?: { from(value: string, encoding: "base64"): Uint8Array };
  }).Buffer;
  if (bufferCtor) {
    return Uint8Array.from(bufferCtor.from(trimmed, "base64"));
  }

  throw new Error("Base64 decoding is unavailable in this browser.");
}

async function deserializeSolanaTransaction(bytes: Uint8Array) {
  const { Transaction, VersionedTransaction } = await import("@solana/web3.js");

  try {
    return VersionedTransaction.deserialize(bytes);
  } catch {
    return Transaction.from(bytes);
  }
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
    decodeSerializedTransaction(
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
