export function resolveCrossNavbarChainId(
  fromChainId: number,
  activeWalletChainId?: number,
): number {
  return activeWalletChainId ?? fromChainId;
}
