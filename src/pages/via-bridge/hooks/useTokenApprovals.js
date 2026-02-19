import { useState, useCallback } from 'react';
import { useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { ERC20_ABI } from '../../../utils/via-bridge-abis/index';

export const useTokenApprovals = () => {
  const [currentHash, setCurrentHash] = useState(null);
  const [approvalError, setApprovalError] = useState(null);
  const [currentType, setCurrentType] = useState(null);

  const { writeContractAsync } = useWriteContract();

  const { isLoading: isWaiting, isSuccess, isError } = useWaitForTransactionReceipt({
    hash: currentHash,
    query: {
      enabled: !!currentHash,
    },
  });

  const executeIndividual = useCallback(async (type, params) => {
    const { address, spender, amount, chainId } = params;

    setCurrentHash(null);
    setApprovalError(null);
    setCurrentType(type);

    try {
      const hash = await writeContractAsync({
        address,
        abi: ERC20_ABI,
        functionName: 'approve',
        args: [spender, amount],
        chainId,
      });

      setCurrentHash(hash);
      return { success: true, hash, type };
    } catch (error) {
      if (error?.message?.includes('User rejected') || error?.code === 4001) {
        setApprovalError({ cancelled: true, message: 'Transaction cancelled' });
        return { success: false, error, cancelled: true };
      }
      setApprovalError(error);
      return { success: false, error };
    }
  }, [writeContractAsync]);

  const resetState = useCallback(() => {
    setCurrentHash(null);
    setApprovalError(null);
    setCurrentType(null);
  }, []);

  return {
    executeIndividual,
    isLoading: isWaiting,
    isSuccess,
    isError,
    error: approvalError,
    currentType,
    hash: currentHash,
    resetState,
  };
};
