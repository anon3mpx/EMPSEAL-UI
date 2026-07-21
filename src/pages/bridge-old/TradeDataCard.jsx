import React, { useState, useRef, useEffect } from "react";
import S from "../../assets/images/s.svg";
import Three from "../../assets/images/324.svg";
import Refresh from "../../assets/images/refresh.svg";
import Info from "../../assets/images/info.svg";
import { formatUnits } from "viem";
import Transcation from "./Transcation";
import {
  readContract,
  waitForTransactionReceipt,
  writeContract,
  sendTransaction,
} from "@wagmi/core";
import { erc20Abi } from "viem";
import { bridgeConfig } from "../../Wagmi/bridgeConfig";
import { toast } from "../../utils/toastHelper";
const TradeDataCard = ({
  onClose,
  amountIn,
  amountOut,
  tokenA,
  selectedRoute,
  quoteData,
  fromAddress,
  toAddress,
  tokenB,
  confirm,
  disabled = false,
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [isConfirm, setConfirm] = useState(false);
  const [swapDetails, setSwapDetails] = useState(null);
  const [transactionHash, setTransactionHash] = useState("");
  const [destinationTx, setDestinationTx] = useState({});
  const modalRef = useRef(null);
  const rangoApiKey =
    import.meta.env.VITE_RANGO_API_KEY || import.meta.env.RANGO_API_KEY || "";

  //route detection logic
  const symbiosisRoute = selectedRoute?.type === "evm";
  const rangoRoute = typeof selectedRoute?.requestId === "string";
  const rubicRoute =
    selectedRoute?.swapType === "cross-chain" ||
    selectedRoute?.swapType === "on-chain";

  // console.log("selected Rango route:", selectedRoute);
  // console.log("selected Rango address:", fromAddress);
  // console.log("selected Rango to address:", toAddress);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (modalRef.current && !modalRef.current.contains(event.target)) {
        onClose();
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [onClose]);

  const getTokenDecimals = () => {
    if (rubicRoute) {
      return selectedRoute?.tokens?.from?.decimals;
    } else if (rangoRoute) {
      return tokenA.decimals;
    } else if (symbiosisRoute) {
      return tokenA.decimals;
    }
    return 18; // default
  };

  const getScaledAmount = () => {
    try {
      const decimals = getTokenDecimals();
      if (!decimals) return BigInt(0);

      if (rubicRoute) {
        const tokenAmount = quoteData?.rubic?.quote?.srcTokenAmount;
        if (!tokenAmount) return BigInt(0);

        const calculatedAmount = Math.floor(
          parseFloat(tokenAmount) * Math.pow(10, decimals)
        );
        return BigInt(calculatedAmount.toString());
      } else if (rangoRoute) {
        if (!amountIn) return BigInt(0);

        const calculatedAmount = Math.floor(
          parseFloat(amountIn) * Math.pow(10, decimals)
        );
        return BigInt(calculatedAmount.toString());
      } else if (symbiosisRoute) {
        if (!amountIn) return BigInt(0);

        // Convert decimal to integer
        const calculatedAmount = Math.floor(
          parseFloat(amountIn) * Math.pow(10, decimals)
        );
        return BigInt(calculatedAmount.toString());
      }
      return BigInt(0);
    } catch (error) {
      console.warn("Error in getScaledAmount:", error);
      return BigInt(0);
    }
  };

  const scaledAmount = getScaledAmount();

  const approveToken = async (tokenAddress, approvalAddress, amount) => {
    try {
      // Check if the token is the native token
      const isNativeToken =
        tokenAddress === "0x0000000000000000000000000000000000000000";

      if (isNativeToken) {
        // Native tokens don't need approval
        await swapTokens();
        return {
          success: true,
          data: swapDetails,
        };
      }
      // await executeSwap(swapDetails, swapDetails.quote.fromAddress);

      // If not a native token, proceed
      let result = await writeContract(bridgeConfig, {
        abi: erc20Abi,
        address: tokenAddress,
        functionName: "approve",
        args: [approvalAddress, amount],
      });
      await waitForTransaction(result);

      // await executeSwap(swapDetails, swapDetails.quote.fromAddress);
      return {
        success: true,
        data: result,
      };
    } catch (error) {
      toast.error("Token approval failed!!");
      throw error;
    }
  };

  const waitForTransaction = async (hash) => {
    try {
      const transactionReceipt = await waitForTransactionReceipt(bridgeConfig, {
        confirmations: 2,
        hash,
      });
      if (transactionReceipt.status === "success") {
        return {
          success: true,
          data: transactionReceipt,
        };
      }
      throw transactionReceipt.status;
    } catch (e) {
      throw e;
    }
  };

  const swapTokens = async () => {
    try {
      let response;
      let payload;

      if (rubicRoute) {
        // Rubic implementation
        payload = {
          dstTokenAddress: quoteData.rubic.quote.dstTokenAddress,
          dstTokenBlockchain: quoteData.rubic.quote.dstTokenBlockchain,
          referrer: quoteData.rubic.quote.referrer,
          srcTokenAddress: quoteData.rubic.quote.srcTokenAddress,
          srcTokenAmount: quoteData.rubic.quote.srcTokenAmount,
          srcTokenBlockchain: quoteData.rubic.quote.srcTokenBlockchain,
          fromAddress: quoteData.rubic.quote.fromAddress,
          receiver: quoteData.rubic.quote.receiver,
          integratorAddress: quoteData.rubic.quote.integratorAddress,
          id: selectedRoute.id,
          slippage: selectedRoute.estimate.slippage,
        };
        response = await fetch(
          "https://api-v2.rubic.exchange/api/routes/swap",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify(payload),
          }
        );
      } else if (typeof selectedRoute?.requestId === "string") {
        // Get source and destination chains from the selectedRoute
        const fromChain = selectedRoute.swaps[0].from.blockchain;
        const toChain =
          selectedRoute.swaps[selectedRoute.swaps.length - 1].to.blockchain;

        // Create selectedWallets object with the user's address for both chains
        const selectedWallets = {
          [fromChain]: fromAddress,
          [toChain]: toAddress,
        };

        // rango payload with updated data
        payload = {
          requestId: selectedRoute.requestId,
          destination: toAddress,
          checkPrerequisites: false,
          selectedWallets: selectedWallets, // Add the selectedWallets object
        };

        const confirmResponse = await fetch(
          `https://api.rango.exchange/routing/confirm?apiKey=${rangoApiKey}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          }
        );

        if (!confirmResponse.ok) {
          throw new Error("Rango route confirmation failed");
        }

        const confirmData = await confirmResponse.json();

        // create the transaction
        const createTxPayload = {
          userSettings: { slippage: selectedRoute?.estimate?.slippage || 1 },
          validations: { balance: true, fee: true, approve: true },
          step: 1,
          requestId: selectedRoute.requestId,
        };

        response = await fetch(
          `https://api.rango.exchange/tx/create?apiKey=${rangoApiKey}`,
          {
            method: "POST",
            headers: {
              accept: "*/*",
              "Content-Type": "application/json",
            },
            body: JSON.stringify(createTxPayload),
          }
        );
      } else if (symbiosisRoute) {
        // Symbiosis implementation
        return {
          transaction: quoteData.symbiosis.tx,
          quote: {
            fromAddress: fromAddress,
          },
        };
      }

      if (!response?.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }

      const data = await response.json();
      setSwapDetails(data);
      return data;
    } catch (error) {
      console.error("Error calling API:", error);
      toast.error("Failed to prepare swap transaction");
      throw error;
    }
  };

  const executeSwap = async (transactionDetails, walletDetails) => {
    try {
      const txHash = await sendTransaction(bridgeConfig, {
        account: walletDetails, // wallet account address
        to: transactionDetails?.transaction?.to,
        data: transactionDetails?.transaction?.data,
        value: transactionDetails?.transaction?.value,
      });

      await waitForTransaction(txHash);
      setTransactionHash(txHash);
      const status = await getTransactionStatus(txHash);

      if (status) {
        return { success: true, txHash };
      } else {
        return { success: false, message: "Transaction failed." };
      }
    } catch (error) {
      console.error("Error executing swap:", error);
      return { success: false, message: error.message };
    }
  };

  const clearState = () => {
    setIsLoading(false);
    setSwapDetails(null);
    setTransactionHash("");
    setDestinationTx({});
  };

  const getTransactionStatus = async (hash) => {
    try {
      if (rubicRoute) {
        const response = await fetch(
          `https://api-v2.rubic.exchange/api/info/status?srcTxHash=${hash}`
        );
        const data = await response.json();
        const { status, destinationTxHash } = data;

        if (data.status === "NOT_FOUND") {
          setConfirm(true);
        } else if (data.status === "SUCCESS") {
          setDestinationTx(data);
          setConfirm(true);
          toast.success("Transaction on the destination chain was successful");
          clearState();
        }
        return status;
      } else if (rangoRoute) {
        const response = await fetch(
          `https://api.rango.exchange/tx/check-status?apiKey=${rangoApiKey}`,
          {
            method: "POST",
            headers: {
              "content-type": "application/json",
            },
            body: JSON.stringify({
              requestId: selectedRoute.requestId,
              txId: hash,
              step: 1,
            }),
          }
        );

        const data = await response.json();

        // Handle Rango specific status
        if (data.status === "success") {
          setDestinationTx(data);
          setConfirm(true);
          toast.success("Rango transaction completed successfully");
          clearState();
        } else if (data.status === "failed") {
          toast.error("Rango transaction failed");
          setConfirm(true);
        }

        return data.status;
      } else if (symbiosisRoute) {
        // Add Symbiosis status check if needed
        setConfirm(true);
        clearState();
        return "SUCCESS"; // Default response for Symbiosis
      }
    } catch (error) {
      console.error("Error checking transaction status:", error);
      toast.error("Failed to check transaction status");
      return "FAILED";
    }
  };

  const handleClick = async () => {
    if (disabled || isLoading) return;

    setIsLoading(true);
    try {
      let approvalResult = null;
      let swapData = null;

      if (rubicRoute) {
        approvalResult = await approveToken(
          selectedRoute?.tokens?.from?.address,
          selectedRoute?.transaction?.approvalAddress,
          scaledAmount
        );
      } else if (symbiosisRoute) {
        approvalResult = await approveToken(
          tokenA.address,
          quoteData.symbiosis.approveTo,
          amountIn
        );
      } else if (rangoRoute) {
        // First get the swap data which includes approval info
        swapData = await swapTokens();
        // console.log("rango swap data: ", swapData);

        if (swapData?.approve) {
          approvalResult = await approveToken(
            swapData.approve.token,
            swapData.approve.spender,
            swapData.approve.amount
          );
        } else {
          approvalResult = { success: true };
        }
      }

      if (approvalResult && approvalResult.success) {
        toast.success("Token Approved!");

        if (!swapData) {
          swapData = await swapTokens();
        }

        let swapResult;
        if (rangoRoute) {
          swapResult = await executeSwap(
            {
              transaction: {
                to: swapData.transaction.to,
                data: swapData.transaction.data,
                value: swapData.transaction.value,
                from: fromAddress,
              },
            },
            fromAddress
          );
        } else {
          swapResult = await executeSwap(
            swapData,
            swapData?.quote?.fromAddress
          );
        }

        if (swapResult.success) {
          if (rangoRoute || rubicRoute) {
            // Show initial message
            toast.info(
              "Transaction is being processed. This may take a few minutes..."
            );

            let lastToastTime = Date.now();
            const statusCheckInterval = setInterval(async () => {
              try {
                const status = await getTransactionStatus(swapResult.txHash);
                const normalizedStatus = status?.toUpperCase();

                if (normalizedStatus === "SUCCESS") {
                  clearInterval(statusCheckInterval);
                  toast.success("Transaction completed successfully! 🎉");
                  clearState();
                } else if (normalizedStatus === "FAILED") {
                  clearInterval(statusCheckInterval);
                  throw new Error("Transaction failed on destination chain");
                } else if (normalizedStatus === "RUNNING") {
                  // Show processing message only once per minute
                  const currentTime = Date.now();
                  if (currentTime - lastToastTime >= 60000) {
                    // 60000ms = 1 minute
                    toast.info("Still processing... Please wait.");
                    lastToastTime = currentTime;
                  }
                }
              } catch (error) {
                clearInterval(statusCheckInterval);
                console.error("Status check failed:", error);
                toast.error("Failed to check transaction status");
              }
            }, 10000); // Check every 10 seconds
          } else {
            // For Symbiosis or other providers
            toast.success("Transaction successful 🎉");
            clearState();
          }
        } else {
          throw new Error(
            "API returned an error: " + (swapResult.message || "Unknown error")
          );
        }
      }
    } catch (error) {
      toast.error("Transaction failed ⚠️");
      console.error("Confirmation failed:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const formatNumber = (value) => {
    if (!value) return ""; // Handle empty input

    const [integerPart, decimalPart] = value.split(".");
    const formattedInteger = integerPart
      .replace(/\D/g, "") // Allow only digits
      .replace(/\B(?=(\d{3})+(?!\d))/g, ","); // Add commas to integer part

    return decimalPart !== undefined
      ? `${formattedInteger}.${decimalPart.replace(/\D/g, "")}` // Remove non-numeric from decimal
      : formattedInteger;
  };

  const getDisplayValues = () => {
    if (rubicRoute && selectedRoute?.estimate) {
      return {
        outputAmount: parseFloat(
          selectedRoute.estimate.destinationTokenAmount || 0
        ).toFixed(6),
        minReceived: parseFloat(
          selectedRoute.estimate.destinationTokenMinAmount || 0
        ).toFixed(6),
        priceImpact: selectedRoute.estimate.priceImpact || "0",
        slippage: selectedRoute.estimate.slippage || "0",
        usdAmount: selectedRoute.estimate.destinationUsdAmount || "0",
      };
    } else if (rangoRoute && selectedRoute?.swaps?.length > 0) {
      const lastSwap = selectedRoute.swaps[selectedRoute.swaps.length - 1];
      return {
        outputAmount: parseFloat(selectedRoute.outputAmount || 0).toFixed(6),
        minReceived: parseFloat(lastSwap?.toAmount || 0).toFixed(6),
        priceImpact: selectedRoute.priceImpactUsdPercent || "0",
        slippage: lastSwap?.recommendedSlippage?.slippage || "1",
        usdAmount: (
          parseFloat(selectedRoute.outputAmount || 0) *
          parseFloat(lastSwap?.to?.usdPrice || 0)
        ).toFixed(2),
      };
    } else if (symbiosisRoute && quoteData?.symbiosis) {
      const symData = quoteData.symbiosis;
      const tokenOutDecimals = symData?.tokenAmountOut?.decimals || 18;
      const tokenOutAmount = symData?.tokenAmountOut?.amount || "0";
      const tokenOutMinAmount = symData?.tokenAmountOutMin?.amount || "0";

      return {
        outputAmount: parseFloat(
          formatUnits(tokenOutAmount, tokenOutDecimals)
        ).toFixed(6),
        minReceived: parseFloat(
          formatUnits(tokenOutMinAmount, tokenOutDecimals)
        ).toFixed(6),
        priceImpact: symData.priceImpact || "0",
        slippage: "0.5",
        usdAmount: symData.amountInUsd?.amount
          ? parseFloat(
              formatUnits(
                symData.amountInUsd.amount,
                symData.amountInUsd.decimals || 18
              )
            ).toFixed(2)
          : "0",
      };
    }
    return {
      outputAmount: "0",
      minReceived: "0",
      priceImpact: "0",
      slippage: "0",
      usdAmount: "0",
    };
  };

  const { outputAmount, minReceived, priceImpact, slippage, usdAmount } =
    getDisplayValues();
  return (
    <>
      <div className="lg:fixed absolute z-40 bg-white left-0 lefts mw300 2xl:bottom-[12%] lg:bottom-[5%] bottom-[100px] scale8 border-4 border-l-2 border-[#FF8A00] md:p-6 p-4 -view">
        <h6 className=" text-sm">
          <span>
            <span className="font-extrabold">Min Received</span> :{" "}
            <span className="">{formatNumber(minReceived)}</span>{" "}
            {tokenB.symbol}
          </span>
        </h6>
        <h6 className=" text-sm py-2">
          <span>
            <span className="font-extrabold">Price in :</span>{" "}
            <span className="">
              {usdAmount} {"$"}
            </span>
          </span>
        </h6>
        <h6 className=" text-sm">
          <span>
            <span className="font-extrabold">Price Impact :</span>{" "}
            <span className="">{priceImpact} %</span>
          </span>
        </h6>
      </div>
    </>
  );
};

export default TradeDataCard;
