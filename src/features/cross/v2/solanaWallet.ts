import { VersionedTransaction } from "@solana/web3.js";
import { decodeSolanaTransactionBytes, deserializeSolanaTransaction } from "../execution/solanaTransaction";

export interface SolanaWalletPort {
  connect(): Promise<string>;
  publicKey(): string | null;
  /** Sign only. Broadcasting belongs to the server's byte-binding submit endpoint. */
  signTransaction(base64: string): Promise<string>;
  subscribe?(changed: () => void): () => void;
}
export interface PhantomSolanaProvider {
  publicKey?: { toString(): string } | null;
  connect(): Promise<unknown>;
  signTransaction(transaction: VersionedTransaction): Promise<VersionedTransaction>;
  on?(event: "accountChanged" | "disconnect", changed: () => void): void;
  removeListener?(event: "accountChanged" | "disconnect", changed: () => void): void;
}
function phantom(): PhantomSolanaProvider | undefined {
  if (typeof window === "undefined") return undefined;
  const w = window as Window & { phantom?: { solana?: PhantomSolanaProvider }; solana?: PhantomSolanaProvider & { isPhantom?: boolean } };
  return w.phantom?.solana ?? (w.solana?.isPhantom ? w.solana : undefined);
}
export function createSolanaWallet(provider: () => PhantomSolanaProvider | undefined = phantom): SolanaWalletPort {
  return {
    publicKey: () => provider()?.publicKey?.toString() ?? null,
    async connect() {
      const p = provider();
      if (!p?.connect || !p.signTransaction) throw new Error("Install Phantom to sign Solana transfers.");
      await p.connect();
      const address = p.publicKey?.toString();
      if (!address) throw new Error("Phantom did not return a Solana account.");
      return address;
    },
    async signTransaction(base64) {
      const p = provider();
      if (!p?.publicKey || !p.signTransaction) throw new Error("Connect Phantom to sign this transfer.");
      const tx = await deserializeSolanaTransaction(decodeSolanaTransactionBytes(base64));
      if (!(tx instanceof VersionedTransaction)) throw new Error("Only versioned Solana transactions are supported.");
      if (tx.message.staticAccountKeys[0]?.toBase58() !== p.publicKey.toString())
        throw new Error("Connected Solana wallet does not match the transaction fee payer.");
      const signed = await p.signTransaction(tx);
      return btoa(String.fromCharCode(...signed.serialize()));
    },
    subscribe(changed) {
      const p = provider();
      // Some injected providers are Proxies that throw when `on`/`removeListener` is read; skip live events rather than crash the view.
      const safely = (f: () => void) => {
        try {
          f();
        } catch {
          /* no account-change events from this provider; connect() still refreshes the address */
        }
      };
      safely(() => p?.on?.("accountChanged", changed));
      safely(() => p?.on?.("disconnect", changed));
      return () => {
        safely(() => p?.removeListener?.("accountChanged", changed));
        safely(() => p?.removeListener?.("disconnect", changed));
      };
    },
  };
}
