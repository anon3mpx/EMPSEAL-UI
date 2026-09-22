import { afterEach, describe, expect, it, vi } from "vitest";
import { exchangeAfterPlaidLink, launchPlaidLink } from "./plaidLink";

afterEach(() => {
  delete (window as Window & { Plaid?: unknown }).Plaid;
});

describe("plaid link handoff", () => {
  it("exchanges the public token from Link without requiring a pasted token", async () => {
    const exchange = vi.fn().mockResolvedValue([{ id: "acct_1", active: true }]);
    await exchangeAfterPlaidLink({
      linkToken: "link-sandbox-1",
      launch: async (token) => {
        expect(token).toBe("link-sandbox-1");
        return "public-sandbox-1";
      },
      exchange,
    });
    expect(exchange).toHaveBeenCalledWith("public-sandbox-1");
  });

  it("opens Plaid with the session linkToken", async () => {
    const open = vi.fn();
    const destroy = vi.fn();
    (window as Window & { Plaid?: unknown }).Plaid = {
      create: ({ token, onSuccess }: { token: string; onSuccess: (publicToken: string) => void }) => {
        expect(token).toBe("link-sandbox-2");
        queueMicrotask(() => onSuccess("public-sandbox-2"));
        return { open, destroy };
      },
    };
    await expect(launchPlaidLink("link-sandbox-2")).resolves.toBe("public-sandbox-2");
    expect(open).toHaveBeenCalled();
  });
});
