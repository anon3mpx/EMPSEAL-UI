export class BasketWalletError extends Error {
  readonly code: "ACCOUNT_MISMATCH" | "CHAIN_MISMATCH" | "WALLET_DISCONNECTED";

  constructor(code: BasketWalletError["code"], message: string) {
    super(message);
    this.name = "BasketWalletError";
    this.code = code;
  }
}

export function normalizeAddress(value: string): string {
  return value.trim().toLowerCase();
}

export function assertExpectedAccount(input: {
  connectedAddress?: string | null;
  expectedAddress: string;
}): string {
  if (!input.connectedAddress) {
    throw new BasketWalletError("WALLET_DISCONNECTED", "Connect the basket wallet before signing.");
  }
  if (normalizeAddress(input.connectedAddress) !== normalizeAddress(input.expectedAddress)) {
    throw new BasketWalletError(
      "ACCOUNT_MISMATCH",
      "Connected account does not match the expected basket wallet.",
    );
  }
  return input.connectedAddress;
}

export function assertExpectedChain(input: {
  connectedChainId?: number | null;
  expectedChainId: number;
}): void {
  if (!input.connectedChainId || input.connectedChainId !== input.expectedChainId) {
    throw new BasketWalletError(
      "CHAIN_MISMATCH",
      `Switch to chain ${input.expectedChainId} before signing or sending this basket transaction.`,
    );
  }
}

export function chainIdFromSwitchResult(result: unknown, fallback: number): number {
  if (typeof result === "number" && Number.isFinite(result)) return result;
  if (result && typeof result === "object" && "id" in result) {
    const id = (result as { id?: unknown }).id;
    if (typeof id === "number" && Number.isFinite(id)) return id;
  }
  return fallback;
}

export async function requireWalletForAction(input: {
  connectedAddress?: string | null;
  connectedChainId?: number | null;
  expectedAddress: string;
  expectedChainId?: number;
  switchChain?: (chainId: number) => Promise<unknown>;
  getConnectedChainId?: () => number | null | undefined | Promise<number | null | undefined>;
}): Promise<string> {
  const address = assertExpectedAccount(input);
  if (input.expectedChainId == null) return address;

  const readChain = async (): Promise<number | null | undefined> => {
    if (input.getConnectedChainId) return input.getConnectedChainId();
    return input.connectedChainId;
  };

  let connected = await readChain();
  if (connected === input.expectedChainId) return address;
  if (!input.switchChain) {
    assertExpectedChain({
      connectedChainId: connected,
      expectedChainId: input.expectedChainId,
    });
    return address;
  }
  const switched = await input.switchChain(input.expectedChainId);
  connected = input.getConnectedChainId ? await input.getConnectedChainId() : null;
  if (connected == null) {
    connected = chainIdFromSwitchResult(switched, input.expectedChainId);
  }
  assertExpectedChain({
    connectedChainId: connected,
    expectedChainId: input.expectedChainId,
  });
  return address;
}
