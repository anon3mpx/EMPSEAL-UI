export type ProviderDirectExecutionKind =
  | "evm_transaction"
  | "layerzero_steps"
  | "deposit_instructions"
  | "non_evm_wallet_required"
  | "quote_only"
  | "unsupported";
