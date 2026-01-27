import { create } from 'zustand';

export const useGasBridgeStore = create((set) => ({
  fromChainId: null, // Should be native chain ID
  toChainId: null,   // Should be native chain ID
  amount: '', // Should be in human-readable format (e.g., "0.1")
  recipientAddress: '',
  setFromChain: (id) => set({ fromChainId: id }),
  setToChain: (id) => set({ toChainId: id }),
  setAmount: (amt) => set({ amount: amt }),
  setRecipientAddress: (addr) => set({ recipientAddress: addr }),
}));
