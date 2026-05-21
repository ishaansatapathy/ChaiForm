"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";

import { HeroSmokeCursor } from "~/components/home/hero-smoke-cursor";

interface HeroSectionProps {
  onScrollDown?: () => void;
}

export function HeroSection({ onScrollDown }: HeroSectionProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const headlineRef = useRef<HTMLDivElement>(null);
  const subRef = useRef<HTMLParagraphElement>(null);
  const badgeRef = useRef<HTMLDivElement>(null);
  const ctaRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      const tl = gsap.timeline({ defaults: { ease: "power3.out" } });

      tl.fromTo(badgeRef.current, { opacity: 0, y: 18 }, { opacity: 1, y: 0, duration: 0.7 }, 0.3)
        .fromTo(
          headlineRef.current!.querySelectorAll(".hero-hand-line"),
          { opacity: 0, y: 36, rotation: -2 },
          { opacity: 1, y: 0, rotation: 0, duration: 0.7, stagger: 0.12, ease: "power2.out" },
          0.5,
        )
        .fromTo(subRef.current, { opacity: 0, y: 22 }, { opacity: 1, y: 0, duration: 0.7 }, 1.0)
        .fromTo(ctaRef.current, { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 0.6 }, 1.2)
        .fromTo(scrollRef.current, { opacity: 0 }, { opacity: 1, duration: 0.8 }, 1.5);

      gsap.to(scrollRef.current!.querySelector(".scroll-line"), {
        scaleY: 0.3,
        transformOrigin: "top center",
        repeat: -1,
        yoyo: true,
        duration: 1.1,
        ease: "sine.inOut",
      });
    }, rootRef.current!);

    return () => ctx.revert();
  }, []);

  return (
    <div
      ref={rootRef}
      className="relative flex h-screen w-full items-center justify-end overflow-hidden"
    >
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: "url(/images/ben10/bg-landing.png)" }}
      />

      <HeroSmokeCursor containerRef={rootRef} />

      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 z-2"
        style={{
          background:
            "linear-gradient(to left, rgba(0,0,0,0.72) 0%, rgba(0,0,0,0.28) 42%, transparent 68%)",
        }}
      />

      <div
        aria-hidden
        className="pointer-events-none absolute bottom-0 left-0 right-0 z-2 h-40"
        style={{ background: "linear-gradient(to bottom, transparent, #000)" }}
      />

      <div className="relative z-10 flex w-full max-w-[min(580px,48vw)] flex-col items-start gap-5 px-[clamp(2rem,7vw,8rem)] text-left">
        <div
          ref={badgeRef}
          className="flex items-center gap-2 rounded-full border border-lime-400/35 bg-black/45 px-4 py-1.5 backdrop-blur-md"
        >
          <span className="h-1.5 w-1.5 rounded-full bg-lime-400 shadow-[0_0_8px_#4ade80]" />
          <span className="font-accent text-[10px] font-medium tracking-[0.38em] text-lime-400/90 uppercase">
            ChaiForm · Form Builder
          </span>
        </div>

        {/* Annotation-style handwriting headline */}
        <h1 ref={headlineRef} className="font-annotate w-full select-none leading-[0.95]">
          <span className="hero-hand-line block opacity-0" style={{ transform: "rotate(-1deg)" }}>
            <span className="text-[clamp(3.4rem,8.5vw,6.2rem)] text-white">Build </span>
            <span
              className="text-[clamp(3.4rem,8.5vw,6.2rem)] text-lime-400"
              style={{ textShadow: "0 0 40px rgba(74,222,128,0.35)" }}
            >
              forms
            </span>
          </span>

          <span
            className="hero-hand-line mt-1 block pl-2 text-[clamp(2.8rem,7vw,5.2rem)] text-white opacity-0"
            style={{ transform: "rotate(-0.5deg)" }}
          >
            like a
          </span>

          <span
            className="hero-hand-line mt-1 block text-[clamp(4rem,10vw,7.5rem)] text-lime-400 opacity-0"
            style={{
              transform: "rotate(-1.2deg)",
              textShadow: "0 0 50px rgba(74,222,128,0.4)",
              textDecoration: "underline",
              textDecorationColor: "rgba(74,222,128,0.55)",
              textDecorationThickness: "3px",
              textUnderlineOffset: "6px",
            }}
          >
            hero.
          </span>
        </h1>

        <p
          ref={subRef}
          className="font-accent max-w-[34ch] text-[clamp(0.88rem,1.35vw,1.05rem)] font-light leading-relaxed tracking-wide text-white/58"
        >
          Powerful forms, real-time responses, and analytics that hit different.
        </p>

        <div ref={ctaRef} className="mt-1 flex flex-wrap items-center gap-3">
          <a
            href="/sign-up"
            className="font-display cursor-pointer rounded-full bg-lime-400 px-7 py-3 text-xs font-black tracking-[0.18em] text-black uppercase transition-all duration-200 hover:scale-105 hover:brightness-110 active:scale-95"
          >
            Start for Free
          </a>
          <a
            href="#features"
            className="font-accent cursor-pointer rounded-full border border-white/20 bg-white/5 px-7 py-3 text-xs font-medium tracking-wide text-white/70 backdrop-blur-sm transition-all duration-200 hover:bg-white/10 hover:text-white"
          >
            See How It Works
          </a>
        </div>
      </div>

      <div
        ref={scrollRef}
        className="absolute bottom-10 left-1/2 z-10 flex -translate-x-1/2 flex-col items-center gap-2 opacity-0"
        onClick={onScrollDown}
        style={{ cursor: "pointer" }}
      >
        <span className="font-mono text-[9px] tracking-[0.4em] text-white/30 uppercase">Scroll</span>
        <div
          className="scroll-line h-10 w-px origin-top"
          style={{ background: "linear-gradient(to bottom, rgba(74,222,128,0.8), transparent)" }}
        />
      </div>
    </div>
  );
}
