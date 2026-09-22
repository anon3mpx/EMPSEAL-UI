export function decodeSolanaTransactionBytes(
  serializedTransaction: string,
  encoding: "base64" | "hex" = "base64",
): Uint8Array {
  const trimmed = serializedTransaction.trim();
  if (!trimmed) {
    throw new Error("Serialized Solana transaction is empty.");
  }

  if (encoding === "hex") {
    const hex = trimmed.startsWith("0x") ? trimmed.slice(2) : trimmed;
    if (!/^[0-9a-fA-F]+$/.test(hex) || hex.length % 2 !== 0) {
      throw new Error("Solana transaction hex is malformed.");
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

export async function deserializeSolanaTransaction(bytes: Uint8Array) {
  const { Transaction, VersionedTransaction } = await import("@solana/web3.js");

  try {
    return VersionedTransaction.deserialize(bytes);
  } catch {
    return Transaction.from(bytes);
  }
}
