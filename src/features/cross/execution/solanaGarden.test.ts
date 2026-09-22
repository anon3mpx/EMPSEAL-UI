import { describe, expect, it, vi } from "vitest";
import {
  executeGardenSolanaIntent,
  GARDEN_SOLANA_TRANSACTION_EXPIRED,
} from "./solanaGarden";

const integration = {
  mode: "provider_direct" as const,
  action: { kind: "garden_htlc_order" as const },
  nativeFunding: {
    runtime: "solana" as const,
    unsignedTransaction: "AQIDBA==",
    signingRequest: {
      format: "solana-versioned-transaction" as const,
      encoding: "base64" as const,
      account: "So11111111111111111111111111111111111111112",
      feePayer: "So11111111111111111111111111111111111111112",
    },
  },
};

describe("executeGardenSolanaIntent", () => {
  it("maps expired blockhash failures to GARDEN_SOLANA_TRANSACTION_EXPIRED", async () => {
    const provider = {
      publicKey: { toString: () => "So11111111111111111111111111111111111111112" },
      signAndSendTransaction: vi.fn().mockRejectedValue(
        new Error("TransactionExpiredBlockheightExceededError: block height exceeded"),
      ),
    };

    await expect(
      executeGardenSolanaIntent({
        integration,
        expectedSignerAddress: "So11111111111111111111111111111111111111112",
        provider,
        deserializeTransaction: async () => ({ deserialized: true }),
      }),
    ).rejects.toThrow(GARDEN_SOLANA_TRANSACTION_EXPIRED);
  });

  it("signs and sends a Garden Solana versioned transaction", async () => {
    const provider = {
      publicKey: { toString: () => "So11111111111111111111111111111111111111112" },
      signAndSendTransaction: vi.fn().mockResolvedValue({ signature: "solana-sig" }),
    };

    await expect(
      executeGardenSolanaIntent({
        integration,
        expectedSignerAddress: "So11111111111111111111111111111111111111112",
        provider,
        deserializeTransaction: async () => ({ deserialized: true }),
      }),
    ).resolves.toBe("solana-sig");
    expect(provider.signAndSendTransaction).toHaveBeenCalled();
  });
});
