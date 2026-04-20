import { useRef } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";

interface Props {
  isActive: boolean;
}

const RAYS = [
  "M960,540 Q1060,390 1380,180",
  "M960,540 Q1150,440 1480,440",
  "M960,540 Q1100,580 1420,720",
  "M960,540 Q960,680 960,900",
  "M960,540 Q820,680 540,720",
  "M960,540 Q770,440 440,440",
  "M960,540 Q860,390 540,180",
  "M960,540 Q960,380 960,160",
];

export default function SlideIgnition({ isActive }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const sunRef = useRef<SVGCircleElement>(null);
  const particleRefs = useRef<SVGCircleElement[]>([]);

  useGSAP(
    () => {
      if (!isActive) return;

      const tl = gsap.timeline();

      // Sun appears from nothing with a spring overshoot
      tl.fromTo(
        sunRef.current,
        { scale: 0, transformOrigin: "960px 540px" },
        { scale: 1, duration: 0.9, ease: "back.out(1.7)" }
      );

      // Particles burst outward along each ray with stagger
      particleRefs.current.forEach((p, i) => {
        tl.fromTo(
          p,
          { opacity: 0, scale: 0, transformOrigin: "center center" },
          {
            opacity: 1,
            scale: 1,
            motionPath: {
              path: `#ray-${i}`,
              align: `#ray-${i}`,
              alignOrigin: [0.5, 0.5],
              start: 0,
              end: 1,
            },
            duration: 1.2,
            ease: "power3.out",
          },
          tl.duration() - 0.6 + i * 0.08
        );
      });

      return () => tl.revert();
    },
    { scope: containerRef, dependencies: [isActive] }
  );

  return (
    <div
      ref={containerRef}
      style={{
        width: "100vw",
        height: "100vh",
        position: "relative",
        background: "var(--bg-cream)",
        overflow: "hidden",
      }}
    >
      <svg
        viewBox="0 0 1920 1080"
        width="100%"
        height="100%"
        style={{ position: "absolute", inset: 0 }}
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Motion paths — visible dashed strokes */}
        {RAYS.map((d, i) => (
          <path
            key={i}
            id={`ray-${i}`}
            d={d}
            fill="none"
            stroke="var(--accent-brown)"
            strokeWidth="1.5"
            strokeDasharray="4 10"
            opacity="0.5"
          />
        ))}

        {/* Sun — flat orange circle */}
        <circle
          ref={sunRef}
          cx="960"
          cy="540"
          r="88"
          fill="var(--accent-orange)"
        />

        {/* Sun inner ring detail */}
        <circle
          cx="960"
          cy="540"
          r="60"
          fill="none"
          stroke="var(--accent-brick)"
          strokeWidth="2"
          opacity="0.4"
          style={{ pointerEvents: "none" }}
        />

        {/* Particles — one per ray */}
        {RAYS.map((_, i) => (
          <circle
            key={i}
            ref={(el) => {
              if (el) particleRefs.current[i] = el;
            }}
            cx="960"
            cy="540"
            r={i % 2 === 0 ? 14 : 10}
            fill={i % 3 === 0 ? "var(--accent-brick)" : "var(--accent-brown)"}
            opacity="0"
          />
        ))}
      </svg>

      <h2
        style={{
          position: "absolute",
          bottom: "10%",
          left: "8%",
          fontFamily: "'Space Grotesk', system-ui",
          fontWeight: 700,
          fontSize: "clamp(1.4rem, 2.5vw, 2.2rem)",
          letterSpacing: "0.14em",
          textTransform: "uppercase",
          color: "var(--ink)",
        }}
      >
        01 / IGNITION
      </h2>
    </div>
  );
}
