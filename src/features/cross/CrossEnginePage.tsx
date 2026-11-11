// /cross-v2 entry: picks the V1 page or the V2 flow by engine (see engine.ts). Both are lazy, so a build with one engine never downloads the other.
// Testing-only: at V1 removal this file, engine.ts and CrossEngineToggle.tsx go, and the route points straight at the V2 flow.
import { lazy, Suspense } from "react";
import CrossEngineToggle from "./CrossEngineToggle";
import { useCrossEngine } from "./engine";

const CrossPageV1 = lazy(() => import("../../design-system/pages/CrossPage"));
const CrossV2Flow = lazy(() => import("./v2/CrossV2Flow"));

export default function CrossEnginePage() {
  const { engine, setEngine, showToggle } = useCrossEngine();
  return (
    <>
      <Suspense fallback={<div style={{ minHeight: "100vh" }} aria-busy="true" />}>
        {engine === "v2" ? <CrossV2Flow /> : <CrossPageV1 />}
      </Suspense>
      {showToggle && (
        <>
          {/* Room below the page so its last row can scroll clear of the floating toggle. */}
          <div aria-hidden style={{ height: 88 }} />
          <CrossEngineToggle engine={engine} onChange={setEngine} />
        </>
      )}
    </>
  );
}
