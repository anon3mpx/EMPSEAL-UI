export type ProviderDirectExecutionKind =
  | "evm_transaction"
  | "layerzero_steps"
  | "garden_solana_source"
  | "garden_bitcoin_source"
  | "deposit_instructions"
  | "non_evm_wallet_required"
  | "quote_only"
  | "unsupported";
