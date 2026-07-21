import { useState } from "react";
import RoutingSplitModal from "./RoutingSplitModal";

export default function RoutingButton({ bestRoute, tokenA, tokenB }) {
  const [isRoutingModalOpen, setIsRoutingModalOpen] = useState(false);

  // Check if we have a valid bestRoute to enable the button
  const hasValidRoute =
    bestRoute && (bestRoute.type === "SPLIT" || bestRoute.type === "CONVERGE" || bestRoute.type === "NOSPLIT");

  return (
    <>
      <button
        onClick={() => setIsRoutingModalOpen(true)}
        disabled={!hasValidRoute}
        className={`rounded-md-r rounded px-4 py-2 font-bold  ${hasValidRoute
          ? "bg-[#FF8A00] text-black hover:opacity-80 cursor-pointer"
          : ""
          }`}
      >
        {hasValidRoute ? `Routing (${bestRoute.type})` : ""}
      </button>

      {hasValidRoute && (
        <RoutingSplitModal
          isOpen={isRoutingModalOpen}
          onClose={() => setIsRoutingModalOpen(false)}
          bestRoute={bestRoute}
          tokenA={tokenA}
          tokenB={tokenB}
        />
      )}
    </>
  );
}
