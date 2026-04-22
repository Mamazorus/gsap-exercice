import { useRef } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";

interface Props {
  isActive: boolean;
}

const SUN_CX = 960;
const SUN_CY = 540;
const SUN_R  = 100;

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
  { id: "v-planet-a", r: 18, fill: "var(--accent-brown)", rx: 220, ry: 75,  duration: 5, startRatio: 0 },
  { id: "v-planet-b", r: 14, fill: "var(--accent-teal)",  rx: 370, ry: 120, duration: 7, startRatio: 0 },
  { id: "v-planet-c", r: 10, fill: "var(--accent-brick)", rx: 530, ry: 170, duration: 9, startRatio: 0 },
];

const MOON_ORBIT_RX = 38;
const MOON_ORBIT_RY = 14;
const MOON_DURATION = 1.8;

const COMET_PATH = `M 300,-350 C 600,1200 1320,1200 1620,-350`;
const TAIL_LENGTH = 0.12;

export default function SlideVoyager({ isActive }: Props) {
  const containerRef       = useRef<HTMLDivElement>(null);
  const behindRefs         = useRef<SVGCircleElement[]>([]);
  const frontRefs          = useRef<SVGCircleElement[]>([]);
  const cometRef           = useRef<SVGGElement>(null);
  const trailRefs          = useRef<SVGPathElement[]>([]);
  // Moon layers: behindSun < Sun < behindPlanet < Planet < frontMoon
  const moonBehindSunRef   = useRef<SVGCircleElement>(null);
  const moonBehindPlanetRef = useRef<SVGCircleElement>(null);
  const moonFrontRef       = useRef<SVGCircleElement>(null);
  const moonOrbitRef       = useRef<SVGEllipseElement>(null);
  const moonAngleRef       = useRef(0);

  useGSAP(
    () => {
      if (!isActive) return;

      // Planets start directly in orbit — no entry animation (that was slide 2)
      PLANETS.forEach((planet, i) => {
        const behind = behindRefs.current[i];
        const front  = frontRefs.current[i];

        // Place at orbit entry point and start orbiting immediately
        gsap.set([behind, front], { opacity: 1 });

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

        gsap.ticker.add(() => {
          const ty       = gsap.getProperty(front, "y") as number;
          const isBehind = ty < 0;
          const scale    = 0.6 + 0.4 * ((ty + planet.ry) / (2 * planet.ry));
          const s        = Math.max(0.6, Math.min(1.0, scale));
          gsap.set(front,  { opacity: isBehind ? 0 : 1, scale: s, transformOrigin: "center center" });
          gsap.set(behind, { opacity: isBehind ? 1 : 0, scale: s, transformOrigin: "center center" });
        });
      });

      // Moon ticker — 3-layer depth system
      // Layer 1: moonBehindSunRef  — drawn before the Sun   (planet A orbit is rx=220, never touches sun)
      // Layer 2: moonBehindPlanetRef — drawn after Sun, before front-planets
      // Layer 3: moonFrontRef      — drawn after front-planets
      gsap.set(
        [moonBehindSunRef.current, moonBehindPlanetRef.current, moonFrontRef.current],
        { opacity: 0 }
      );
      gsap.set(moonOrbitRef.current, { opacity: 0 });
      gsap.to([moonBehindPlanetRef.current, moonFrontRef.current], {
        opacity: 1, duration: 0.6, delay: 0.3,
      });

      const planetAFront = frontRefs.current[0];

      const moonTicker = () => {
        const px = gsap.getProperty(planetAFront, "x") as number;
        const py = gsap.getProperty(planetAFront, "y") as number;

        // Planet absolute position in SVG space
        const planetAbsX = SUN_CX + px;
        const planetAbsY = SUN_CY + py;

        moonAngleRef.current += (2 * Math.PI) / (MOON_DURATION * 60);
        const angle = moonAngleRef.current;
        const mx = Math.cos(angle) * MOON_ORBIT_RX;
        const my = Math.sin(angle) * MOON_ORBIT_RY;

        // Moon absolute position
        const moonAbsX = planetAbsX + mx;
        const moonAbsY = planetAbsY + my;

        // Distance from moon to sun center
        const distToSun = Math.sqrt(
          (moonAbsX - SUN_CX) ** 2 + (moonAbsY - SUN_CY) ** 2
        );
        // Is moon behind the sun? (in front of sun = bottom half of sun ellipse = moon y > SUN_CY)
        const moonBehindSun = distToSun < SUN_R && moonAbsY < SUN_CY;

        // Is moon behind the planet? (top half of moon's own orbit around planet)
        const moonBehindPlanet = my < 0;

        // Is planet itself behind sun? (to scale moon correctly)
        const planetBehindSun = py < 0;

        const moonScale = 0.7 + 0.3 * ((my + MOON_ORBIT_RY) / (2 * MOON_ORBIT_RY));
        // Inherit planet scale for depth coherence
        const s = Math.max(0.5, Math.min(1.0, moonScale * (planetBehindSun ? 0.75 : 1)));

        // Shared position props — transforms relative to each circle's cx/cy=SUN_CX/SUN_CY
        const pos = {
          x: moonAbsX - SUN_CX,
          y: moonAbsY - SUN_CY,
          scale: s,
          transformOrigin: "center center",
        };

        // behindSun layer: only visible when moon is physically behind the sun
        gsap.set(moonBehindSunRef.current, {
          ...pos,
          opacity: moonBehindSun ? 0.7 : 0,
        });

        // behindPlanet layer: visible when moon is behind planet but NOT behind sun
        gsap.set(moonBehindPlanetRef.current, {
          ...pos,
          opacity: !moonBehindSun && moonBehindPlanet ? 1 : 0,
        });

        // front layer: visible when moon is in front of planet and NOT behind sun
        gsap.set(moonFrontRef.current, {
          ...pos,
          opacity: !moonBehindSun && !moonBehindPlanet ? 1 : 0,
        });

        // Orbit ring follows planet
        if (moonOrbitRef.current) {
          moonOrbitRef.current.setAttribute("cx", String(planetAbsX));
          moonOrbitRef.current.setAttribute("cy", String(planetAbsY));
        }
      };
      gsap.ticker.add(moonTicker);

      const DURATION = 9;

      const cometTl = gsap.timeline({
        repeat: -1,
        repeatDelay: 1.5,
        delay: 0.2,
        onRepeat() {
          const opacities = [0.04,0.08,0.12,0.18,0.24,0.31,0.38,0.46,0.54,0.62,0.69,0.76,0.82,0.88,0.92,0.95,0.97,0.98,0.99,1.00];
          trailRefs.current.forEach((el, i) => gsap.set(el, { opacity: opacities[i] }));
        },
      });

      cometTl.fromTo(
        cometRef.current,
        { opacity: 1 },
        {
          motionPath: {
            path: "#v-comet-path",
            align: "#v-comet-path",
            alignOrigin: [0.5, 0.5],
            autoRotate: true,
            start: 0,
            end: 1,
          },
          duration: DURATION,
          ease: "power4.inOut",
        },
        0
      );

      const LAYERS: [number, number][] = [
        [TAIL_LENGTH * 1.00, 0.04],
        [TAIL_LENGTH * 0.92, 0.08],
        [TAIL_LENGTH * 0.84, 0.12],
        [TAIL_LENGTH * 0.76, 0.18],
        [TAIL_LENGTH * 0.68, 0.24],
        [TAIL_LENGTH * 0.60, 0.31],
        [TAIL_LENGTH * 0.52, 0.38],
        [TAIL_LENGTH * 0.44, 0.46],
        [TAIL_LENGTH * 0.37, 0.54],
        [TAIL_LENGTH * 0.30, 0.62],
        [TAIL_LENGTH * 0.24, 0.69],
        [TAIL_LENGTH * 0.18, 0.76],
        [TAIL_LENGTH * 0.13, 0.82],
        [TAIL_LENGTH * 0.09, 0.88],
        [TAIL_LENGTH * 0.06, 0.92],
        [TAIL_LENGTH * 0.04, 0.95],
        [TAIL_LENGTH * 0.025, 0.97],
        [TAIL_LENGTH * 0.015, 0.98],
        [TAIL_LENGTH * 0.008, 0.99],
        [TAIL_LENGTH * 0.003, 1.00],
      ];

      const totalLen = trailRefs.current[0].getTotalLength();

      LAYERS.forEach(([, opac], li) => {
        gsap.set(trailRefs.current[li], {
          strokeDasharray: `0 ${totalLen}`,
          strokeDashoffset: 0,
          opacity: opac,
        });
      });

      const proxy = { t: 0 };
      cometTl.fromTo(
        proxy,
        { t: 0 },
        {
          t: 1,
          duration: DURATION,
          ease: "power4.inOut",
          onUpdate() {
            const headPx = proxy.t * totalLen;
            LAYERS.forEach(([frac], li) => {
              const el        = trailRefs.current[li];
              const tailPx    = totalLen * frac;
              const tailStart = Math.max(0, headPx - tailPx);
              el.style.strokeDasharray  = `${headPx - tailStart} ${totalLen}`;
              el.style.strokeDashoffset = `${-tailStart}`;
            });
          },
          onComplete() {
            trailRefs.current.forEach((el) =>
              gsap.to(el, { opacity: 0, duration: 0.8 })
            );
          },
        },
        0
      );

      return () => { gsap.ticker.remove(moonTicker); };
    },
    { scope: containerRef, dependencies: [isActive] }
  );

  const moonFill = "#b0b0b0";

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
        {/* MotionPath guides */}
        {PLANETS.map((planet, i) => (
          <path
            key={`v-orbit-${i}`}
            id={`v-orbit-${i}`}
            d={ellipsePath(SUN_CX, SUN_CY, planet.rx, planet.ry)}
            fill="none"
            stroke="none"
          />
        ))}
        <path id="v-comet-path" d={COMET_PATH} fill="none" stroke="none" />

        {/* Orbit top arcs — behind sun */}
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

        {/* Moon behind sun (deepest layer) */}
        <circle
          ref={moonBehindSunRef}
          cx={SUN_CX} cy={SUN_CY}
          r={5} fill={moonFill}
          opacity="0"
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
        <circle cx={SUN_CX} cy={SUN_CY} r={SUN_R} fill="var(--accent-orange)" />
        <circle cx={SUN_CX} cy={SUN_CY} r="68" fill="none" stroke="var(--accent-brick)" strokeWidth="2" opacity="0.35" />

        {/* Orbit bottom arcs — in front of sun */}
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

        {/* Moon behind planet (in front of sun, but behind planet A) */}
        <circle
          ref={moonBehindPlanetRef}
          cx={SUN_CX} cy={SUN_CY}
          r={5} fill={moonFill}
          opacity="0"
        />

        {/* Moon orbit ring — invisible guide only */}
        <ellipse
          ref={moonOrbitRef}
          cx={SUN_CX} cy={SUN_CY}
          rx={MOON_ORBIT_RX} ry={MOON_ORBIT_RY}
          fill="none"
          stroke="none"
          opacity="0"
        />

        {/* Comet trail */}
        {[3,2.9,2.8,2.7,2.6,2.5,2.4,2.3,2.2,2.1,2,1.9,1.8,1.6,1.5,1.4,1.3,1.2,1.1,1].map((sw, i) => (
          <path
            key={`trail-${i}`}
            ref={(el) => { if (el) trailRefs.current[i] = el; }}
            d={COMET_PATH}
            fill="none"
            stroke="var(--accent-teal)"
            strokeWidth={sw}
            strokeLinecap="round"
            opacity="0"
          />
        ))}

        {/* Front-of-sun planets */}
        {PLANETS.map((planet, i) => (
          <circle
            key={`front-${planet.id}`}
            ref={(el) => { if (el) frontRefs.current[i] = el; }}
            cx={SUN_CX} cy={SUN_CY}
            r={planet.r} fill={planet.fill} opacity="0"
          />
        ))}

        {/* Moon in front of planet (topmost moon layer) */}
        <circle
          ref={moonFrontRef}
          cx={SUN_CX} cy={SUN_CY}
          r={5} fill={moonFill}
          opacity="0"
        />

        {/* Comet — always on top */}
        <g ref={cometRef} opacity="0">
          <ellipse cx="-38" cy="0" rx="18" ry="3.5" fill="var(--accent-teal)" opacity="0.3" />
          <ellipse cx="-26" cy="0" rx="22" ry="5"   fill="var(--accent-teal)" opacity="0.4" />
          <ellipse cx="-14" cy="0" rx="26" ry="6.5" fill="var(--accent-teal)" opacity="0.5" />
          <circle cx="0" cy="0" r="10" fill="var(--ink)" />
          <circle cx="0" cy="0" r="6"  fill="var(--accent-teal)" />
          <circle cx="-2" cy="-2" r="3" fill="var(--bg-cream)" opacity="0.6" />
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
        03 / SYSTÈME
      </h2>
    </div>
  );
}
