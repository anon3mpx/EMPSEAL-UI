import { useSendTransaction, useWaitForTransactionReceipt, useAccount, useSwitchChain, useWalletClient } from 'wagmi';
import { toast } from 'react-toastify';
import { useSearchTransaction, useGetChains } from './useGasBridgeAPI';
import { useEffect, useState } from 'react';
import { useGasBridgeStore } from '../redux/store/gasBridgeStore';

export const useGasBridgeTx = () => {
  const [txHash, setTxHash] = useState(null);
  
  const { sendTransactionAsync, isPending: isSending } = useSendTransaction();
  const { switchChainAsync } = useSwitchChain();
  const { chainId } = useAccount();
  const { data: walletClient } = useWalletClient();
  const { fromChainId } = useGasBridgeStore();
  const { data: chains } = useGetChains();

  const { data: receipt, isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({
    hash: txHash,
  });

  // Start polling for backend status once the on-chain tx is confirmed
  const { data: backendStatus, isLoading: isPolling } = useSearchTransaction({
    hash: isConfirmed ? txHash : null,
  });

  const executeBridge = async (txData) => {
    try {
      // 1. Check Chain
      if (chainId !== fromChainId) {
        const targetChain = chains?.find((c) => c.chain === fromChainId);
        
        if (!targetChain) {
          toast.error(`Chain data not found for ID ${fromChainId}`);
          return;
        }

        try {
          // Try standard switch (works if chain is in wagmi config)
          await switchChainAsync({ chainId: fromChainId });
        } catch (switchError) {
          // If chain not configured or switch failed, try adding it manually
          // Error code 4902 indicates the chain has not been added to the wallet.
          // We also catch generic errors as wagmi might throw "Chain not configured"
          if (walletClient) {
             try {
               await walletClient.request({
                 method: 'wallet_addEthereumChain',
                 params: [
                   {
                     chainId: `0x${fromChainId.toString(16)}`,
                     chainName: targetChain.name,
                     nativeCurrency: {
                       name: targetChain.symbol,
                       symbol: targetChain.symbol,
                       decimals: targetChain.decimals || 18,
                     },
                     rpcUrls: targetChain.rpcs,
                     blockExplorerUrls: targetChain.explorer ? [targetChain.explorer] : [],
                   },
                 ],
               });
               // After adding, we assume the wallet switches to it or we can try switching again.
               // Most wallets switch automatically upon addition.
             } catch (addError) {
               console.error("Failed to add chain:", addError);
               toast.error("Failed to switch/add network. Please switch manually.");
               return;
             }
          } else {
             console.error("No wallet client available to add chain");
             toast.error("Please switch network manually in your wallet.");
             return;
          }
        }
      }

      // 2. Send Transaction
      toast.info('Waiting for signature...');
      const hash = await sendTransactionAsync({
        to: txData.to,
        value: txData.value,
        data: txData.data,
      });

      setTxHash(hash);
      toast.success('Transaction submitted! Waiting for confirmation...');

    } catch (error) {
      console.error("Bridge Execution Failed:", error);
      if (error.message?.includes('User rejected')) {
         toast.error("Transaction rejected by user.");
      } else {
         toast.error(error.message || 'Transaction failed');
      }
    }
  };

  useEffect(() => {
    if (isConfirming) {
      // Toast for confirming state
    }
    if (isConfirmed && receipt) {
      toast.success('Transaction confirmed on source chain! Verifying bridge...');
    }
  }, [isConfirming, isConfirmed, receipt]);

  useEffect(() => {
    if (isPolling) {
      // Toast for polling state
    }
    if (backendStatus?.deposit?.status === 'CONFIRMED') {
      toast.success('Bridge complete! Funds received on destination chain.');
    } else if (backendStatus?.deposit?.status === 'ERROR') {
      toast.error('An error occurred with the bridge transfer.');
    }
  }, [isPolling, backendStatus]);

  return {
    executeBridge,
    isSending,
    isConfirming,
    isConfirmed,
    isPolling,
    txHash,
    backendStatus,
  };
};
