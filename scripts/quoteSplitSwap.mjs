#!/usr/bin/env node

import { isAddress, parseUnits } from "ethers";
import { createRouter as createSdkRouter } from "empx-swap-sdk";
import { fileURLToPath } from "node:url";
import path from "node:path";

export const DEFAULT_RECIPIENT = "0x000000000000000000000000000000000000dEaD";

export const HELP_TEXT = `Fetch one preview-only split quote from empx-swap-sdk.

Usage:
  npm run quote:split -- \\
    --chain <chain-id> \\
    --token-in <erc20-address> \\
    --token-out <erc20-address> \\
    --amount <human-readable-amount> \\
    [--recipient <address>] \\
    [--rpc <url>] \\
    [--max-steps <1-4>] \\
    [--slippage-bps <0-1000>] \\
    [--max-splits <2-4>] \\
    [--min-savings-bps <0-10000>] \\
    [--split-search-timeout-ms <1-60000>] \\
    [--timeout-ms <1000-300000>]

Notes:
  - Uses quoteSplitSwap() with routing=\"split\".
  - Prints only genuine split previews; it never submits a transaction.
  - --amount is converted using token-in decimals fetched from chain.
  - Defaults to maxSplits=3, minSavingsBps=1, and a 15000ms SDK split search.
  - --timeout-ms is the outer script safety timeout and defaults to 60000ms.
  - --recipient defaults to ${DEFAULT_RECIPIENT}.
`;

const CLI_OPTIONS = new Map([
  ["--chain", "chainId"],
  ["--token-in", "tokenIn"],
  ["--token-out", "tokenOut"],
  ["--amount", "amount"],
  ["--recipient", "recipient"],
  ["--rpc", "rpcUrl"],
  ["--max-steps", "maxSteps"],
  ["--slippage-bps", "slippageBps"],
  ["--max-splits", "maxSplits"],
  ["--min-savings-bps", "minSavingsBps"],
  ["--split-search-timeout-ms", "splitSearchTimeoutMs"],
  ["--timeout-ms", "timeoutMs"],
]);

function cliError(message) {
  const error = new Error(message);
  error.code = "INVALID_ARGUMENT";
  return error;
}

function parseInteger(value, flag, { min, max }) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < min || parsed > max) {
    throw cliError(`${flag} must be an integer between ${min} and ${max}`);
  }
  return parsed;
}

export function parseCliArgs(argv) {
  if (argv.includes("--help") || argv.includes("-h")) return { help: true };

  const values = {};
  for (let index = 0; index < argv.length; index += 1) {
    const raw = argv[index];
    const [flag, inlineValue] = raw.split("=", 2);
    const key = CLI_OPTIONS.get(flag);
    if (!key) throw cliError(`Unknown option: ${flag}`);

    const value = inlineValue ?? argv[index + 1];
    if (!value || (!inlineValue && value.startsWith("--"))) {
      throw cliError(`Missing value for ${flag}`);
    }
    values[key] = value;
    if (inlineValue == null) index += 1;
  }

  for (const required of ["chainId", "tokenIn", "tokenOut", "amount"]) {
    if (!values[required]) {
      const flag = [...CLI_OPTIONS].find(([, key]) => key === required)?.[0];
      throw cliError(`Missing required option: ${flag}`);
    }
  }

  const chainId = parseInteger(values.chainId, "--chain", {
    min: 1,
    max: Number.MAX_SAFE_INTEGER,
  });
  const recipient = values.recipient ?? DEFAULT_RECIPIENT;
  for (const [flag, address] of [
    ["--token-in", values.tokenIn],
    ["--token-out", values.tokenOut],
    ["--recipient", recipient],
  ]) {
    if (!isAddress(address)) throw cliError(`${flag} must be a valid EVM address`);
  }
  if (values.tokenIn.toLowerCase() === values.tokenOut.toLowerCase()) {
    throw cliError("--token-in and --token-out must be different");
  }
  if (!/^(?:0|[1-9]\d*)(?:\.\d+)?$/.test(values.amount) || Number(values.amount) <= 0) {
    throw cliError("--amount must be a positive decimal value");
  }

  return {
    chainId,
    tokenIn: values.tokenIn,
    tokenOut: values.tokenOut,
    amount: values.amount,
    recipient,
    rpcUrl: values.rpcUrl,
    maxSteps: parseInteger(values.maxSteps ?? "3", "--max-steps", { min: 1, max: 4 }),
    slippageBps: parseInteger(values.slippageBps ?? "200", "--slippage-bps", {
      min: 0,
      max: 1_000,
    }),
    maxSplits: parseInteger(values.maxSplits ?? "3", "--max-splits", { min: 2, max: 4 }),
    minSavingsBps: parseInteger(
      values.minSavingsBps ?? "1",
      "--min-savings-bps",
      { min: 0, max: 10_000 },
    ),
    splitSearchTimeoutMs: parseInteger(
      values.splitSearchTimeoutMs ?? "15000",
      "--split-search-timeout-ms",
      { min: 1, max: 60_000 },
    ),
    timeoutMs: parseInteger(values.timeoutMs ?? "60000", "--timeout-ms", {
      min: 1_000,
      max: 300_000,
    }),
  };
}

async function withTimeout(promise, timeoutMs, onTimeout) {
  let timeoutId;
  const timeout = new Promise((_, reject) => {
    timeoutId = setTimeout(() => {
      onTimeout?.();
      const error = new Error(`SDK split quote timed out after ${timeoutMs}ms`);
      error.code = "REQUEST_TIMEOUT";
      reject(error);
    }, timeoutMs);
  });
  try {
    return await Promise.race([promise, timeout]);
  } finally {
    clearTimeout(timeoutId);
  }
}

export async function fetchSplitQuote(input, dependencies = {}) {
  const createRouter = dependencies.createRouter ?? createSdkRouter;
  const onProgress = dependencies.onProgress ?? (() => {});
  const router = createRouter(input.chainId, input.rpcUrl);
  onProgress("resolving token-in decimals");
  const tokenInDecimals = await router.getTokenDecimals(input.tokenIn);
  const amountRaw = parseUnits(input.amount, tokenInDecimals);
  onProgress(`SDK is evaluating up to ${input.maxSplits ?? 3} split legs`);
  const quote = await withTimeout(
    router.quoteSplitSwap(
      amountRaw,
      input.tokenIn,
      input.tokenOut,
      input.recipient,
      {
        routing: "split",
        maxSteps: input.maxSteps ?? 3,
        slippageBps: input.slippageBps ?? 200,
        maxSplits: input.maxSplits ?? 3,
        minSavingsBps: input.minSavingsBps ?? 1,
        splitSearchTimeoutMs: input.splitSearchTimeoutMs ?? 15_000,
      },
    ),
    input.timeoutMs ?? 60_000,
    () => router.provider?.destroy?.(),
  );
  if (quote.routing !== "split" || !Array.isArray(quote.splits) || quote.splits.length < 2) {
    const error = new Error("SDK returned no genuine split quote");
    error.code = "NO_SPLIT_QUOTE";
    throw error;
  }

  const receivedAt = Date.now();
  return {
    kind: "split_quote",
    chainId: input.chainId,
    tokenIn: input.tokenIn,
    tokenOut: input.tokenOut,
    recipient: input.recipient,
    amount: input.amount,
    amountRaw: amountRaw.toString(),
    tokenInDecimals,
    receivedAt,
    expiresInMs: Math.max(
      0,
      Number(quote.validUntil ?? quote.tradeInfo?.validUntil ?? 0) - receivedAt,
    ),
    quote,
  };
}

function errorPayload(error) {
  if (typeof error?.toJSON === "function") {
    const serialized = error.toJSON();
    if (serialized?.error) return serialized;
  }
  return {
    error: {
      code: error?.code ?? "UNKNOWN_ERROR",
      message: error?.message ?? String(error),
      retryable: Boolean(error?.retryable),
      context: error?.context ?? error?.details ?? {},
    },
  };
}

function isNoSplitError(error) {
  return [
    "NO_SPLIT_QUOTE",
    "SPLIT_UNAVAILABLE",
    "SPLIT_NOT_BENEFICIAL",
    "SPLIT_SIMULATION_FAILED",
  ].includes(error?.code);
}

function jsonStringify(value) {
  return JSON.stringify(
    value,
    (_key, item) => (typeof item === "bigint" ? item.toString() : item),
    2,
  );
}

export async function runCli(argv, dependencies = {}) {
  const stdout = dependencies.stdout ?? process.stdout;
  const stderr = dependencies.stderr ?? process.stderr;
  const fetchQuote = dependencies.fetchSplitQuote ?? fetchSplitQuote;
  let startedAt;

  try {
    const input = parseCliArgs(argv);
    if (input.help) {
      stdout.write(HELP_TEXT);
      return 0;
    }
    startedAt = Date.now();
    const onProgress = (message) => {
      stderr.write(`[split-quote] ${message}\n`);
    };
    onProgress(
      `searching for a split quote on chain ${input.chainId} with maxSplits=${input.maxSplits}`,
    );
    const result = await fetchQuote(input, { ...dependencies, onProgress });
    result.elapsedMs = Date.now() - startedAt;
    onProgress(`completed in ${result.elapsedMs}ms`);
    stdout.write(`${jsonStringify(result)}\n`);
    return 0;
  } catch (error) {
    if (startedAt !== undefined) {
      stderr.write(`[split-quote] stopped after ${Date.now() - startedAt}ms\n`);
    }
    stderr.write(`${jsonStringify(errorPayload(error))}\n`);
    return isNoSplitError(error) ? 2 : 1;
  }
}

const isMain =
  process.argv[1] &&
  path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url));

if (isMain) {
  process.exitCode = await runCli(process.argv.slice(2));
}
