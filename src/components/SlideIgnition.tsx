import { useRef } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";

interface Props {
  isActive: boolean;
}

const SUN_CX = 960;
const SUN_CY = 540;
const SUN_R  = 88;

const PARTICLE_COUNT = 55;

const PARTICLES = Array.from({ length: PARTICLE_COUNT }, (_, i) => {
  const angle          = (i / PARTICLE_COUNT) * Math.PI * 2 + i * 0.37;
  const initDist       = 250 + (i % 7) * 70 + Math.sin(i) * 40;
  const orbitRx        = 140 + (i % 9) * 42 + Math.cos(i * 1.3) * 25;
  const orbitRy        = orbitRx * (0.55 + (i % 4) * 0.1);
  const orbitSpeed     = 5 + (i % 5) * 1.6 + Math.sin(i) * 0.7;
  // Burst lands exactly at the orbit entry point
  const orbitPhase     = angle;
  const burstX         = SUN_CX + Math.cos(orbitPhase) * orbitRx;
  const burstY         = SUN_CY + Math.sin(orbitPhase) * orbitRy;
  return {
    id: i,
    initDist,
    initX:      SUN_CX + Math.cos(angle) * initDist,
    initY:      SUN_CY + Math.sin(angle) * initDist,
    r:          1.8 + (i % 4) * 1.2,
    fill:       i % 3 === 0 ? "var(--accent-brick)" : i % 3 === 1 ? "var(--accent-brown)" : "var(--accent-orange)",
    burstX,
    burstY,
    orbitRx,
    orbitRy,
    orbitSpeed,
    orbitPhase,
  };
});

export default function SlideIgnition({ isActive }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const sunRef       = useRef<SVGCircleElement>(null);
  const sunGlowRef   = useRef<SVGCircleElement>(null);
  const sunRingRef   = useRef<SVGCircleElement>(null);
  const particleRefs = useRef<SVGCircleElement[]>([]);
  const angles       = useRef<number[]>(PARTICLES.map((p) => p.orbitPhase));
  const orbitActive  = useRef(false);

  useGSAP(
    () => {
      if (!isActive) return;

      orbitActive.current = false;
      angles.current = PARTICLES.map((p) => p.orbitPhase);

      // Reset
      gsap.set(sunRef.current,     { attr: { r: 0 }, opacity: 0 });
      gsap.set(sunGlowRef.current, { attr: { r: 0 }, opacity: 0 });
      gsap.set(sunRingRef.current, { attr: { r: SUN_R }, opacity: 0 });
      particleRefs.current.forEach((p, i) => {
        gsap.set(p, { attr: { cx: PARTICLES[i].initX, cy: PARTICLES[i].initY }, opacity: 0 });
      });

      const tl = gsap.timeline();

      // Phase 1 — particules apparaissent
      particleRefs.current.forEach((p, i) => {
        tl.to(p, { opacity: 0.5 + (i % 3) * 0.15, duration: 0.3, ease: "power1.in" }, i * 0.018);
      });

      // Phase 2 — convergence au centre
      tl.addLabel("collapse", 0.9 + PARTICLE_COUNT * 0.018);
      particleRefs.current.forEach((p, i) => {
        tl.to(p, {
          attr: { cx: SUN_CX, cy: SUN_CY },
          opacity: 1,
          duration: 1.0 + (PARTICLES[i].initDist / 900) * 0.5,
          ease: "power2.in",
        }, `collapse+=${i * 0.01}`);
      });

      // Phase 3 — explosion : soleil + flash + burst particules
      tl.addLabel("explode", "collapse+=1.4");

      tl.to(sunRef.current, { attr: { r: SUN_R * 1.2 }, opacity: 1, duration: 0.15, ease: "power4.out" }, "explode");
      tl.to(sunRef.current, { attr: { r: SUN_R }, duration: 0.4, ease: "power2.inOut" }, "explode+=0.15");

      tl.to(sunGlowRef.current, { attr: { r: SUN_R * 2.6 }, opacity: 0.5, duration: 0.15, ease: "power4.out" }, "explode");
      tl.to(sunGlowRef.current, { attr: { r: SUN_R * 3 }, opacity: 0, duration: 0.5, ease: "power2.out" }, "explode+=0.15");

      tl.to(sunRingRef.current, { opacity: 0.5, duration: 0.08 }, "explode");
      tl.to(sunRingRef.current, { attr: { r: SUN_R * 4.5 }, opacity: 0, duration: 1.0, ease: "power2.out" }, "explode+=0.08");

      // Burst : chaque particule va directement à son point d'entrée d'orbite
      // ease "power3.out" = rapide au départ, ralentit en arrivant = effet gravité naturel
      particleRefs.current.forEach((p, i) => {
        tl.to(p, {
          attr: { cx: PARTICLES[i].burstX, cy: PARTICLES[i].burstY },
          opacity: 0.75,
          duration: 0.7 + (i % 4) * 0.12,
          ease: "power3.out",
        }, `explode+=${i * 0.005}`);
      });

      // Phase 4 — quand le burst est fini, le ticker prend le relais sans saut
      // car les particules sont déjà exactement à orbitPhase sur leur ellipse
      tl.call(() => {
        particleRefs.current.forEach((p) => gsap.killTweensOf(p));
        orbitActive.current = true;
      }, [], "explode+=1.4");

      // Respiration du soleil
      tl.to(sunRef.current, {
        attr: { r: SUN_R * 1.04 },
        duration: 2.2,
        ease: "sine.inOut",
        repeat: -1,
        yoyo: true,
      }, "explode+=0.6");

      // Ticker — orbite continue, reprise exactement à burstX/burstY = orbitPhase
      const orbitTicker = () => {
        if (!orbitActive.current) return;
        PARTICLES.forEach((pt, i) => {
          angles.current[i] += (2 * Math.PI) / (pt.orbitSpeed * 60);
          const el = particleRefs.current[i];
          if (!el) return;
          el.setAttribute("cx", String(SUN_CX + Math.cos(angles.current[i]) * pt.orbitRx));
          el.setAttribute("cy", String(SUN_CY + Math.sin(angles.current[i]) * pt.orbitRy));
        });
      };
      gsap.ticker.add(orbitTicker);

      return () => {
        orbitActive.current = false;
        gsap.ticker.remove(orbitTicker);
        tl.kill();
      };
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
        <circle ref={sunGlowRef} cx={SUN_CX} cy={SUN_CY} r="0" fill="var(--accent-orange)" opacity="0" />
        <circle ref={sunRingRef} cx={SUN_CX} cy={SUN_CY} r={SUN_R} fill="none" stroke="var(--accent-brick)" strokeWidth="2" opacity="0" />

        {/* Sun avant les particules dans le DOM = particules par-dessus */}
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
