export type RampDirection = "ON_RAMP" | "OFF_RAMP";
export type RampFiatCurrency = "USD";
export type RampFiatRail = "ACH_PUSH" | "ACH" | "WIRE";
export type RampDelegateType = "PARTNER" | "AGENT" | "INTEGRATION" | "SERVICE";
export type RampGrantOperation = "READ" | "PREVIEW" | "CREATE_ON_RAMP" | "CREATE_OFF_RAMP";

export interface RampCapabilityStatus {
  enabled: boolean;
  blockers: string[];
}

export interface RampCapabilities {
  enabled: boolean;
  blockers: string[];
  supportedChainIds: number[];
  features: {
    kyc: RampCapabilityStatus;
    onRamp: RampCapabilityStatus;
    offRamp: RampCapabilityStatus;
    delegatedActions: RampCapabilityStatus;
    agentActions?: RampCapabilityStatus;
  };
}

export interface RampSignedAction {
  action: string;
  wallet: string;
  chainId: number;
  payloadHash: string;
  nonce: string;
  timestamp: number;
  expiresAt: number;
  signature: string;
}

export interface RampSignedCommand {
  wallet: string;
  chainId: number;
  signedAction: RampSignedAction;
}

export interface RampKycLinkCommand extends RampSignedCommand {
  fullName: string;
  email: string;
  type: "individual" | "business";
  redirectUri: string;
}

export interface RampBankLinkExchangeCommand extends RampSignedCommand {
  sessionId: string;
  publicToken: string;
}

export interface RampTransferCommand extends RampSignedCommand {
  direction: RampDirection;
  tokenAddress: string;
  fiatCurrency: RampFiatCurrency;
  fiatRail: RampFiatRail;
  amount: string;
  externalAccountId?: string;
  basketId?: string;
}

export interface RampCreateDelegationCommand extends RampSignedCommand {
  partner: string;
  delegateType: RampDelegateType;
  delegateId?: string;
  operations: RampGrantOperation[];
  directions: RampDirection[];
  chainIds: number[];
  externalAccountIds: string[];
  expiresAt: string;
}

export interface RampProfile {
  customerId: string;
  wallet: string;
  chainId: number;
  kycStatus: string;
  tosStatus: string;
  ready: boolean;
  externalAccounts: RampExternalAccount[];
}

export interface RampExternalAccount {
  id: string;
  bankName?: string;
  accountType?: string;
  currency?: string;
  lastFour?: string;
  active: boolean;
  validationState?: string;
}

export interface RampKycHandoff {
  kycUrl: string;
  tosUrl: string;
  kycStatus: string;
  tosStatus: string;
}

export interface RampBankLinkHandoff {
  sessionId: string;
  linkToken: string;
  expiresAt: string;
}

export interface RampDepositInstructions {
  paymentRail?: string;
  amount?: string;
  currency?: string;
  depositAddress?: string;
  bankName?: string;
  accountNumberLastFour?: string;
  routingNumberLastFour?: string;
  memo?: string;
}

export interface RampPreview {
  sourceAmount: string;
  destinationAmount: string;
  feeAmount: string;
  feeCurrency: string;
  etaSeconds: number;
  depositInstructions?: RampDepositInstructions;
  route?: {
    direction: RampDirection;
    chainId: number;
    tokenAddress: string;
    minimumAmount?: string;
    maximumAmount?: string;
  };
}

export interface RampTransfer {
  id: string;
  direction: RampDirection;
  chainId: number;
  tokenAddress: string;
  fiatCurrency: RampFiatCurrency;
  fiatRail: RampFiatRail;
  amount: string;
  state: string;
  depositInstructions?: RampDepositInstructions;
  basketId?: string;
  basketFundingState?: string;
  preliminaryTransactionHash?: string;
  finalTransactionHash?: string;
}

export interface RampDelegation {
  id: string;
  partnerId: string;
  delegateType: RampDelegateType;
  delegateId?: string;
  operations: RampGrantOperation[];
  directions: RampDirection[];
  chainIds: number[];
  expiresAt: string;
  revokedAt?: string;
}

export interface RampSessionSnapshot {
  wallet: string;
  chainId: number;
  transferId?: string;
  sessionId?: string;
  basketId?: string;
}

export const RAMP_ACTIONS = {
  registerWallet: "REGISTER_WALLET",
  profile: "RAMP_PROFILE",
  kycLink: "CREATE_KYC_HANDOFF",
  kycRefresh: "REFRESH_KYC",
  bankLink: "CREATE_BANK_LINK",
  bankLinkExchange: "EXCHANGE_BANK_LINK",
  externalAccounts: "SYNC_EXTERNAL_ACCOUNTS",
  preview: "RAMP_PREVIEW",
  createTransfer: "CREATE_RAMP_TRANSFER",
  transferStatus: "RAMP_TRANSFER_STATUS",
  cancelTransfer: "CANCEL_RAMP_TRANSFER",
  createDelegation: "CREATE_RAMP_DELEGATION",
  revokeDelegation: "REVOKE_RAMP_DELEGATION",
} as const;
