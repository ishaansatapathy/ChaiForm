"use client";

import { useEffect, useRef, type CSSProperties } from "react";
import gsap from "gsap";

import { rubikDirt } from "~/lib/fonts";

export function HeroSection() {
  const rootRef = useRef<HTMLDivElement>(null);
  const headlineRef = useRef<HTMLHeadingElement>(null);
  const eyebrowRef = useRef<HTMLParagraphElement>(null);
  const subRef = useRef<HTMLParagraphElement>(null);
  const badgeRef = useRef<HTMLDivElement>(null);
  const ctaRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLAnchorElement>(null);
  const hudTopRef = useRef<HTMLDivElement>(null);
  const hudBotRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      const tl = gsap.timeline({ defaults: { ease: "power3.out" } });

      tl.fromTo(
        hudTopRef.current,
        { opacity: 0, y: -10 },
        { opacity: 1, y: 0, duration: 0.6 },
        0.1,
      )
        .fromTo(
          hudBotRef.current,
          { opacity: 0, y: 10 },
          { opacity: 1, y: 0, duration: 0.6 },
          0.2,
        )
        .fromTo(
          badgeRef.current,
          { opacity: 0, y: 18 },
          { opacity: 1, y: 0, duration: 0.7 },
          0.3,
        )
        .fromTo(
          eyebrowRef.current,
          { opacity: 0, x: -8 },
          { opacity: 1, x: 0, duration: 0.5 },
          0.42,
        )
        .fromTo(
          headlineRef.current,
          { opacity: 0, y: 28, skewX: -6 },
          { opacity: 1, y: 0, skewX: -3, duration: 0.9, ease: "power2.out" },
          0.5,
        )
        .fromTo(
          subRef.current,
          { opacity: 0, y: 22 },
          { opacity: 1, y: 0, duration: 0.7 },
          1.0,
        )
        .fromTo(
          ctaRef.current,
          { opacity: 0, y: 20 },
          { opacity: 1, y: 0, duration: 0.6 },
          1.2,
        )
        .fromTo(
          scrollRef.current,
          { opacity: 0 },
          { opacity: 1, duration: 0.8 },
          1.5,
        );

      const scrollLine = scrollRef.current?.querySelector(".scroll-line");
      if (scrollLine) {
        gsap.to(scrollLine, {
          scaleY: 0.3,
          transformOrigin: "top center",
          repeat: -1,
          yoyo: true,
          duration: 1.1,
          ease: "sine.inOut",
        });
      }
    }, rootRef.current!);

    return () => ctx.revert();
  }, []);

  return (
    <div
      ref={rootRef}
      className="relative flex h-screen w-full items-center justify-end overflow-hidden"
    >
      <div
        className="absolute inset-0 bg-black bg-cover bg-[center_left] bg-no-repeat"
        style={{ backgroundImage: "url(/images/ben10/bg-landing.png)" }}
      />

      {/* Breathing green aura behind character on left side — adds depth */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 z-1"
        style={{
          background:
            "radial-gradient(ellipse 50% 60% at 22% 55%, rgba(74,222,128,0.22) 0%, rgba(74,222,128,0.08) 30%, transparent 60%)",
        }}
      />
      <div aria-hidden className="b10s-pulse pointer-events-none absolute top-1/2 left-[22%] z-1 aspect-square w-[40vw] -translate-x-1/2 -translate-y-1/2 rounded-full"
        style={{
          background:
            "radial-gradient(circle, rgba(74,222,128,0.14) 0%, transparent 70%)",
          filter: "blur(70px)",
        }}
      />

      {/* HeroSmokeCursor disabled — mousemove + blend was janking scroll on landing */}

      {/* Slow scan line — ambient system-alive feel */}
      <div aria-hidden className="fx-scan-line absolute inset-x-0 z-2" style={{ top: 0 }} />

      {/* Drifting embers — left side, around character */}
      <HeroEmbers />

      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 z-2"
        style={{
          background:
            "linear-gradient(to right, transparent 0%, rgba(0,0,0,0.45) 38%, rgba(0,0,0,0.82) 62%, rgba(0,0,0,0.92) 100%)",
        }}
      />

      <div
        aria-hidden
        className="pointer-events-none absolute right-0 bottom-0 left-0 z-2 h-40"
        style={{ background: "linear-gradient(to bottom, transparent, #000)" }}
      />

      {/* Ground glow strip — character feels rooted in the world */}
      <div
        aria-hidden
        className="pointer-events-none absolute bottom-0 left-0 z-2 h-32 w-[55%]"
        style={{
          background:
            "radial-gradient(ellipse 70% 100% at 30% 100%, rgba(74,222,128,0.32) 0%, rgba(74,222,128,0.08) 40%, transparent 75%)",
          mixBlendMode: "screen",
        }}
      />

      <div
        ref={hudTopRef}
        className="pointer-events-none absolute top-5 right-0 left-0 z-20 flex items-center justify-between px-[clamp(1.25rem,4vw,3rem)]"
      >
        <div className="flex items-center gap-2">
          <span className="size-1.5 rounded-full bg-lime-400 shadow-[0_0_8px_#4ade80] hud-blink" />
          <span className="font-display text-[10px] font-bold tracking-[0.32em] text-lime-400/90 uppercase">
            Omnitrix
          </span>
          <span className="font-mono hidden text-[9px] tracking-[0.22em] text-white/30 uppercase sm:inline">
            {"// online"}
          </span>
        </div>
        <span className="font-mono hidden text-[9px] tracking-[0.28em] text-white/35 uppercase sm:inline">
          sector 01 · active
        </span>
      </div>

      <div className="pointer-events-none absolute top-1/2 right-3 z-10 hidden -translate-y-1/2 flex-col items-end gap-3 lg:flex">
        <span className="h-px w-3 bg-lime-400/55 shadow-[0_0_4px_rgba(74,222,128,0.6)]" />
        <span className="h-px w-7 bg-lime-400/55 shadow-[0_0_4px_rgba(74,222,128,0.6)]" />
        <span className="h-px w-3 bg-lime-400/55 shadow-[0_0_4px_rgba(74,222,128,0.6)]" />
        <span className="h-px w-3 bg-lime-400/55 shadow-[0_0_4px_rgba(74,222,128,0.6)]" />
        <span className="h-px w-7 bg-lime-400/55 shadow-[0_0_4px_rgba(74,222,128,0.6)]" />
        <span className="h-px w-3 bg-lime-400/55 shadow-[0_0_4px_rgba(74,222,128,0.6)]" />
      </div>

      <div className="relative z-10 flex w-full max-w-[min(640px,52vw)] flex-col items-start gap-5 px-[clamp(2rem,7vw,8rem)] text-left">
        <div
          ref={badgeRef}
          className="flex items-center gap-2 rounded-full border border-lime-400/35 bg-black/45 px-4 py-1.5 backdrop-blur-md"
        >
          <span className="h-1.5 w-1.5 rounded-full bg-lime-400 shadow-[0_0_8px_#4ade80]" />
          <span className="font-accent text-[10px] font-medium tracking-[0.38em] text-lime-400/90 uppercase">
            {"CHAIFORM // DNA TRANSFORMATION SYSTEM"}
          </span>
        </div>
 
        <p
          ref={eyebrowRef}
          className="font-mono -mb-1 flex items-center gap-2 text-[10px] tracking-[0.32em] text-white/40 uppercase"
        >
          <span className="inline-block h-px w-5 bg-lime-400/70" />
          {"SYSTEM PROTOCOL 0.1 // INIT"}
        </p>
 
        <h1
          ref={headlineRef}
          className={`${rubikDirt.className} opacity-0`}
          style={{ lineHeight: 0.95, transform: "rotate(-2.5deg) skewX(-4deg)", transformOrigin: "left center" }}
        >
          {/* Line 1 — big, white + lime accent */}
          <span
            className="block uppercase glitch-active"
            style={{
              fontSize: "clamp(3.8rem, 11vw, 7.5rem)",
              color: "#f0f0f0",
              letterSpacing: "-0.01em",
            }}
          >
            ACTIVATE{" "}
            <span style={{ color: "#4ade80" }}>DNA</span>
          </span>
 
          {/* Line 2 — slightly smaller, lime */}
          <span
            className="block uppercase"
            style={{
              fontSize: "clamp(2.6rem, 7.5vw, 5.2rem)",
              color: "#4ade80",
              letterSpacing: "0.02em",
              marginTop: "0.08em",
            }}
          >
            SYSTEM OVERWRITE
          </span>
        </h1>
 
        <p
          ref={subRef}
          className="font-mono max-w-[42ch] text-[clamp(0.8rem,1.15vw,0.92rem)] font-light leading-relaxed tracking-wider text-white/50"
          style={{ textTransform: "uppercase" }}
        >
          OMNITRIX INTERFACE STABLE. COGNITIVE SYNAPSE DECRYPTED. BUILD FORMS LIKE A HERO.
        </p>
 
        <div ref={ctaRef} className="mt-1 flex flex-wrap items-center gap-3">
          <a
            href="/sign-up"
            className="btn-omni border-glitch font-display rounded-full px-8 py-3.5 text-xs font-black tracking-[0.18em] uppercase"
            style={{ transform: "rotate(-1deg)" }}
          >
            ENGAGE OMNITRIX
          </a>
          <a
            href="/sign-in"
            className="font-mono group flex items-center gap-2 rounded-full border border-lime-400/30 bg-lime-400/5 px-6 py-3.5 text-xs font-bold tracking-widest text-lime-400/90 backdrop-blur-sm transition-all duration-200 hover:border-lime-400/60 hover:bg-lime-400/10 hover:text-white"
            style={{ transform: "rotate(1deg)" }}
          >
            SIGN IN
            <span className="text-lime-400/80 transition-transform duration-200 group-hover:translate-x-0.5">
              →
            </span>
          </a>
        </div>
      </div>

      <div
        ref={hudBotRef}
        className="pointer-events-none absolute right-0 bottom-5 left-0 z-20 flex flex-col gap-2.5 px-[clamp(1.25rem,4vw,3rem)]"
      >
        <div className="flex items-end justify-between">
          <div className="font-mono flex items-center gap-3 text-[9px] tracking-[0.28em] text-white/30 uppercase">
            <span className="size-1 rounded-full bg-lime-400/80 shadow-[0_0_6px_rgba(74,222,128,0.7)]" />
            dna · locked
            <span className="text-white/15">·</span>
            plumber relay · stable
            <span className="text-white/15">·</span>
            <span className="text-lime-400/80">power · 100%</span>
          </div>
          <div className="font-mono hidden items-center gap-3 text-[9px] tracking-[0.28em] text-white/30 uppercase md:flex">
            <span>chaiform · online</span>
            <span className="size-1 rounded-full bg-lime-400/80 shadow-[0_0_6px_rgba(74,222,128,0.7)]" />
          </div>
        </div>

        {/* Energy power bar — moving scan creates a charging feel */}
        <div className="fx-power-bar w-full" />
      </div>

      <a
        href="/sign-up"
        ref={scrollRef}
        className="absolute bottom-16 left-1/2 z-10 flex -translate-x-1/2 flex-col items-center gap-2 opacity-0"
      >
        <span className="font-mono text-[9px] tracking-[0.4em] text-white/40 uppercase">
          Get started
        </span>
        <div
          className="scroll-line h-10 w-px origin-top"
          style={{ background: "linear-gradient(to bottom, rgba(74,222,128,0.85), transparent)" }}
        />
      </a>
    </div>
  );
}

/**
 * HeroEmbers — drifting green dust particles around the character area.
 * Deterministic positions (seeded by index) so no SSR hydration mismatch.
 */
function HeroEmbers() {
  const embers = Array.from({ length: 22 }, (_, i) => {
    const seed = i * 9301 + 49297;
    const r1 = (seed % 233280) / 233280;
    const r2 = ((seed * 7) % 233280) / 233280;
    const r3 = ((seed * 13) % 233280) / 233280;
    return {
      left: 4 + r1 * 46, // 4% → 50% (left half of viewport)
      bottom: -6 + r2 * 18,
      delay: r3 * 5,
      duration: 6 + r1 * 6,
      dx: (r2 - 0.5) * 50,
      dy: -(140 + r3 * 160),
      size: r1 > 0.85 ? 3 : 2,
    };
  });

  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 z-2 overflow-hidden">
      {embers.map((e, i) => (
        <span
          key={i}
          className="fx-ember"
          style={
            {
              left: `${e.left}%`,
              bottom: `${e.bottom}%`,
              width: e.size,
              height: e.size,
              animationDelay: `${e.delay}s`,
              animationDuration: `${e.duration}s`,
              "--dx": `${e.dx}px`,
              "--dy": `${e.dy}px`,
              "--ember-color": "rgba(140, 255, 170, 0.85)",
            } as CSSProperties
          }
        />
      ))}
    </div>
  );
}
