const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";
const MILLIS_THRESHOLD = 1_000_000_000_000;
const ROUTER_INTENT_VALUE_BUFFER_BPS = 200n;
const BPS_DENOMINATOR = 10_000n;
const DEFAULT_ROUTER_INTENT_GAS_LIMIT = 1_200_000n;

function addRouterIntentValueBuffer(value: bigint) {
  if (value <= 0n) return value;

  return (
    (value * (BPS_DENOMINATOR + ROUTER_INTENT_VALUE_BUFFER_BPS) +
      (BPS_DENOMINATOR - 1n)) /
    BPS_DENOMINATOR
  );
}

export function toSendTransactionArgs(integration: {
  contractAddress: string;
  calldata: string;
  value: string;
  gas?: string | number | bigint;
  gasLimit?: string | number | bigint;
}) {
  const value = BigInt(integration.value ?? "0");
  const gasLimit =
    integration.gasLimit !== undefined && integration.gasLimit !== null
      ? BigInt(integration.gasLimit)
      : integration.gas !== undefined && integration.gas !== null
        ? BigInt(integration.gas)
        : DEFAULT_ROUTER_INTENT_GAS_LIMIT;

  return {
    to: integration.contractAddress as `0x${string}`,
    data: integration.calldata as `0x${string}`,
    value: addRouterIntentValueBuffer(value),
    gas: gasLimit,
  };
}

export function getRequiredRouterIntentApproval(session: {
  quote?: {
    tokenIn?: string;
    amountIn?: string;
    srcChainId?: number;
  };
  integration?: {
    mode?: string;
    integration?: {
      contractAddress?: string;
    };
  };
}) {
  const tokenAddress = session.quote?.tokenIn;
  const spender = session.integration?.integration?.contractAddress;
  const amountIn = session.quote?.amountIn;
  const chainId = session.quote?.srcChainId;

  if (
    session.integration?.mode !== "router_intent" ||
    !tokenAddress ||
    tokenAddress.toLowerCase() === ZERO_ADDRESS ||
    !spender ||
    !amountIn ||
    !chainId
  ) {
    return null;
  }

  return {
    tokenAddress,
    spender,
    amount: BigInt(amountIn),
    chainId,
  };
}

export function getRouterIntentExpiresAt(integration: {
  mode?: string;
  integration?: {
    expiresAt?: number;
  };
  expiresAt?: number;
}) {
  if (integration.mode !== "router_intent") {
    return null;
  }

  const expiresAt = integration.integration?.expiresAt ?? integration.expiresAt ?? null;

  if (expiresAt === null) {
    return null;
  }

  return expiresAt < MILLIS_THRESHOLD ? expiresAt * 1000 : expiresAt;
}

export function isRouterIntentExpired(
  integration: {
    mode?: string;
    integration?: {
      expiresAt?: number;
    };
    expiresAt?: number;
  },
  now = Date.now(),
) {
  const expiresAt = getRouterIntentExpiresAt(integration);
  return expiresAt !== null ? now > expiresAt : false;
}
