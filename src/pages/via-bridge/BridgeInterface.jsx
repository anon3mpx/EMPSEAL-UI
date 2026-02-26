import { useState, useEffect, useCallback } from "react";
import {
  useAccount,
  useReadContract,
  useWriteContract,
  useWaitForTransactionReceipt,
  useSwitchChain,
} from "wagmi";
import { parseUnits, formatEther, formatUnits } from "viem";
import { toast } from "../../utils/toastHelper";
import { Loader2, AlertCircle, CheckCircle2, Check, Copy } from "lucide-react";

import ChainSelector from "./components/ChainSelector";
import TokenSelector from "./components/TokenSelector";
import SelectionModal from "./components/SelectionModal";
import RecentTransactions from "../../components/RecentTransactions";
import { useRecentTransactions } from "../../hooks/useRecentTransactions";
import {
  BRIDGE_CONFIG,
  getTokensArray,
  getTokenById,
  getDefaultToken,
  hasToken,
} from "./config/bridgeConfig";
import UpDownAr from "../../assets/images/reverse.svg";

// Import ABIs
import { ERC20_ABI } from "../../utils/via-bridge-abis/index";
import { useApprovalFlow } from "./hooks/useApprovalFlow";

// PulseChain network symbol for GeckoTerminal API
const PULSECHAIN_SYMBOL = "pulsechain";

// Dummy transactions for testing
// const dummyTransactions = [
//   {
//     hash: "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef",
//     explorerUrl: "https://etherscan.io",
//     timestamp: Date.now() - 1000 * 60 * 5,
//     fromChainName: "Ethereum",
//     toChainName: "Arbitrum",
//   },
//   {
//     hash: "0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890",
//     explorerUrl: "https://arbiscan.io",
//     timestamp: Date.now() - 1000 * 60 * 60,
//     fromChainName: "Arbitrum",
//     toChainName: "Optimism",
//   },
//   {
//     hash: "0x9876543210fedcba9876543210fedcba9876543210fedcba9876543210fedcba",
//     explorerUrl: "https://optimistic.etherscan.io",
//     timestamp: Date.now() - 1000 * 60 * 60 * 24,
//     fromChainName: "Optimism",
//     toChainName: "Base",
//   },
// ];

const BridgeInterface = () => {
  const { address, chain } = useAccount();
  const { switchChain } = useSwitchChain();
  const { transactions, addTransaction, clearTransactions } =
    useRecentTransactions();

  // const displayTransactions =
  //   transactions?.length > 0 ? transactions : dummyTransactions;

  // ----------------------------------------------------------------
  // 1. STATE & CONFIG
  // ----------------------------------------------------------------

  const [fromChainId, setFromChainId] = useState(null);
  const [toChainId, setToChainId] = useState(null);
  const [selectedToken, setSelectedToken] = useState(null);

  const [isFromChainModalOpen, setIsFromChainModalOpen] = useState(false);
  const [isToChainModalOpen, setIsToChainModalOpen] = useState(false);
  const [isTokenModalOpen, setIsTokenModalOpen] = useState(false);
  const [amount, setAmount] = useState("1");
  const [recipient, setRecipient] = useState("");

  // Token price states
  const [tokenPrice, setTokenPrice] = useState(null);
  const [usdValue, setUsdValue] = useState("0.00");
  const [isPriceLoading, setIsPriceLoading] = useState(false);

  // Add separate price state for destination token
  const [destTokenPrice, setDestTokenPrice] = useState(null);
  const [destUsdValue, setDestUsdValue] = useState("0.00");
  const [isDestPriceLoading, setIsDestPriceLoading] = useState(false);

  // Add refresh trigger for approval flow
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const sourceChain = fromChainId ? BRIDGE_CONFIG[fromChainId] : null;
  const destChain = toChainId ? BRIDGE_CONFIG[toChainId] : null;
  const isCorrectChain = chain?.id === fromChainId;

  // Add copy functionality states
  const [copySuccess, setCopySuccess] = useState(false);
  const [activeTokenAddress, setActiveTokenAddress] = useState(null);

  // ----------------------------------------------------------------
  // COPY ADDRESS HANDLER
  // ----------------------------------------------------------------
  const handleCopyAddress = async (address) => {
    try {
      await navigator.clipboard.writeText(address);
      setActiveTokenAddress(address);
      setCopySuccess(true);
      toast.success("Address copied to clipboard!");

      // Reset after 2 seconds
      setTimeout(() => {
        setCopySuccess(false);
        setActiveTokenAddress(null);
      }, 2000);
    } catch (err) {
      console.error("Failed to copy address:", err);
      toast.error("Failed to copy address");
    }
  };

  // ----------------------------------------------------------------
  // 2. DATA FETCHING (FEES, ALLOWANCES, BALANCES)
  // ----------------------------------------------------------------

  const [bridgeFees, setBridgeFees] = useState(null);

  const bridgeFeesAbi = selectedToken?.abi;
  const bridgeFeesContractAddress = selectedToken?.bridge;

  // PulseChain (Synthetic) -> 369 | Base (Collateral) -> 8453
  // const bridgeFeesDestChainId =
  //   sourceChain.abiType === "synthetic" ? 369 : 8453;
  const bridgeFeesDestChainId = toChainId;

  const { data: fetchedBridgeFees } = useReadContract({
    address: bridgeFeesContractAddress,
    abi: bridgeFeesAbi,
    functionName: "getBridgeFees",
    args: [bridgeFeesDestChainId],
    chainId: fromChainId,
    query: {
      enabled: !!fromChainId && !!bridgeFeesContractAddress,
    },
  });

  useEffect(() => {
    if (fetchedBridgeFees) {
      setBridgeFees(fetchedBridgeFees);
    }
  }, [fetchedBridgeFees]);

  useEffect(() => {
    if (!selectedToken) {
      setBridgeFees(null);
    }
  }, [selectedToken]);

  // ----------------------------------------------------------------
  // TOKEN PRICE FETCHING
  // ----------------------------------------------------------------

  // Source token price (collateral on PulseChain)
  useEffect(() => {
    const fetchTokenPrice = async () => {
      if (!selectedToken) {
        setTokenPrice(null);
        setUsdValue("0.00");
        return;
      }

      setIsPriceLoading(true);

      try {
        // Get the collateral token address from PulseChain
        let collateralTokenAddress;

        if (selectedToken.abiType === "collateral") {
          // Token is on PulseChain, use its address directly
          collateralTokenAddress = selectedToken.address.toLowerCase();
        } else {
          // Token is synthetic on another chain, find the collateral token on PulseChain
          const pulseChainConfig = BRIDGE_CONFIG[369];
          if (pulseChainConfig && pulseChainConfig.tokens[selectedToken.id]) {
            collateralTokenAddress =
              pulseChainConfig.tokens[selectedToken.id].address.toLowerCase();
          } else {
            console.error(
              "Could not find collateral token for:",
              selectedToken.id,
            );
            setTokenPrice(null);
            setIsPriceLoading(false);
            return;
          }
        }

        // Fetch price from GeckoTerminal using PulseChain network
        const response = await fetch(
          `https://api.geckoterminal.com/api/v2/simple/networks/${PULSECHAIN_SYMBOL}/token_price/${collateralTokenAddress}`,
        );

        if (!response.ok) {
          throw new Error(`HTTP error! Status: ${response.status}`);
        }

        const data = await response.json();
        const tokenPrices = data?.data?.attributes?.token_prices;

        if (tokenPrices && tokenPrices[collateralTokenAddress]) {
          const price = tokenPrices[collateralTokenAddress];
          setTokenPrice(price);

          // Calculate USD value
          const amountNum = parseFloat(amount) || 0;
          const priceNum = parseFloat(price) || 0;
          setUsdValue((amountNum * priceNum).toFixed(2));
        } else {
          setTokenPrice(null);
          setUsdValue("0.00");
        }
      } catch (error) {
        console.error("Error fetching token price:", error.message);
        setTokenPrice(null);
        setUsdValue("0.00");
      } finally {
        setIsPriceLoading(false);
      }
    };

    fetchTokenPrice();
  }, [selectedToken, amount]);

  // Destination token price (synthetic on destination chain)
  useEffect(() => {
    const fetchDestTokenPrice = async () => {
      if (!selectedToken || !toChainId) {
        setDestTokenPrice(null);
        setDestUsdValue("0.00");
        return;
      }

      setIsDestPriceLoading(true);

      try {
        // Get the synthetic token address on the destination chain
        let syntheticTokenAddress;
        const destChainConfig = BRIDGE_CONFIG[toChainId];

        if (destChainConfig && destChainConfig.tokens[selectedToken.id]) {
          // Use the token address on the destination chain (synthetic)
          syntheticTokenAddress =
            destChainConfig.tokens[selectedToken.id].address.toLowerCase();
        } else {
          console.error(
            "Could not find synthetic token for:",
            selectedToken.id,
            "on chain:",
            toChainId,
          );
          setDestTokenPrice(null);
          setIsDestPriceLoading(false);
          return;
        }

        // Map chain ID to GeckoTerminal network identifier
        let networkSymbol;
        switch (toChainId) {
          case 8453: // Base
            networkSymbol = "base";
            break;
          case 369: // PulseChain
            networkSymbol = "pulsechain";
            break;
          case 56: // BSC
            networkSymbol = "bsc";
            break;
          case 137: // Polygon
            networkSymbol = "polygon";
            break;
          case 42161: // Arbitrum
            networkSymbol = "arbitrum";
            break;
          case 10: // Optimism
            networkSymbol = "optimism";
            break;
          case 43114: // Avalanche
            networkSymbol = "avalanche";
            break;
          default:
            networkSymbol = null;
        }

        if (!networkSymbol) {
          // console.log("No network symbol mapping for chain:", toChainId);
          setDestTokenPrice(null);
          setDestUsdValue("0.00");
          setIsDestPriceLoading(false);
          return;
        }

        // Fetch price from GeckoTerminal using destination network
        const response = await fetch(
          `https://api.geckoterminal.com/api/v2/simple/networks/${networkSymbol}/token_price/${syntheticTokenAddress}`,
        );

        if (!response.ok) {
          throw new Error(`HTTP error! Status: ${response.status}`);
        }

        const data = await response.json();
        const tokenPrices = data?.data?.attributes?.token_prices;

        if (tokenPrices && tokenPrices[syntheticTokenAddress]) {
          const price = tokenPrices[syntheticTokenAddress];
          setDestTokenPrice(price);

          // Calculate USD value for destination
          const amountNum = parseFloat(amount) || 0;
          const priceNum = parseFloat(price) || 0;
          setDestUsdValue((amountNum * priceNum).toFixed(2));
        } else {
          setDestTokenPrice(null);
          setDestUsdValue("0.00");
        }
      } catch (error) {
        console.error("Error fetching destination token price:", error.message);
        setDestTokenPrice(null);
        setDestUsdValue("0.00");
      } finally {
        setIsDestPriceLoading(false);
      }
    };

    fetchDestTokenPrice();
  }, [selectedToken, toChainId, amount]);

  // --- USDC DATA ---
  // Allowance
  const { data: usdcAllowance, refetch: refetchUsdcAllowance } =
    useReadContract({
      address: sourceChain?.usdcAddress,
      abi: ERC20_ABI,
      functionName: "allowance",
      args: [address, selectedToken?.bridge],
      chainId: fromChainId,
      query: {
        enabled:
          !!address &&
          !!sourceChain &&
          !!sourceChain.usdcAddress &&
          !!selectedToken?.bridge,
      },
    });
  // Balance
  const { data: usdcBalance, refetch: refetchUsdcBalance } = useReadContract({
    address: sourceChain?.usdcAddress,
    abi: ERC20_ABI,
    functionName: "balanceOf",
    args: [address],
    chainId: fromChainId,
    query: { enabled: !!address && !!sourceChain && !!sourceChain.usdcAddress },
  });

  // --- WRAPPED GAS TOKEN DATA (WPLS/WETH) ---
  // Allowance
  const {
    data: wrappedGasTokenAllowance,
    refetch: refetchWrappedGasTokenAllowance,
  } = useReadContract({
    address: sourceChain?.wrappedGasTokenAddress,
    abi: ERC20_ABI,
    functionName: "allowance",
    args: [address, selectedToken?.bridge],
    chainId: fromChainId,
    query: {
      enabled:
        !!address &&
        !!sourceChain &&
        !!sourceChain.wrappedGasTokenAddress &&
        !!selectedToken?.bridge,
    },
  });
  // Balance
  const {
    data: wrappedGasTokenBalance,
    refetch: refetchWrappedGasTokenBalance,
  } = useReadContract({
    address: sourceChain?.wrappedGasTokenAddress,
    abi: ERC20_ABI,
    functionName: "balanceOf",
    args: [address],
    chainId: fromChainId,
    query: {
      enabled:
        !!address && !!sourceChain && !!sourceChain.wrappedGasTokenAddress,
    },
  });

  // --- SOURCE TOKEN DATA ---
  const { data: tokenBalance, refetch: refetchTokenBalance } = useReadContract({
    address: selectedToken?.address,
    abi: ERC20_ABI,
    functionName: "balanceOf",
    args: [address],
    chainId: fromChainId,
    query: { enabled: !!address && !!selectedToken?.address && !!fromChainId },
  });
  const { data: tokenDecimals } = useReadContract({
    address: selectedToken?.address,
    abi: ERC20_ABI,
    functionName: "decimals",
    chainId: fromChainId,
    query: { enabled: !!selectedToken?.address && !!fromChainId },
  });
  // Allowance
  const { data: tokenAllowance, refetch: refetchTokenAllowance } =
    useReadContract({
      address: selectedToken?.address,
      abi: ERC20_ABI,
      functionName: "allowance",
      args: [address, selectedToken?.bridge],
      chainId: fromChainId,
      query: {
        enabled:
          !!address &&
          !!selectedToken?.address &&
          !!selectedToken?.bridge &&
          !!fromChainId,
      },
    });

  // ----------------------------------------------------------------
  // 3. DERIVED STATE & VALIDATION
  // ----------------------------------------------------------------

  const selectedTokenDecimals = Number(tokenDecimals ?? 18);
  const parseTokenAmount = useCallback(
    (value) => {
      if (!value) return 0n;
      try {
        return parseUnits(value, selectedTokenDecimals);
      } catch {
        return 0n;
      }
    },
    [selectedTokenDecimals],
  );

  const amountBigInt = parseTokenAmount(amount);

  // Allowances (Default to 0n)
  const currentTokenAllowance = tokenAllowance ?? 0n;
  const currentUsdcAllowance = usdcAllowance ?? 0n;
  const currentWrappedGasAllowance = wrappedGasTokenAllowance ?? 0n;

  // Balances
  const currentTokenBalance = tokenBalance ?? 0n;
  const currentUsdcBalance = usdcBalance ?? 0n;
  const currentWrappedGasBalance = wrappedGasTokenBalance ?? 0n;

  // Requirements
  const requiredUsdc = bridgeFees ? bridgeFees[3] : 0n;
  const requiredGasToken = bridgeFees ? bridgeFees[2] : 0n;

  // --- Validation Flags ---
  // Check if selected token IS the wrapped gas token (WPLS case)
  const isWrappingGasToken =
    selectedToken?.address?.toLowerCase() ===
    sourceChain?.wrappedGasTokenAddress?.toLowerCase();

  // When token IS wrapped gas token, combine balance and allowance checks
  let needsTokenApproval, needsWrappedGasTokenApproval, totalTokenAmount;

  if (isWrappingGasToken) {
    // Combined: need (bridge amount + gas fees) in WPLS
    totalTokenAmount = amountBigInt + requiredGasToken;
    needsTokenApproval = currentTokenAllowance < totalTokenAmount;
    needsWrappedGasTokenApproval = false; // Same token, handled above
  } else {
    // Normal: separate checks
    totalTokenAmount = amountBigInt;
    needsTokenApproval = currentTokenAllowance < amountBigInt;
    needsWrappedGasTokenApproval =
      currentWrappedGasAllowance < requiredGasToken;
  }

  // 1. Check Insufficient Balances
  const hasInsufficientTokenBalance = isWrappingGasToken
    ? currentTokenBalance < totalTokenAmount // Need combined balance
    : currentTokenBalance < amountBigInt; // Just bridge amount

  const hasInsufficientUsdcBalance = currentUsdcBalance < requiredUsdc;
  const hasInsufficientGasTokenBalance = isWrappingGasToken
    ? false // Already checked in token balance
    : currentWrappedGasBalance < requiredGasToken;

  // 2. Check Approval Needs (already set above)
  const needsUsdcApproval = currentUsdcAllowance < requiredUsdc;

  // --- Determine Current Step ---
  // Step 1: Input / Connect
  // Step 2: Approvals (Only if balances are sufficient)
  // Step 3: Ready to Bridge
  let currentStep = 1;

  if (!address || !isCorrectChain || !amount || parseFloat(amount) === 0) {
    currentStep = 1;
  } else if (bridgeFees) {
    // If any approval is needed, go to Step 2
    if (
      needsTokenApproval ||
      needsUsdcApproval ||
      needsWrappedGasTokenApproval
    ) {
      currentStep = 2;
    } else {
      // If all approvals met, go to Step 3
      currentStep = 3;
    }
  } else {
    // Fees loading
    currentStep = 1;
  }

  // ----------------------------------------------------------------
  // 4. CONTRACT WRITES
  // ----------------------------------------------------------------

  const { writeContractAsync: executeBridge } = useWriteContract();
  const [bridgeHash, setBridgeHash] = useState(null);
  const [displayBridgeHash, setDisplayBridgeHash] = useState(null);
  const [bridgeUiStatus, setBridgeUiStatus] = useState("idle");
  const [lastHandledBridgeHash, setLastHandledBridgeHash] = useState(null);

  const {
    startApprovals,
    clearFlow,
    status: approvalFlowStatus,
    flowError,
    isApproving,
    remainingCount,
    currentApproval,
    isDone,
    isCancelled,
    isFailed,
  } = useApprovalFlow();

  const { isLoading: isBridging, isSuccess: isBridged } =
    useWaitForTransactionReceipt({
      hash: bridgeHash,
      query: { enabled: !!bridgeHash },
    });

  useEffect(() => {
    if (address) setRecipient(address);
  }, [address]);

  // Refetch Everything on Success - Memoized with useCallback
  const refetchAll = useCallback(() => {
    refetchTokenAllowance();
    refetchUsdcAllowance();
    refetchWrappedGasTokenAllowance();
    refetchTokenBalance();
    refetchUsdcBalance();
    refetchWrappedGasTokenBalance();
  }, [
    refetchTokenAllowance,
    refetchUsdcAllowance,
    refetchWrappedGasTokenAllowance,
    refetchTokenBalance,
    refetchUsdcBalance,
    refetchWrappedGasTokenBalance,
  ]);

  // Monitor allowance changes to trigger refresh
  useEffect(() => {
    if (
      tokenAllowance !== undefined ||
      usdcAllowance !== undefined ||
      wrappedGasTokenAllowance !== undefined
    ) {
      // Small delay to ensure state updates
      const timer = setTimeout(() => {
        setRefreshTrigger((prev) => prev + 1);
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [tokenAllowance, usdcAllowance, wrappedGasTokenAllowance]);

  // ----------------------------------------------------------------
  // 6. ACTION HANDLERS
  // ----------------------------------------------------------------

  // Helper function to get pending approvals queue (must be before useEffects that use it)
  const getApprovalQueue = useCallback(() => {
    const approvals = [];

    // 1. Main token approval
    if (needsTokenApproval) {
      const amount = isWrappingGasToken
        ? amountBigInt + requiredGasToken // Combined for WPLS
        : amountBigInt;

      approvals.push({
        type: "token",
        tokenAddress: selectedToken.address,
        spender: selectedToken.bridge,
        amount,
        symbol: selectedToken.symbol,
        chainId: fromChainId,
      });
    }

    // 2. USDC approval
    if (needsUsdcApproval) {
      approvals.push({
        type: "usdc",
        tokenAddress: sourceChain.usdcAddress,
        spender: selectedToken.bridge,
        amount: requiredUsdc,
        symbol: "USDC",
        chainId: fromChainId,
      });
    }

    // 3. Gas token approval (only if NOT wrapping gas token)
    if (needsWrappedGasTokenApproval && !isWrappingGasToken) {
      approvals.push({
        type: "gasToken",
        tokenAddress: sourceChain.wrappedGasTokenAddress,
        spender: selectedToken.bridge,
        amount: requiredGasToken,
        symbol: fromChainId === 369 ? "WPLS" : "WETH",
        chainId: fromChainId,
      });
    }

    return approvals;
  }, [
    needsTokenApproval,
    isWrappingGasToken,
    amountBigInt,
    requiredGasToken,
    selectedToken,
    needsUsdcApproval,
    sourceChain,
    needsWrappedGasTokenApproval,
    fromChainId,
  ]);

  const handleApprove = useCallback(async () => {
    if (!bridgeFees) {
      toast.error("Bridge fees not loaded yet.");
      return;
    }

    const queue = getApprovalQueue();

    if (queue.length === 0) {
      toast.info("All tokens already approved!");
      return;
    }

    await startApprovals(queue, fromChainId);
  }, [bridgeFees, getApprovalQueue, startApprovals, fromChainId]);

  // ----------------------------------------------------------------
  // 5. EFFECT HANDLERS (must be after action handlers)
  // ----------------------------------------------------------------

  useEffect(() => {
    if (isBridged && bridgeHash && bridgeHash !== lastHandledBridgeHash) {
      setLastHandledBridgeHash(bridgeHash);
      setBridgeUiStatus("success");
      toast.success("Bridge transaction submitted!");
      addTransaction({
        hash: bridgeHash,
        timestamp: Date.now(),
        fromAddress: address,
        fromChainName: sourceChain?.name || "Unknown",
        toChainName: destChain?.name || "Unknown",
        explorerUrl: sourceChain?.explorer,
      });
      setAmount("");
      refetchAll();
    }
  }, [
    isBridged,
    bridgeHash,
    lastHandledBridgeHash,
    sourceChain?.name,
    sourceChain?.explorer,
    destChain?.name,
    addTransaction,
    refetchAll,
  ]);

  useEffect(() => {
    if (bridgeUiStatus !== "success") return;

    const resetTimer = setTimeout(() => {
      setBridgeUiStatus("idle");
      setBridgeHash(null);
    }, 2500);

    return () => clearTimeout(resetTimer);
  }, [bridgeUiStatus]);

  // Approval flow status handlers
  useEffect(() => {
    if (approvalFlowStatus === "submitting" && currentApproval) {
      toast.info(`Approving ${currentApproval.symbol}...`);
    }
  }, [approvalFlowStatus, currentApproval]);

  // Updated approval completion handler with delay
  useEffect(() => {
    if (isDone) {
      toast.success("All required approvals completed!");

      // Add delay to allow blockchain to update
      setTimeout(() => {
        refetchAll();
      }, 1500);

      clearFlow();
    }
  }, [isDone, clearFlow, refetchAll]);

  useEffect(() => {
    if (isCancelled) {
      toast.warning("Transaction cancelled");
      clearFlow();
    }
  }, [isCancelled, clearFlow]);

  useEffect(() => {
    if (isFailed) {
      if (flowError?.cancelled) {
        toast.warning("Transaction cancelled");
      } else {
        toast.error("Approval failed. Please try again.");
        console.error("Approval flow error:", flowError);
      }
      clearFlow();
    }
  }, [isFailed, flowError, clearFlow]);

  const handleBridge = useCallback(async () => {
    try {
      const amountBigInt = parseTokenAmount(amount);
      const abiToUse = selectedToken?.abi;

      if (!abiToUse) {
        toast.error("Unsupported token type");
        return;
      }

      if (amountBigInt <= 0n) {
        toast.error("Enter a valid amount");
        return;
      }

      const hash = await executeBridge({
        address: selectedToken.bridge,
        abi: abiToUse,
        functionName: "bridge",
        args: [toChainId, recipient, amountBigInt],
        chainId: fromChainId,
      });

      setBridgeHash(hash);
      setDisplayBridgeHash(hash);
      setBridgeUiStatus("pending");
      toast.info("Initiating bridge...");
    } catch (error) {
      setBridgeUiStatus("idle");
      toast.error("Bridge failed");
      console.error(error);
    }
  }, [
    amount,
    selectedToken,
    toChainId,
    recipient,
    fromChainId,
    executeBridge,
    parseTokenAmount,
  ]);

  const handleSwapDirection = () => {
    const newFromChainId = toChainId;
    const newToChainId = fromChainId;

    // Find the same token on the new source chain
    const newToken = getTokenById(newFromChainId, selectedToken?.id);

    setFromChainId(newFromChainId);
    setToChainId(newToChainId);
    setAmount("");
    setSelectedToken(newToken || getDefaultToken(newFromChainId));
  };

  const handlePercentageChange = (value) => {
    // Note: tokenBalance from useReadContract is BigInt
    if (tokenBalance === undefined) return;
    setSelectedPercentage(value);
    const bal = Number(formatUnits(tokenBalance, selectedTokenDecimals));
    const calculatedAmount = (bal * value) / 100;
    setAmount(calculatedAmount.toString());
  };

  const [selectedPercentage, setSelectedPercentage] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  // ----------------------------------------------------------------
  // 7. RENDER HELPERS
  // ----------------------------------------------------------------

  const renderButton = useCallback(() => {
    if (!address) return <button disabled>Connect Wallet</button>;
    if (!isCorrectChain)
      return (
        <button onClick={() => switchChain({ chainId: fromChainId })}>
          Switch to {sourceChain?.name}
        </button>
      );
    if (bridgeUiStatus === "success")
      return (
        <button disabled className="flex gap-2 items-center justify-center">
          <CheckCircle2 className="w-5 h-5" /> Bridged
        </button>
      );

    // Check if bridgeFees are loaded
    if (!bridgeFees && currentStep > 1) {
      return <button disabled>Loading fees...</button>;
    }

    // Step 1: Input Validation
    if (currentStep === 1) {
      return (
        <button disabled={!amount || parseFloat(amount) === 0}>
          Enter Amount
        </button>
      );
    }

    // Step 2: Approvals (with Balance Checks)
    if (currentStep === 2) {
      const queue = getApprovalQueue();
      const queueCount = isApproving ? remainingCount : queue.length;

      // PRIORITY: Check Balances First
      if (hasInsufficientTokenBalance)
        return (
          <button disabled className="w-full cursor-not-allowed opacity-50">
            Insufficient{" "}
            {isWrappingGasToken
              ? `${selectedToken.symbol} (incl. gas)`
              : selectedToken.symbol}
          </button>
        );
      if (hasInsufficientUsdcBalance)
        return (
          <button disabled className="w-full cursor-not-allowed opacity-50">
            Insufficient USDC
          </button>
        );
      if (hasInsufficientGasTokenBalance)
        return (
          <button disabled className="w-full cursor-not-allowed opacity-50">
            Insufficient {fromChainId === 369 ? "WPLS" : "WETH"}
          </button>
        );

      // Show approval button
      if (isApproving) {
        return (
          <button disabled className="w-full flex justify-center items-center">
            <Loader2 className="w-5 h-5 animate-spin" />
            {`Approving ${currentApproval?.symbol ?? queue[0]?.symbol ?? "token"}...`}
          </button>
        );
      }

      // Single "Approve" button with refresh option
      return (
        <div className="w-full space-y-2">
          <button
            onClick={handleApprove}
            disabled={!amount || !bridgeFees}
            className="w-full flex justify-center items-center"
          >
            Approve{queueCount > 1 ? ` (${queueCount} tokens)` : ""}
          </button>
          <button
            onClick={() => {
              refetchAll();
              toast.info("Checking approval status...");
            }}
            className="text-xs text-[#FF9900] hover:text-[#FF9900]/80 underline w-full text-center"
          >
            Refresh approval status
          </button>
        </div>
      );
    }

    // Step 3: Bridge
    if (currentStep === 3) {
      return (
        <button
          onClick={handleBridge}
          disabled={isBridging || !amount || !recipient}
          className="w-full flex gap-2 items-center justify-center"
        >
          {isBridging || bridgeUiStatus === "pending" ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" /> Bridging...
            </>
          ) : (
            <>
              <CheckCircle2 className="w-5 h-5" /> Bridge Tokens
            </>
          )}
        </button>
      );
    }
    return null;
  }, [
    amount,
    address,
    isCorrectChain,
    bridgeUiStatus,
    currentStep,
    isApproving,
    isBridging,
    bridgeFees,
    hasInsufficientTokenBalance,
    hasInsufficientUsdcBalance,
    hasInsufficientGasTokenBalance,
    isWrappingGasToken,
    selectedToken,
    recipient,
    handleApprove,
    handleBridge,
    getApprovalQueue,
    remainingCount,
    currentApproval,
    refetchAll,
    fromChainId,
    sourceChain?.name,
    switchChain,
  ]);

  const maxInputDecimals = Math.min(6, selectedTokenDecimals);
  // Function to format the number with commas
  const formatNumber = (value) => {
    if (!value) return ""; // Handle empty input

    const [integerPart, decimalPart] = value.split("."); // Split into integer and decimal parts
    const formattedInteger = integerPart
      .replace(/\D/g, "") // Allow only digits
      .replace(/\B(?=(\d{3})+(?!\d))/g, ""); // Add commas to integer part

    // If there's a decimal part, return formatted integer + decimal
    if (decimalPart === undefined || maxInputDecimals === 0)
      return formattedInteger;
    return `${formattedInteger}.${decimalPart.replace(/\D/g, "").slice(0, maxInputDecimals)}`;
  };
  const getDynamicFontSize = (value, desktop = 48, mobile = 32) => {
    const length = value?.replace(/\D/g, "").length || 0;
    const baseSize = window.innerWidth >= 768 ? desktop : mobile;

    return Math.max(12, baseSize - length * 1.5);
  };

  return (
    <>
      {/* scales-b scales-top scales-top_via */}
      <div className="md:max-w-[750px] scales-b scales-top_via_1 mx-auto w-full md:px-1 px-4 justify-center xl:gap-4 gap-4 items-start 2xl:pt-2 py-2 md:mt-4 mt-1">
        {!isCorrectChain && address && sourceChain && (
          <div
            className="mb-4 flex items-start gap-3 cursor-pointer bg_swap_box_chain"
            onClick={() => switchChain({ chainId: fromChainId })}
          >
            <AlertCircle className="w-5 h-5 text-[#FF9900] mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium text-[#FF9900]">
                Wrong Network
              </p>
              <p className="text-sm text-[#FF9900]">
                Click to switch to {sourceChain?.name}
              </p>
            </div>
          </div>
        )}
        <div className="lg:max-w-[750px] md:max-w-[750px] mx-auto w-full">
          <div className="flex gap-3 md:flex-nowrap flex-wrap">
            <div className="relative bg_swap_box_chain flex justify-center items-center wfu">
              <ChainSelector
                chain={sourceChain}
                onClick={() => setIsFromChainModalOpen(true)}
              />
            </div>
            <div className="relative bg_swap_box w-full">
              <div className="flex justify-between gap-3 items-center">
                <div className="font-orbitron md:text-[15px] text-xs font-extrabold leading-normal text-[#FF9900]">
                  From
                </div>
                <div className="md:text-xs text-[10px] font-orbitron">
                  <span className="font-normal leading-normal text-[#FF9900]">
                    BAL
                  </span>
                  <span className="font-normal leading-normal text-[#FF9900]">
                    {" "}
                    :{" "}
                  </span>
                  <span className="text-white leading-normal">
                    {tokenBalance
                      ? parseFloat(
                          formatUnits(tokenBalance, selectedTokenDecimals),
                        ).toFixed(6)
                      : "0.00"}{" "}
                  </span>
                </div>
              </div>
              <div className="flex w-full mt-3 md:gap-5 gap-2 mt6 items-center">
                <div className="lg:md:max-w-[220px] w-full">
                  <div className="relative flex md:gap-2 gap-1 items-center bg-black border border-[#FF9900] md:rounded-[10px] rounded-lg md:px-5 px-3 md:py-[10px] py-2 justify-center w-full">
                    <TokenSelector
                      token={selectedToken}
                      chainId={fromChainId}
                      onClick={() => {
                        if (!fromChainId) {
                          toast.error("Please select chain first");
                          return;
                        }
                        setIsTokenModalOpen(true);
                      }}
                      className="text-[#FF9900]"
                    />
                    <button
                      onClick={() => handleCopyAddress(selectedToken.address)}
                      className="rounded-md transition-colors"
                      title="Copy token address"
                    >
                      {copySuccess &&
                      activeTokenAddress === selectedToken.address ? (
                        <Check className="md:w-4 md:h-4 w-3 h-3 text-green-500" />
                      ) : (
                        <Copy className="md:w-4 md:h-4 w-3 h-3 text-white hover:text-[#FF9900]" />
                      )}
                    </button>
                  </div>
                </div>
                <div className="w-full md:h-[53px] h-9">
                  {(() => {
                    const formattedValue = formatNumber(
                      amount?.toString() || "",
                    );

                    const outputLength =
                      formattedValue.replace(/\D/g, "").length || 0;

                    const defaultFontSize =
                      window.innerWidth >= 1024
                        ? 28
                        : window.innerWidth >= 768
                          ? 24
                          : 20;
                    const FREE_DIGITS = window.innerWidth >= 768 ? 13 : 6;
                    // const FREE_DIGITS = 12; // no shrink up to 10 digits
                    const SHRINK_RATE = 3; // slow shrink rate

                    const excessDigits = Math.max(
                      0,
                      outputLength - FREE_DIGITS,
                    );

                    const dynamicFontSize = Math.max(
                      10,
                      defaultFontSize - excessDigits * SHRINK_RATE,
                    );

                    return (
                      <>
                        <input
                          type="text"
                          value={formattedValue}
                          onChange={(e) =>
                            setAmount(formatNumber(e.target.value))
                          }
                          placeholder={
                            tokenBalance?.formatted === "0.000000"
                              ? "0"
                              : "0.00"
                          }
                          className="font-orbitron font-extrabold text-white rounded-[10px] px-1 py-3 text-end w-full h-full outline-none border-none transition-all duration-200 ease-in-out bg-black space"
                          style={{
                            fontSize: `${dynamicFontSize}px`,
                          }}
                        />

                        <button
                          onClick={() => {
                            if (tokenBalance !== undefined) {
                              setAmount(
                                formatUnits(
                                  tokenBalance,
                                  selectedTokenDecimals,
                                ),
                              );
                              setSelectedPercentage(100);
                            }
                          }}
                          className="mt-2 ml-auto py-1 border border-[#FF9900] flex justify-center items-center rounded-xl md:text-[10px] text-[7px] font-medium font-orbitron md:w-[100px] w-[80px] px-2 bg-[#FFE7C3] text-[#040404] hover:border-black hover:bg-[#FF9900] hover:text-black"
                        >
                          MAX AMOUNT
                        </button>
                      </>
                    );
                  })()}
                </div>
              </div>
              <div className="flex justify-between gap-2 items-center md:mt-10 mt-7">
                <div className="text-[#FF9900] font-orbitron md:text-[15px] text-xs flex flex-col relative top-2">
                  {isPriceLoading ? (
                    <span className="animate-pulse">Loading...</span>
                  ) : tokenPrice ? (
                    `$${parseFloat(tokenPrice).toFixed(6)}`
                  ) : (
                    "--"
                  )}
                  <span className="font-bold mt-1">Market Price</span>
                </div>
                <div className="text-zinc-200 text-[10px] font-normal font-orbitron leading-normal flex md:gap-2 gap-1 justify-end">
                  <span></span>
                  {[25, 50, 75, 100].map((value) => (
                    <button
                      key={value}
                      type="button"
                      className={`py-1 border border-[#EEC485] flex justify-center items-center rounded-xl md:text-[10px] text-[8px] font-medium font-orbitron md:w-12 w-11 px-2
                ${
                  selectedPercentage === value
                    ? "!text-black !bg-[#FF9900] border-[#FF9900]"
                    : "bg-[#EEC485] text-[#040404] border-black hover:border-black hover:bg-[#FF9900] hover:text-black"
                }`}
                      onClick={() => handlePercentageChange(value)}
                      disabled={isLoading}
                    >
                      {value}%
                    </button>
                  ))}
                </div>
              </div>
              {/* USD Value Display */}
              <div className="text-right text-white md:text-sm text-xs mt-2 font-orbitron">
                {isPriceLoading ? (
                  <span className="animate-pulse">Fetching...</span>
                ) : tokenPrice ? (
                  <span>${usdValue}</span>
                ) : (
                  <span>--</span>
                )}
              </div>
            </div>
          </div>
          <div
            className="cursor-pointer mx-auto my-4 relative md:w-[50px] w-10"
            onClick={handleSwapDirection}
          >
            <img
              src={UpDownAr}
              alt="Ar"
              className="hoverswap transition-all rounded-xl"
            />
          </div>
          {/* TO SECTION */}
          <div className="flex gap-3 md:flex-nowrap flex-wrap">
            <div className="relative bg_swap_box_chain flex justify-center items-center wfu">
              <ChainSelector
                chain={destChain}
                onClick={() => setIsToChainModalOpen(true)}
              />
            </div>
            <div className="relative text-white bg_swap_box_black w-full">
              <div className="flex justify-between gap-3 items-center">
                <div className="font-orbitron md:text-[15px] text-xs font-extrabold leading-normal text-[#FF9900]">
                  To
                </div>
              </div>
              <div className="flex w-full mt-3 md:gap-5 gap-2 mt6 items-center">
                <div className="lg:md:max-w-[220px] w-full">
                  <div className="relative flex md:gap-2 gap-1 items-center bg-black border border-[#FF9900] md:rounded-[10px] rounded-lg md:px-5 px-3 md:py-[10px] py-2 justify-center w-full">
                    <TokenSelector
                      token={selectedToken}
                      chainId={fromChainId}
                      onClick={() => setIsTokenModalOpen(true)}
                      className="!text-white"
                    />
                    <button
                      onClick={() => handleCopyAddress(selectedToken.address)}
                      className="rounded-md transition-colors"
                      title="Copy token address"
                    >
                      {copySuccess &&
                      activeTokenAddress === selectedToken.address ? (
                        <Check className="md:w-4 md:h-4 w-3 h-3 text-green-500" />
                      ) : (
                        <Copy className="md:w-4 md:h-4 w-3 h-3 text-white hover:text-[#FF9900]" />
                      )}
                    </button>
                  </div>
                </div>
                <div className="w-full md:h-[53px] h-9">
                  {(() => {
                    const formattedValue = formatNumber(
                      amount?.toString() || "",
                    );

                    const inputLength =
                      formattedValue.replace(/\D/g, "").length || 0;

                    const defaultFontSize =
                      window.innerWidth >= 1024
                        ? 28
                        : window.innerWidth >= 768
                          ? 24
                          : 20;

                    const FREE_DIGITS = window.innerWidth >= 768 ? 13 : 6;
                    const SHRINK_RATE = 3; // slow shrink rate

                    const excessDigits = Math.max(0, inputLength - FREE_DIGITS);

                    const dynamicFontSize = Math.max(
                      10,
                      defaultFontSize - excessDigits * SHRINK_RATE,
                    );

                    return (
                      <>
                        <input
                          type="text"
                          value={formattedValue}
                          onChange={(e) =>
                            setAmount(formatNumber(e.target.value))
                          }
                          placeholder={
                            tokenBalance?.formatted === "0.000000"
                              ? "0"
                              : "0.00"
                          }
                          className="font-orbitron font-extrabold text-white rounded-[10px] px-1 py-3 text-end w-full h-full outline-none border-none transition-all duration-200 ease-in-out bg-black space"
                          style={{
                            fontSize: `${dynamicFontSize}px`,
                          }}
                        />
                        {/* USD Value Display for expected amount (using destination token price) */}
                        <div className="text-right text-white md:text-sm text-xs mt-2 font-orbitron">
                          {isDestPriceLoading ? (
                            <span className="animate-pulse">Fetching...</span>
                          ) : destTokenPrice ? (
                            <span>${destUsdValue}</span>
                          ) : (
                            <span className="text-gray-400">Unknown</span>
                          )}
                        </div>
                      </>
                    );
                  })()}
                </div>
              </div>
              <div className="flex justify-between gap-2 items-center md:mt-8 mt-5">
                <div className="text-[#FF9900] font-orbitron md:text-[15px] text-xs flex flex-col relative top-2">
                  {isDestPriceLoading ? (
                    <span className="animate-pulse">Loading...</span>
                  ) : destTokenPrice ? (
                    `$${parseFloat(destTokenPrice).toFixed(6)}`
                  ) : (
                    <span className="text-gray-400">Unknown</span>
                  )}
                  <span className="font-bold mt-1">Market Price</span>
                </div>
                <div className="text-zinc-200 text-[10px] font-normal font-orbitron leading-normal flex md:gap-2 gap-1 justify-end">
                  <span></span>
                  {[25, 50, 75, 100].map((value) => (
                    <button
                      key={value}
                      type="button"
                      className={`py-1 border border-[#EEC485] flex justify-center items-center rounded-xl md:text-[10px] text-[8px] font-medium font-orbitron md:w-12 w-11 px-2
                ${
                  selectedPercentage === value
                    ? "!text-black !bg-[#FF9900] border-[#FF9900]"
                    : "bg-[#EEC485] text-[#040404] border-black hover:border-black hover:bg-[#FF9900] hover:text-black"
                }`}
                      onClick={() => handlePercentageChange(value)}
                      disabled={isLoading}
                    >
                      {value}%
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="my-5 relative ">
          <div className="relative w-full bg_swap_box_chain !py-7">
            <input
              type="text"
              value={recipient}
              onChange={(e) => setRecipient(e.target.value)}
              placeholder="0x..."
              className="absolute inset-0 top-0 bottom-0 my-auto w-full h-full md:pl-4 pl-4 md:pr-36 pr-20 py-10 bg-transparent text-white font-orbitron md:text-lg text-[8px] truncate outline-none"
            />
            <button
              className={`!absolute !bg-transparent md:w-[90px] w-16 md:h-10 h-10 hover:opacity-70 bg-black !border !border-[#FF9900] top-2 right-3 flex justify-center items-center rounded-xl px-2 font-orbitron !text-[#FF9900] md:text-base text-xs font-bold`}
              // onClick={handleSelfButtonClick}
            >
              Self
            </button>
          </div>
        </div>
        {/* Fees Display */}
        {bridgeFees && (
          <div className="mb-5 flex justify-between gap-2 items-center bg_swap_box_chain">
            <div className="block md:text-lg text-base font-medium text-white font-orbitron text-center">
              Estimated Fees:
            </div>
            <div className="grid grid-cols-2 gap-1 text-center text-[#FF9900] text-xs md:text-base font-orbitron">
              <div className="font-normal">Gas Token</div>
              <div>
                <span className="font-bold">
                  {formatEther(bridgeFees[2] ?? 0n)}{" "}
                </span>
                {fromChainId === 369 ? "WPLS" : "ETH"}
              </div>

              <div className="font-normal">Messaging Fees:</div>
              <div className="font-bold">
                {formatUnits(bridgeFees[3] ?? 0n, 6)}
                <span className="font-normal"> USDC</span>
              </div>
            </div>
          </div>
        )}
        <div className="md:px-1 px-4 2xl:pb-4">
          <button
            type="button"
            className="gtw relative w-full md:h-12 h-11 bg-[#F59216] md:rounded-[10px] rounded-md mx-auto button-trans text-center mt-4 flex justify-center items-center gap-2 transition-all font-orbitron lg:text-base text-base font-extrabold"
          >
            {renderButton()}
          </button>
        </div>
      </div>

      {/* Modals */}
      <SelectionModal
        isOpen={isFromChainModalOpen}
        onClose={() => setIsFromChainModalOpen(false)}
        items={Object.values(BRIDGE_CONFIG).filter((c) => c.id !== toChainId)}
        onSelect={(chain) => {
          const chainId =
            typeof chain.id === "string" ? parseInt(chain.id) : chain.id;
          setFromChainId(chainId);
          setSelectedToken(null);
          setToChainId(null);
          setIsFromChainModalOpen(false);
        }}
        title="Select From Chain"
      />
      <SelectionModal
        isOpen={isToChainModalOpen}
        onClose={() => setIsToChainModalOpen(false)}
        items={Object.values(BRIDGE_CONFIG).filter((c) => {
          const chainId = typeof c.id === "string" ? parseInt(c.id) : c.id;
          // If no token selected, show all chains except from
          if (!selectedToken) return chainId !== fromChainId;
          // Only show chains that have the currently selected token
          return (
            chainId !== fromChainId && hasToken(chainId, selectedToken?.id)
          );
        })}
        onSelect={(chain) => {
          const chainId =
            typeof chain.id === "string" ? parseInt(chain.id) : chain.id;
          setToChainId(chainId);
          setIsToChainModalOpen(false);
        }}
        title="Select To Chain"
      />
      <SelectionModal
        isOpen={isTokenModalOpen}
        onClose={() => setIsTokenModalOpen(false)}
        items={getTokensArray(fromChainId).map((t) => ({ ...t, id: t.id }))}
        onSelect={(token) => {
          setSelectedToken(token);
          setIsTokenModalOpen(false);
        }}
        title="Select Token"
        chainId={fromChainId}
      />
      {/* Info / Logs */}
      <div className="lg:max-w-[1000px] md:max-w-[1000px] mx-auto w-full px-4 scales-b scales-top">
        {/* {displayBridgeHash && (
          <div className="bg_swap_box_chain p-4 w-full font-orbitron">
            <p className="text-lg text-[#FBB025] font-bold  mb-2 v">
              Bridge transaction submitted!
            </p>
            <p className="text-sm text-[#FBB025] mb-2">
              Your tokens will arrive in 2-10 minutes
            </p>
            <a
              href={`https://scan.vialabs.io/transaction/${displayBridgeHash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs font-bold text-white hover:underline"
            >
              Track on VIA Scanner →
            </a>
          </div>
        )} */}
        {/* Dummy */}
        {/* <RecentTransactions
          transactions={displayTransactions}
          clearTransactions={clearTransactions}
        /> */}
        {/*  Ends */}
        <RecentTransactions
          transactions={transactions}
          clearTransactions={clearTransactions}
        />
        <hr className="mt-4 scales-top_via_2" />
        {/* Instructions */}
        <div className="w-full md:px-0 px-1 md:pb-10 pb-6 scales-top_via_2">
          <div className="mt-5 md:max-w-[1300px] w-full mx-auto bg-[#100C06] border border-[#100C06] rounded-xl lg:px-12 px-6 lg:py-10 py-10">
            <h2 className="md:text-[40px] text-[32px] font-extrabold text-white mb-10 font-orbitron">
              How It Works
            </h2>
            <ol className="space-y-6">
              <li className="flex items-center gap-4">
                <span className="w-8 h-8 bg-[#FBB025] text-black rounded-md flex items-center justify-center text-base font-bold">
                  1
                </span>
                <span className="text-white text-sm">
                  Connect your wallet and select the source chain
                </span>
              </li>
              <li className="flex items-center gap-4">
                <span className="w-8 h-8 bg-[#FBB025] text-black rounded-md flex items-center justify-center text-base font-bold">
                  2
                </span>
                <span className="text-white text-sm">
                  Approve tokens (Bridge Token, USDC, and Gas Token)
                </span>
              </li>
              <li className="flex items-center gap-4">
                <span className="w-8 h-8 bg-[#FBB025] text-black rounded-md flex items-center justify-center text-base font-bold">
                  3
                </span>
                <span className="text-white text-sm">
                  Execute the bridge and wait 2–10 minutes
                </span>
              </li>
              <li className="flex items-center gap-4">
                <span className="w-8 h-8 bg-[#FBB025] text-black rounded-md flex items-center justify-center text-base font-bold">
                  4
                </span>
                <span className="text-white text-sm">
                  Track your transaction on{" "}
                  <a
                    href="https://scan.vialabs.io"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[#FF9900] underline"
                  >
                    VIA Scanner
                  </a>
                </span>
              </li>
            </ol>
          </div>
        </div>
      </div>
    </>
  );
};

export default BridgeInterface;
