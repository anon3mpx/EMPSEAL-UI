import type { RampSignedAction, RampSignedCommand } from "../api/contracts";
import { payloadWithoutSignature, rampActionMessage, unsignedRampAction } from "../utils/signatures";
import { requireRampWallet } from "../utils/wallet";

export interface RampSigner {
  address?: string | null;
  chainId?: number | null;
  signMessage: (message: string) => Promise<string>;
  switchChain?: (chainId: number) => Promise<unknown>;
}

export async function signRampCommand(input: {
  action: string;
  wallet: string;
  chainId: number;
  payload: Record<string, unknown>;
  nonce: string;
  timestamp: number;
  expiresAt: number;
  signer: RampSigner;
  resourceId?: string;
}): Promise<{ command: RampSignedCommand; hashedPayload: Record<string, unknown>; signedAction: RampSignedAction }> {
  await requireRampWallet({
    connectedAddress: input.signer.address,
    connectedChainId: input.signer.chainId,
    expectedAddress: input.wallet,
    expectedChainId: input.chainId,
    switchChain: input.signer.switchChain,
  });
  const hashedPayload = payloadWithoutSignature(input.payload, input.resourceId);
  const unsigned = unsignedRampAction({
    action: input.action,
    wallet: input.wallet,
    chainId: input.chainId,
    payload: hashedPayload,
    nonce: input.nonce,
    timestamp: input.timestamp,
    expiresAt: input.expiresAt,
  });
  const signature = await input.signer.signMessage(rampActionMessage(unsigned));
  const signedAction = { ...unsigned, signature };
  return {
    hashedPayload,
    signedAction,
    command: {
      wallet: input.wallet,
      chainId: input.chainId,
      signedAction,
    },
  };
}

export function transferDidNotMoveFunds(copy: string): boolean {
  return !/moved funds|funds sent|transfer complete|payment completed/i.test(copy);
}
