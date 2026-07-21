
import { useRef, useEffect, useState } from "react";
import { motion, useInView } from "framer-motion";

const STATS = [
  { value: 50, suffix: "B+", label: "Assets Under Management", prefix: "$" },
  { value: 2.4, suffix: "M+", label: "Active Wallets", prefix: "" },
  { value: 99.99, suffix: "%", label: "Platform Uptime", prefix: "" },
  { value: 40, suffix: "+", label: "Supported Networks", prefix: "" },
];

function CountUp({ value, prefix, suffix }: { value: number; prefix: string; suffix: string }) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true });

  useEffect(() => {
    if (!inView) return;
    let start = 0;
    const end = value;
    const duration = 1800;
    const step = (end / duration) * 16;
    const timer = setInterval(() => {
      start += step;
      if (start >= end) {
        setCount(end);
        clearInterval(timer);
      } else {
        setCount(parseFloat(start.toFixed(2)));
      }
    }, 16);
    return () => clearInterval(timer);
  }, [inView, value]);

  const display = value % 1 !== 0 ? count.toFixed(2) : Math.floor(count).toString();

  return (
    <span ref={ref}>
      {prefix}{display}{suffix}
    </span>
  );
}

export default function StatsSection() {
  const ref = useRef<HTMLElement>(null);
  const inView = useInView(ref, { once: true, margin: "-100px" });

  return (
    <section ref={ref} id="technology" className="relative py-24 px-6 overflow-hidden">
      {/* Dividers */}
      <div className="divider mb-24" />

      {/* Background */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse 80% 60% at 50% 50%, rgba(255,138,0,0.03) 0%, transparent 70%)",
        }}
      />

      <div className="max-w-7xl mx-auto">
        {/* Label */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={inView ? { opacity: 1 } : {}}
          transition={{ duration: 0.6 }}
          className="text-center text-xs font-medium tracking-cinematic mb-16"
          style={{ color: "var(--empx-orange)", letterSpacing: "0.3em" }}
        >
          BY THE NUMBERS
        </motion.p>

        {/* Stats grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-px">
          {STATS.map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 30 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.7, delay: i * 0.1, ease: [0.16, 1, 0.3, 1] }}
              className="relative flex flex-col items-center py-12 px-6 text-center"
            >
              {/* Glass card */}
              <div
                className="absolute inset-2 glass"
                style={{ borderColor: "rgba(255,255,255,0.05)" }}
              />

              <div className="relative z-10">
                <p
                  className="text-4xl md:text-5xl lg:text-6xl font-bold leading-none mb-3"
                  style={{
                    background:
                      i % 2 === 0
                        ? "linear-gradient(135deg, #c8a96e, #e8c98e)"
                        : "linear-gradient(135deg, #FFB347, #FF6B00)",
                    WebkitBackgroundClip: "text",
                    backgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                  }}
                >
                  <CountUp value={stat.value} prefix={stat.prefix} suffix={stat.suffix} />
                </p>
                <p className="text-xs font-medium text-white/40 tracking-wider" style={{ letterSpacing: "0.1em" }}>
                  {stat.label}
                </p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      <div className="divider mt-24" />
    </section>
  );
}
