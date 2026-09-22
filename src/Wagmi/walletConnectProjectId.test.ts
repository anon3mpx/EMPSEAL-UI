import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";

const configuredProjectId = "0123456789abcdef0123456789abcdef";

vi.mock("@rainbow-me/rainbowkit", () => ({
  connectorsForWallets: (
    _wallets: unknown,
    options: { projectId: string },
  ) => [{ projectId: options.projectId }],
  getDefaultConfig: (options: { projectId: string }) => options,
}));

vi.mock("@rainbow-me/rainbowkit/wallets", () => ({
  coinbaseWallet: vi.fn(),
  metaMaskWallet: vi.fn(),
  phantomWallet: vi.fn(),
  rainbowWallet: vi.fn(),
  walletConnectWallet: vi.fn(),
}));

describe("WalletConnect project configuration", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  afterAll(() => {
    vi.unstubAllEnvs();
  });

  it("uses the configured Vite project ID for every Wagmi config", async () => {
    vi.stubEnv("VITE_WALLETCONNECT_PROJECT_ID", configuredProjectId);

    const [{ config }, { bridgeConfig }, { viaBridgeConfig }] = await Promise.all([
      import("./config"),
      import("./bridgeConfig"),
      import("./viaBridgeConfig"),
    ]);

    expect(config.projectId).toBe(configuredProjectId);
    expect(bridgeConfig.projectId).toBe(configuredProjectId);
    expect(viaBridgeConfig.projectId).toBe(configuredProjectId);
  });

  it("fails once with a clear message instead of starting with a placeholder ID", async () => {
    vi.stubEnv("VITE_WALLETCONNECT_PROJECT_ID", "YOUR_PROJECT_ID");

    await expect(import("./config")).rejects.toThrow(
      "VITE_WALLETCONNECT_PROJECT_ID must be set to a valid WalletConnect project ID",
    );
  });
});
