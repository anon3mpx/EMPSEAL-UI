import { SUPPORTED_CHAINS } from "@/config/chains";
import { classifyProviderDirectAction } from "../execution/providerDirect";
import { isExecutionPlanTerminal } from "../execution/crossExecution";
import type { CrossExecutionSession, ExecutionPlan } from "../api/contracts";
import {
  getOfferCapability,
  type OfferCapabilityContext,
} from "../model/capabilities";

function chainLabel(chainId: number | undefined, fallback: string): string {
  return (chainId !== undefined && SUPPORTED_CHAINS[chainId]?.name) || fallback;
}

// Carrier ids look like "bridge:8453:USDC" or a bare symbol; show the symbol.
function carrierLabel(carrierAsset: string | undefined): string {
  const symbol = carrierAsset?.split(":").pop()?.trim();
  return symbol && !symbol.startsWith("0x") ? symbol : "bridge token";
}

export function describeSequentialPlanStop(plan: ExecutionPlan): {
  message: string;
  tone: "error" | "hint";
  actionLabel: string;
} | null {
  if (!isExecutionPlanTerminal(plan)) return null;
  const stoppedStep =
    plan.steps.find((step) => step.errorCode) ?? plan.steps[plan.currentStep];
  const carrier = carrierLabel(plan.carrierAsset);

  if (plan.status === "COMPLETED") {
    return { message: "All route steps completed.", tone: "hint", actionLabel: "Route completed" };
  }
  if (plan.status === "EXPIRED") {
    return {
      message: "This route expired before it finished. No further transaction will be sent from it. Get a new quote to continue.",
      tone: "error",
      actionLabel: "Route expired",
    };
  }
  if (plan.status === "FAILED") {
    return {
      message: `This route failed${stoppedStep?.errorMessage ? `: ${stoppedStep.errorMessage}` : "."} No further transaction will be sent from it. Get a new quote to continue.`,
      tone: "error",
      actionLabel: "Route failed",
    };
  }

  let message: string;
  switch (stoppedStep?.errorCode) {
    case "CARRIER_REQUOTE_UNAVAILABLE":
      message = `Your swap completed, but the selected bridge route is no longer available on the same terms. Your ${carrier} is in your wallet on ${chainLabel(stoppedStep.chainId, "the source chain")}. Get a new quote to continue.`;
      break;
    case "MINIMUM_OUTPUT_NOT_MET":
      message =
        stoppedStep.kind === "source_swap"
          ? `Your swap completed below the planned minimum output, so the route stopped before bridging. The swapped tokens are in your wallet on ${chainLabel(stoppedStep.chainId, "the source chain")}. Get a new quote to continue.`
          : "A route step delivered less than the planned minimum output, so the route stopped before the next step. Funds received so far remain in your wallet. Get a new quote to continue.";
      break;
    case "DESTINATION_SWAP_UNAVAILABLE": {
      const destination = plan.steps.find((step) => step.kind === "destination_swap");
      message = `Your bridge transfer settled, but the destination swap is no longer available on the same terms. Your ${carrier} is in your wallet on ${chainLabel(destination?.chainId, "the destination chain")}. Get a new quote to continue.`;
      break;
    }
    default:
      message = "This route stopped before the next step and needs a new quote. Funds received so far remain in your wallet. Get a new quote to continue.";
  }
  return { message, tone: "error", actionLabel: "Re-quote required" };
}

interface CrossExecutionPanelProps {
  session: CrossExecutionSession | null;
  isExecuting: boolean;
  onExecuteSingle: () => void;
  onExecutePrimary: () => void;
  onExecuteGas: () => void;
  singleActionLabel?: string;
  singleActionDisabled?: boolean;
  singleExecutionHint?: string | null;
  singleExecutionError?: string | null;
  sourceWallet?: OfferCapabilityContext["sourceWallet"];
}

export function CrossExecutionPanel({
  session,
  isExecuting,
  onExecuteSingle,
  onExecutePrimary,
  onExecuteGas,
  singleActionLabel,
  singleActionDisabled,
  singleExecutionHint,
  singleExecutionError,
  sourceWallet,
}: CrossExecutionPanelProps) {
  if (!session) return null;

  const singleClassification =
    session.mode === "single" && session.integration?.mode === "provider_direct"
      ? classifyProviderDirectAction(session.integration, {
          selectedSourceChainId:
            session.sourceChainId ?? session.quote?.srcChainId,
        })
      : null;
  const singleClassificationBlocked =
    singleClassification === "unsupported" ||
    singleClassification === "non_evm_wallet_required" ||
    singleClassification === "quote_only";
  const singleAction =
    session.mode === "single" && session.integration.mode === "provider_direct"
      ? session.integration.action
      : null;
  const depositAction =
    singleClassification === "deposit_instructions" && singleAction
      ? singleAction
      : null;
  const gardenNativeFunding =
    session.mode === "single" &&
    session.integration.mode === "provider_direct" &&
    (singleClassification === "garden_bitcoin_source" ||
      singleClassification === "garden_solana_source")
      ? session.integration.nativeFunding
      : null;
  const singleRail =
    session.mode === "single" && session.quote?.rail
      ? getOfferCapability(
          {
            rail: session.quote.rail,
            srcChainId: session.quote.srcChainId,
            dstChainId: session.quote.dstChainId,
            offerType:
              String(session.quote.rail).toUpperCase() === "GARDEN"
                ? "garden_htlc"
                : undefined,
            actionKind:
              session.integration.mode === "provider_direct"
                ? session.integration.action.kind
                : undefined,
            direction:
              session.integration.mode === "provider_direct" &&
              session.integration.action.kind === "optimism_standard_bridge"
                ? session.integration.action.direction
                : undefined,
          },
          sourceWallet ? { sourceWallet } : undefined,
        )
      : null;
  const destinationDomain =
    singleAction?.kind === "hyperlane_transfer_remote"
      ? singleAction.destinationDomain ??
        singleAction.destinationDomainId ??
        singleAction.domain
      : undefined;
  const interchainGas =
    singleAction?.kind === "hyperlane_transfer_remote"
      ? singleAction.interchainGasValue ??
        singleAction.interchainGas ??
        singleAction.value
      : undefined;
  const sequentialPlan =
    session.mode === "single" && session.integration.mode === "sequential_wallet"
      ? session.executionPlan
      : undefined;
  const sequentialCurrentStep = sequentialPlan?.steps[sequentialPlan.currentStep];
  const sequentialSubmitted = sequentialCurrentStep?.status === "SUBMITTED";
  const sequentialStop = sequentialPlan ? describeSequentialPlanStop(sequentialPlan) : null;
  // Only a READY step with a prepared tx may be sent; a stopped plan never.
  const sequentialBlocked =
    session.mode === "single" &&
    session.integration.mode === "sequential_wallet" &&
    (Boolean(sequentialStop) ||
      !session.integration.tx ||
      (sequentialPlan !== undefined && sequentialCurrentStep?.status !== "READY"));
  const singleButtonDisabled =
    isExecuting ||
    singleActionDisabled ||
    singleClassificationBlocked ||
    sequentialBlocked;

  return (
    <div className="border border-white/[0.05] bg-white/[0.02] p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-white">
            Execution
          </p>
          <p className="mt-1 text-[10px] text-white/35">
            {session.mode === "single"
              ? `Intent ${session.intentId}`
              : `Composed ${session.composedIntentId ?? "session"}`}
          </p>
        </div>

        <span className="border border-white/[0.06] bg-white/[0.03] px-2 py-1 text-[9px] font-semibold text-white/50">
          {session.mode === "single" ? "SINGLE" : "COMPOSED"}
        </span>
      </div>

      {session.mode === "single" ? (
        <div className="mt-4 space-y-3">
          <p className="text-sm text-white/70">
            {session.integration?.mode === "router_intent"
              ? "Contract-backed execution is ready."
              : session.integration?.mode === "sequential_wallet"
                ? sequentialPlan?.status === "COMPLETED"
                  ? "Sequential execution completed."
                  : sequentialStop
                    ? "Sequential execution has stopped. No further wallet action can be sent from this plan."
                    : "Sequential execution is ready. Each wallet action is confirmed before the next leg is prepared."
              : singleClassification === "layerzero_steps"
                ? "LayerZero provider steps are ready for execution."
                : singleClassification === "garden_solana_source"
                  ? "Garden Solana transaction is ready to sign and send."
                : singleClassification === "garden_bitcoin_source"
                  ? "Garden Bitcoin PSBT is ready to sign and broadcast."
                : singleClassification === "deposit_instructions"
                  ? "Provider deposit instructions are ready. Send the exact source transaction from your source wallet."
                : singleClassification === "quote_only"
                  ? "This route is quote only and cannot be selected or executed."
                  : singleClassification === "non_evm_wallet_required"
                    ? "This route needs a compatible non-EVM source wallet or reviewed deposit flow."
                    : singleClassification === "unsupported"
                      ? "The returned provider action is not supported by this wallet."
                : "Provider-direct execution is ready."}
          </p>

          {sequentialPlan ? (
            <div className="space-y-2 border border-white/[0.05] bg-black/10 p-3 text-[10px] text-white/55">
              <div className="flex items-center justify-between">
                <span>Plan status</span>
                <span className="uppercase text-white/75">{sequentialPlan.status.replace("_", " ")}</span>
              </div>
              {sequentialPlan.steps.map((step) => (
                <div key={step.stepId} className="flex items-center justify-between gap-3">
                  <span>{step.index + 1}. {step.kind.replace(/_/g, " ")}</span>
                  <span className={step.index === sequentialPlan.currentStep ? "text-[#FF8A00]" : "text-white/35"}>
                    {step.status}{step.kind === "destination_swap" && step.status === "PLANNED" ? " (provisional)" : ""}
                  </span>
                </div>
              ))}
            </div>
          ) : null}

          {singleRail ? (
            <div className="grid gap-2 border border-white/[0.05] bg-black/10 p-3 text-[10px] text-white/55 sm:grid-cols-2">
              <div>
                <span className="text-white/30">Rail: </span>
                {singleRail.label}
              </div>
              <div>
                <span className="text-white/30">Status: </span>
                <span className="uppercase">
                  {singleRail.status.replace("_", " ")}
                </span>
              </div>
              <div>
                <span className="text-white/30">Source wallet: </span>
                <span className="uppercase">{singleRail.requiredSourceWallet}</span>
              </div>
              <div>
                <span className="text-white/30">Approvals: </span>
                {session.integration.mode === "provider_direct" &&
                session.integration.approvals?.length
                  ? `${session.integration.approvals.length} exact request(s)`
                  : "None returned"}
              </div>
              {destinationDomain !== undefined ? (
                <div>
                  <span className="text-white/30">Destination domain: </span>
                  {String(destinationDomain)}
                </div>
              ) : null}
              {interchainGas !== undefined ? (
                <div>
                  <span className="text-white/30">Interchain gas value: </span>
                  {String(interchainGas)}
                </div>
              ) : null}
            </div>
          ) : null}

          {singleClassification === "garden_bitcoin_source" && gardenNativeFunding ? (
            <div className="space-y-2 border border-[#FF8A00]/20 bg-[#FF8A00]/[0.04] p-3 text-[10px] text-white/60">
              {typeof gardenNativeFunding.depositAddress === "string" ? (
                <div>
                  <span className="text-white/35">Deposit address: </span>
                  <span className="break-all text-white/80">
                    {gardenNativeFunding.depositAddress}
                  </span>
                </div>
              ) : null}
              {gardenNativeFunding.depositAmount ? (
                <div>
                  <span className="text-white/35">Deposit amount: </span>
                  <span className="text-white/80">{String(gardenNativeFunding.depositAmount)} sats</span>
                </div>
              ) : null}
              {gardenNativeFunding.changeAtomic ? (
                <div>
                  <span className="text-white/35">Change: </span>
                  <span className="text-white/80">{String(gardenNativeFunding.changeAtomic)} sats</span>
                </div>
              ) : null}
              {gardenNativeFunding.feeAtomic ? (
                <div>
                  <span className="text-white/35">Network fee: </span>
                  <span className="text-white/80">{String(gardenNativeFunding.feeAtomic)} sats</span>
                </div>
              ) : null}
            </div>
          ) : null}

          {depositAction ? (
            <div className="space-y-2 border border-[#FF8A00]/20 bg-[#FF8A00]/[0.04] p-3 text-[10px] text-white/60">
              <div>
                <span className="text-white/35">Deposit address: </span>
                <span className="break-all text-white/80">
                  {String(depositAction.depositAddress)}
                </span>
              </div>
              {typeof depositAction.memo === "string" && depositAction.memo ? (
                <div>
                  <span className="text-white/35">Memo: </span>
                  <span className="break-all text-white/80">
                    {depositAction.memo}
                  </span>
                </div>
              ) : null}
              {typeof depositAction.refundAddress === "string" &&
              depositAction.refundAddress ? (
                <div>
                  <span className="text-white/35">Refund address: </span>
                  <span className="break-all text-white/80">
                    {depositAction.refundAddress}
                  </span>
                </div>
              ) : null}
            </div>
          ) : null}

          {singleExecutionHint ? (
            <p className="text-[11px] leading-5 text-[#FF8A00]/75">
              {singleExecutionHint}
            </p>
          ) : null}

          {singleExecutionError ? (
            <p className="text-[11px] leading-5 text-red-300/85">
              {singleExecutionError}
            </p>
          ) : null}

          {sequentialStop ? (
            <p
              role={sequentialStop.tone === "error" ? "alert" : undefined}
              className={`text-[11px] leading-5 ${
                sequentialStop.tone === "error" ? "text-red-300/85" : "text-[#FF8A00]/75"
              }`}
            >
              {sequentialStop.message}
            </p>
          ) : null}

          <button
            type="button"
            onClick={onExecuteSingle}
            disabled={singleButtonDisabled}
            className={`w-full px-4 py-3 text-[12px] font-bold uppercase tracking-[0.1em] ${
              singleButtonDisabled
                ? "cursor-not-allowed bg-white/[0.06] text-white/25"
                : "bg-[#FF8A00] text-[#03030a]"
            }`}
          >
            {isExecuting
              ? "Executing..."
              : sequentialStop
                ? sequentialStop.actionLabel
              : sequentialSubmitted
                ? "Awaiting Confirmation"
              : sequentialBlocked
                ? "Preparing Next Step"
                : (singleActionLabel ??
                (singleClassification === "garden_solana_source"
                  ? "Sign Garden Solana Transaction"
                  : singleClassification === "garden_bitcoin_source"
                    ? "Sign Garden BTC PSBT"
                  : singleClassification === "deposit_instructions"
                  ? "Review Deposit Instructions"
                  : session.integration.mode === "sequential_wallet"
                    ? `Execute ${sequentialCurrentStep?.kind.replace(/_/g, " ") ?? "Current Step"}`
                    : "Execute Route"))}
          </button>
        </div>
      ) : (
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <button
            type="button"
            onClick={onExecutePrimary}
            disabled={isExecuting}
            className={`px-4 py-3 text-[12px] font-bold uppercase tracking-[0.1em] ${
              isExecuting
                ? "cursor-not-allowed bg-white/[0.06] text-white/25"
                : "bg-[#FF8A00] text-[#03030a]"
            }`}
          >
            {isExecuting ? "Executing..." : "Execute Primary"}
          </button>

          <button
            type="button"
            onClick={onExecuteGas}
            disabled={isExecuting}
            className={`px-4 py-3 text-[12px] font-bold uppercase tracking-[0.1em] ${
              isExecuting
                ? "cursor-not-allowed bg-white/[0.06] text-white/25"
                : "bg-white text-[#03030a]"
            }`}
          >
            {isExecuting ? "Executing..." : "Execute Gas Leg"}
          </button>
        </div>
      )}
    </div>
  );
}
