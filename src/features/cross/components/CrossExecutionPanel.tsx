import { classifyProviderDirectAction } from "../execution/providerDirect";

interface CrossExecutionPanelProps {
  session: any;
  isExecuting: boolean;
  onExecuteSingle: () => void;
  onExecutePrimary: () => void;
  onExecuteGas: () => void;
  singleActionLabel?: string;
  singleActionDisabled?: boolean;
  singleExecutionHint?: string | null;
  singleExecutionError?: string | null;
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
}: CrossExecutionPanelProps) {
  if (!session) return null;

  const singleClassification =
    session.mode === "single" && session.integration?.mode === "provider_direct"
      ? classifyProviderDirectAction(session.integration)
      : null;

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
              : singleClassification === "layerzero_steps"
                ? "LayerZero provider steps are ready for execution."
                : singleClassification === "unsupported"
                  ? "This route needs a non-EVM source wallet. Phase 1 supports EVM source execution only."
                : "Provider-direct execution is ready."}
          </p>

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

          <button
            type="button"
            onClick={onExecuteSingle}
            disabled={
              isExecuting ||
              singleActionDisabled ||
              singleClassification === "unsupported"
            }
            className={`w-full px-4 py-3 text-[12px] font-bold uppercase tracking-[0.1em] ${
              isExecuting ||
              singleActionDisabled ||
              singleClassification === "unsupported"
                ? "cursor-not-allowed bg-white/[0.06] text-white/25"
                : "bg-[#FF8A00] text-[#03030a]"
            }`}
          >
            {isExecuting ? "Executing..." : (singleActionLabel ?? "Execute Route")}
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
