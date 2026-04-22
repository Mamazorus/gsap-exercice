import { useRef } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";

interface Props {
  isActive: boolean;
}

const SUN_CX = 960;
const SUN_CY = 540;

function ellipsePath(cx: number, cy: number, rx: number, ry: number): string {
  return [
    `M ${cx - rx} ${cy}`,
    `a ${rx} ${ry} 0 1 0 ${rx * 2} 0`,
    `a ${rx} ${ry} 0 1 0 ${-rx * 2} 0`,
  ].join(" ");
}

function ellipseTopArc(cx: number, cy: number, rx: number, ry: number): string {
  return `M ${cx - rx} ${cy} a ${rx} ${ry} 0 1 1 ${rx * 2} 0`;
}

function ellipseBottomArc(cx: number, cy: number, rx: number, ry: number): string {
  return `M ${cx + rx} ${cy} a ${rx} ${ry} 0 1 1 ${-rx * 2} 0`;
}

const PLANETS = [
  { id: "planet-a", orbitId: "orbit-a", r: 18, fill: "var(--accent-brown)", rx: 220, ry: 75,  duration: 5, orbitStartRatio: 0 },
  { id: "planet-b", orbitId: "orbit-b", r: 14, fill: "var(--accent-teal)",  rx: 370, ry: 120, duration: 7, orbitStartRatio: 0 },
  { id: "planet-c", orbitId: "orbit-c", r: 10, fill: "var(--accent-brick)", rx: 530, ry: 170, duration: 9, orbitStartRatio: 0 },
];

export default function SlideAlignment({ isActive }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const behindRefs   = useRef<SVGCircleElement[]>([]);
  const frontRefs    = useRef<SVGCircleElement[]>([]);

  useGSAP(
    () => {
      if (!isActive) return;

      PLANETS.forEach((planet, i) => {
        const behind = behindRefs.current[i];
        const front  = frontRefs.current[i];

        gsap.set([behind, front], { x: 0, y: 0, opacity: 0 });

        const delay = i * 0.4;

        gsap.to([behind, front], {
          x: -planet.rx,
          y: 0,
          opacity: 1,
          duration: 0.9,
          ease: "power2.out",
          delay,
          onComplete: () => {
            const orbitConfig = {
              motionPath: {
                path: `#${planet.orbitId}`,
                align: `#${planet.orbitId}`,
                alignOrigin: [0.5, 0.5] as [number, number],
                start: planet.orbitStartRatio,
                end: planet.orbitStartRatio + 1,
              },
              duration: planet.duration,
              ease: "none" as const,
              repeat: -1,
            };
            gsap.to(behind, orbitConfig);
            gsap.to(front,  orbitConfig);
          },
        });

        gsap.ticker.add(() => {
          const ty       = gsap.getProperty(front, "y") as number;
          const isBehind = ty < 0;
          const scale    = 0.6 + 0.4 * ((ty + planet.ry) / (2 * planet.ry));
          const s        = Math.max(0.6, Math.min(1.0, scale));
          gsap.set(front,  { opacity: isBehind ? 0 : 1, scale: s, transformOrigin: "center center" });
          gsap.set(behind, { opacity: isBehind ? 1 : 0, scale: s, transformOrigin: "center center" });
        });
      });
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
        {PLANETS.map((planet) => (
          <path
            key={planet.orbitId}
            id={planet.orbitId}
            d={ellipsePath(SUN_CX, SUN_CY, planet.rx, planet.ry)}
            fill="none"
            stroke="none"
          />
        ))}

        {PLANETS.map((planet) => (
          <path
            key={`arc-top-${planet.id}`}
            d={ellipseTopArc(SUN_CX, SUN_CY, planet.rx, planet.ry)}
            fill="none"
            stroke="var(--accent-brown)"
            strokeWidth="1.2"
            strokeDasharray="6 14"
            opacity="0.45"
          />
        ))}

        {PLANETS.map((planet, i) => (
          <circle
            key={`behind-${planet.id}`}
            ref={(el) => { if (el) behindRefs.current[i] = el; }}
            cx={SUN_CX} cy={SUN_CY}
            r={planet.r} fill={planet.fill} opacity="0"
          />
        ))}

        <circle cx={SUN_CX} cy={SUN_CY} r="100" fill="var(--accent-orange)" />
        <circle cx={SUN_CX} cy={SUN_CY} r="68" fill="none" stroke="var(--accent-brick)" strokeWidth="2" opacity="0.35" />

        {PLANETS.map((planet) => (
          <path
            key={`arc-bottom-${planet.id}`}
            d={ellipseBottomArc(SUN_CX, SUN_CY, planet.rx, planet.ry)}
            fill="none"
            stroke="var(--accent-brown)"
            strokeWidth="1.2"
            strokeDasharray="6 14"
            opacity="0.45"
          />
        ))}

        {PLANETS.map((planet, i) => (
          <circle
            key={`front-${planet.id}`}
            ref={(el) => { if (el) frontRefs.current[i] = el; }}
            cx={SUN_CX} cy={SUN_CY}
            r={planet.r} fill={planet.fill} opacity="0"
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
        02 / FORMATION
      </h2>
    </div>
  );
}
