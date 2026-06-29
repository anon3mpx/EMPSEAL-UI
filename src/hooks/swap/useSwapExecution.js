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

const NATIVE_ADDRESSES = new Set([
  EMPTY_ADDRESS.toLowerCase(),
  "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee",
]);

function isNativeAddress(addr) {
  return !!addr && NATIVE_ADDRESSES.has(addr.toLowerCase());
}

function isSameAddress(a, b) {
  return !!a && !!b && a.toLowerCase() === b.toLowerCase();
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
 * @param {number}  input.protocolFee              - basis points (15 for stable pairs, 28 otherwise)
 * @param {boolean} input.isRefreshingQuote        - guard against submitting against a stale quote
 * @param {{ checkAllowance, callApprove, swapTokens } | null} [input.swapContractApi]
 *   Optional legacy write surface shared with the classic Emp swap page.
 * @param {"sdk" | "legacy" | "auto"} [input.executionMode]
 *   "sdk" uses SDK writes only. "legacy" uses swapContractApi when available.
 *   "auto" prefers SDK writes and falls back to swapContractApi only when the
 *   SDK write surface is not ready.
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

  // ─── SDK seam (default path) ───────────────────────────────────────────────
  const { router, signer } = useEmpxRouter({ chainId });

  // Resolve once per render so allowance, approval, and swap submission agree
  // on the same write surface.
  const executionSurface = resolveSwapExecutionMode({
    executionMode,
    hasLegacyApi: hasSwapContractApi(swapContractApi),
    hasRouter: Boolean(router),
    hasSigner: Boolean(signer),
  });
  const useLegacyExecution = executionSurface.mode === SWAP_EXECUTION_MODE.LEGACY;

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
        } else if (router) {
          // SDK shape: returns { approved, allowance: string }.
          const allowance = await router.checkAllowance(
            selectedTokenA.address,
            address,
            amountInBigInt,
          );
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
  ]);

  // ─── Internal: SDK-driven approval submission ──────────────────────────────
  const submitApprovalViaSdk = async (amountInBigInt) => {
    if (!router) throw new Error("SDK router unavailable");
    if (!signer) throw new Error("No wallet signer connected");

    const calldata = router.getApprovalCalldata(
      selectedTokenA.address,
      amountInBigInt,
    );

    const tx = await signer.sendTransaction({
      to: calldata.to,
      data: calldata.data,
      value: BigInt(calldata.value || "0"),
    });
    await tx.wait();

    // Re-check allowance to confirm the on-chain state caught up.
    const fresh = await router.checkAllowance(
      selectedTokenA.address,
      address,
      amountInBigInt,
    );
    return fresh.approved;
  };

  // ─── Internal: SDK-driven swap submission ──────────────────────────────────
  //
  // Picks the correct calldata builder based on the token roles:
  //   • native → wrapped     → getWrapCalldata
  //   • wrapped → native     → getUnwrapCalldata
  //   • native → ERC-20      → getSwapFromNativeCalldata
  //   • ERC-20 → native      → getSwapToNativeCalldata
  //   • ERC-20 → ERC-20      → getSwapCalldata
  const submitSwapViaSdk = async () => {
    if (!router) throw new Error("SDK router unavailable");
    if (!signer) throw new Error("No wallet signer connected");

    const tokenInAddr = selectedTokenA?.address;
    const tokenOutAddr = selectedTokenB?.address;
    const wrappedNative = router.chain.WRAPPED_NATIVE;

    const isTokenInNative = isNativeAddress(tokenInAddr);
    const isTokenOutNative = isNativeAddress(tokenOutAddr);
    const isTokenInWrapped = isSameAddress(tokenInAddr, wrappedNative);
    const isTokenOutWrapped = isSameAddress(tokenOutAddr, wrappedNative);

    // Fee passed as basis-point string to match SDK signatures.
    const feeBpsStr = String(protocolFee);

    let calldata;
    if (isTokenInNative && isTokenOutWrapped) {
      calldata = router.getWrapCalldata({ amountIn: String(tradeInfo.amountIn) });
    } else if (isTokenInWrapped && isTokenOutNative) {
      calldata = router.getUnwrapCalldata({ amountIn: String(tradeInfo.amountIn) });
    } else if (isTokenInNative) {
      calldata = router.getSwapFromNativeCalldata(tradeInfo, address, feeBpsStr);
    } else if (isTokenOutNative) {
      calldata = router.getSwapToNativeCalldata(tradeInfo, address, feeBpsStr);
    } else {
      calldata = router.getSwapCalldata(tradeInfo, address, feeBpsStr);
    }

    const tx = await signer.sendTransaction({
      to: calldata.to,
      data: calldata.data,
      value: BigInt(calldata.value || "0"),
    });
    setSwapHash(tx.hash);
    await tx.wait();
    return tx.hash;
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

    if (useLegacyExecution) {
      // ───── Legacy path: callsite-provided swapContractApi ─────────────────
      try {
        await swapContractApi.swapTokens(
          (s) => setSwapStatus(s),
          (hash) => setSwapHash(hash),
          selectedTokenA?.address,
          selectedTokenB?.address,
          address,
          tradeInfo,
          chainId,
          protocolFee,
        );
        setSwapSuccess(true);
        onSwapSubmitted?.();
      } catch (error) {
        console.error("Swap failed (legacy)", error);
        setSwapSuccess(false);
      }
      return;
    }

    // ───── SDK path ─────
    try {
      setSwapStatus("SWAPPING");
      await submitSwapViaSdk();
      setSwapStatus("SWAPPED");
      setSwapSuccess(true);
      toast.success("Transaction Successful");
      onSwapSubmitted?.();
    } catch (error) {
      const msg = error?.message || String(error);
      if (msg.includes("EmpsealRouter: Insufficient output amount")) {
        setSwapStatus("ERROR");
        toast.error("Output amount too high. Adjust slippage and retry.");
      } else if (msg.includes("user rejected") || msg.includes("User denied")) {
        setSwapStatus("ERROR");
        toast.error("Transaction rejected");
      } else {
        setSwapStatus("ERROR");
        toast.error("Swap failed");
      }
      console.error("Swap failed (SDK)", error);
      setSwapSuccess(false);
    }
  };

  // ─── handleApprove: approval then auto-confirm ─────────────────────────────
  const handleApprove = async () => {
    try {
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
      const msg = error?.message || String(error);
      if (msg.includes("user rejected") || msg.includes("User denied")) {
        toast.error("Approval rejected");
      } else {
        toast.error("Token approval failed");
      }
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
    // actions
    handleApprove,
    confirmSwap,
  };
}
