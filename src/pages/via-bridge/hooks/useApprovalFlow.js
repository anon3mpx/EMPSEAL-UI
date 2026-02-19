import { useCallback, useEffect, useMemo, useState } from "react";
import { useTokenApprovals } from "./useTokenApprovals";

const FLOW_STATUS = {
  IDLE: "idle",
  SUBMITTING: "submitting",
  WAITING_CONFIRMATION: "waiting_confirmation",
  DONE: "done",
  CANCELLED: "cancelled",
  ERROR: "error",
};

export const useApprovalFlow = () => {
  const [status, setStatus] = useState(FLOW_STATUS.IDLE);
  const [queue, setQueue] = useState([]);
  const [approvalIndex, setApprovalIndex] = useState(0);
  const [flowError, setFlowError] = useState(null);

  const {
    executeIndividual,
    isLoading,
    isSuccess,
    isError,
    error,
    resetState,
  } = useTokenApprovals();

  const currentApproval = queue[approvalIndex] ?? null;

  const clearFlow = useCallback(() => {
    setQueue([]);
    setApprovalIndex(0);
    setFlowError(null);
    setStatus(FLOW_STATUS.IDLE);
    resetState();
  }, [resetState]);

  const submitApproval = useCallback(
    async (approval, approvalChainId) => {
      if (!approval || !approvalChainId) return;

      setStatus(FLOW_STATUS.SUBMITTING);
      const result = await executeIndividual(approval.type, {
        address: approval.tokenAddress,
        spender: approval.spender,
        amount: approval.amount,
        chainId: approvalChainId,
      });

      if (result?.cancelled) {
        setStatus(FLOW_STATUS.CANCELLED);
        return;
      }

      if (!result?.success) {
        setFlowError(result?.error ?? new Error("Approval transaction failed"));
        setStatus(FLOW_STATUS.ERROR);
        return;
      }

      setStatus(FLOW_STATUS.WAITING_CONFIRMATION);
    },
    [executeIndividual],
  );

  const startApprovals = useCallback(
    async (approvals, selectedChainId) => {
      if (!approvals || approvals.length === 0) {
        return { started: false };
      }

      setQueue(approvals);
      setApprovalIndex(0);
      setFlowError(null);
      await submitApproval(approvals[0], selectedChainId);
      return { started: true };
    },
    [submitApproval],
  );

  useEffect(() => {
    if (!isSuccess || status !== FLOW_STATUS.WAITING_CONFIRMATION) return;

    resetState();
    const nextIndex = approvalIndex + 1;

    if (nextIndex >= queue.length) {
      setStatus(FLOW_STATUS.DONE);
      return;
    }

    const nextApproval = queue[nextIndex];
    setApprovalIndex(nextIndex);
    submitApproval(nextApproval, queue[nextIndex]?.chainId);
  }, [isSuccess, status, approvalIndex, queue, submitApproval, resetState]);

  useEffect(() => {
    if (!error && !isError) return;
    setFlowError(error ?? new Error("Approval transaction failed"));
    setStatus(FLOW_STATUS.ERROR);
  }, [error, isError]);

  const remainingCount = useMemo(() => {
    if (!queue.length) return 0;
    return Math.max(queue.length - approvalIndex, 1);
  }, [queue, approvalIndex]);

  const isApproving =
    status === FLOW_STATUS.SUBMITTING ||
    status === FLOW_STATUS.WAITING_CONFIRMATION ||
    isLoading;

  return {
    startApprovals,
    clearFlow,
    status,
    flowError,
    isApproving,
    remainingCount,
    currentApproval,
    queue,
    approvalIndex,
    isDone: status === FLOW_STATUS.DONE,
    isCancelled: status === FLOW_STATUS.CANCELLED,
    isFailed: status === FLOW_STATUS.ERROR,
    FLOW_STATUS,
  };
};
