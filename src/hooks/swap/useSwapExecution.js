// ─── useSwapExecution ────────────────────────────────────────────────────────
//
// Owns the transaction-submission surface of the swap page: the swap status
// state machine, the allowance check, the approval flow, and the actual swap
// call.
//
// SDK-FIRST (W2 wiring, C3 audit decision: "Hybrid")
// ──────────────────────────────────────────────────
// The default execution path now goes through empx-swap-sdk via the
// useEmpxRouter root hook:
//   • Allowance check  → router.checkAllowance(token, owner, requiredAmount)
//   • Approval submit  → router.getApprovalCalldata(token, amount)
//                         → signer.sendTransaction(calldata) → tx.wait()
//   • Swap submit      → router.getSwapCalldata / getSwapFromNativeCalldata /
//                         getSwapToNativeCalldata / getWrapCalldata /
//                         getUnwrapCalldata  (picked by native/wrapped check)
//                         → signer.sendTransaction(calldata) → tx.wait()
//
// Backward-compat override
// ────────────────────────
// The legacy `swapContractApi` shape is still accepted as an optional write
// surface for the V1 contract route shared with Emp.  `executionMode` controls
// whether the hook uses SDK writes only, legacy writes only, or auto mode
// (prefer SDK, fall back to legacy when the SDK write surface is unavailable).
//
// State machine (preserved from pre-W2)
// ─────────────────────────────────────
//   "IDLE"                       → initial / after modal close
//   "APPROVING"                   → approval tx in flight
//   "APPROVED"                    → approval mined successfully
//   "WAITING_FOR_CONFIRMATION"    → bridge between approve success and swap
//   "SWAPPING"                    → swap tx in flight (legacy emitted "PROCESSING")
//   "SWAPPED"                     → swap mined successfully
//   "ERROR" / "FAILED"            → terminal error
//
// Allowance handling
// ──────────────────
// On every change to (chainId, address, selectedTokenA, debouncedAmountIn),
// re-fetches the on-chain allowance and sets needsApproval.  Skipped when
// the sellToken is the native sentinel (no approval concept).
//
// Auto-chain
// ──────────
// On successful approval, handleApprove auto-calls confirmSwap so the user
// doesn't have to click twice.  Matches the original UX exactly.

import { useEffect, useState } from "react";
import { toast } from "../../utils/toastHelper";
import { convertToBigInt } from "../../utils/utils";
import { EMPTY_ADDRESS } from "../../utils/contractCalls";
import { useEmpxRouter } from "./useEmpxRouter";
import {
  SWAP_EXECUTION_MODE,
  hasSwapContractApi,
  resolveSwapExecutionMode,
} from "./swapExecutionMode";
import {
  checkPreparedAllowance,
  getSwapExecutionErrorMessage,
  getPreparedApproval,
  isPreparedRouteExpired,
  prepareExecutableSdkRoute,
  submitPreparedSdkRoute,
} from "./swapPreparedExecution";

const NATIVE_ADDRESSES = new Set([
  EMPTY_ADDRESS.toLowerCase(),
  "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee",
]);
const EXPIRED_QUOTE_MESSAGE = "Quote expired. Refresh the quote and try again.";
const MIN_EXECUTION_WINDOW_MS = 10_000;

function isNativeAddress(addr) {
  return !!addr && NATIVE_ADDRESSES.has(addr.toLowerCase());
}

async function assertSignerContext({ signer, address, chainId }) {
  const signerAddressPromise =
    typeof signer?.getAddress === "function" && address
      ? signer.getAddress()
      : Promise.resolve(null);
  const networkPromise =
    typeof signer?.provider?.getNetwork === "function"
      ? signer.provider.getNetwork()
      : Promise.resolve(null);
  const [signerAddress, network] = await Promise.all([
    signerAddressPromise,
    networkPromise,
  ]);

  if (signerAddress && signerAddress.toLowerCase() !== address.toLowerCase()) {
    throw new Error("Connected wallet account changed. Review the swap and try again.");
  }

  if (network && Number(network.chainId) !== Number(chainId)) {
    throw new Error("Connected wallet network changed. Switch back and try again.");
  }
}

/**
 * @param {Object} input
 * @param {number}  input.chainId
 * @param {string}  input.address                  - connected wallet address (may be falsy when disconnected)
 * @param {Object|null} input.selectedTokenA       - sell token (with .address + .decimal)
 * @param {Object|null} input.selectedTokenB       - buy token
 * @param {string}  input.amountIn                 - user-typed sell amount (decimal string)
 * @param {string}  input.debouncedAmountIn        - debounced version used for allowance check
 * @param {unknown} input.tradeInfo                - route + amounts blob produced by setCalculatedRoute
 * @param {unknown} input.preparedRoute            - displayed route including source, routing, and SDK calldata
 * @param {number}  input.protocolFee              - basis points (15 for stable pairs, 28 otherwise)
 * @param {boolean} input.isRefreshingQuote        - guard against submitting against a stale quote
 * @param {{ checkAllowance, callApprove, swapTokens } | null} [input.swapContractApi]
 *   Optional legacy write surface shared with the classic Emp swap page.
 * @param {"sdk" | "legacy" | "auto"} [input.executionMode]
 *   "sdk" uses SDK writes only. "legacy" uses swapContractApi when available.
 *   "auto" follows preparedRoute.source: SDK calldata for SDK routes and the
 *   supplied contract API for local fallback routes.
 * @param {() => void} [input.onSwapSubmitted]     - called after a successful swap
 */
export function useSwapExecution({
  chainId,
  address,
  selectedTokenA,
  selectedTokenB,
  amountIn,
  debouncedAmountIn,
  tradeInfo,
  preparedRoute,
  protocolFee,
  isRefreshingQuote,
  swapContractApi,
  executionMode = SWAP_EXECUTION_MODE.SDK,
  onSwapSubmitted,
}) {
  // ─── State machine ─────────────────────────────────────────────────────────
  const [swapStatus, setSwapStatus] = useState("IDLE");
  const [swapHash, setSwapHash] = useState("");
  const [swapSuccess, setSwapSuccess] = useState(false);
  const [needsApproval, setNeedsApproval] = useState(false);
  const [executionError, setExecutionError] = useState(null);

  // ─── SDK seam (default path) ───────────────────────────────────────────────
  const { router, signer } = useEmpxRouter({ chainId });

  // Resolve once per render so allowance, approval, and swap submission agree
  // on the same write surface.
  const executionSurface = resolveSwapExecutionMode({
    executionMode,
    routeSource: preparedRoute?.source,
    hasLegacyApi: hasSwapContractApi(swapContractApi),
    hasRouter: Boolean(router),
    hasSigner: Boolean(signer),
  });
  const useLegacyExecution = executionSurface.mode === SWAP_EXECUTION_MODE.LEGACY;
  const activeTradeInfo = preparedRoute?.tradeInfo ?? tradeInfo;

  // ─── Allowance check ───────────────────────────────────────────────────────
  // Re-runs whenever the things that could change allowance status change.
  // Skip when the sell token is native (no approval concept for native sends).
  useEffect(() => {
    const checkApproval = async () => {
      if (
        !address ||
        !selectedTokenA ||
        isNativeAddress(selectedTokenA.address) ||
        !debouncedAmountIn ||
        parseFloat(debouncedAmountIn) <= 0
      ) {
        setNeedsApproval(false);
        return;
      }

      try {
        const amountInBigInt = convertToBigInt(
          debouncedAmountIn,
          selectedTokenA.decimal,
        );

        if (useLegacyExecution) {
          // Legacy shape: returns { data: bigint } — `data` is the allowance.
          const allowance = await swapContractApi.checkAllowance(
            chainId,
            selectedTokenA.address,
            address,
          );
          setNeedsApproval(allowance.data < amountInBigInt);
        } else if (router && preparedRoute?.source === "sdk") {
          // SDK shape: returns { approved, allowance: string }.
          const allowance = await checkPreparedAllowance({
            route: preparedRoute,
            router,
            token: selectedTokenA.address,
            owner: address,
            amount: amountInBigInt,
          });
          setNeedsApproval(!allowance.approved);
        } else {
          // No SDK router AND no override — likely chain not in registry, or
          // signer still loading.  Conservative default: don't claim approval
          // is needed (user can't approve without a working write surface
          // anyway).  The UI guards against submit while this is the case.
          setNeedsApproval(false);
        }
      } catch (error) {
        console.error("Error checking allowance:", error);
      }
    };

    checkApproval();
  }, [
    chainId,
    address,
    selectedTokenA,
    debouncedAmountIn,
    swapContractApi,
    useLegacyExecution,
    router,
    preparedRoute,
  ]);

  // ─── Internal: SDK-driven approval submission ──────────────────────────────
  const submitApprovalViaSdk = async (amountInBigInt) => {
    if (!router) throw new Error("SDK router unavailable");
    if (!signer) throw new Error("No wallet signer connected");

    const calldata = getPreparedApproval({
      route: preparedRoute,
      router,
      token: selectedTokenA.address,
      amount: amountInBigInt,
    });

    const tx = await signer.sendTransaction({
      to: calldata.to,
      data: calldata.data,
      value: BigInt(calldata.value || "0"),
    });
    await tx.wait();

    // Re-check allowance to confirm the on-chain state caught up.
    const fresh = await checkPreparedAllowance({
      route: preparedRoute,
      router,
      token: selectedTokenA.address,
      owner: address,
      amount: amountInBigInt,
    });
    return fresh.approved;
  };

  // ─── Internal: SDK-driven swap submission ──────────────────────────────────
  //
  // Re-prepares from post-approval state, validates split calldata, then sends
  // the exact SDK transaction request.
  const submitSwapViaSdk = async () => {
    if (!router) throw new Error("SDK router unavailable");
    if (!signer) throw new Error("No wallet signer connected");
    if (preparedRoute?.source !== "sdk") {
      throw new Error("SDK prepared route unavailable");
    }
    if (
      preparedRoute.recipient &&
      address &&
      preparedRoute.recipient.toLowerCase() !== address.toLowerCase()
    ) {
      throw new Error("Prepared route recipient no longer matches the connected wallet");
    }
    await assertSignerContext({ signer, address, chainId });
    const executableRoute = await prepareExecutableSdkRoute({
      route: preparedRoute,
      router,
      sender: address,
    });
    if (
      isPreparedRouteExpired(
        executableRoute,
        Date.now(),
        MIN_EXECUTION_WINDOW_MS,
      )
    ) {
      const error = new Error("SDK quote is too close to expiry");
      error.code = "QUOTE_EXPIRED";
      throw error;
    }

    if (
      selectedTokenA?.address &&
      !isNativeAddress(selectedTokenA.address)
    ) {
      const amountInBigInt = convertToBigInt(
        amountIn,
        selectedTokenA.decimal,
      );
      const allowance = await checkPreparedAllowance({
        route: executableRoute,
        router,
        token: selectedTokenA.address,
        owner: address,
        amount: amountInBigInt,
      });
      if (!allowance.approved) {
        setNeedsApproval(true);
        throw new Error("Token approval is required for the refreshed SDK route");
      }
    }

    const hash = await submitPreparedSdkRoute({
      route: executableRoute,
      signer,
      router,
      sender: address,
    });
    setSwapHash(hash);
    return hash;
  };

  // ─── confirmSwap: actual swap submission ──────────────────────────────────
  const confirmSwap = async () => {
    if (amountIn !== debouncedAmountIn || isRefreshingQuote) {
      toast.error("Refreshing quote. Please wait.");
      return null;
    }

    if (selectedTokenA?.address === selectedTokenB?.address) {
      return null;
    }

    if (
      isPreparedRouteExpired(
        preparedRoute ?? (activeTradeInfo ? { tradeInfo: activeTradeInfo } : undefined),
      )
    ) {
      setSwapStatus("ERROR");
      setSwapSuccess(false);
      setExecutionError(EXPIRED_QUOTE_MESSAGE);
      toast.error(EXPIRED_QUOTE_MESSAGE);
      return null;
    }

    setExecutionError(null);

    if (useLegacyExecution) {
      // ───── Legacy path: callsite-provided swapContractApi ─────────────────
      try {
        await swapContractApi.swapTokens(
          (s) => setSwapStatus(s),
          (hash) => setSwapHash(hash),
          selectedTokenA?.address,
          selectedTokenB?.address,
          address,
          activeTradeInfo,
          chainId,
          protocolFee,
        );
        setSwapSuccess(true);
        setExecutionError(null);
        onSwapSubmitted?.();
      } catch (error) {
        console.error("Swap failed (legacy)", error);
        setSwapStatus("ERROR");
        setSwapSuccess(false);
        setExecutionError(getSwapExecutionErrorMessage(error));
      }
      return;
    }

    // ───── SDK path ─────
    try {
      setSwapStatus("SWAPPING");
      await submitSwapViaSdk();
      setSwapStatus("SWAPPED");
      setSwapSuccess(true);
      setExecutionError(null);
      toast.success("Transaction Successful");
      onSwapSubmitted?.();
    } catch (error) {
      const message = getSwapExecutionErrorMessage(error);
      setSwapStatus("ERROR");
      setExecutionError(message);
      toast.error(message);
      console.error("Swap failed (SDK)", error);
      setSwapSuccess(false);
    }
  };

  // ─── handleApprove: approval then auto-confirm ─────────────────────────────
  const handleApprove = async () => {
    try {
      setExecutionError(null);
      setSwapStatus("APPROVING");
      const amountInBigInt = convertToBigInt(amountIn, selectedTokenA.decimal);

      let approved = false;
      if (useLegacyExecution) {
        await swapContractApi.callApprove(
          chainId,
          selectedTokenA.address,
          amountInBigInt,
        );
        const allowance = await swapContractApi.checkAllowance(
          chainId,
          selectedTokenA.address,
          address,
        );
        approved = allowance.data >= amountInBigInt;
      } else {
        approved = await submitApprovalViaSdk(amountInBigInt);
      }

      if (approved) {
        setNeedsApproval(false);
        setSwapStatus("APPROVED");
        toast.success("Token approved!");
        setSwapStatus("WAITING_FOR_CONFIRMATION");
        await confirmSwap();
      }
    } catch (error) {
      setSwapStatus("ERROR");
      console.error("Approval failed:", error);
      const message = getSwapExecutionErrorMessage(error, { phase: "approval" });
      setExecutionError(message);
      toast.error(message);
    }
  };

  return {
    // state
    swapStatus,
    setSwapStatus,
    swapHash,
    setSwapHash,
    swapSuccess,
    setSwapSuccess,
    needsApproval,
    executionError,
    // actions
    handleApprove,
    confirmSwap,
  };
}
