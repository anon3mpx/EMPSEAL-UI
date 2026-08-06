export function isSplitSwapUiEnabled(env = import.meta.env) {
  return env?.VITE_ENABLE_SPLIT_SWAP_UI === "true";
}
