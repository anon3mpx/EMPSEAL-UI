// The cross widget's Route section: the token path, then each step kept apart (source swap, bridge, destination swap),
// with what the step delivers and its value check.
import { RouteVisualization, type RouteHop } from "./components";
import { MicroLabel, wk } from "./widgetKit";

export interface RouteStep {
  step: string;
  detail: string;
  out: string;
  valueText: string;
}

export default function WidgetRoute({ routeHops, railName, steps }: { routeHops?: RouteHop[]; railName?: string; steps?: RouteStep[] }) {
  return (
    <>
      {routeHops && routeHops.length > 1 && (
        <>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 13 }}>
            <MicroLabel>Route</MicroLabel>
            {railName && <span style={{ fontSize: 9, color: wk.t3 }}>via {railName}</span>}
          </div>
          <div style={{ marginBottom: steps?.length ? 12 : 24 }}>
            <RouteVisualization hops={routeHops} animated compact />
          </div>
        </>
      )}
      {steps && steps.length > 0 && (
        <ol aria-label="Steps" style={{ listStyle: "none", margin: "0 0 24px", padding: 0, display: "flex", flexDirection: "column", gap: 6 }}>
          {steps.map((s, i) => (
            <li key={`${i}:${s.step}`} style={{ display: "flex", justifyContent: "space-between", gap: 10, fontSize: 10.5, lineHeight: 1.4 }}>
              <span style={{ color: wk.t2, minWidth: 0 }}>
                <span style={{ color: wk.t1, fontWeight: 600 }}>Step {i + 1} · {s.step}</span> · {s.detail}
              </span>
              <span style={{ color: wk.t3, fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap" }}>
                {s.out}
                {s.valueText ? ` · ${s.valueText}` : ""}
              </span>
            </li>
          ))}
        </ol>
      )}
    </>
  );
}
