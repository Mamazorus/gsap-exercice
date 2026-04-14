import gsap from "gsap";
import { MotionPathPlugin } from "gsap/MotionPathPlugin";
import Matter from "matter-js";

gsap.registerPlugin(MotionPathPlugin);

const { Engine, Bodies, Body, Composite } = Matter;

function randomBetween(min: number, max: number): number {
  return Math.random() * (max - min) + min;
}

// ─────────────────────────────────────────────
// SCROLL FLUIDE
// ─────────────────────────────────────────────
let currentSection = 0;
const SECTION_COUNT = 3;
let isScrolling = false;
let section2Played = false;
let section3Played = false;

function goToSection(index: number) {
  if (index < 0 || index >= SECTION_COUNT || isScrolling) return;
  isScrolling = true;
  currentSection = index;

  gsap.to("#slider", {
    y: -index * window.innerHeight,
    duration: 1,
    ease: "power3.inOut",
    onComplete: () => {
      isScrolling = false;
      if (index === 1 && !section2Played) {
        section2Played = true;
        playSection2();
      }
      if (index === 2 && !section3Played) {
        section3Played = true;
        playSection3();
      }
    },
  });
}

window.addEventListener("wheel", (e) => {
  if (isScrolling) return;
  if (e.deltaY > 0) goToSection(currentSection + 1);
  else goToSection(currentSection - 1);
}, { passive: true });

let touchStartY = 0;
window.addEventListener("touchstart", (e) => { touchStartY = e.touches[0].clientY; }, { passive: true });
window.addEventListener("touchend", (e) => {
  if (isScrolling) return;
  const delta = touchStartY - e.changedTouches[0].clientY;
  if (Math.abs(delta) < 30) return;
  goToSection(delta > 0 ? currentSection + 1 : currentSection - 1);
}, { passive: true });

// ─────────────────────────────────────────────
// SECTION 1 — Matter.js
// ─────────────────────────────────────────────
const W = window.innerWidth;
const H = window.innerHeight;
const WALL = 60;
const COUNT = 60;

const COLORS = ["#3A9E5F","#2F6FBF","#F07A4A","#E8C84A","#E882A8","#A855C8","#E84A4A","#4AB8E8"];

const engine = Engine.create({ gravity: { x: 0, y: 2 } });
const world  = engine.world;

Composite.add(world, [
  Bodies.rectangle(W / 2, H + WALL / 2, W * 3, WALL, { isStatic: true }),
  Bodies.rectangle(-WALL / 2, H / 2, WALL, H * 3, { isStatic: true }),
  Bodies.rectangle(W + WALL / 2, H / 2, WALL, H * 3, { isStatic: true }),
]);

interface CircleItem { body: Matter.Body; el: HTMLDivElement; radius: number; }
const container = document.querySelector<HTMLDivElement>("#circles")!;
const items: CircleItem[] = [];

for (let i = 0; i < COUNT; i++) {
  const radius = randomBetween(60, 100);
  const color  = COLORS[Math.floor(Math.random() * COLORS.length)];
  const body = Bodies.circle(
    randomBetween(radius, W - radius),
    randomBetween(-1400, -radius),
    radius,
    { restitution: 0.55, friction: 0.05, frictionAir: 0.012, density: 0.002 }
  );
  Body.setVelocity(body, { x: randomBetween(-3, 3), y: randomBetween(1, 4) });
  Composite.add(world, body);

  const el = document.createElement("div");
  el.classList.add("circle");
  el.style.cssText = `width:${radius*2}px;height:${radius*2}px;background-color:${color};background-image:url('/src/pims_texture.png');background-size:cover;background-position:center;`;
  container.appendChild(el);
  items.push({ body, el, radius });
}

gsap.ticker.add(() => {
  Engine.update(engine, 1000 / 60);
  items.forEach(({ body, el, radius }) => {
    el.style.transform = `translate(${body.position.x - radius}px,${body.position.y - radius}px)`;
  });
});

gsap.timeline()
  .from("#hero-title",    { y: 40, opacity: 0, duration: 0.8, ease: "power3.out" })
  .from("#hero-subtitle", { y: 20, opacity: 0, duration: 0.6, ease: "power2.out" }, "-=0.4");

// ─────────────────────────────────────────────
// SECTION 2 — MotionPath infini
// ─────────────────────────────────────────────
const S_COLORS = ["#F4A0C0","#F07A4A","#E8C84A","#3A9E5F","#2F6FBF","#A855C8","#E84A4A","#4AB8E8"];
const S_RADIUS = 85;
// Durée d'un round trip. L'intervalle entre chaque rond = DURATION / MAX_VISIBLE
// MAX_VISIBLE=1.5 → il y a toujours 1 rond visible à l'écran, parfois 2
const DURATION    = 1.8;
const INTERVAL    = DURATION / 1.5; // ~1.2s entre chaque lancement
const OVERSHOOT   = 150;            // px hors écran avant d'entrer et après sortie

const sContainer = document.querySelector<HTMLDivElement>("#s-circles")!;

// Pool de 3 éléments DOM réutilisés en boucle
const POOL_SIZE = 3;
const pool: HTMLDivElement[] = [];
for (let i = 0; i < POOL_SIZE; i++) {
  const el = document.createElement("div");
  el.classList.add("s-circle");
  el.style.cssText = `
    width:${S_RADIUS * 2}px;
    height:${S_RADIUS * 2}px;
    background-size:cover;
    background-position:center;
    margin-left:-${S_RADIUS}px;
    margin-top:-${S_RADIUS}px;
    visibility:hidden;
  `;
  sContainer.appendChild(el);
  pool.push(el);
}

let colorIndex = 0;
let loopInterval: ReturnType<typeof setInterval> | null = null;

function playSection2() {
  const svg        = document.querySelector<SVGSVGElement>("#s-svg")!;
  const motionPath = document.querySelector<SVGPathElement>("#motion-path")!;
  const sec2       = document.querySelector<HTMLElement>("#section2")!;

  const svgRect  = svg.getBoundingClientRect();
  const sec2Rect = sec2.getBoundingClientRect();
  const vb       = svg.viewBox.baseVal;
  const scaleX   = svgRect.width  / vb.width;
  const scaleY   = svgRect.height / vb.height;
  const offsetX  = svgRect.left - sec2Rect.left;
  const offsetY  = svgRect.top  - sec2Rect.top;
  const totalLen = motionPath.getTotalLength();

  // Le path SVG va de y=1116 (bas) à y=-146 (haut) — sens inverse.
  // On lit donc de totalLen → 0 pour aller de haut en bas visuellement.
  // ptAt(0) = haut du path, ptAt(1) = bas du path.
  function ptAt(progress: number): { x: number; y: number } {
    const len = (1 - progress) * totalLen; // inverser le sens
    const pt  = motionPath.getPointAtLength(len);
    return {
      x: offsetX + pt.x * scaleX,
      y: offsetY + (pt.y - vb.y) * scaleY, // vb.y = -146, on recale
    };
  }

  let poolIdx = 0;

  function launchOne() {
    const el    = pool[poolIdx % POOL_SIZE];
    poolIdx++;
    const color = S_COLORS[colorIndex % S_COLORS.length];
    colorIndex++;

    el.style.backgroundColor = color;
    el.style.backgroundImage = `url('/src/pims_texture.png')`;
    el.style.visibility      = "visible";

    // Spawn légèrement au-dessus de l'écran (progress un peu négatif)
    // Le section2 a overflow:hidden donc le rond est invisible là
    const proxy = { t: -0.05 };
    const startPos = ptAt(proxy.t);
    gsap.set(el, { x: startPos.x, y: startPos.y });

    gsap.to(proxy, {
      t: 1.05,            // sort légèrement sous l'écran
      duration: DURATION,
      ease: "none",       // vitesse constante — pas de rebond, pas d'ease bizarre
      overwrite: true,
      onUpdate() {
        const pos = ptAt(proxy.t);
        gsap.set(el, { x: pos.x, y: pos.y });
      },
      onComplete() {
        el.style.visibility = "hidden";
      },
    });
  }

  // Premier lancement immédiat puis interval régulier
  launchOne();
  loopInterval = setInterval(launchOne, INTERVAL * 1000);
}

// Stopper la boucle section2 si on revient à section1
window.addEventListener("wheel", () => {
  if (currentSection === 0 && loopInterval !== null) {
    clearInterval(loopInterval);
    loopInterval = null;
    section2Played = false;
    pool.forEach(el => { el.style.visibility = "hidden"; });
  }
}, { passive: true });

// ─────────────────────────────────────────────
// SECTION 3 — Ronds qui suivent le path en zigzag
// ─────────────────────────────────────────────
const S3_DURATION  = 2.4;
const S3_INTERVAL  = S3_DURATION / 1.5;
const S3_RADIUS    = 70;
const S3_COLORS    = ["#FF1573","#F07A4A","#E8C84A","#3A9E5F","#2F6FBF","#A855C8","#F4A0C0","#4AB8E8"];

let s3LoopInterval: ReturnType<typeof setInterval> | null = null;
let s3ColorIndex = 0;

const S3_POOL_SIZE = 3;
const s3Pool: HTMLDivElement[] = [];
const s3Container = document.querySelector<HTMLDivElement>("#s3-pims")!;

for (let i = 0; i < S3_POOL_SIZE; i++) {
  const el = document.createElement("div");
  el.style.cssText = `
    position:absolute;
    width:${S3_RADIUS * 2}px;
    height:${S3_RADIUS * 2}px;
    border-radius:50%;
    background-size:cover;
    background-position:center;
    margin-left:-${S3_RADIUS}px;
    margin-top:-${S3_RADIUS}px;
    visibility:hidden;
    will-change:transform;
  `;
  s3Container.appendChild(el);
  s3Pool.push(el);
}

function playSection3() {
  // Le path guide est dans le même SVG que la déco — même viewBox, coordonnées cohérentes
  const svg       = document.querySelector<SVGSVGElement>("#s3-deco")!;
  const guidePath = document.querySelector<SVGPathElement>("#s3-motion-path")!;
  const sec3      = document.querySelector<HTMLElement>("#section3")!;

  const sec3Rect = sec3.getBoundingClientRect();
  const totalLen = guidePath.getTotalLength();

  // getScreenCTM() donne la matrice de transformation complète du path vers l'écran
  // (inclut le <g transform="scale(...)"> + le viewBox du SVG + la position dans la page)
  // On l'utilise pour convertir chaque point local en coordonnées écran absolues,
  // puis on soustrait l'offset de la section pour avoir des coordonnées relatives à section3.
  const ctm = guidePath.getScreenCTM()!;

  function ptAt(progress: number): { x: number; y: number } {
    const len    = Math.max(0, Math.min(totalLen, progress * totalLen));
    const svgPt  = guidePath.getPointAtLength(len);
    // Transformer via CTM → coordonnées écran absolues
    const screenPt = svgPt.matrixTransform(ctm);
    return {
      x: screenPt.x - sec3Rect.left,
      y: screenPt.y - sec3Rect.top,
    };
  }

  let poolIdx = 0;

  function launchOne() {
    const el    = s3Pool[poolIdx % S3_POOL_SIZE];
    poolIdx++;
    const color = S3_COLORS[s3ColorIndex % S3_COLORS.length];
    s3ColorIndex++;

    el.style.backgroundColor = color;
    el.style.backgroundImage = `url('/src/pims_texture.png')`;
    el.style.visibility      = "visible";

    const proxy    = { t: -0.04 };
    const startPos = ptAt(proxy.t);
    gsap.set(el, { x: startPos.x, y: startPos.y });

    gsap.to(proxy, {
      t: 1.04,
      duration: S3_DURATION,
      ease: "none",
      overwrite: true,
      onUpdate() {
        const pos = ptAt(proxy.t);
        gsap.set(el, { x: pos.x, y: pos.y });
      },
      onComplete() {
        el.style.visibility = "hidden";
      },
    });
  }

  launchOne();
  s3LoopInterval = setInterval(launchOne, S3_INTERVAL * 1000);
}
