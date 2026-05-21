"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Lenis from "lenis";

// ═══════════════════════════════════════════════════════════════════════════
// Canvas background removal — auto-detects light/dark bg from edge pixels
// ═══════════════════════════════════════════════════════════════════════════

function detectBgMode(d: Uint8ClampedArray, w: number, h: number): "white" | "black" {
  const step = Math.max(1, Math.floor(Math.min(w, h) / 20));
  let sum = 0, count = 0;
  for (let x = 0; x < w; x += step) {
    for (const y of [0, h - 1]) {
      const pi = (y * w + x) * 4;
      if (d[pi + 3] < 10) continue;
      sum += (d[pi] + d[pi + 1] + d[pi + 2]) / (3 * 255);
      count++;
    }
  }
  for (let y = 0; y < h; y += step) {
    for (const x of [0, w - 1]) {
      const pi = (y * w + x) * 4;
      if (d[pi + 3] < 10) continue;
      sum += (d[pi] + d[pi + 1] + d[pi + 2]) / (3 * 255);
      count++;
    }
  }
  return count > 0 && sum / count > 0.35 ? "white" : "black";
}

function removeBgCanvas(src: string): Promise<{ url: string; mode: "white" | "black" }> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const w = img.naturalWidth, h = img.naturalHeight;
      const cv = document.createElement("canvas");
      cv.width = w; cv.height = h;
      const ctx = cv.getContext("2d", { willReadFrequently: true })!;
      ctx.drawImage(img, 0, 0);
      const id = ctx.getImageData(0, 0, w, h);
      const d = id.data;
      const mode = detectBgMode(d, w, h);

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
      for (let pass = 0; pass < 6; pass++) {
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
      cv.toBlob(
        (b) => resolve({ url: b ? URL.createObjectURL(b) : src, mode }),
        "image/png",
      );
    };
    img.src = src;
  });
}

// ─── Hook: load image + remove bg, return src + detected mode ─────────────
function useTransparentImage(src: string) {
  const [state, setState] = useState<{ url: string; mode: "white" | "black" }>({
    url: src,
    mode: "black",
  });
  const blobRef = useRef<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    removeBgCanvas(src).then((res) => {
      if (cancelled) { URL.revokeObjectURL(res.url); return; }
      if (blobRef.current) URL.revokeObjectURL(blobRef.current);
      blobRef.current = res.url;
      setState(res);
    });
    return () => { cancelled = true; };
  }, [src]);

  useEffect(() => () => { if (blobRef.current) URL.revokeObjectURL(blobRef.current); }, []);

  return state;
}

// ─── Character image — transparent, blend-mode-aware ─────────────────────
function CharacterImg({
  src,
  accent,
  className,
  style,
}: {
  src: string;
  accent: string;
  className?: string;
  style?: React.CSSProperties;
}) {
  const { url, mode } = useTransparentImage(src);
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={url}
      alt=""
      draggable={false}
      className={`select-none ${className ?? ""}`}
      style={{
        filter: `drop-shadow(0 0 90px ${accent}cc) drop-shadow(0 0 220px ${accent}44) drop-shadow(0 18px 60px rgba(0,0,0,0.95))`,
        mixBlendMode: mode === "black" ? "screen" : "normal",
        maskImage: "linear-gradient(to top, transparent 0%, black 7%)",
        WebkitMaskImage: "linear-gradient(to top, transparent 0%, black 7%)",
        ...style,
      }}
    />
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// Persistent Omnitrix Thread — the spine of the experience
// Lives fixed-positioned, transforms its size/position/role per section
// ═══════════════════════════════════════════════════════════════════════════

const OMNITRIX_STATES = [
  // S0 Intro: massive center, spinning slowly
  { x: "50vw", y: "50vh", size: 460, opacity: 1.0, rotation: 0, blur: 0 },
  // S1 Humungousaur: corner HUD badge
  { x: "calc(100vw - 92px)", y: "92px", size: 72, opacity: 0.95, rotation: 90, blur: 0 },
  // S2 XLR8: same corner but spinning fast
  { x: "calc(100vw - 92px)", y: "92px", size: 80, opacity: 1, rotation: 720, blur: 0 },
  // S3 Heatblast: huge background watermark, blurred + low opacity
  { x: "50vw", y: "55vh", size: 760, opacity: 0.10, rotation: 900, blur: 8 },
  // S4 Ghostfreak: drifts up to top-center, smaller
  { x: "50vw", y: "20vh", size: 140, opacity: 0.55, rotation: 1080, blur: 0 },
  // S5 Big Chill: corner again, small
  { x: "calc(100vw - 84px)", y: "calc(100vh - 84px)", size: 64, opacity: 0.8, rotation: 1260, blur: 0 },
  // S6 White Flip: small DARK logo top-left (invert filter applied)
  { x: "92px", y: "92px", size: 56, opacity: 1, rotation: 1440, blur: 0 },
  // S7 Diamondhead: mid-left side
  { x: "12vw", y: "50vh", size: 200, opacity: 0.85, rotation: 1620, blur: 0 },
  // S8 Ben final: MASSIVE halo behind ben
  { x: "50vw", y: "55vh", size: 900, opacity: 0.7, rotation: 1980, blur: 4 },
];

function OmnitrixThread({ totalSections }: { totalSections: number }) {
  const omniRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const { url } = useTransparentImage("/images/ben10/omnitrix.png");

  useLayoutEffect(() => {
    const el = omniRef.current;
    if (!el) return;

    // Initial state = S0
    gsap.set(el, {
      left: OMNITRIX_STATES[0].x,
      top: OMNITRIX_STATES[0].y,
      xPercent: -50,
      yPercent: -50,
      width: OMNITRIX_STATES[0].size,
      height: OMNITRIX_STATES[0].size,
      opacity: OMNITRIX_STATES[0].opacity,
      rotation: OMNITRIX_STATES[0].rotation,
      filter: "blur(0px)",
    });

    // Continuous slow rotation (always alive)
    const spinTl = gsap.to(imgRef.current, {
      rotation: 360,
      duration: 25,
      repeat: -1,
      ease: "none",
    });

    return () => { spinTl.kill(); };
  }, []);

  return (
    <div
      ref={omniRef}
      aria-hidden
      className="omnitrix-thread pointer-events-none fixed z-40"
      style={{ willChange: "transform, opacity, width, height", transformOrigin: "center" }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        ref={imgRef}
        src={url}
        alt=""
        draggable={false}
        className="block h-full w-full select-none"
        style={{
          mixBlendMode: "screen",
          filter: "drop-shadow(0 0 60px rgba(74,222,128,0.7)) drop-shadow(0 0 120px rgba(74,222,128,0.35))",
        }}
      />
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// MOCK UI COMPONENTS — These give each section its own custom interface
// ═══════════════════════════════════════════════════════════════════════════

// ─── Live submission feed (for XLR8 section) ────────────────────────────
function LiveFeedUI({ accent }: { accent: string }) {
  const feedRef = useRef<HTMLDivElement>(null);
  const items = [
    { id: "#7821", ms: 0.08, type: "Survey" },
    { id: "#7822", ms: 0.11, type: "Lead" },
    { id: "#7823", ms: 0.07, type: "Quiz" },
    { id: "#7824", ms: 0.09, type: "Order" },
    { id: "#7825", ms: 0.06, type: "Feedback" },
  ];

  useEffect(() => {
    const el = feedRef.current;
    if (!el) return;
    const rows = el.querySelectorAll(".feed-row");
    gsap.set(rows, { opacity: 0, x: 30 });
    const tl = gsap.timeline({ repeat: -1, repeatDelay: 0.4 });
    rows.forEach((r, i) => {
      tl.to(r, { opacity: 1, x: 0, duration: 0.35, ease: "power3.out" }, i * 0.42);
      tl.to(r, { opacity: 0.18, duration: 0.3 }, i * 0.42 + 1.2);
    });
    return () => { tl.kill(); };
  }, []);

  return (
    <div
      ref={feedRef}
      className="rounded-2xl border bg-black/55 p-5 backdrop-blur-md"
      style={{ borderColor: `${accent}33` }}
    >
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span
            className="h-1.5 w-1.5 animate-pulse rounded-full"
            style={{ background: accent, boxShadow: `0 0 8px ${accent}` }}
          />
          <span className="font-mono text-[10px] tracking-[0.35em] uppercase" style={{ color: accent }}>
            LIVE FEED
          </span>
        </div>
        <span className="font-mono text-[10px] tracking-widest text-white/35">
          0.08ms&nbsp;AVG
        </span>
      </div>
      <div className="flex flex-col gap-2.5">
        {items.map((it) => (
          <div
            key={it.id}
            className="feed-row flex items-center justify-between gap-4 rounded-lg border border-white/5 bg-white/[0.025] px-4 py-2.5"
          >
            <div className="flex items-center gap-3">
              <span style={{ color: accent }}>✓</span>
              <span className="font-mono text-xs text-white/85">{it.id}</span>
              <span className="rounded-full bg-white/5 px-2 py-0.5 font-mono text-[9px] tracking-wider text-white/55 uppercase">
                {it.type}
              </span>
            </div>
            <span className="font-mono text-xs text-white/45">{it.ms}ms</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Animated stat counter (for Humungousaur section) ───────────────────
function StatCounter({
  value,
  label,
  accent,
  triggerRef,
}: {
  value: number;
  label: string;
  accent: string;
  triggerRef: React.RefObject<HTMLElement | null>;
}) {
  const numRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!numRef.current || !triggerRef.current) return;
    const obj = { v: 0 };
    const tw = gsap.to(obj, {
      v: value,
      duration: 2.2,
      ease: "power3.out",
      onUpdate: () => {
        if (numRef.current) numRef.current.textContent = Math.round(obj.v).toLocaleString();
      },
      scrollTrigger: {
        trigger: triggerRef.current,
        start: "top 80%",
        toggleActions: "play none none reverse",
      },
    });
    return () => { tw.kill(); };
  }, [value, triggerRef]);

  return (
    <div className="flex items-baseline gap-4">
      <div
        ref={numRef}
        className="font-black tabular-nums"
        style={{
          fontFamily: "'Orbitron','Arial Black',sans-serif",
          fontSize: "clamp(2.5rem, 5vw, 4.5rem)",
          color: accent,
          lineHeight: 1,
          textShadow: `0 0 60px ${accent}66`,
        }}
      >
        0
      </div>
      <div className="font-mono text-[10px] tracking-[0.35em] text-white/50 uppercase">
        {label}
      </div>
    </div>
  );
}

// ─── Mock analytics dashboard (for Heatblast section) ───────────────────
function DashboardUI({ accent }: { accent: string }) {
  const barRefs = useRef<(HTMLDivElement | null)[]>([]);
  const bars = [40, 65, 30, 80, 55, 70, 95, 60, 45, 85, 50, 75];

  useEffect(() => {
    barRefs.current.forEach((b, i) => {
      if (!b) return;
      gsap.fromTo(
        b,
        { scaleY: 0 },
        {
          scaleY: 1,
          duration: 0.8,
          ease: "power3.out",
          delay: i * 0.04,
          repeat: -1,
          repeatDelay: 4,
          yoyo: true,
        },
      );
    });
  }, []);

  return (
    <div
      className="rounded-2xl border bg-black/55 p-5 backdrop-blur-md"
      style={{ borderColor: `${accent}33` }}
    >
      <div className="mb-4 flex items-center justify-between">
        <span className="font-mono text-[10px] tracking-[0.35em] uppercase" style={{ color: accent }}>
          SUBMISSIONS · 24H
        </span>
        <span className="font-mono text-[10px] tracking-widest text-white/35">+38.4%</span>
      </div>
      <div className="flex h-32 items-end gap-1.5">
        {bars.map((h, i) => (
          <div
            key={i}
            ref={(el) => { barRefs.current[i] = el; }}
            className="flex-1 origin-bottom rounded-t-sm"
            style={{
              height: `${h}%`,
              background: `linear-gradient(to top, ${accent}cc, ${accent}33)`,
              boxShadow: `0 0 12px ${accent}66`,
            }}
          />
        ))}
      </div>
      <div className="mt-4 flex items-baseline gap-4">
        <span
          className="font-black tabular-nums"
          style={{
            fontFamily: "'Orbitron','Arial Black',sans-serif",
            fontSize: "clamp(1.5rem, 3vw, 2.4rem)",
            color: accent,
            lineHeight: 1,
          }}
        >
          184,221
        </span>
        <span className="font-mono text-[10px] tracking-[0.3em] text-white/40 uppercase">
          responses
        </span>
      </div>
    </div>
  );
}

// ─── Floating form cards (for Big Chill section) ────────────────────────
function FormCardStack({ accent }: { accent: string }) {
  const cards = [
    { title: "Customer Survey", fields: 8, color: accent, x: -8, y: -10, rot: -8, depth: 1 },
    { title: "Job Application", fields: 12, color: "#22d3ee", x: 18, y: 4, rot: 6, depth: 2 },
    { title: "Event RSVP", fields: 5, color: "#f97316", x: -22, y: 14, rot: -4, depth: 3 },
    { title: "Lead Magnet", fields: 4, color: "#a78bfa", x: 14, y: -18, rot: 9, depth: 1 },
    { title: "Feedback Form", fields: 7, color: "#4ade80", x: 0, y: 0, rot: 0, depth: 2 },
  ];

  return (
    <div className="relative h-[60vh] w-[55vw]">
      {cards.map((c, i) => (
        <div
          key={i}
          className="absolute top-1/2 left-1/2 rounded-2xl border bg-black/65 p-5 backdrop-blur-md transition-transform"
          style={{
            width: 240,
            transform: `translate(calc(-50% + ${c.x}vw), calc(-50% + ${c.y}vh)) rotate(${c.rot}deg)`,
            borderColor: `${c.color}55`,
            boxShadow: `0 30px 80px ${c.color}22, 0 0 60px ${c.color}11`,
            zIndex: 10 - c.depth,
            opacity: 1 - (c.depth - 1) * 0.12,
          }}
        >
          <div className="mb-3 flex items-center justify-between">
            <span className="font-mono text-[9px] tracking-[0.3em] uppercase" style={{ color: c.color }}>
              FORM · {String(i + 1).padStart(2, "0")}
            </span>
            <span
              className="h-1.5 w-1.5 rounded-full"
              style={{ background: c.color, boxShadow: `0 0 8px ${c.color}` }}
            />
          </div>
          <div
            className="mb-3 font-black text-white"
            style={{ fontFamily: "'Orbitron','Arial Black',sans-serif", fontSize: 18 }}
          >
            {c.title}
          </div>
          <div className="flex flex-col gap-2">
            {Array.from({ length: 3 }).map((_, j) => (
              <div key={j} className="h-2 rounded-full bg-white/10" style={{ width: `${70 + j * 8}%` }} />
            ))}
          </div>
          <div className="mt-3 text-[10px] font-mono tracking-wider text-white/45">
            {c.fields} fields
          </div>
        </div>
      ))}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// SECTION COMPONENTS — Each section is its own component with unique layout
// ═══════════════════════════════════════════════════════════════════════════

// ─── S0: INTRO — pure Omnitrix center, "It's Hero Time" ─────────────────
function IntroSection({ index }: { index: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLDivElement>(null);
  const subRef = useRef<HTMLParagraphElement>(null);

  useLayoutEffect(() => {
    const text = textRef.current;
    const sub = subRef.current;
    if (!text || !sub) return;

    const tl = gsap.timeline({ defaults: { ease: "power3.out" } });
    tl.from(text.querySelectorAll(".intro-line"), {
      yPercent: 110,
      duration: 0.9,
      stagger: 0.12,
      delay: 0.5,
    });
    tl.fromTo(sub, { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 0.7 }, "-=0.3");
    return () => { tl.kill(); };
  }, []);

  return (
    <section
      ref={ref}
      data-section={index}
      className="b10-section relative flex h-screen w-full items-center justify-center bg-black"
    >
      <BgImage filter="brightness(0.45) saturate(1.3)" />
      <FilmGrain />

      <div className="relative z-10 flex flex-col items-center" style={{ marginTop: "32vh" }}>
        <div ref={textRef} className="text-center">
          {["It's", "Hero", "Time"].map((w, i) => (
            <div key={i} className="overflow-hidden" style={{ lineHeight: 0.95 }}>
              <h1
                className="intro-line block font-black text-white"
                style={{
                  fontFamily: "'Orbitron','Arial Black',sans-serif",
                  fontSize: "clamp(3rem, 9vw, 11rem)",
                  textShadow: "0 0 100px rgba(74,222,128,0.35)",
                }}
              >
                {w}
              </h1>
            </div>
          ))}
        </div>
        <p
          ref={subRef}
          className="mt-6 max-w-md text-center text-sm leading-relaxed text-white/45"
        >
          Six aliens. Six superpowers. One form builder that does it all.
          <br />
          <span className="font-mono text-[10px] tracking-[0.4em] text-lime-400/70 uppercase">
            Scroll to transform ↓
          </span>
        </p>
      </div>
    </section>
  );
}

// ─── S1: EDITORIAL with stat counter (Humungousaur) ─────────────────────
function EditorialStatSection({
  index,
  character,
  side,
  accent,
  bgFilter,
  eyebrow,
  heading,
  body,
  stat,
}: {
  index: number;
  character: string;
  side: "left" | "right";
  accent: string;
  bgFilter: string;
  eyebrow: string;
  heading: string[];
  body: string;
  stat: { value: number; label: string };
}) {
  const ref = useRef<HTMLDivElement>(null);
  const charRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    if (!ref.current || !charRef.current || !textRef.current) return;
    const text = textRef.current;
    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: ref.current,
        start: "top 70%",
        end: "bottom 30%",
        toggleActions: "play none none reverse",
      },
    });
    tl.from(charRef.current, {
      xPercent: side === "right" ? 60 : -60,
      yPercent: 30,
      scale: 0.7,
      opacity: 0,
      duration: 1.0,
      ease: "expo.out",
    });
    tl.from(
      text.querySelectorAll(".reveal-line"),
      { yPercent: 110, duration: 0.55, stagger: 0.08, ease: "power3.out" },
      "-=0.7",
    );
    tl.from(text.querySelector(".eyebrow"), { opacity: 0, x: -20, duration: 0.4 }, "-=0.4");
    tl.from(text.querySelector(".body-text"), { opacity: 0, y: 20, duration: 0.5 }, "-=0.3");
    tl.from(text.querySelector(".stat-block"), { opacity: 0, y: 20, duration: 0.5 }, "-=0.3");
    return () => { tl.kill(); ScrollTrigger.getAll().forEach((t) => { if (t.trigger === ref.current) t.kill(); }); };
  }, [side]);

  return (
    <section
      ref={ref}
      data-section={index}
      className="b10-section relative flex h-screen w-full items-center overflow-hidden bg-black"
    >
      <BgImage filter={bgFilter} />
      <FilmGrain />

      {/* Character — pinned to side, full height */}
      <div
        ref={charRef}
        className="pointer-events-none absolute bottom-0 z-10"
        style={{ [side]: 0, willChange: "transform, opacity" }}
      >
        <CharacterImg
          src={character}
          accent={accent}
          style={{ height: "92vh", width: "auto", objectFit: "contain", objectPosition: "bottom center" }}
        />
      </div>

      {/* Text block */}
      <div
        ref={textRef}
        className="absolute z-20 flex flex-col gap-6"
        style={{
          [side === "right" ? "left" : "right"]: "clamp(2rem, 6vw, 7rem)",
          bottom: "12vh",
          maxWidth: "clamp(280px, 42vw, 580px)",
        }}
      >
        <p
          className="eyebrow flex items-center gap-3 font-mono text-[10px] font-bold tracking-[0.45em] uppercase"
          style={{ color: accent }}
        >
          <span className="inline-block h-px w-8" style={{ background: accent }} />
          {eyebrow}
        </p>

        <h2 className="flex flex-col">
          {heading.map((line, j) => (
            <div key={j} className="overflow-hidden" style={{ lineHeight: 0.95 }}>
              <span
                className="reveal-line block font-black text-white"
                style={{
                  fontFamily: "'Orbitron','Arial Black',sans-serif",
                  fontSize: "clamp(2.5rem, 7vw, 6.5rem)",
                  textShadow: `0 0 90px ${accent}33`,
                }}
              >
                {line}
              </span>
            </div>
          ))}
        </h2>

        <p className="body-text max-w-md text-white/45" style={{ fontSize: "clamp(0.9rem, 1.3vw, 1.05rem)", lineHeight: 1.7 }}>
          {body}
        </p>

        <div className="stat-block mt-2">
          <StatCounter value={stat.value} label={stat.label} accent={accent} triggerRef={ref} />
        </div>
      </div>

      <SectionMeta index={index} total={9} accent={accent} />
    </section>
  );
}

// ─── S2: SPLIT with live feed (XLR8) ────────────────────────────────────
function SplitFeedSection({
  index,
  character,
  accent,
  bgFilter,
  eyebrow,
  heading,
  body,
}: {
  index: number;
  character: string;
  accent: string;
  bgFilter: string;
  eyebrow: string;
  heading: string[];
  body: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const charRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLDivElement>(null);
  const uiRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    if (!ref.current) return;
    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: ref.current,
        start: "top 70%",
        end: "bottom 30%",
        toggleActions: "play none none reverse",
      },
    });
    tl.from(charRef.current, {
      xPercent: -80,
      yPercent: 10,
      scale: 0.85,
      opacity: 0,
      duration: 0.7,
      ease: "expo.out",
    });
    tl.from(
      textRef.current!.querySelectorAll(".reveal-line"),
      { yPercent: 110, duration: 0.55, stagger: 0.08, ease: "power3.out" },
      "-=0.4",
    );
    tl.from(textRef.current!.querySelectorAll(".small-fade"), { opacity: 0, y: 18, duration: 0.5, stagger: 0.1 }, "-=0.3");
    tl.from(uiRef.current, { opacity: 0, y: 40, duration: 0.7, ease: "power3.out" }, "-=0.5");
    return () => { tl.kill(); };
  }, []);

  return (
    <section
      ref={ref}
      data-section={index}
      className="b10-section relative h-screen w-full overflow-hidden bg-black"
    >
      <BgImage filter={bgFilter} />
      <FilmGrain />

      {/* Character left-half */}
      <div
        ref={charRef}
        className="pointer-events-none absolute bottom-0 left-0 z-10"
        style={{ willChange: "transform, opacity" }}
      >
        <CharacterImg
          src={character}
          accent={accent}
          style={{ height: "94vh", width: "auto", objectFit: "contain", objectPosition: "bottom left" }}
        />
      </div>

      {/* Right column: text + live feed */}
      <div
        className="absolute top-1/2 right-[clamp(2rem,6vw,7rem)] z-20 flex -translate-y-1/2 flex-col gap-6"
        style={{ width: "clamp(320px, 38vw, 540px)" }}
      >
        <div ref={textRef} className="flex flex-col gap-5">
          <p
            className="small-fade flex items-center gap-3 font-mono text-[10px] font-bold tracking-[0.45em] uppercase"
            style={{ color: accent }}
          >
            <span className="inline-block h-px w-8" style={{ background: accent }} />
            {eyebrow}
          </p>
          <h2 className="flex flex-col">
            {heading.map((line, j) => (
              <div key={j} className="overflow-hidden" style={{ lineHeight: 0.95 }}>
                <span
                  className="reveal-line block font-black text-white"
                  style={{
                    fontFamily: "'Orbitron','Arial Black',sans-serif",
                    fontSize: "clamp(2.2rem, 6vw, 5.5rem)",
                    textShadow: `0 0 90px ${accent}33`,
                  }}
                >
                  {line}
                </span>
              </div>
            ))}
          </h2>
          <p
            className="small-fade max-w-sm text-white/45"
            style={{ fontSize: "clamp(0.88rem, 1.25vw, 1rem)", lineHeight: 1.7 }}
          >
            {body}
          </p>
        </div>

        <div ref={uiRef}>
          <LiveFeedUI accent={accent} />
        </div>
      </div>

      <SectionMeta index={index} total={9} accent={accent} />
    </section>
  );
}

// ─── S3: EDITORIAL + DASHBOARD (Heatblast) ──────────────────────────────
function DashboardSection({
  index,
  character,
  accent,
  bgFilter,
  eyebrow,
  heading,
  body,
}: {
  index: number;
  character: string;
  accent: string;
  bgFilter: string;
  eyebrow: string;
  heading: string[];
  body: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const charRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLDivElement>(null);
  const uiRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    if (!ref.current) return;
    const tl = gsap.timeline({
      scrollTrigger: { trigger: ref.current, start: "top 70%", toggleActions: "play none none reverse" },
    });
    tl.from(charRef.current, {
      xPercent: 70,
      yPercent: 20,
      scale: 0.8,
      opacity: 0,
      duration: 0.95,
      ease: "expo.out",
    });
    tl.from(
      textRef.current!.querySelectorAll(".reveal-line"),
      { yPercent: 110, duration: 0.55, stagger: 0.08 },
      "-=0.5",
    );
    tl.from(textRef.current!.querySelectorAll(".small-fade"), { opacity: 0, y: 18, duration: 0.45, stagger: 0.08 }, "-=0.3");
    tl.from(uiRef.current, { opacity: 0, y: 40, duration: 0.7 }, "-=0.4");
    return () => { tl.kill(); };
  }, []);

  return (
    <section
      ref={ref}
      data-section={index}
      className="b10-section relative h-screen w-full overflow-hidden bg-black"
    >
      <BgImage filter={bgFilter} />
      <FilmGrain />

      <div
        ref={charRef}
        className="pointer-events-none absolute bottom-0 right-0 z-10"
        style={{ willChange: "transform, opacity" }}
      >
        <CharacterImg
          src={character}
          accent={accent}
          style={{ height: "92vh", width: "auto", objectFit: "contain", objectPosition: "bottom right" }}
        />
      </div>

      <div
        className="absolute top-1/2 left-[clamp(2rem,6vw,7rem)] z-20 flex -translate-y-1/2 flex-col gap-6"
        style={{ width: "clamp(320px, 40vw, 580px)" }}
      >
        <div ref={textRef} className="flex flex-col gap-5">
          <p
            className="small-fade flex items-center gap-3 font-mono text-[10px] font-bold tracking-[0.45em] uppercase"
            style={{ color: accent }}
          >
            <span className="inline-block h-px w-8" style={{ background: accent }} />
            {eyebrow}
          </p>
          <h2 className="flex flex-col">
            {heading.map((line, j) => (
              <div key={j} className="overflow-hidden" style={{ lineHeight: 0.95 }}>
                <span
                  className="reveal-line block font-black text-white"
                  style={{
                    fontFamily: "'Orbitron','Arial Black',sans-serif",
                    fontSize: "clamp(2.2rem, 6.5vw, 6rem)",
                    textShadow: `0 0 90px ${accent}33`,
                  }}
                >
                  {line}
                </span>
              </div>
            ))}
          </h2>
          <p
            className="small-fade max-w-sm text-white/45"
            style={{ fontSize: "clamp(0.88rem, 1.25vw, 1rem)", lineHeight: 1.7 }}
          >
            {body}
          </p>
        </div>

        <div ref={uiRef}>
          <DashboardUI accent={accent} />
        </div>
      </div>

      <SectionMeta index={index} total={9} accent={accent} />
    </section>
  );
}

// ─── S4: GHOSTFREAK — text dominant, char ghosted in background ─────────
function GhostedSection({
  index,
  character,
  accent,
  bgFilter,
  eyebrow,
  heading,
  body,
  features,
}: {
  index: number;
  character: string;
  accent: string;
  bgFilter: string;
  eyebrow: string;
  heading: string[];
  body: string;
  features: string[];
}) {
  const ref = useRef<HTMLDivElement>(null);
  const charRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    if (!ref.current) return;
    const tl = gsap.timeline({
      scrollTrigger: { trigger: ref.current, start: "top 70%", toggleActions: "play none none reverse" },
    });
    tl.from(charRef.current, {
      opacity: 0,
      yPercent: 8,
      scale: 0.95,
      duration: 1.4,
      ease: "power2.out",
    });
    tl.from(
      textRef.current!.querySelectorAll(".reveal-line"),
      { yPercent: 110, duration: 0.6, stagger: 0.1 },
      "-=1.0",
    );
    tl.from(textRef.current!.querySelectorAll(".small-fade"), { opacity: 0, y: 22, duration: 0.5, stagger: 0.07 }, "-=0.4");
    return () => { tl.kill(); };
  }, []);

  return (
    <section
      ref={ref}
      data-section={index}
      className="b10-section relative h-screen w-full overflow-hidden"
      style={{ background: "linear-gradient(180deg, #07021a 0%, #03000d 100%)" }}
    >
      <BgImage filter={bgFilter} />
      <FilmGrain />

      {/* Ghostfreak — ghosted in background, center-right */}
      <div
        ref={charRef}
        className="pointer-events-none absolute z-[5]"
        style={{
          right: "5vw",
          top: "50%",
          transform: "translateY(-50%)",
          opacity: 0.32,
          willChange: "transform, opacity",
        }}
      >
        <CharacterImg
          src={character}
          accent={accent}
          style={{ height: "88vh", width: "auto", objectFit: "contain", filter: `drop-shadow(0 0 90px ${accent}77)` }}
        />
      </div>

      {/* Text dominant */}
      <div
        ref={textRef}
        className="absolute top-1/2 left-[clamp(2rem,7vw,8rem)] z-20 flex -translate-y-1/2 flex-col gap-7"
        style={{ width: "clamp(280px, 50vw, 720px)" }}
      >
        <p
          className="small-fade flex items-center gap-3 font-mono text-[10px] font-bold tracking-[0.45em] uppercase"
          style={{ color: accent }}
        >
          <span className="inline-block h-px w-8" style={{ background: accent }} />
          {eyebrow}
        </p>
        <h2 className="flex flex-col">
          {heading.map((line, j) => (
            <div key={j} className="overflow-hidden" style={{ lineHeight: 0.92 }}>
              <span
                className="reveal-line block font-black text-white"
                style={{
                  fontFamily: "'Orbitron','Arial Black',sans-serif",
                  fontSize: "clamp(2.8rem, 8vw, 7.5rem)",
                  textShadow: `0 0 100px ${accent}44`,
                  letterSpacing: "-0.02em",
                }}
              >
                {line}
              </span>
            </div>
          ))}
        </h2>
        <p
          className="small-fade max-w-md text-white/45"
          style={{ fontSize: "clamp(0.9rem, 1.3vw, 1.1rem)", lineHeight: 1.7 }}
        >
          {body}
        </p>

        {/* Monospace feature badges */}
        <div className="small-fade flex flex-wrap gap-3">
          {features.map((f, i) => (
            <span
              key={i}
              className="rounded-full border px-4 py-1.5 font-mono text-[10px] tracking-[0.25em] uppercase"
              style={{ borderColor: `${accent}55`, color: accent, background: `${accent}0a` }}
            >
              {f}
            </span>
          ))}
        </div>
      </div>

      <SectionMeta index={index} total={9} accent={accent} />
    </section>
  );
}

// ─── S5: BIG CHILL — floating cards layout (Cappen hero style) ──────────
function CardsFloatSection({
  index,
  character,
  accent,
  bgFilter,
  eyebrow,
  heading,
}: {
  index: number;
  character: string;
  accent: string;
  bgFilter: string;
  eyebrow: string;
  heading: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const charRef = useRef<HTMLDivElement>(null);
  const cardsRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    if (!ref.current) return;
    const tl = gsap.timeline({
      scrollTrigger: { trigger: ref.current, start: "top 70%", toggleActions: "play none none reverse" },
    });
    if (cardsRef.current) {
      tl.from(cardsRef.current.children, {
        opacity: 0,
        scale: 0.85,
        rotation: 0,
        y: 60,
        duration: 0.9,
        stagger: 0.1,
        ease: "expo.out",
      });
    }
    if (charRef.current) {
      tl.from(charRef.current, { opacity: 0, yPercent: -30, scale: 0.9, duration: 1.2, ease: "power3.out" }, "-=0.8");
    }
    if (textRef.current) {
      tl.from(
        textRef.current.querySelectorAll(".reveal-line"),
        { yPercent: 110, duration: 0.55, stagger: 0.08 },
        "-=0.6",
      );
    }
    return () => { tl.kill(); };
  }, []);

  return (
    <section
      ref={ref}
      data-section={index}
      className="b10-section relative flex h-screen w-full items-center justify-center overflow-hidden bg-black"
    >
      <BgImage filter={bgFilter} />
      <FilmGrain />

      {/* Floating cards — center */}
      <div ref={cardsRef} className="relative z-10">
        <FormCardStack accent={accent} />
      </div>

      {/* Big Chill — drifts down through cards, on right */}
      <div
        ref={charRef}
        className="pointer-events-none absolute top-0 right-[-4vw] z-20"
        style={{ willChange: "transform, opacity" }}
      >
        <CharacterImg
          src={character}
          accent={accent}
          style={{ height: "95vh", width: "auto", objectFit: "contain", objectPosition: "top right" }}
        />
      </div>

      {/* Heading bottom-left */}
      <div ref={textRef} className="absolute bottom-12 left-[clamp(2rem,6vw,7rem)] z-30 flex flex-col gap-4">
        <p
          className="flex items-center gap-3 font-mono text-[10px] font-bold tracking-[0.45em] uppercase"
          style={{ color: accent }}
        >
          <span className="inline-block h-px w-8" style={{ background: accent }} />
          {eyebrow}
        </p>
        <div className="overflow-hidden" style={{ lineHeight: 0.95 }}>
          <span
            className="reveal-line block font-black text-white"
            style={{
              fontFamily: "'Orbitron','Arial Black',sans-serif",
              fontSize: "clamp(2rem, 5.5vw, 5rem)",
              textShadow: `0 0 90px ${accent}44`,
            }}
          >
            {heading}
          </span>
        </div>
      </div>

      <SectionMeta index={index} total={9} accent={accent} />
    </section>
  );
}

// ─── S6: WHITE THEME FLIP — editorial 2-column proof section ────────────
function WhiteFlipSection({ index }: { index: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLDivElement>(null);
  const quoteRef = useRef<HTMLDivElement>(null);
  const awardsRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    if (!ref.current) return;
    const tl = gsap.timeline({
      scrollTrigger: { trigger: ref.current, start: "top 70%", toggleActions: "play none none reverse" },
    });
    if (titleRef.current) {
      tl.from(titleRef.current.querySelectorAll(".reveal-line"), { yPercent: 110, duration: 0.6, stagger: 0.1 });
    }
    if (awardsRef.current) {
      tl.from(awardsRef.current.children, { opacity: 0, y: 16, duration: 0.5, stagger: 0.08 }, "-=0.4");
    }
    if (quoteRef.current) {
      tl.from(quoteRef.current, { opacity: 0, y: 24, duration: 0.7 }, "-=0.3");
    }
    return () => { tl.kill(); };
  }, []);

  const awards = [
    { label: "Product Hunt", badge: "#1 OF THE DAY" },
    { label: "Awwwards", badge: "SOTD" },
    { label: "CSS Design Awards", badge: "SOTM" },
    { label: "Indie Hackers", badge: "TOP 5" },
  ];

  return (
    <section
      ref={ref}
      data-section={index}
      className="b10-section relative flex h-screen w-full items-center overflow-hidden"
      style={{ background: "#f5f1ea" }}
    >
      <FilmGrain dark />

      <div className="relative z-10 grid w-full grid-cols-1 gap-12 px-[clamp(2rem,7vw,8rem)] md:grid-cols-12">
        {/* Left: Heading + awards */}
        <div className="md:col-span-7 flex flex-col gap-10">
          <p className="flex items-center gap-3 font-mono text-[10px] font-bold tracking-[0.45em] uppercase text-black/55">
            <span className="inline-block h-px w-8 bg-black/50" />
            Trusted Worldwide
          </p>

          <div ref={titleRef}>
            {["Designed", "by hands.", "Loved", "by builders."].map((line, j) => (
              <div key={j} className="overflow-hidden" style={{ lineHeight: 0.95 }}>
                <span
                  className="reveal-line block font-black"
                  style={{
                    fontFamily: "'Orbitron','Arial Black',sans-serif",
                    fontSize: "clamp(2.5rem, 7vw, 6.5rem)",
                    color: j % 2 === 1 ? "#4ade80" : "#111",
                    letterSpacing: "-0.02em",
                  }}
                >
                  {line}
                </span>
              </div>
            ))}
          </div>

          <div ref={awardsRef} className="mt-4 flex flex-col gap-3 border-t border-black/15 pt-6">
            {awards.map((a) => (
              <div key={a.label} className="flex items-center justify-between border-b border-black/10 pb-3">
                <span
                  className="font-black text-black/90"
                  style={{ fontFamily: "'Orbitron','Arial Black',sans-serif", fontSize: "clamp(1.1rem, 2vw, 1.8rem)" }}
                >
                  {a.label}
                </span>
                <span className="rounded-md border border-black/25 px-2.5 py-1 font-mono text-[10px] tracking-[0.2em] text-black/70 uppercase">
                  {a.badge}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Right: Quote */}
        <div ref={quoteRef} className="md:col-span-5 flex flex-col justify-end gap-6">
          <span className="font-mono text-[40px] leading-none text-black/30">“</span>
          <p
            className="text-black/80"
            style={{
              fontFamily: "'Orbitron','Arial Black',sans-serif",
              fontSize: "clamp(1.1rem, 1.8vw, 1.6rem)",
              lineHeight: 1.45,
              letterSpacing: "-0.01em",
            }}
          >
            ChaiForm replaced Typeform, Notion forms, and our analytics tool in one go. The
            scroll experience alone closed the deal.
          </p>
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-full bg-black" />
            <div>
              <p className="font-mono text-[11px] font-bold tracking-wider text-black/90 uppercase">
                Anya Sharma
              </p>
              <p className="font-mono text-[10px] tracking-wider text-black/45 uppercase">
                Head of Growth · Acmebase
              </p>
            </div>
          </div>
        </div>
      </div>

      <SectionMeta index={index} total={9} accent="#111" light />
    </section>
  );
}

// ─── S7: DIAMONDHEAD — vertical text + char collide ─────────────────────
function VerticalCollideSection({
  index,
  character,
  accent,
  bgFilter,
  eyebrow,
  heading,
  body,
}: {
  index: number;
  character: string;
  accent: string;
  bgFilter: string;
  eyebrow: string;
  heading: string;
  body: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const charRef = useRef<HTMLDivElement>(null);
  const vertRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    if (!ref.current) return;
    const tl = gsap.timeline({
      scrollTrigger: { trigger: ref.current, start: "top 70%", toggleActions: "play none none reverse" },
    });
    if (vertRef.current) tl.from(vertRef.current, { yPercent: 60, opacity: 0, duration: 1.0, ease: "power3.out" });
    if (charRef.current) tl.from(charRef.current, { yPercent: -50, xPercent: 50, scale: 0.7, opacity: 0, rotation: 18, duration: 0.8, ease: "expo.out" }, "-=0.6");
    if (textRef.current) {
      tl.from(textRef.current.querySelectorAll(".small-fade"), { opacity: 0, y: 18, duration: 0.45, stagger: 0.08 }, "-=0.4");
    }
    return () => { tl.kill(); };
  }, []);

  return (
    <section
      ref={ref}
      data-section={index}
      className="b10-section relative h-screen w-full overflow-hidden bg-black"
    >
      <BgImage filter={bgFilter} />
      <FilmGrain />

      {/* Vertical massive heading on the LEFT */}
      <div
        ref={vertRef}
        className="absolute top-1/2 left-[clamp(2rem,5vw,5rem)] z-10 -translate-y-1/2"
      >
        <div
          className="font-black"
          style={{
            fontFamily: "'Orbitron','Arial Black',sans-serif",
            fontSize: "clamp(5rem, 14vw, 16rem)",
            color: "transparent",
            WebkitTextStroke: `1.5px ${accent}`,
            lineHeight: 0.85,
            letterSpacing: "-0.04em",
          }}
        >
          {heading.split("").map((c, i) => (
            <div key={i}>{c}</div>
          ))}
        </div>
      </div>

      {/* Character right */}
      <div
        ref={charRef}
        className="pointer-events-none absolute bottom-0 right-0 z-20"
        style={{ willChange: "transform, opacity" }}
      >
        <CharacterImg
          src={character}
          accent={accent}
          style={{ height: "94vh", width: "auto", objectFit: "contain", objectPosition: "bottom right" }}
        />
      </div>

      {/* Right side text */}
      <div
        ref={textRef}
        className="absolute right-[clamp(2rem,6vw,7rem)] bottom-14 z-30 flex flex-col gap-4"
        style={{ maxWidth: 380 }}
      >
        <p
          className="small-fade flex items-center gap-3 font-mono text-[10px] font-bold tracking-[0.45em] uppercase"
          style={{ color: accent }}
        >
          <span className="inline-block h-px w-8" style={{ background: accent }} />
          {eyebrow}
        </p>
        <p className="small-fade text-white/55" style={{ fontSize: "clamp(0.9rem, 1.3vw, 1.05rem)", lineHeight: 1.7 }}>
          {body}
        </p>
        {/* Big stat */}
        <div className="small-fade mt-2 flex items-baseline gap-4">
          <span
            className="font-black tabular-nums"
            style={{
              fontFamily: "'Orbitron','Arial Black',sans-serif",
              fontSize: "clamp(2rem, 4.5vw, 3.8rem)",
              color: accent,
              textShadow: `0 0 60px ${accent}55`,
            }}
          >
            99.99%
          </span>
          <span className="font-mono text-[10px] tracking-[0.3em] text-white/45 uppercase">
            uptime SLA
          </span>
        </div>
      </div>

      <SectionMeta index={index} total={9} accent={accent} />
    </section>
  );
}

// ─── S8: BEN FINAL CTA ──────────────────────────────────────────────────
function FinalCtaSection({
  index,
  character,
  accent,
  bgFilter,
}: {
  index: number;
  character: string;
  accent: string;
  bgFilter: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const charRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLDivElement>(null);
  const ctaRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    if (!ref.current) return;
    const tl = gsap.timeline({
      scrollTrigger: { trigger: ref.current, start: "top 70%", toggleActions: "play none none reverse" },
    });
    if (charRef.current) tl.from(charRef.current, { yPercent: 80, opacity: 0, scale: 0.6, duration: 1.4, ease: "expo.out" });
    if (textRef.current) {
      tl.from(textRef.current.querySelectorAll(".reveal-line"), { yPercent: 110, duration: 0.6, stagger: 0.1 }, "-=1.0");
    }
    if (ctaRef.current) tl.from(ctaRef.current, { opacity: 0, y: 24, duration: 0.7, ease: "back.out(1.3)" }, "-=0.3");
    return () => { tl.kill(); };
  }, []);

  return (
    <section
      ref={ref}
      data-section={index}
      className="b10-section relative flex h-screen w-full items-end justify-center overflow-hidden bg-black"
    >
      <BgImage filter={bgFilter} />
      <FilmGrain />

      {/* Ben — center bottom */}
      <div
        ref={charRef}
        className="pointer-events-none absolute bottom-0 left-1/2 z-10 -translate-x-1/2"
        style={{ willChange: "transform, opacity" }}
      >
        <CharacterImg
          src={character}
          accent={accent}
          style={{ height: "82vh", width: "auto", objectFit: "contain", objectPosition: "bottom center" }}
        />
      </div>

      {/* Text — centered top half */}
      <div
        ref={textRef}
        className="absolute left-1/2 top-[14vh] z-30 -translate-x-1/2 text-center"
      >
        <p className="mb-6 flex items-center justify-center gap-3 font-mono text-[10px] font-bold tracking-[0.45em] uppercase" style={{ color: accent }}>
          <span className="inline-block h-px w-8" style={{ background: accent }} />
          It&apos;s Hero Time
          <span className="inline-block h-px w-8" style={{ background: accent }} />
        </p>
        {["You Are", "the Hero", "Now."].map((line, j) => (
          <div key={j} className="overflow-hidden" style={{ lineHeight: 0.95 }}>
            <span
              className="reveal-line block font-black text-white"
              style={{
                fontFamily: "'Orbitron','Arial Black',sans-serif",
                fontSize: "clamp(2.8rem, 8vw, 8rem)",
                textShadow: `0 0 100px ${accent}55`,
              }}
            >
              {line}
            </span>
          </div>
        ))}
      </div>

      {/* CTA */}
      <div
        ref={ctaRef}
        className="absolute bottom-[8vh] left-1/2 z-40 flex -translate-x-1/2 items-center gap-5"
      >
        <a
          href="/sign-up"
          className="rounded-full px-10 py-4 text-sm font-black tracking-[0.14em] text-black uppercase transition-all duration-200 hover:scale-105 hover:brightness-110 active:scale-95"
          style={{
            background: accent,
            boxShadow: `0 0 40px ${accent}66, 0 0 80px ${accent}33`,
          }}
        >
          Start Building Free →
        </a>
        <span className="font-mono text-[10px] tracking-[0.3em] text-white/35 uppercase">
          Free · No card needed
        </span>
      </div>

      <SectionMeta index={index} total={9} accent={accent} />
    </section>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// SHARED VISUAL PRIMITIVES
// ═══════════════════════════════════════════════════════════════════════════

function BgImage({ filter }: { filter: string }) {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0"
      style={{
        backgroundImage: "url(/images/ben10/bg-hero.png)",
        backgroundSize: "cover",
        backgroundPosition: "center",
        filter,
      }}
    />
  );
}

function FilmGrain({ dark = false }: { dark?: boolean }) {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 z-[2]"
      style={{
        opacity: dark ? 0.045 : 0.028,
        mixBlendMode: dark ? "multiply" : "screen",
        backgroundImage:
          "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
        backgroundSize: "180px",
      }}
    />
  );
}

function SectionMeta({
  index,
  total,
  accent,
  light = false,
}: {
  index: number;
  total: number;
  accent: string;
  light?: boolean;
}) {
  return (
    <>
      {/* Section number — large outline bottom-right */}
      <div
        className="pointer-events-none absolute bottom-2 right-6 z-30 select-none font-black leading-none"
        style={{
          fontFamily: "'Orbitron','Arial Black',sans-serif",
          fontSize: "clamp(5rem, 14vw, 16rem)",
          color: "transparent",
          WebkitTextStroke: `1px ${accent}`,
          opacity: light ? 0.18 : 0.10,
          lineHeight: 1,
        }}
      >
        {String(index).padStart(2, "0")}
      </div>

      {/* Counter */}
      <div
        className={`pointer-events-none absolute right-7 top-7 z-30 font-mono text-[10px] tracking-[0.4em] ${
          light ? "text-black/40" : "text-white/30"
        }`}
      >
        {String(index).padStart(2, "0")}&thinsp;/&thinsp;{String(total).padStart(2, "0")}
      </div>
    </>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN SCROLL EXPERIENCE
// ═══════════════════════════════════════════════════════════════════════════

export function Ben10Scroll() {
  const containerRef = useRef<HTMLDivElement>(null);
  const omniRef = useRef<HTMLDivElement>(null);
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

    // Drive the Omnitrix's position based on which section is most in view
    const sections = Array.from(
      containerRef.current!.querySelectorAll<HTMLElement>(".b10-section"),
    );

    sections.forEach((sec, i) => {
      ScrollTrigger.create({
        trigger: sec,
        start: "top 50%",
        end: "bottom 50%",
        onToggle: (self) => {
          if (!self.isActive) return;
          setActiveIndex(i);
          const omni = document.querySelector<HTMLDivElement>(".omnitrix-thread");
          if (!omni) return;
          const s = OMNITRIX_STATES[i] ?? OMNITRIX_STATES[0];
          gsap.to(omni, {
            left: s.x,
            top: s.y,
            width: s.size,
            height: s.size,
            opacity: s.opacity,
            rotation: s.rotation,
            filter: `blur(${s.blur}px)`,
            duration: 1.5,
            ease: "expo.out",
            overwrite: "auto",
          });
        },
      });
    });

    // Global progress bar
    ScrollTrigger.create({
      trigger: containerRef.current,
      start: "top top",
      end: "bottom bottom",
      onUpdate: (self) => {
        if (progressRef.current) progressRef.current.style.width = `${self.progress * 100}%`;
      },
    });

    return () => {
      document.documentElement.classList.remove("lenis", "lenis-smooth");
      gsap.ticker.remove(onTick);
      lenis.destroy();
      ScrollTrigger.getAll().forEach((t) => t.kill());
    };
  }, []);

  return (
    <>
      {/* Global progress bar */}
      <div
        aria-hidden
        className="pointer-events-none fixed top-0 right-0 left-0 z-50 h-[2px]"
        style={{ background: "rgba(255,255,255,0.05)" }}
      >
        <div
          ref={progressRef}
          className="h-full"
          style={{ width: "0%", background: "linear-gradient(90deg, #4ade80, rgba(255,255,255,0.5))" }}
        />
      </div>

      {/* Persistent Omnitrix thread */}
      <div ref={omniRef}>
        <OmnitrixThread totalSections={OMNITRIX_STATES.length} />
      </div>

      {/* Left-side nav dots */}
      <div
        aria-hidden
        className="pointer-events-none fixed left-5 top-1/2 z-45 flex -translate-y-1/2 flex-col gap-3"
      >
        {OMNITRIX_STATES.map((_, j) => (
          <div
            key={j}
            className="rounded-full transition-all duration-500"
            style={{
              width: activeIndex === j ? 6 : 3,
              height: activeIndex === j ? 6 : 3,
              background:
                activeIndex === j
                  ? activeIndex === 6
                    ? "#111"
                    : "#4ade80"
                  : activeIndex === 6
                    ? "rgba(0,0,0,0.25)"
                    : "rgba(255,255,255,0.18)",
              boxShadow:
                activeIndex === j ? `0 0 12px 4px ${activeIndex === 6 ? "#111" : "#4ade80"}55` : "none",
            }}
          />
        ))}
      </div>

      <div ref={containerRef} className="relative">
        <IntroSection index={0} />

        <EditorialStatSection
          index={1}
          character="/images/ben10/humungousaur.png"
          side="right"
          accent="#4ade80"
          bgFilter="brightness(0.46) saturate(1.25)"
          eyebrow="Drag & Drop Builder"
          heading={["Build Forms", "That Hit", "Hard."]}
          body="Build any form in minutes. No code. No limits. Pure, raw impact."
          stat={{ value: 184221, label: "forms built this month" }}
        />

        <SplitFeedSection
          index={2}
          character="/images/ben10/xlr8.png"
          accent="#22d3ee"
          bgFilter="sepia(1) saturate(4) hue-rotate(165deg) brightness(0.45)"
          eyebrow="Real-Time Responses"
          heading={["Speed", "Beyond", "Limits."]}
          body="Live submissions. Zero lag. Your data arrives before the dust settles."
        />

        <DashboardSection
          index={3}
          character="/images/ben10/heatblast.png"
          accent="#f97316"
          bgFilter="sepia(1) saturate(4.5) hue-rotate(320deg) brightness(0.44)"
          eyebrow="Live Analytics"
          heading={["Data That", "Burns", "Bright."]}
          body="Every response becomes intelligence. See patterns the moment they form."
        />

        <GhostedSection
          index={4}
          character="/images/ben10/ghostfreak.png"
          accent="#a78bfa"
          bgFilter="sepia(1) saturate(4) hue-rotate(245deg) brightness(0.36)"
          eyebrow="Invisible Security"
          heading={["Privacy.", "Without", "Compromise."]}
          body="Your data, encrypted end-to-end. Stored on your terms. Visible only to you."
          features={["256-bit AES", "SOC 2 Type II", "GDPR", "HIPAA Ready", "Zero Tracking"]}
        />

        <CardsFloatSection
          index={5}
          character="/images/ben10/big-chill.png"
          accent="#818cf8"
          bgFilter="sepia(1) saturate(3.5) hue-rotate(220deg) brightness(0.42)"
          eyebrow="Unlimited Scale"
          heading="Soar beyond every limit."
        />

        <WhiteFlipSection index={6} />

        <VerticalCollideSection
          index={7}
          character="/images/ben10/diamondhead.png"
          accent="#2dd4bf"
          bgFilter="sepia(1) saturate(3.5) hue-rotate(140deg) brightness(0.46)"
          eyebrow="Rock-Solid Reliability"
          heading="DIAMOND"
          body="Built on a foundation that doesn't crack. 99.99% uptime SLA, every response captured, nothing leaks."
        />

        <FinalCtaSection
          index={8}
          character="/images/ben10/ben-young.png"
          accent="#4ade80"
          bgFilter="brightness(0.48) saturate(1.35)"
        />
      </div>
    </>
  );
}
