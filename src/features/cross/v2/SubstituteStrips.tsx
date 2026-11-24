// When nothing delivers the requested token: the routes that deliver another token, one rail strip per token (USDT, USDC, ETH, ...),
// in the same boxes as the main rail strip. Picking a card only selects it: the output field and confirm modal then show that token.
import { RailCardStrip } from "../../../design-system/widgetKit";
import { routeCardsOf } from "./routeCards";
import type { CheckedSubstitute } from "./useV2Quote";
import { planIdOf } from "./widgetView";

export interface SubstituteStripsProps {
  substitutes: CheckedSubstitute[];
  selectedPlanId: string | null;
  ticker: (asset: string) => string;
  onPick: (planId: string) => void;
}

export default function SubstituteStrips({ substitutes, selectedPlanId, ticker, onPick }: SubstituteStripsProps) {
  const groups = substitutes.filter((s) => s.offers.length > 0);
  if (groups.length === 0) return null;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {groups.map((s) => {
        const label = `Delivers ${ticker(s.asset)}`;
        const { cards, offerOf } = routeCardsOf(s.offers, [], selectedPlanId, ticker);
        return (
          <section key={s.asset} aria-label={label}>
            <RailCardStrip
              rails={cards}
              label={label}
              onSelect={(name) => {
                const hit = offerOf(name);
                if (hit) onPick(planIdOf(hit.offer));
              }}
            />
          </section>
        );
      })}
    </div>
  );
}
