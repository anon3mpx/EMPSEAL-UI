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
// The legacy `swapContractApi` shape is still accepted as an optional input
// for widget integrations that need full control over the write surface.
// When provided, it short-circuits the SDK path entirely.  When absent, the
// SDK path is used.  This preserves the existing contractApi prop on Emp.
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
 *   Optional legacy override.  When provided, short-circuits the SDK path
 *   entirely and uses this object's methods instead.  Useful for widget
 *   integrators who need full control over the write surface.  When absent
 *   (the default in the main dApp), the SDK path runs.
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
  onSwapSubmitted,
}) {
  // ─── State machine ─────────────────────────────────────────────────────────
  const [swapStatus, setSwapStatus] = useState("IDLE");
  const [swapHash, setSwapHash] = useState("");
  const [swapSuccess, setSwapSuccess] = useState(false);
  const [needsApproval, setNeedsApproval] = useState(false);

  // ─── SDK seam (default path) ───────────────────────────────────────────────
  const { router, signer } = useEmpxRouter();

  // True iff caller passed a working override (all three methods present).
  const useLegacyOverride =
    !!swapContractApi &&
    typeof swapContractApi.checkAllowance === "function" &&
    typeof swapContractApi.callApprove === "function" &&
    typeof swapContractApi.swapTokens === "function";

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

        if (useLegacyOverride) {
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
    useLegacyOverride,
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

    if (useLegacyOverride) {
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
      if (useLegacyOverride) {
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
