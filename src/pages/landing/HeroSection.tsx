
import { useRef } from "react";
import { motion, useScroll, useTransform } from "framer-motion";


import FrameCanvas from "./FrameCanvas";

const SCROLL_HEIGHT = "600vh"; // Total scroll travel for animation

export default function HeroSection() {
  const containerRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end end"],
  });

  // Parallax transforms on text elements
  const heroOpacity = useTransform(scrollYProgress, [0, 0.12], [1, 0]);
  const heroY = useTransform(scrollYProgress, [0, 0.12], ["0%", "-30%"]);

  // Phase labels that fade in/out as scroll progresses
  const phase1Opacity = useTransform(scrollYProgress, [0.05, 0.15, 0.28, 0.38], [0, 1, 1, 0]);
  const phase2Opacity = useTransform(scrollYProgress, [0.35, 0.45, 0.58, 0.68], [0, 1, 1, 0]);
  const phase3Opacity = useTransform(scrollYProgress, [0.65, 0.75, 0.92, 1.0], [0, 1, 1, 0]);

  // Canvas scale for cinematic zoom feel
  const canvasScale = useTransform(scrollYProgress, [0, 0.5, 1], [1, 1.04, 1]);

  return (
    <div
      id="frame-scroll-zone"
      ref={containerRef}
      style={{ height: SCROLL_HEIGHT }}
      className="relative"
    >
      {/* Sticky canvas + overlay */}
      <div className="sticky top-0 h-screen w-full overflow-hidden">
        {/* Radial ambient lights */}
        <div
          className="absolute inset-0 z-0 pointer-events-none"
          style={{
            background:
              "radial-gradient(ellipse 80% 60% at 50% 110%, rgba(255,138,0,0.06) 0%, transparent 70%), radial-gradient(ellipse 60% 40% at 20% -10%, rgba(255,138,0,0.03) 0%, transparent 60%)",
          }}
        />

        {/* 3D Frame Canvas */}
        <motion.div
          className="absolute inset-0 z-10"
          style={{ scale: canvasScale }}
        >
          {/* Vignette frame */}
          <div
            className="absolute inset-0 z-20 pointer-events-none"
            style={{
              background:
                "radial-gradient(ellipse 85% 85% at 50% 50%, transparent 40%, rgba(3,3,10,0.7) 100%)",
            }}
          />
          <FrameCanvas />
        </motion.div>

        {/* Hero text — fades on scroll start */}
        <motion.div
          style={{ opacity: heroOpacity, y: heroY }}
          className="absolute bottom-0 left-0 right-0 z-30 flex flex-col items-center pb-24 pointer-events-none"
        >
          {/* Eyebrow */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6, duration: 0.8 }}
            className="tracking-cinematic text-xs font-medium mb-4"
            style={{ color: "var(--empx-gold)", letterSpacing: "0.35em" }}
          >
            NEXT-GENERATION DIGITAL INFRASTRUCTURE
          </motion.p>

          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8, duration: 1, ease: [0.16, 1, 0.3, 1] }}
            className="text-6xl md:text-8xl lg:text-9xl font-bold text-center leading-none tracking-tight"
          >
            <span className="gradient-gold text-glow-gold">EMP</span>
            <span className="text-white">X</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.1, duration: 0.8 }}
            className="mt-4 text-sm md:text-base text-white/40 tracking-widest-xl text-center"
            style={{ letterSpacing: "0.18em" }}
          >
            SCROLL TO EXPLORE
          </motion.p>

          {/* Scroll indicator */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.5, duration: 0.8 }}
            className="mt-6 flex flex-col items-center gap-2"
          >
            <div className="w-px h-16 bg-gradient-to-b from-transparent via-[rgba(200,169,110,0.5)] to-transparent" />
          </motion.div>
        </motion.div>

        {/* Phase 1: ROTATING */}
        <motion.div
          style={{ opacity: phase1Opacity }}
          className="absolute top-1/2 left-8 md:left-16 -translate-y-1/2 z-30 pointer-events-none"
        >
          <p className="text-xs tracking-cinematic text-white/30 mb-2" style={{ letterSpacing: "0.3em" }}>PHASE 01</p>
          <h2 className="text-2xl md:text-4xl font-bold gradient-gold leading-tight">
            Precision<br />Engineered
          </h2>
          <p className="mt-3 text-sm text-white/50 max-w-[200px] leading-relaxed">
            Every component crafted to exact specifications.
          </p>
        </motion.div>

        {/* Phase 2: EXPLODING */}
        <motion.div
          style={{ opacity: phase2Opacity }}
          className="absolute top-1/2 right-8 md:right-16 -translate-y-1/2 z-30 pointer-events-none text-right"
        >
          <p className="text-xs tracking-cinematic text-white/30 mb-2" style={{ letterSpacing: "0.3em" }}>PHASE 02</p>
          <h2 className="text-2xl md:text-4xl font-bold gradient-blue leading-tight">
            Modular<br />Architecture
          </h2>
          <p className="mt-3 text-sm text-white/50 max-w-[200px] ml-auto leading-relaxed">
            Decentralised by design. Infinitely composable.
          </p>
        </motion.div>

        {/* Phase 3: REASSEMBLING */}
        <motion.div
          style={{ opacity: phase3Opacity }}
          className="absolute bottom-24 left-0 right-0 z-30 flex flex-col items-center pointer-events-none"
        >
          <p className="text-xs tracking-cinematic text-white/30 mb-2" style={{ letterSpacing: "0.3em" }}>PHASE 03</p>
          <h2 className="text-3xl md:text-5xl font-bold gradient-mixed text-center leading-tight">
            Unified. Complete.
          </h2>
          <p className="mt-4 text-sm text-white/50 text-center max-w-sm leading-relaxed">
            The full EMPX ecosystem — seamlessly integrated, endlessly scalable.
          </p>
        </motion.div>
      </div>
    </div>
  );
}
