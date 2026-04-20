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

// startRatio: 0 = path starts at M cx-rx, cy (left tip) — matches where the glide animation lands
const PLANETS = [
  { id: "v-planet-a", r: 18, fill: "var(--accent-brown)", rx: 220, ry: 75,  duration: 5,  startRatio: 0 },
  { id: "v-planet-b", r: 14, fill: "var(--accent-teal)",  rx: 370, ry: 120, duration: 7,  startRatio: 0 },
  { id: "v-planet-c", r: 10, fill: "var(--accent-brick)", rx: 530, ry: 170, duration: 9,  startRatio: 0 },
];

// Comet enters top-left, slingshots close to sun, exits bottom-right
const COMET_PATH = `M -80,60 C 150,180 450,480 ${SUN_CX - 110},${SUN_CY - 20} C ${SUN_CX + 80},${SUN_CY + 20} 1100,420 1980,880`;

export default function SlideVoyager({ isActive }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const behindRefs   = useRef<SVGCircleElement[]>([]);
  const frontRefs    = useRef<SVGCircleElement[]>([]);
  const cometRef     = useRef<SVGGElement>(null);

  useGSAP(
    () => {
      if (!isActive) return;

      // Planets: emerge from sun center, glide to orbit entry, then loop forever
      PLANETS.forEach((planet, i) => {
        const behind = behindRefs.current[i];
        const front  = frontRefs.current[i];

        gsap.set([behind, front], { x: 0, y: 0, opacity: 0 });

        gsap.to([behind, front], {
          x: -planet.rx,
          y: 0,
          opacity: 1,
          duration: 0.9,
          ease: "power2.out",
          delay: i * 0.4,
          onComplete: () => {
            const orbitConfig = {
              motionPath: {
                path: `#v-orbit-${i}`,
                align: `#v-orbit-${i}`,
                alignOrigin: [0.5, 0.5] as [number, number],
                start: planet.startRatio,
                end: planet.startRatio + 1,
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
          const ty = gsap.getProperty(front, "y") as number;
          const isBehind = ty < 0;
          gsap.set(front,  { opacity: isBehind ? 0 : 1 });
          gsap.set(behind, { opacity: isBehind ? 1 : 0 });
        });
      });

      // Comet: slow in, fast at perihelion, slow out — loops with pause
      gsap.fromTo(
        cometRef.current,
        { opacity: 0 },
        {
          opacity: 1,
          motionPath: {
            path: "#v-comet-path",
            align: "#v-comet-path",
            alignOrigin: [0.5, 0.5],
            autoRotate: true,
            start: 0,
            end: 1,
          },
          duration: 3.5,
          ease: "power4.inOut",
          repeat: -1,
          repeatDelay: 0.6,
          delay: 0.6,
        }
      );
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
        {/* Invisible full ellipses — MotionPath guides */}
        {PLANETS.map((planet, i) => (
          <path
            key={`v-orbit-${i}`}
            id={`v-orbit-${i}`}
            d={ellipsePath(SUN_CX, SUN_CY, planet.rx, planet.ry)}
            fill="none"
            stroke="none"
          />
        ))}

        {/* Comet path — invisible guide */}
        <path id="v-comet-path" d={COMET_PATH} fill="none" stroke="none" />

        {/* Top arc strokes — behind sun */}
        {PLANETS.map((planet, i) => (
          <path
            key={`arc-top-${i}`}
            d={ellipseTopArc(SUN_CX, SUN_CY, planet.rx, planet.ry)}
            fill="none"
            stroke="var(--accent-brown)"
            strokeWidth="1.2"
            strokeDasharray="6 14"
            opacity="0.35"
          />
        ))}

        {/* Comet path visible stroke — behind sun half */}
        <path
          d={`M -80,60 C 150,180 450,480 ${SUN_CX},${SUN_CY}`}
          fill="none"
          stroke="var(--accent-teal)"
          strokeWidth="1"
          strokeDasharray="3 14"
          opacity="0.35"
        />

        {/* Behind-sun planets */}
        {PLANETS.map((planet, i) => (
          <circle
            key={`behind-${planet.id}`}
            ref={(el) => { if (el) behindRefs.current[i] = el; }}
            cx={SUN_CX} cy={SUN_CY}
            r={planet.r} fill={planet.fill} opacity="0"
          />
        ))}

        {/* Sun */}
        <circle cx={SUN_CX} cy={SUN_CY} r="100" fill="var(--accent-orange)" />
        <circle cx={SUN_CX} cy={SUN_CY} r="68" fill="none" stroke="var(--accent-brick)" strokeWidth="2" opacity="0.35" />

        {/* Bottom arc strokes — in front of sun */}
        {PLANETS.map((planet, i) => (
          <path
            key={`arc-bottom-${i}`}
            d={ellipseBottomArc(SUN_CX, SUN_CY, planet.rx, planet.ry)}
            fill="none"
            stroke="var(--accent-brown)"
            strokeWidth="1.2"
            strokeDasharray="6 14"
            opacity="0.35"
          />
        ))}

        {/* Comet path visible stroke — front half */}
        <path
          d={`M ${SUN_CX},${SUN_CY} C ${SUN_CX + 80},${SUN_CY + 20} 1100,420 1980,880`}
          fill="none"
          stroke="var(--accent-teal)"
          strokeWidth="1"
          strokeDasharray="3 14"
          opacity="0.35"
        />

        {/* Front-of-sun planets */}
        {PLANETS.map((planet, i) => (
          <circle
            key={`front-${planet.id}`}
            ref={(el) => { if (el) frontRefs.current[i] = el; }}
            cx={SUN_CX} cy={SUN_CY}
            r={planet.r} fill={planet.fill} opacity="0"
          />
        ))}

        {/* Comet — drawn last so always on top */}
        <g ref={cometRef} opacity="0">
          <ellipse cx="-18" cy="0" rx="26" ry="5" fill="var(--accent-teal)" opacity="0.5" />
          <circle cx="0" cy="0" r="9" fill="var(--ink)" />
          <circle cx="0" cy="0" r="5" fill="var(--accent-teal)" />
        </g>
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
        03 / VOYAGER
      </h2>
    </div>
  );
}
