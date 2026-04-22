import { useRef } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";

interface Props {
  isActive: boolean;
}

const SUN_CX = 960;
const SUN_CY = 540;
const SUN_R  = 88;

const PARTICLE_COUNT = 40;

function makeOrbitPath(rx: number, ry: number): string {
  return `M ${SUN_CX - rx} ${SUN_CY} a ${rx} ${ry} 0 1 0 ${rx * 2} 0 a ${rx} ${ry} 0 1 0 ${-rx * 2} 0`;
}

const PARTICLES = Array.from({ length: PARTICLE_COUNT }, (_, i) => {
  const initAngle  = (i / PARTICLE_COUNT) * Math.PI * 2;
  const initDist   = 220 + (i % 7) * 65 + Math.sin(i * 1.3) * 35;
  const orbitRx    = 140 + (i % 9) * 38 + Math.cos(i * 1.3) * 22;
  const orbitRy    = orbitRx * (0.45 + (i % 5) * 0.09);
  const startRatio = i / PARTICLE_COUNT;
  const orbitSpeed = 4 + (i % 6) * 1.2 + Math.sin(i) * 0.5;
  const accelDur   = 2.5 + (i % 4) * 0.6;
  return {
    id:         i,
    initX:      SUN_CX + Math.cos(initAngle) * initDist,
    initY:      SUN_CY + Math.sin(initAngle) * initDist,
    r:          1.8 + (i % 4) * 1.1,
    fill:       i % 3 === 0 ? "var(--accent-brick)" : i % 3 === 1 ? "var(--accent-brown)" : "var(--accent-orange)",
    orbitRx,
    orbitRy,
    startRatio,
    orbitSpeed,
    accelDur,
    initDist,
    pathId:     `orbit-p-${i}`,
  };
});

export default function SlideIgnition({ isActive }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const sunRef       = useRef<SVGCircleElement>(null);
  const sunGlowRef   = useRef<SVGCircleElement>(null);
  const sunRingRef   = useRef<SVGCircleElement>(null);
  const particleRefs = useRef<SVGCircleElement[]>([]);

  useGSAP(
    () => {
      if (!isActive) return;

      gsap.set(sunRef.current,     { attr: { r: 0 }, opacity: 0 });
      gsap.set(sunGlowRef.current, { attr: { r: 0 }, opacity: 0 });
      gsap.set(sunRingRef.current, { attr: { r: SUN_R }, opacity: 0 });
      particleRefs.current.forEach((p, i) => {
        gsap.set(p, { attr: { cx: PARTICLES[i].initX, cy: PARTICLES[i].initY }, opacity: 0 });
      });

      const tl = gsap.timeline();

      // Phase 1 — apparition
      particleRefs.current.forEach((p, i) => {
        tl.to(p, { opacity: 0.5 + (i % 3) * 0.15, duration: 0.3, ease: "power1.in" }, i * 0.015);
      });

      // Phase 2 — convergence au centre
      tl.addLabel("collapse", 0.8 + PARTICLE_COUNT * 0.015);
      particleRefs.current.forEach((p, i) => {
        tl.to(p, {
          attr: { cx: SUN_CX, cy: SUN_CY },
          opacity: 1,
          duration: 0.9 + (PARTICLES[i].initDist / 900) * 0.5,
          ease: "power2.in",
        }, `collapse+=${i * 0.01}`);
      });

      // Phase 3 — explosion
      tl.addLabel("explode", "collapse+=1.3");

      tl.to(sunRef.current, { attr: { r: SUN_R * 1.2 }, opacity: 1, duration: 0.15, ease: "power4.out" }, "explode");
      tl.to(sunRef.current, { attr: { r: SUN_R }, duration: 0.4, ease: "power2.inOut" }, "explode+=0.15");
      tl.to(sunGlowRef.current, { attr: { r: SUN_R * 2.6 }, opacity: 0.5, duration: 0.15, ease: "power4.out" }, "explode");
      tl.to(sunGlowRef.current, { attr: { r: SUN_R * 3 }, opacity: 0, duration: 0.5, ease: "power2.out" }, "explode+=0.15");
      tl.to(sunRingRef.current, { opacity: 0.5, duration: 0.08 }, "explode");
      tl.to(sunRingRef.current, { attr: { r: SUN_R * 4.5 }, opacity: 0, duration: 1.0, ease: "power2.out" }, "explode+=0.08");

      // Phase 4 — chaque particule part du centre vers son point d'entrée puis orbite
      particleRefs.current.forEach((p, i) => {
        const pt = PARTICLES[i];
        const burstOffset = `explode+=${i * 0.008}`;

        // Remet la particule au centre exactement au moment du burst
        tl.set(p, { attr: { cx: SUN_CX, cy: SUN_CY } }, burstOffset);

        // Burst : du centre vers le point d'entrée sur son path (tween cx/cy classique)
        const entryX = SUN_CX + Math.cos(pt.startRatio * Math.PI * 2) * pt.orbitRx;
        const entryY = SUN_CY + Math.sin(pt.startRatio * Math.PI * 2) * pt.orbitRy;
        tl.to(p, {
          attr: { cx: entryX, cy: entryY },
          opacity: 0.7,
          duration: 0.5 + (i % 4) * 0.07,
          ease: "power3.out",
        }, burstOffset);

        // Accélération : 1 tour avec ease power2.in (lent → rapide)
        tl.to(p, {
          motionPath: {
            path: `#${pt.pathId}`,
            align: `#${pt.pathId}`,
            alignOrigin: [0.5, 0.5],
            start: pt.startRatio,
            end:   pt.startRatio + 1,
          },
          duration: pt.accelDur,
          ease: "power2.in",
        }, ">");

        // Orbite infinie à vitesse max
        tl.to(p, {
          motionPath: {
            path: `#${pt.pathId}`,
            align: `#${pt.pathId}`,
            alignOrigin: [0.5, 0.5],
            start: pt.startRatio + 1,
            end:   pt.startRatio + 2,
          },
          duration: pt.orbitSpeed,
          ease: "none",
          repeat: -1,
        }, ">");
      });

      // Respiration du soleil
      tl.to(sunRef.current, {
        attr: { r: SUN_R * 1.04 },
        duration: 2.2,
        ease: "sine.inOut",
        repeat: -1,
        yoyo: true,
      }, "explode+=0.6");

      return () => { tl.kill(); };
    },
    { scope: containerRef, dependencies: [isActive] }
  );

  return (
    <div
      ref={containerRef}
      style={{ width: "100vw", height: "100vh", position: "relative", background: "var(--bg-cream)", overflow: "hidden" }}
    >
      <svg
        viewBox="0 0 1920 1080"
        width="100%"
        height="100%"
        style={{ position: "absolute", inset: 0 }}
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Un path d'orbite invisible par particule */}
        {PARTICLES.map((p) => (
          <path
            key={p.pathId}
            id={p.pathId}
            d={makeOrbitPath(p.orbitRx, p.orbitRy)}
            fill="none"
            stroke="none"
          />
        ))}

        <circle ref={sunGlowRef} cx={SUN_CX} cy={SUN_CY} r="0" fill="var(--accent-orange)" opacity="0" />
        <circle ref={sunRingRef} cx={SUN_CX} cy={SUN_CY} r={SUN_R} fill="none" stroke="var(--accent-brick)" strokeWidth="2" opacity="0" />

        <circle ref={sunRef} cx={SUN_CX} cy={SUN_CY} r="0" fill="var(--accent-orange)" opacity="0" />
        <circle cx={SUN_CX} cy={SUN_CY} r="60" fill="none" stroke="var(--accent-brick)" strokeWidth="2" opacity="0.35" />

        {PARTICLES.map((p, i) => (
          <circle
            key={p.id}
            ref={(el) => { if (el) particleRefs.current[i] = el; }}
            cx={p.initX} cy={p.initY}
            r={p.r} fill={p.fill} opacity="0"
          />
        ))}
      </svg>

      <h2 style={{
        position: "absolute", bottom: "10%", left: "8%",
        fontFamily: "'Space Grotesk', system-ui", fontWeight: 700,
        fontSize: "clamp(1.4rem, 2.5vw, 2.2rem)", letterSpacing: "0.14em",
        textTransform: "uppercase", color: "var(--ink)",
      }}>
        01 / ORIGINE
      </h2>
    </div>
  );
}
