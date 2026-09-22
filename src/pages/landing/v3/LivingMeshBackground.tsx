// ─── Living Mesh Background (idea 02, redesigned) ───────────────────────────
//
// v1 of this was a set of blurred CSS radial-gradient blobs at 4-18% alpha
// under a darkening vignette — real code, but tuned so faint it read as
// "missing." This version uses an actual WebGL noise shader (Aurora, see
// ./Aurora.tsx) so there's real motion and depth instead of a static glow.

import { motion, useScroll, useTransform } from "framer-motion";
import Aurora from "./Aurora";

export default function LivingMeshBackground() {
  const { scrollYProgress } = useScroll();
  const intensity = useTransform(scrollYProgress, [0, 0.15, 0.5, 0.85, 1], [0.75, 1, 0.9, 0.7, 0.5]);

  return (
    <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden" aria-hidden>
      <motion.div style={{ opacity: intensity }} className="absolute inset-0">
        <Aurora colorStops={["#994f00", "#FF8A00", "#FFB347"]} amplitude={1.15} blend={0.6} speed={0.65} />
      </motion.div>

      {/* Faint diagonal hairlines, same shear angle as the mark */}
      <div
        className="absolute inset-0"
        style={{
          opacity: 0.02,
          backgroundImage:
            "repeating-linear-gradient(112deg, rgba(255,255,255,0.9) 0px, rgba(255,255,255,0.9) 1px, transparent 1px, transparent 160px)",
        }}
      />

      {/* Grain — keeps the gradient from banding */}
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: "radial-gradient(rgba(255,255,255,0.9) 0.6px, transparent 0.6px)",
          backgroundSize: "3px 3px",
        }}
      />

      {/* Light top+bottom fade only — no longer a full-field darkening wash,
          just enough to keep hero/footer text legible at the very edges */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(180deg, rgba(5,5,12,0.5) 0%, transparent 18%, transparent 82%, rgba(5,5,12,0.6) 100%)",
        }}
      />
    </div>
  );
}
