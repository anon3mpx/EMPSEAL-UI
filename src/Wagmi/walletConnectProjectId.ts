const configuredProjectId = import.meta.env.VITE_WALLETCONNECT_PROJECT_ID?.trim();

if (
  !configuredProjectId ||
  configuredProjectId === "YOUR_PROJECT_ID" ||
  !/^[a-f0-9]{32}$/i.test(configuredProjectId)
) {
  throw new Error(
    "VITE_WALLETCONNECT_PROJECT_ID must be set to a valid WalletConnect project ID",
  );
}

export const walletConnectProjectId = configuredProjectId;
