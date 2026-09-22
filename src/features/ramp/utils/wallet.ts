export class RampWalletError extends Error {
  readonly code: "ACCOUNT_MISMATCH" | "CHAIN_MISMATCH" | "WALLET_DISCONNECTED";
  constructor(code: RampWalletError["code"], message: string) {
    super(message);
    this.name = "RampWalletError";
    this.code = code;
  }
}

export async function requireRampWallet(input: {
  connectedAddress?: string | null;
  connectedChainId?: number | null;
  expectedAddress: string;
  expectedChainId: number;
  switchChain?: (chainId: number) => Promise<unknown>;
}): Promise<string> {
  if (!input.connectedAddress) {
    throw new RampWalletError("WALLET_DISCONNECTED", "Connect a wallet before signing a ramp action.");
  }
  if (input.connectedAddress.toLowerCase() !== input.expectedAddress.toLowerCase()) {
    throw new RampWalletError("ACCOUNT_MISMATCH", "Connected account does not match the ramp wallet.");
  }
  if (input.connectedChainId !== input.expectedChainId) {
    if (!input.switchChain) {
      throw new RampWalletError("CHAIN_MISMATCH", `Switch to chain ${input.expectedChainId} before signing.`);
    }
    await input.switchChain(input.expectedChainId);
  }
  return input.connectedAddress;
}
