import { useConnectModal } from "@rainbow-me/rainbowkit";
import {
  readContract,
  sendTransaction,
  waitForTransactionReceipt,
  writeContract,
} from "@wagmi/core";
import { motion } from "framer-motion";
import {
  useCallback,
  useDeferredValue,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  type Address,
  erc20Abi,
  formatUnits,
  parseUnits,
} from "viem";
import {
  useAccount,
  useBalance,
  useChainId,
  useSignMessage,
  useSwitchChain,
} from "wagmi";
import { config } from "../../Wagmi/config";
import {
  buildCancelMessage,
  buildRefundMessage,
  buildSubmittedMessage,
  classifyProviderDirectAction,
  clearCrossSession,
  CrossExecutionPanel,
  CrossRouteList,
  CrossTrackingPanel,
  CrossTradeForm,
  crossApi,
  findMatchingRefreshedOffer,
  getCrossTokensForChain,
  getCrossUiChains,
  getOfferOutputAmount,
  getQuotedOutputDisplay,
  getLayerZeroStepMessage,
  getLayerZeroStepTx,
  getRequiredRouterIntentApproval,
  isRouterIntentExpired,
  loadCrossSession,
  mergeLayerZeroUserSteps,
  mapCrossApiError,
  normalizeOfferSet,
  pickDefaultToken,
  saveCrossSession,
  toSendTransactionArgs,
  useCrossExecutionSession,
  useCrossIntentTracking,
  useCrossQuote,
  useCrossRecovery,
} from "@/features/cross";
import { toast } from "@/utils/toastHelper";

const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";

const parseUnitsSafe = (value: string, decimals: number) => {
  if (!value || value === "." || value === "0.") return 0n;

  try {
    return parseUnits(value, decimals);
  } catch {
    return 0n;
  }
};

const getProviderDirectTx = (integration: any) => {
  const action = integration?.action ?? integration;
  return (
    action?.tx ??
    integration?.tx ??
    integration?.integration?.tx ??
    action?.transaction ??
    null
  );
};

export default function CrossChainPage() {
  const chains = useMemo(() => getCrossUiChains(), []);
  const defaultFromToken = pickDefaultToken(getCrossTokensForChain(8453));
  const defaultToToken = pickDefaultToken(getCrossTokensForChain(42161));

  const { address, isConnected } = useAccount();
  const currentChainId = useChainId();
  const { switchChainAsync } = useSwitchChain();
  const { signMessageAsync } = useSignMessage();
  const { openConnectModal } = useConnectModal();

  const [fromChainId, setFromChainId] = useState(8453);
  const [toChainId, setToChainId] = useState(42161);
  const [fromTokenAddress, setFromTokenAddress] = useState(
    defaultFromToken?.address ?? ZERO_ADDRESS,
  );
  const [toTokenAddress, setToTokenAddress] = useState(
    defaultToToken?.address ?? ZERO_ADDRESS,
  );
  const [amount, setAmount] = useState("");
  const [selectedOfferId, setSelectedOfferId] = useState<string | null>(null);
  const [nativeDstAddress, setNativeDstAddress] = useState("");
  const [includeDestinationGas, setIncludeDestinationGas] = useState(false);
  const [destinationGasAmount, setDestinationGasAmount] = useState("0.001");
  const [selectedGasOfferId, setSelectedGasOfferId] = useState<string | null>(
    null,
  );
  const [session, setSession] = useState<any>(() => {
    const restored = loadCrossSession<any>();

    if (
      restored?.mode === "single" &&
      restored?.status === "SELECTED" &&
      restored?.integration?.mode === "router_intent" &&
      isRouterIntentExpired(restored.integration)
    ) {
      return null;
    }

    return restored;
  });
  const [isExecuting, setIsExecuting] = useState(false);
  const [isCheckingApproval, setIsCheckingApproval] = useState(false);
  const [isApproving, setIsApproving] = useState(false);
  const [hasRequiredApproval, setHasRequiredApproval] = useState(true);
  const [now, setNow] = useState(Date.now());

  const deferredAmount = useDeferredValue(amount);

  useEffect(() => {
    const interval = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(interval);
  }, []);

  const fromTokens = useMemo(
    () => getCrossTokensForChain(fromChainId),
    [fromChainId],
  );
  const toTokens = useMemo(
    () => getCrossTokensForChain(toChainId),
    [toChainId],
  );

  useEffect(() => {
    if (!fromTokens.some((token) => token.address === fromTokenAddress)) {
      setFromTokenAddress(
        pickDefaultToken(fromTokens)?.address ?? fromTokens[0]?.address ?? "",
      );
    }
  }, [fromTokens, fromTokenAddress]);

  useEffect(() => {
    if (!toTokens.some((token) => token.address === toTokenAddress)) {
      setToTokenAddress(
        pickDefaultToken(toTokens)?.address ?? toTokens[0]?.address ?? "",
      );
    }
  }, [toTokens, toTokenAddress]);

  const fromToken =
    fromTokens.find((token) => token.address === fromTokenAddress) ??
    pickDefaultToken(fromTokens);
  const toToken =
    toTokens.find((token) => token.address === toTokenAddress) ??
    pickDefaultToken(toTokens);

  const amountInBaseUnits = useMemo(() => {
    if (!fromToken) return "0";
    return parseUnitsSafe(deferredAmount, fromToken.decimals).toString();
  }, [deferredAmount, fromToken]);

  const destinationGasWei = useMemo(() => {
    return parseUnitsSafe(destinationGasAmount, 18).toString();
  }, [destinationGasAmount]);

  const quoteRequest = useMemo(
    () => ({
      tokenIn: fromTokenAddress,
      tokenOut: toTokenAddress,
      amountIn: amountInBaseUnits,
      srcChainId: fromChainId,
      dstChainId: toChainId,
      userAddress: address,
      nativeDstAddress: nativeDstAddress || undefined,
      urgency: "fast" as const,
      destinationGas:
        includeDestinationGas && destinationGasWei !== "0"
          ? [
              {
                provider: "gaszip" as const,
                chainId: toChainId,
                amountWei: destinationGasWei,
              },
            ]
          : undefined,
    }),
    [
      address,
      amountInBaseUnits,
      destinationGasWei,
      fromChainId,
      fromTokenAddress,
      includeDestinationGas,
      nativeDstAddress,
      toChainId,
      toTokenAddress,
    ],
  );

  const quoteEnabled = Boolean(
    isConnected &&
      address &&
      fromTokenAddress &&
      toTokenAddress &&
      fromChainId !== toChainId &&
      amountInBaseUnits !== "0",
  );

  const quote = useCrossQuote(quoteEnabled, quoteRequest);
  const execution = useCrossExecutionSession();

  const effectiveQuote = useMemo(() => {
    if (execution.fallbackOfferSet) {
      return normalizeOfferSet({ offerSet: execution.fallbackOfferSet });
    }

    return quote.data;
  }, [execution.fallbackOfferSet, quote.data]);

  const gasOffers = useMemo(() => {
    const composition = effectiveQuote?.gasZipComposition;
    if (!composition) return [];

    if (Array.isArray(composition.destinationGasOffers)) {
      return composition.destinationGasOffers;
    }

    if (composition.gasZipDestinationGasOffer) {
      return [composition.gasZipDestinationGasOffer];
    }

    return [];
  }, [effectiveQuote?.gasZipComposition]);

  const displayOffers = useMemo(() => {
    const offers = effectiveQuote?.offers ?? [];
    if (!gasOffers.length) return offers;

    const gasOfferIds = new Set(gasOffers.map((offer: any) => offer.offerId));
    const primaryOffers = offers.filter((offer: any) => !gasOfferIds.has(offer.offerId));

    return primaryOffers.length ? primaryOffers : offers;
  }, [effectiveQuote?.offers, gasOffers]);

  const selectedOffer = useMemo(
    () =>
      displayOffers.find((offer: any) => offer.offerId === selectedOfferId) ?? null,
    [displayOffers, selectedOfferId],
  );

  useEffect(() => {
    if (!displayOffers.length) return;

    if (
      !selectedOfferId ||
      !displayOffers.some((offer: any) => offer.offerId === selectedOfferId)
    ) {
      setSelectedOfferId(
        displayOffers.find((offer: any) => offer.offerId === effectiveQuote?.bestOfferId)
          ?.offerId ??
          displayOffers[0]?.offerId ??
          null,
      );
    }
  }, [displayOffers, effectiveQuote?.bestOfferId, selectedOfferId]);

  useEffect(() => {
    if (!gasOffers.length) {
      setSelectedGasOfferId(null);
      return;
    }

    if (
      !selectedGasOfferId ||
      !gasOffers.some((offer: any) => offer.offerId === selectedGasOfferId)
    ) {
      setSelectedGasOfferId(gasOffers[0]?.offerId ?? null);
    }
  }, [gasOffers, selectedGasOfferId]);

  useEffect(() => {
    if (session) {
      saveCrossSession(session);
    } else {
      clearCrossSession();
    }
  }, [session]);

  useEffect(() => {
    if (execution.fallbackOfferSet) {
      toast.warning("Selected route expired. Please choose an updated route.");
    }
  }, [execution.fallbackOfferSet]);

  const tracking = useCrossIntentTracking(
    session?.mode === "single" ? session.intentId : undefined,
    session?.mode === "composed" ? session.composedIds : undefined,
  );

  const singleApprovalRequest = useMemo(
    () =>
      session?.mode === "single"
        ? getRequiredRouterIntentApproval(session)
        : null,
    [session],
  );

  useEffect(() => {
    let cancelled = false;

    const checkAllowance = async () => {
      if (!address || !singleApprovalRequest) {
        setHasRequiredApproval(true);
        setIsCheckingApproval(false);
        return;
      }

      setIsCheckingApproval(true);

      try {
        const allowance = await readContract(config, {
          address: singleApprovalRequest.tokenAddress as Address,
          abi: erc20Abi,
          functionName: "allowance",
          args: [address, singleApprovalRequest.spender as Address],
          chainId: singleApprovalRequest.chainId,
        });

        if (!cancelled) {
          setHasRequiredApproval(allowance >= singleApprovalRequest.amount);
        }
      } catch {
        if (!cancelled) {
          setHasRequiredApproval(false);
        }
      } finally {
        if (!cancelled) {
          setIsCheckingApproval(false);
        }
      }
    };

    checkAllowance();

    return () => {
      cancelled = true;
    };
  }, [address, singleApprovalRequest]);

  const recoveryIntentId =
    session?.mode === "single"
      ? session.intentId ?? ""
      : session?.primaryTransfer?.intentId ?? "";
  const recovery = useCrossRecovery(recoveryIntentId);

  const { data: fromTokenBalance } = useBalance({
    address,
    chainId: fromChainId,
    token:
      fromToken && !fromToken.isNative
        ? (fromToken.address as Address)
        : undefined,
    query: {
      enabled: Boolean(address && fromToken),
    },
  });

  const { data: sourceNativeBalance } = useBalance({
    address,
    chainId:
      session?.mode === "single"
        ? (session.sourceChainId ?? session.quote?.srcChainId ?? fromChainId)
        : fromChainId,
    query: {
      enabled: Boolean(address),
    },
  });

  const handleFlip = useCallback(() => {
    setFromChainId(toChainId);
    setToChainId(fromChainId);
    setFromTokenAddress(toTokenAddress);
    setToTokenAddress(fromTokenAddress);
  }, [fromChainId, fromTokenAddress, toChainId, toTokenAddress]);

  const ensureChain = useCallback(
    async (targetChainId: number) => {
      if (currentChainId !== targetChainId) {
        await switchChainAsync({ chainId: targetChainId });
      }
    },
    [currentChainId, switchChainAsync],
  );

  const submitStandardIntent = useCallback(
    async (intentId: string, srcTxHash: string) => {
      if (!address) {
        throw new Error("Wallet not connected.");
      }

      const timestamp = Date.now();
      const message = buildSubmittedMessage({
        intentId,
        wallet: address,
        timestamp,
        srcTxHash,
      });
      const signature = await signMessageAsync({ message });

      await crossApi.markSubmitted(intentId, {
        userAddress: address,
        signature,
        timestamp,
        srcTxHash,
      });
    },
    [address, signMessageAsync],
  );

  useEffect(() => {
    if (
      session?.mode === "single" &&
      session?.status === "SELECTED" &&
      session?.integration?.mode === "router_intent" &&
      isRouterIntentExpired(session.integration, now)
    ) {
      setSession(null);
    }
  }, [now, session]);

  const sendEvmTransaction = useCallback(
    async (tx: any, chainId: number) => {
      if (!address) {
        throw new Error("Wallet not connected.");
      }

      await ensureChain(chainId);

      return sendTransaction(config, {
        account: address,
        chainId,
        to: tx.to as Address,
        data: (tx.data ?? tx.calldata ?? "0x") as `0x${string}`,
        value: BigInt(tx.value ?? "0"),
      });
    },
    [address, ensureChain],
  );

  const executeLayerZeroIntent = useCallback(
    async (intentId: string, integration: any, sourceChainId: number) => {
      if (!address) {
        throw new Error("Wallet not connected.");
      }

      const action = integration?.action ?? integration;
      let steps = action?.userSteps ?? [];

      if (action?.requiresFreshUserSteps) {
        const refreshed = await crossApi.rebuildLayerZeroUserSteps(intentId);
        steps = mergeLayerZeroUserSteps(integration, refreshed)?.action?.userSteps ?? steps;
      }

      const signatures: string[] = [];
      let sourceTxHash: string | undefined;

      for (const step of steps) {
        const tx = getLayerZeroStepTx(step);
        if (tx?.to) {
          sourceTxHash = await sendEvmTransaction(tx, sourceChainId);
          continue;
        }

        const message = getLayerZeroStepMessage(step);
        if (typeof message === "string") {
          signatures.push(await signMessageAsync({ message }));
          continue;
        }

        throw new Error(
          "Unsupported LayerZero step for the current wallet capability.",
        );
      }

      if (action?.submitSignatureRequired) {
        await crossApi.submitLayerZeroSignatures(intentId, { signatures });
      }

      if (!sourceTxHash) {
        throw new Error("LayerZero execution did not produce a source transaction.");
      }

      await crossApi.markLayerZeroSubmitted(intentId, {
        userAddress: address,
        sourceTxHash,
      });

      return sourceTxHash;
    },
    [address, sendEvmTransaction, signMessageAsync],
  );

  const executeIntent = useCallback(
    async (intentId: string, integration: any, sourceChainId: number) => {
      if (integration?.mode === "router_intent") {
        const txHash = await sendEvmTransaction(
          toSendTransactionArgs(integration.integration ?? integration),
          sourceChainId,
        );
        await submitStandardIntent(intentId, txHash);
        return txHash;
      }

      if (integration?.mode === "provider_direct") {
        const classification = classifyProviderDirectAction(integration);
        const actionKind = integration?.action?.kind;

        if (classification === "layerzero_steps") {
          return executeLayerZeroIntent(intentId, integration, sourceChainId);
        }

        if (classification === "evm_tx") {
          const tx = getProviderDirectTx(integration);
          const txHash = await sendEvmTransaction(tx, sourceChainId);
          if (actionKind === "layerzero_value_transfer_api") {
            await crossApi.markLayerZeroSubmitted(intentId, {
              userAddress: address,
              sourceTxHash: txHash,
            });
          } else {
            await submitStandardIntent(intentId, txHash);
          }
          return txHash;
        }

        throw new Error(
          "This route requires a non-EVM source wallet. Phase 1 only supports EVM source execution.",
        );
      }

      throw new Error("Unsupported integration mode returned by the API.");
    },
    [address, executeLayerZeroIntent, sendEvmTransaction, submitStandardIntent],
  );

  const prepareSingleExecution = useCallback(async (options?: {
    offerOverride?: any;
    quoteOverride?: any;
  }) => {
    const quoteForSelection = options?.quoteOverride ?? effectiveQuote;
    const offerForSelection = options?.offerOverride ?? selectedOffer;

    if (!address || !offerForSelection || !quoteForSelection) {
      return null;
    }

    const response = await execution.selectSingleIntent({
      offerSetId: quoteForSelection.offerSetId,
      offerId: offerForSelection.offerId,
      userAddress: address,
    });

    let nextIntegration = response.integration;
    const action = nextIntegration?.action ?? nextIntegration;

    if (
      nextIntegration?.mode === "provider_direct" &&
      action?.kind === "layerzero_value_transfer_api" &&
      action?.requiresFreshUserSteps
    ) {
      const refreshed = await crossApi.rebuildLayerZeroUserSteps(response.intentId);
      nextIntegration = mergeLayerZeroUserSteps(nextIntegration, refreshed);
    }

    const nextSession = {
      mode: "single",
      intentId: response.intentId,
      selectedOfferId: offerForSelection.offerId,
      offerSetId: quoteForSelection.offerSetId,
      quote: response.quote,
      integration: nextIntegration,
      status: "SELECTED",
      sourceChainId: response.quote?.srcChainId ?? offerForSelection.srcChainId,
      lastError: null,
    };

    setSession(nextSession);
    return nextSession;
  }, [address, effectiveQuote, execution, selectedOffer]);

  const handlePrepareExecution = useCallback(async () => {
    if (!address || !selectedOffer || !effectiveQuote) {
      return;
    }

    try {
      if (includeDestinationGas && selectedGasOfferId) {
        const response = await execution.selectComposedIntent({
          offerSetId: effectiveQuote.offerSetId,
          primaryTransferOfferId: selectedOffer.offerId,
          gasZipDestinationGasOfferId: selectedGasOfferId,
          userAddress: address,
        });

        setSession({
          mode: "composed",
          composedIntentId: response.composedIntentId,
          offerSetId: effectiveQuote.offerSetId,
          selectedOfferId: selectedOffer.offerId,
          selectedGasOfferId,
          status: response.status,
          primaryTransfer: response.primaryTransfer,
          gasZipDestinationGas: response.gasZipDestinationGas,
          composedIds: {
            primary: response.primaryTransfer?.intentId,
            gas: response.gasZipDestinationGas?.intentId,
          },
          lastError: null,
        });
        toast.info("Composed route selected. Execute each leg to continue.");
        return;
      }

      await prepareSingleExecution();
      toast.info("Route selected. Review execution details below.");
    } catch (error: any) {
      toast.error(mapCrossApiError(error));
    }
  }, [
    address,
    effectiveQuote,
    execution,
    includeDestinationGas,
    prepareSingleExecution,
    selectedGasOfferId,
    selectedOffer,
  ]);

  const handleExecuteSingle = useCallback(async () => {
    if (!session || session.mode !== "single") return;

    if (isRouterIntentExpired(session.integration)) {
      setSession(null);
      toast.error("Prepared route expired. Prepare execution again.");
      return;
    }

    try {
      setIsExecuting(true);
      const txHash = await executeIntent(
        session.intentId,
        session.integration,
        session.sourceChainId ?? session.quote?.srcChainId ?? fromChainId,
      );
      setSession((current: any) => ({
        ...current,
        lastTxHash: txHash,
        status: "SUBMITTED",
        lastError: null,
      }));
      toast.success("Source transaction submitted.");
    } catch (error: any) {
      const message = mapCrossApiError(error);
      setSession((current: any) =>
        current ? { ...current, lastError: message } : current,
      );
      toast.error(message);
    } finally {
      setIsExecuting(false);
    }
  }, [executeIntent, fromChainId, session]);

  const handleApproveSingle = useCallback(async () => {
    if (!address || !singleApprovalRequest || !selectedOffer) return;

    try {
      setIsApproving(true);
      await ensureChain(singleApprovalRequest.chainId);

      const hash = await writeContract(config, {
        account: address,
        chainId: singleApprovalRequest.chainId,
        address: singleApprovalRequest.tokenAddress as Address,
        abi: erc20Abi,
        functionName: "approve",
        args: [
          singleApprovalRequest.spender as Address,
          singleApprovalRequest.amount,
        ],
      });

      toast.info("Approval transaction sent. Waiting for confirmation...");

      await waitForTransactionReceipt(config, {
        hash,
        chainId: singleApprovalRequest.chainId,
      });

      const refreshedQuote = (await quote.refetch()).data;
      if (!refreshedQuote) {
        throw new Error("Unable to refresh the route quote after approval.");
      }

      const refreshedOffer = findMatchingRefreshedOffer(
        refreshedQuote,
        selectedOffer,
      );
      if (!refreshedOffer) {
        setSession(null);
        setSelectedOfferId(
          refreshedQuote.bestOfferId ??
            refreshedQuote.offers?.[0]?.offerId ??
            null,
        );
        toast.warning(
          "Approved route changed while waiting for confirmation. Review the refreshed quote and prepare execution again.",
        );
        return;
      }

      setHasRequiredApproval(true);
      setSelectedOfferId(refreshedOffer.offerId);
      await prepareSingleExecution({
        quoteOverride: refreshedQuote,
        offerOverride: refreshedOffer,
      });
      toast.success("Token approved. Route refreshed.");
    } catch (error: any) {
      const message = mapCrossApiError(error);
      setSession((current: any) =>
        current ? { ...current, lastError: message } : current,
      );
      toast.error(message);
    } finally {
      setIsApproving(false);
    }
  }, [
    address,
    ensureChain,
    prepareSingleExecution,
    quote,
    selectedOffer,
    singleApprovalRequest,
  ]);

  const handleExecuteComposedLeg = useCallback(
    async (leg: "primary" | "gas") => {
      if (!session || session.mode !== "composed") return;

      const legPayload =
        leg === "primary"
          ? session.primaryTransfer
          : session.gasZipDestinationGas;

      if (!legPayload?.intentId || !legPayload?.integration) {
        toast.error("Selected composed leg is missing execution details.");
        return;
      }

      try {
        setIsExecuting(true);
        const txHash = await executeIntent(
          legPayload.intentId,
          legPayload.integration,
          legPayload.quote?.srcChainId ?? fromChainId,
        );

        setSession((current: any) => ({
          ...current,
          [leg === "primary" ? "primaryTransfer" : "gasZipDestinationGas"]: {
            ...legPayload,
            lastTxHash: txHash,
          },
          lastError: null,
        }));
        toast.success(
          leg === "primary"
            ? "Primary transfer submitted."
            : "Destination gas leg submitted.",
        );
      } catch (error: any) {
        const message = mapCrossApiError(error);
        setSession((current: any) =>
          current ? { ...current, lastError: message } : current,
        );
        toast.error(message);
      } finally {
        setIsExecuting(false);
      }
    },
    [executeIntent, fromChainId, session],
  );

  const handleCancel = useCallback(async () => {
    if (!session || session.mode !== "single" || !address) return;

    const reason = window.prompt("Cancellation reason", "User requested cancel");
    if (!reason) return;

    try {
      const timestamp = Date.now();
      const message = buildCancelMessage({
        intentId: session.intentId,
        wallet: address,
        timestamp,
        reason,
      });
      const signature = await signMessageAsync({ message });

      await recovery.cancel.mutateAsync({
        userAddress: address,
        signature,
        timestamp,
        reason,
        replacementTxHash: "",
      });
      toast.success("Cancellation request submitted.");
    } catch (error: any) {
      toast.error(mapCrossApiError(error));
    }
  }, [address, recovery.cancel, session, signMessageAsync]);

  const handleRefund = useCallback(async () => {
    if (!session || session.mode !== "single" || !address) return;

    const reason = window.prompt("Refund reason", "Bridge appears stuck");
    if (!reason) return;

    try {
      const timestamp = Date.now();
      const message = buildRefundMessage({
        intentId: session.intentId,
        wallet: address,
        timestamp,
        reason,
      });
      const signature = await signMessageAsync({ message });

      await recovery.refund.mutateAsync({
        userAddress: address,
        signature,
        timestamp,
        reason,
      });
      toast.success("Refund request submitted.");
    } catch (error: any) {
      toast.error(mapCrossApiError(error));
    }
  }, [address, recovery.refund, session, signMessageAsync]);

  const receiveQuoteDisplay = selectedOffer
    ? getQuotedOutputDisplay(
        getOfferOutputAmount(selectedOffer),
        toToken?.decimals ?? 18,
        selectedOffer,
      )
    : null;
  const receiveAmount = receiveQuoteDisplay?.display ?? "";
  const receiveMetaLabel = receiveQuoteDisplay?.invalidQuote
    ? "API returned an invalid receive amount for this route. Hidden until the quote payload is corrected."
    : receiveQuoteDisplay?.quoteUnitMismatch
      ? `API quote-unit mismatch detected. Showing a ${
          receiveQuoteDisplay.settlementSymbol ?? "settlement"
        }-based estimate.`
      : undefined;
  const singleRouterValue =
    session?.mode === "single" && session.integration?.mode === "router_intent"
      ? BigInt(session.integration?.integration?.value ?? "0")
      : 0n;
  const hasRouterNativeValueRequirement = singleRouterValue > 0n;
  const hasSufficientRouterNativeValue =
    !hasRouterNativeValueRequirement ||
    (sourceNativeBalance?.value ?? 0n) >= singleRouterValue;
  const singleExecutionHint =
    hasRouterNativeValueRequirement && session?.mode === "single"
      ? hasSufficientRouterNativeValue
        ? `This route requires ${formatUnits(singleRouterValue, 18)} native gas value on the source chain in addition to transaction gas.`
        : `This route requires ${formatUnits(singleRouterValue, 18)} native gas value on the source chain. Your wallet balance appears too low for execution.`
      : null;
  const balanceLabel =
    isConnected && fromToken && fromTokenBalance
      ? `Bal: ${Number(fromTokenBalance.formatted).toLocaleString(undefined, {
          maximumFractionDigits: 6,
        })} ${fromToken.symbol}`
      : undefined;
  const quoteErrorMessage = quote.error ? mapCrossApiError(quote.error) : null;
  const showNativeDstAddress = false;
  const singleRouteNeedsApproval =
    Boolean(singleApprovalRequest) && !hasRequiredApproval;
  const singleExecutionBlockedForNativeValue =
    !singleRouteNeedsApproval && !hasSufficientRouterNativeValue;
  const singleActionLabel =
    session?.mode === "single"
      ? isCheckingApproval
        ? "Checking Approval..."
        : isApproving
          ? "Approving..."
          : singleRouteNeedsApproval
            ? "Approve Token"
            : singleExecutionBlockedForNativeValue
              ? "Insufficient Native Value"
            : "Execute Route"
      : undefined;
  const singleActionDisabled =
    isCheckingApproval || isApproving || singleExecutionBlockedForNativeValue;
  const handleSingleAction =
    singleRouteNeedsApproval ? handleApproveSingle : handleExecuteSingle;

  return (
    <div className="min-h-[calc(100vh-52px)] bg-[radial-gradient(ellipse_60%_40%_at_50%_0%,rgba(255,138,0,0.04)_0%,transparent_60%)] px-4 py-12">
      <div className="mx-auto w-full max-w-[560px]">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="mb-8 text-center">
            <p className="mb-2 text-[9px] font-bold tracking-[0.4em] text-[#FF8A00]/45">
              CROSS-CHAIN SWAP
            </p>
            <h1 className="text-[26px] font-bold tracking-[-0.02em] text-white">
              Swap Across Chains.{" "}
              <span className="text-[#FF8A00]">Smart Routing.</span>
            </h1>
            <p className="mt-2 text-[12px] text-white/25">
              Powered by EMPX cross-chain routing at{" "}
              <span className="text-white/40">crosschain.empx.io</span>
            </p>
          </div>

          <div className="rounded-none border border-white/[0.07] bg-[rgba(6,6,14,0.98)] shadow-[0_40px_80px_rgba(0,0,0,0.7)] backdrop-blur-[60px]">
            <div className="flex items-center justify-between border-b border-white/[0.05] px-5 py-[18px]">
              <h3 className="text-[13px] font-bold uppercase tracking-[0.08em] text-white">
                Cross-Chain Swap
              </h3>
              <div className="flex items-center gap-1.5">
                <div className="h-1.5 w-1.5 animate-pulse bg-[#4ade80] shadow-[0_0_6px_rgba(74,222,128,0.5)]" />
                <span className="text-[10px] tracking-[0.06em] text-white/20">
                  LIVE
                </span>
              </div>
            </div>

            <div className="space-y-5 p-5">
              <CrossTradeForm
                chains={chains}
                fromChainId={fromChainId}
                toChainId={toChainId}
                fromTokens={fromTokens}
                toTokens={toTokens}
                fromTokenAddress={fromTokenAddress}
                toTokenAddress={toTokenAddress}
                amount={amount}
                receiveAmount={receiveAmount}
                receiveMetaLabel={receiveMetaLabel}
                nativeDstAddress={nativeDstAddress}
                showNativeDstAddress={showNativeDstAddress}
                onAmountChange={setAmount}
                onFlip={handleFlip}
                onFromChainChange={setFromChainId}
                onToChainChange={setToChainId}
                onFromTokenChange={setFromTokenAddress}
                onToTokenChange={setToTokenAddress}
                onNativeDstAddressChange={setNativeDstAddress}
                balanceLabel={balanceLabel}
              />

              <CrossRouteList
                offers={displayOffers}
                selectedOfferId={selectedOfferId}
                onSelect={setSelectedOfferId}
                expiresAt={effectiveQuote?.expiresAt ?? null}
                tokenOutDecimals={toToken?.decimals}
                tokenOutSymbol={toToken?.symbol}
                errorMessage={quoteEnabled ? quoteErrorMessage : null}
                gasOffers={gasOffers}
                includeDestinationGas={includeDestinationGas}
                selectedGasOfferId={selectedGasOfferId}
                destinationGasAmount={destinationGasAmount}
                onSelectGasOffer={setSelectedGasOfferId}
                onIncludeDestinationGasChange={setIncludeDestinationGas}
                onDestinationGasAmountChange={setDestinationGasAmount}
              />

              {session ? (
                <>
                  <CrossExecutionPanel
                    session={session}
                    isExecuting={isExecuting}
                    onExecuteSingle={handleSingleAction}
                    onExecutePrimary={() => handleExecuteComposedLeg("primary")}
                    onExecuteGas={() => handleExecuteComposedLeg("gas")}
                    singleActionLabel={singleActionLabel}
                    singleActionDisabled={singleActionDisabled}
                    singleExecutionHint={singleExecutionHint}
                    singleExecutionError={
                      session?.mode === "single" ? session?.lastError ?? null : null
                    }
                  />

                  <CrossTrackingPanel
                    tracking={tracking.data}
                    session={session}
                    isCancelling={recovery.cancel.isPending}
                    isRefunding={recovery.refund.isPending}
                    onCancel={handleCancel}
                    onRefund={handleRefund}
                  />
                </>
              ) : !isConnected ? (
                <button
                  type="button"
                  onClick={() => openConnectModal?.()}
                  className="w-full bg-[#FF8A00] px-[14px] py-[14px] text-[12px] font-bold uppercase tracking-[0.1em] text-[#03030a] transition-opacity hover:opacity-85"
                >
                  Connect Wallet
                </button>
              ) : fromChainId === toChainId ? (
                <button
                  disabled
                  className="w-full cursor-not-allowed border border-white/[0.05] bg-white/[0.03] px-[14px] py-[14px] text-[12px] font-bold uppercase tracking-[0.1em] text-white/12"
                >
                  Select Different Chains
                </button>
              ) : !selectedOffer ? (
                <button
                  disabled
                  className="w-full cursor-not-allowed border border-white/[0.05] bg-white/[0.03] px-[14px] py-[14px] text-[12px] font-bold uppercase tracking-[0.1em] text-white/12"
                >
                  {quote.isFetching ? "Fetching Routes..." : "Enter Amount"}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handlePrepareExecution}
                  disabled={execution.isSelecting || quote.isFetching}
                  className={`w-full px-[14px] py-[14px] text-[12px] font-bold uppercase tracking-[0.1em] ${
                    execution.isSelecting || quote.isFetching
                      ? "cursor-not-allowed bg-[#FF8A00]/40 text-[#03030a]"
                      : "bg-[#FF8A00] text-[#03030a]"
                  }`}
                >
                  {execution.isSelecting
                    ? "Preparing Route..."
                    : "Prepare Execution"}
                </button>
              )}

              {session ? (
                <button
                  type="button"
                  onClick={() => setSession(null)}
                  className="w-full border border-white/[0.08] bg-transparent px-[14px] py-[14px] text-[11px] font-bold uppercase tracking-[0.1em] text-white/40 transition-colors hover:border-white/[0.16] hover:text-white/70"
                >
                  Clear Active Session
                </button>
              ) : null}

              <p className="text-center text-[9px] tracking-[0.14em] text-white/[0.07]">
                CCTP · LAYERZERO · THORCHAIN · GAS.ZIP · POWERED BY EMPX
              </p>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
