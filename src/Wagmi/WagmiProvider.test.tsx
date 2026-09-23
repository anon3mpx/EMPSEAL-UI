import { describe, expect, it, vi } from "vitest";

vi.mock("@rainbow-me/rainbowkit", () => ({
  RainbowKitProvider: ({ children }: { children: unknown }) => children,
  darkTheme: () => ({}),
}));

vi.mock("wagmi", () => ({
  WagmiProvider: ({ children }: { children: unknown }) => children,
}));

vi.mock("@tanstack/react-query", () => ({
  QueryClient: class QueryClient {},
  QueryClientProvider: ({ children }: { children: unknown }) => children,
}));

vi.mock("./config", () => ({ config: { id: "canonical" } }));

vi.mock("./bridgeConfig", () => {
  throw new Error("bridge config was initialized eagerly");
});

vi.mock("./viaBridgeConfig", () => {
  throw new Error("via-bridge config was initialized eagerly");
});

vi.mock("../hooks/ChainContext", () => ({
  ChainProvider: ({ children }: { children: unknown }) => children,
}));

vi.mock("../hooks/ConnectPopupContext", () => ({
  ConnectPopupProvider: ({ children }: { children: unknown }) => children,
}));

describe("WagmiProviderWrapper", () => {
  it("does not initialize inactive route-specific WalletConnect configs", async () => {
    const providerModule = await import("./WagmiProvider");

    expect(providerModule.default).toBeTypeOf("function");
  });
});
