"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Lenis from "lenis";

// ─── Types ────────────────────────────────────────────────────────────────────

type BgMode = "white" | "black" | "none";
type Dir = "left" | "right";

interface Section {
  character: string;
  removeBg: BgMode;
  from: Dir;
  accent: string;
  /** RGBA color atmosphere layered on top of the single bg image */
  atmosphere: string;
  eyebrow: string;
  heading: string;
  body: string;
  cta?: string;
}

// Unique entry animation per character — this IS the "surprise" factor
interface Entry {
  x: number;   // xPercent
  y: number;   // yPercent
  r: number;   // rotation deg
  s: number;   // scale
  dur: number; // enter duration (timeline units 0-1)
  ease: string;
}

// ─── Per-character entry config ───────────────────────────────────────────────

const ENTRIES: Entry[] = [
  { x: -115, y: 14, r: -7, s: 0.78, dur: 0.48, ease: "expo.out" },        // Humungousaur — heavy slam from left
  { x: 150,  y:  0, r:  5, s: 0.92, dur: 0.22, ease: "expo.out" },        // XLR8 — lightning fast from right
  { x: -90,  y: 22, r: -4, s: 0.70, dur: 0.44, ease: "back.out(1.05)" },  // Heatblast — rises from below-left
  { x: 110,  y:-18, r: 12, s: 0.82, dur: 0.36, ease: "expo.out" },        // Diamondhead — sharp drop from top-right
  { x: -80,  y:-24, r: -9, s: 0.78, dur: 0.52, ease: "power4.out" },      // Big Chill — descends from above-left
  { x:   0,  y: 32, r:  0, s: 0.62, dur: 0.60, ease: "expo.out" },        // Ben — hero rise from below-center
];

// ─── Section data ─────────────────────────────────────────────────────────────

const SECTIONS: Section[] = [
  {
    character: "/images/ben10/humungousaur.png",
    removeBg: "white",
    from: "left",
    accent: "#4ade80",
    atmosphere: "rgba(0,14,0,0.74)",
    eyebrow: "Feature 01",
    heading: "Build Forms\nThat Hit Hard",
    body: "Drag, drop, dominate. Craft powerful forms in minutes — zero code, pure impact.",
  },
  {
    character: "/images/ben10/xlr8.png",
    removeBg: "white",
    from: "right",
    accent: "#22d3ee",
    atmosphere: "rgba(0,6,18,0.74)",
    eyebrow: "Feature 02",
    heading: "Responses at\nAlien Speed",
    body: "Real-time submissions. Zero latency. Your data arrives before the dust settles.",
  },
  {
    character: "/images/ben10/heatblast.png",
    removeBg: "white",
    from: "left",
    accent: "#fb923c",
    atmosphere: "rgba(18,5,0,0.72)",
    eyebrow: "Feature 03",
    heading: "Analytics That\nBurn Bright",
    body: "Every submission becomes actionable intelligence. See patterns. Act fast.",
  },
  {
    character: "/images/ben10/diamondhead.png",
    removeBg: "black",
    from: "right",
    accent: "#2dd4bf",
    atmosphere: "rgba(0,14,14,0.72)",
    eyebrow: "Feature 04",
    heading: "Forms Built\nLike Diamond",
    body: "Unbreakable structure. Pristine UX. Every response captured perfectly.",
  },
  {
    character: "/images/ben10/big-chill.png",
    removeBg: "white",
    from: "left",
    accent: "#818cf8",
    atmosphere: "rgba(8,0,22,0.72)",
    eyebrow: "Feature 05",
    heading: "Soar Beyond\nEvery Limit",
    body: "Unlimited forms. Unlimited responses. Scale without boundaries.",
  },
  {
    character: "/images/ben10/ben-young.png",
    removeBg: "black",
    from: "right",
    accent: "#4ade80",
    atmosphere: "rgba(0,16,4,0.68)",
    eyebrow: "It's Hero Time",
    heading: "You Are the\nHero Now",
    body: "Start building for free. Your forms. Your rules. Your data — always yours.",
    cta: "Start Building Free →",
  },
];

// ─── Canvas background remover ────────────────────────────────────────────────

function removeBgCanvas(src: string, mode: "white" | "black"): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const w = img.naturalWidth, h = img.naturalHeight;
      const canvas = document.createElement("canvas");
      canvas.width = w; canvas.height = h;
      const ctx = canvas.getContext("2d", { willReadFrequently: true })!;
      ctx.drawImage(img, 0, 0);
      const id = ctx.getImageData(0, 0, w, h);
      const d = id.data;

      const isBg = (pi: number) => {
        const r = d[pi] / 255, g = d[pi + 1] / 255, b = d[pi + 2] / 255;
        const avg = (r + g + b) / 3, sat = Math.max(r, g, b) - Math.min(r, g, b);
        return mode === "black" ? avg < 0.18 && sat < 0.22 : avg > 0.55 && sat < 0.28;
      };

      const vis = new Uint8Array(w * h);
      const qx: number[] = [], qy: number[] = [];
      const seed = (x: number, y: number) => {
        if (x < 0 || y < 0 || x >= w || y >= h) return;
        const m = y * w + x;
        if (vis[m] || !isBg(m * 4)) return;
        vis[m] = 1; qx.push(x); qy.push(y);
      };
      for (let x = 0; x < w; x++) { seed(x, 0); seed(x, h - 1); }
      for (let y = 0; y < h; y++) { seed(0, y); seed(w - 1, y); }
      while (qx.length) {
        const x = qx.pop()!, y = qy.pop()!;
        d[(y * w + x) * 4 + 3] = 0;
        seed(x - 1, y); seed(x + 1, y); seed(x, y - 1); seed(x, y + 1);
      }
      for (let pass = 0; pass < 3; pass++) {
        const snap = new Uint8ClampedArray(d);
        for (let y = 0; y < h; y++) {
          for (let x = 0; x < w; x++) {
            const i = (y * w + x) * 4;
            if (d[i + 3] === 0) continue;
            const r = d[i] / 255, g = d[i + 1] / 255, b = d[i + 2] / 255;
            const avg = (r + g + b) / 3, sat = Math.max(r, g, b) - Math.min(r, g, b);
            const fringe = mode === "black" ? avg < 0.32 && sat < 0.22 : avg > 0.42 && sat < 0.32;
            if (!fringe) continue;
            const ns = [
              x > 0 ? (y * w + x - 1) * 4 : -1,
              x < w - 1 ? (y * w + x + 1) * 4 : -1,
              y > 0 ? ((y - 1) * w + x) * 4 : -1,
              y < h - 1 ? ((y + 1) * w + x) * 4 : -1,
            ];
            if (ns.some((n) => n < 0 || snap[n + 3] === 0)) d[i + 3] = 0;
          }
        }
      }
      ctx.putImageData(id, 0, 0);
      canvas.toBlob((b) => resolve(b ? URL.createObjectURL(b) : src), "image/png");
    };
    img.src = src;
  });
}

// ─── Character image ──────────────────────────────────────────────────────────

function CharacterImg({ src, removeBg, accent }: { src: string; removeBg: BgMode; accent: string }) {
  const [finalSrc, setFinalSrc] = useState(src);
  const blobRef = useRef<string | null>(null);

  useEffect(() => {
    if (removeBg === "none") return;
    let cancelled = false;
    removeBgCanvas(src, removeBg).then((url) => {
      if (cancelled) { URL.revokeObjectURL(url); return; }
      if (blobRef.current) URL.revokeObjectURL(blobRef.current);
      blobRef.current = url;
      setFinalSrc(url);
    });
    return () => { cancelled = true; };
  }, [src, removeBg]);

  useEffect(() => () => { if (blobRef.current) URL.revokeObjectURL(blobRef.current); }, []);

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={finalSrc}
      alt=""
      draggable={false}
      className="max-h-[72vh] w-auto max-w-full select-none object-contain"
      style={{
        filter: `drop-shadow(0 0 80px ${accent}bb) drop-shadow(0 0 180px ${accent}33) drop-shadow(0 10px 40px rgba(0,0,0,0.95))`,
        willChange: "transform",
      }}
    />
  );
}

// ─── Main scroll component ────────────────────────────────────────────────────

export function Ben10Scroll() {
  const containerRef = useRef<HTMLDivElement>(null);
  const progressRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  useLayoutEffect(() => {
    gsap.registerPlugin(ScrollTrigger);

    const lenis = new Lenis({ lerp: 0.065, smoothWheel: true });
    document.documentElement.classList.add("lenis", "lenis-smooth");
    lenis.on("scroll", ScrollTrigger.update);
    const onTick = (t: number) => lenis.raf(t * 1000);
    gsap.ticker.add(onTick);
    gsap.ticker.lagSmoothing(0);

    // ── Global progress bar + active index tracker ───────────────────────────
    ScrollTrigger.create({
      trigger: containerRef.current,
      start: "top top",
      end: "bottom bottom",
      onUpdate: (self) => {
        if (progressRef.current) progressRef.current.style.width = `${self.progress * 100}%`;
        setActiveIndex(Math.min(SECTIONS.length - 1, Math.floor(self.progress * SECTIONS.length)));
      },
    });

    // ── Per-section independent timelines ────────────────────────────────────
    containerRef.current!.querySelectorAll<HTMLElement>(".b10s").forEach((section, i) => {
      const bg       = section.querySelector<HTMLElement>(".b10s-bg")!;
      const atm      = section.querySelector<HTMLElement>(".b10s-atm")!;
      const charWrap = section.querySelector<HTMLElement>(".b10s-char")!;
      const headings = section.querySelectorAll<HTMLElement>(".b10s-h");
      const eyebrow  = section.querySelector<HTMLElement>(".b10s-eyebrow");
      const body     = section.querySelector<HTMLElement>(".b10s-body");
      const cta      = section.querySelector<HTMLElement>(".b10s-cta");
      const bigNum   = section.querySelector<HTMLElement>(".b10s-bignum");

      if (!bg || !atm || !charWrap) return;

      const e   = ENTRIES[i];
      const sec = SECTIONS[i];
      const tl  = gsap.timeline({ paused: true });

      // ── Background: cinematic zoom-out + vertical parallax ─────────────────
      // Always in motion — gives depth even during "hold" phase
      tl.fromTo(bg, { scale: 1.14, yPercent: -6 }, { scale: 1.0, yPercent: 6, ease: "none" }, 0);

      // ── Atmosphere overlay: fade in quickly, hold, fade out ─────────────────
      tl.fromTo(atm, { opacity: 0 }, { opacity: 1, duration: 0.12, ease: "power2.out" }, 0);
      tl.to(atm, { opacity: 0, duration: 0.12, ease: "power2.in" }, 0.88);

      // ── Character: UNIQUE entry per section ─────────────────────────────────
      tl.fromTo(
        charWrap,
        { xPercent: e.x, yPercent: e.y, rotation: e.r, scale: e.s, opacity: 0 },
        { xPercent: 0, yPercent: 0, rotation: 0, scale: 1, opacity: 1, duration: e.dur, ease: e.ease },
        0.07,
      );

      // Subtle float during hold — always something moving
      const floatStart = 0.07 + e.dur + 0.02;
      if (floatStart < 0.70) {
        tl.to(charWrap, { yPercent: -4, ease: "none", duration: 0.70 - floatStart }, floatStart);
      }

      // ── Text: premium mask reveal (overflow:hidden + translateY) ────────────
      if (eyebrow) {
        tl.fromTo(
          eyebrow,
          { opacity: 0, x: sec.from === "left" ? -12 : 12 },
          { opacity: 1, x: 0, duration: 0.22, ease: "power2.out" },
          0.12,
        );
      }
      // Each heading line rises from below a clipping mask
      headings.forEach((h, j) => {
        tl.fromTo(h, { yPercent: 115 }, { yPercent: 0, duration: 0.34, ease: "power3.out" }, 0.17 + j * 0.09);
      });
      if (body) {
        tl.fromTo(body, { opacity: 0, y: 14 }, { opacity: 1, y: 0, duration: 0.28, ease: "power2.out" }, 0.30);
      }
      if (cta) {
        tl.fromTo(
          cta,
          { opacity: 0, y: 16, scale: 0.93 },
          { opacity: 1, y: 0, scale: 1, duration: 0.28, ease: "back.out(1.2)" },
          0.38,
        );
      }

      // Big background number
      if (bigNum) {
        tl.fromTo(bigNum, { opacity: 0, scale: 1.22 }, { opacity: 1, scale: 1, duration: 0.55, ease: "expo.out" }, 0.07);
      }

      // ── EXIT: char leaves in OPPOSITE direction (through-movement feel) ─────
      const exitX = sec.from === "left" ? 90 : -90;
      const exitY = i === SECTIONS.length - 1 ? -28 : 0; // Ben rises off-screen

      tl.to(
        charWrap,
        { xPercent: exitX, yPercent: exitY, opacity: 0, scale: 0.88, duration: 0.28, ease: "power2.in" },
        0.72,
      );
      if (eyebrow) tl.to(eyebrow, { opacity: 0, duration: 0.18 }, 0.72);
      headings.forEach((h, j) => {
        tl.to(h, { yPercent: -115, duration: 0.24, ease: "power2.in" }, 0.72 + j * 0.04);
      });
      if (body) tl.to(body, { opacity: 0, y: -10, duration: 0.17 }, 0.73);
      if (cta) tl.to(cta, { opacity: 0, duration: 0.16 }, 0.73);
      if (bigNum) tl.to(bigNum, { opacity: 0, scale: 0.84, duration: 0.2 }, 0.73);

      // ── Attach to scroll ─────────────────────────────────────────────────────
      gsap.to(tl, {
        time: tl.duration(),
        ease: "none",
        scrollTrigger: {
          trigger: section,
          start: "top top",
          end: "bottom bottom",
          scrub: 1.3,
        },
      });
    });

    return () => {
      document.documentElement.classList.remove("lenis", "lenis-smooth");
      gsap.ticker.remove(onTick);
      lenis.destroy();
      ScrollTrigger.getAll().forEach((t) => t.kill());
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <>
      {/* Progress bar */}
      <div
        aria-hidden
        className="fixed top-0 left-0 right-0 z-[60] h-[2px] pointer-events-none"
        style={{ background: "rgba(255,255,255,0.04)" }}
      >
        <div
          ref={progressRef}
          className="h-full transition-none"
          style={{
            width: "0%",
            background: `linear-gradient(90deg, ${SECTIONS[activeIndex]?.accent ?? "#4ade80"} 0%, rgba(255,255,255,0.6) 100%)`,
          }}
        />
      </div>

      <div ref={containerRef} className="bg-black">
        {SECTIONS.map((sec, i) => (
          <div
            key={i}
            className="b10s relative"
            style={{ height: "270vh" }}
          >
            {/* ── Sticky panel ──────────────────────────────────────────────── */}
            <div className="sticky top-0 h-screen w-full overflow-hidden bg-black">

              {/* ── SINGLE background image — no more jarring bg swaps ─────── */}
              {/* The atmosphere overlay provides the per-section color identity */}
              <div
                className="b10s-bg absolute inset-0 bg-cover bg-center origin-center"
                style={{ backgroundImage: "url(/images/ben10/bg-hero.png)" }}
              />

              {/* Color atmosphere per section */}
              <div
                className="b10s-atm absolute inset-0"
                style={{ background: sec.atmosphere, opacity: 0 }}
              />

              {/* Film grain — cinematic texture */}
              <div
                aria-hidden
                className="pointer-events-none absolute inset-0 z-[2] opacity-[0.032]"
                style={{
                  backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
                  backgroundSize: "200px 200px",
                }}
              />

              {/* ── Content ──────────────────────────────────────────────────── */}
              <div
                className={`absolute inset-0 z-10 flex items-center gap-10 lg:gap-20 ${
                  sec.from === "right" ? "flex-row-reverse" : "flex-row"
                }`}
                style={{ padding: "0 clamp(2rem, 6vw, 7rem)" }}
              >
                {/* Character */}
                <div className="flex flex-1 items-center justify-center">
                  <div
                    className="b10s-char"
                    style={{ opacity: 0, willChange: "transform, opacity" }}
                  >
                    <CharacterImg src={sec.character} removeBg={sec.removeBg} accent={sec.accent} />
                  </div>
                </div>

                {/* Text */}
                <div className="flex flex-1 flex-col gap-5">
                  <p
                    className="b10s-eyebrow flex items-center gap-3 font-mono text-[11px] font-bold tracking-[0.45em] uppercase"
                    style={{ color: sec.accent, opacity: 0 }}
                  >
                    <span className="inline-block h-px w-6 shrink-0" style={{ background: sec.accent }} />
                    {sec.eyebrow}
                  </p>

                  {/* Each line wrapped in overflow:hidden for the mask reveal */}
                  {sec.heading.split("\n").map((line, j) => (
                    <div key={j} className="overflow-hidden">
                      <h2
                        className="b10s-h whitespace-nowrap font-black leading-[0.97] text-white"
                        style={{
                          fontFamily: "'Orbitron','Arial Black',sans-serif",
                          fontSize: "clamp(2.2rem,4.6vw,5.5rem)",
                          textShadow: `0 0 90px ${sec.accent}33`,
                          transform: "translateY(115%)",
                          willChange: "transform",
                        }}
                      >
                        {line}
                      </h2>
                    </div>
                  ))}

                  <p
                    className="b10s-body max-w-[400px] leading-[1.78] text-white/42"
                    style={{ fontSize: "clamp(0.88rem,1.3vw,1.05rem)", opacity: 0 }}
                  >
                    {sec.body}
                  </p>

                  {sec.cta && (
                    <div className="b10s-cta mt-2 flex items-center gap-5" style={{ opacity: 0 }}>
                      <a
                        href="/sign-up"
                        className="rounded-full px-8 py-3.5 text-sm font-black tracking-[0.14em] text-black uppercase transition-all duration-200 hover:scale-105 hover:brightness-110 active:scale-95"
                        style={{ background: sec.accent }}
                      >
                        {sec.cta}
                      </a>
                      <span className="font-mono text-[10px] tracking-[0.28em] text-white/22 uppercase">
                        Free plan · No credit card
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* ── Large outline section number ──────────────────────────── */}
              <div
                className="b10s-bignum pointer-events-none absolute bottom-1 right-3 select-none font-black leading-none"
                style={{
                  fontFamily: "'Orbitron','Arial Black',sans-serif",
                  fontSize: "clamp(6rem,16vw,17rem)",
                  color: "transparent",
                  WebkitTextStroke: `1.5px ${sec.accent}`,
                  opacity: 0,
                  lineHeight: 1,
                }}
              >
                {String(i + 1).padStart(2, "0")}
              </div>

              {/* ── Thin vertical accent line ─────────────────────────────── */}
              <div
                aria-hidden
                className={`pointer-events-none absolute top-[16%] bottom-[16%] w-px z-10 ${
                  sec.from === "left" ? "left-6 lg:left-10" : "right-6 lg:right-10"
                }`}
                style={{
                  background: `linear-gradient(to bottom, transparent, ${sec.accent}cc 30%, ${sec.accent}cc 70%, transparent)`,
                  boxShadow: `0 0 18px 5px ${sec.accent}22`,
                }}
              />

              {/* ── Section counter ───────────────────────────────────────── */}
              <div
                className="pointer-events-none absolute right-7 bottom-6 z-20"
                style={{ color: sec.accent }}
              >
                <span className="font-mono text-[10px] tracking-[0.35em] opacity-28">
                  {String(i + 1).padStart(2, "0")}&nbsp;/&nbsp;{String(SECTIONS.length).padStart(2, "0")}
                </span>
              </div>

              {/* ── Nav dots ─────────────────────────────────────────────── */}
              <div
                aria-hidden
                className="pointer-events-none absolute left-5 top-1/2 z-20 flex -translate-y-1/2 flex-col gap-3"
              >
                {SECTIONS.map((s, j) => (
                  <div
                    key={j}
                    className="rounded-full transition-all duration-500"
                    style={{
                      width: activeIndex === j ? 6 : 3,
                      height: activeIndex === j ? 6 : 3,
                      background: activeIndex === j ? s.accent : "rgba(255,255,255,0.18)",
                      boxShadow: activeIndex === j ? `0 0 12px 4px ${s.accent}55` : "none",
                    }}
                  />
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
