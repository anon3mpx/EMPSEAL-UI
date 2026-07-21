export type WidgetExecutionMode = "auto" | "sdk" | "contract";
export type ResolvedWidgetExecutionMode = "sdk" | "contract";

const BYTES32_HEX = /^0x[0-9a-fA-F]{64}$/;

export function isValidWidgetIntegratorId(integratorId?: string | null): boolean {
  return !!integratorId && BYTES32_HEX.test(integratorId.trim());
}

export function getWidgetExecutionMode({
  configuredMode,
  integratorId,
}: {
  configuredMode?: WidgetExecutionMode | null;
  integratorId?: string | null;
}): ResolvedWidgetExecutionMode {
  if (configuredMode === "sdk") return "sdk";
  if (configuredMode === "contract") return "contract";
  return isValidWidgetIntegratorId(integratorId) ? "contract" : "sdk";
}

export function parseWidgetExecutionMode(rawMode: string | null | undefined): WidgetExecutionMode {
  const normalized = rawMode?.trim().toLowerCase();
  if (normalized === "sdk" || normalized === "contract") return normalized;
  return "auto";
}
