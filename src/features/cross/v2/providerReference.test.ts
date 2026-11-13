import { describe, expect, it } from "vitest";
import { providerReference, referenceKind } from "./providerReference";

const hash = `0x${"ab".repeat(32)}`;
describe("CCTP Solana reference", () => {
  it("cctp-solana reference names the source chain", () => {
    expect(referenceKind("cctp-solana")).toBe("chain-tx-hash");
    expect(providerReference("cctp-solana", hash, null, [], 8453)).toBe(`8453:${hash}`);
  });
  it("refuses missing chains and malformed hashes", () => {
    expect(providerReference("cctp-solana", hash, null)).toBeNull();
    expect(providerReference("cctp-solana", "abc", null, [], 8453)).toBeNull();
    expect(providerReference("cctp-solana", hash, null, [], 0)).toBeNull();
  });
});
