"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";

import { HeroSmokeCursor } from "~/components/home/hero-smoke-cursor";

interface HeroSectionProps {
  onScrollDown?: () => void;
}

export function HeroSection({ onScrollDown }: HeroSectionProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const headingRef = useRef<HTMLDivElement>(null);
  const subRef = useRef<HTMLParagraphElement>(null);
  const badgeRef = useRef<HTMLDivElement>(null);
  const ctaRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      const tl = gsap.timeline({ defaults: { ease: "power3.out" } });

      tl.fromTo(
        badgeRef.current,
        { opacity: 0, y: 18 },
        { opacity: 1, y: 0, duration: 0.7 },
        0.3,
      )
        .fromTo(
          headingRef.current!.querySelectorAll(".hero-line"),
          { opacity: 0, y: 36, skewY: 3 },
          { opacity: 1, y: 0, skewY: 0, duration: 0.85, stagger: 0.12 },
          0.55,
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
          1.6,
        );

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

  const lines = [
    { text: "Build Forms.", accent: false },
    { text: "Like a Hero.", accent: true },
  ];

  return (
    <div
      ref={rootRef}
      className="relative flex h-screen w-full items-center justify-end overflow-hidden"
    >
      {/* Landing wallpaper */}
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: "url(/images/ben10/bg-landing.png)" }}
      />

      {/* Cursor smoke trail */}
      <HeroSmokeCursor containerRef={rootRef} />

      {/* Soft edge fade — keeps right-side copy readable */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 z-[2]"
        style={{
          background:
            "linear-gradient(to left, rgba(0,0,0,0.72) 0%, rgba(0,0,0,0.28) 42%, transparent 68%)",
        }}
      />

      {/* Bottom fade into scroll sections */}
      <div
        aria-hidden
        className="pointer-events-none absolute bottom-0 left-0 right-0 z-[2] h-40"
        style={{ background: "linear-gradient(to bottom, transparent, #000)" }}
      />

      {/* Hero copy — right side empty space */}
      <div
        className="relative z-10 flex w-full max-w-[min(560px,46vw)] flex-col items-start gap-5 px-[clamp(2rem,7vw,8rem)] text-left"
      >
        <div
          ref={badgeRef}
          className="flex items-center gap-2 rounded-full border border-lime-400/35 bg-black/45 px-4 py-1.5 backdrop-blur-md"
        >
          <span className="h-1.5 w-1.5 rounded-full bg-lime-400 shadow-[0_0_8px_#4ade80]" />
          <span className="font-accent text-[10px] font-medium tracking-[0.38em] text-lime-400/90 uppercase">
            ChaiForm · Form Builder
          </span>
        </div>

        <div ref={headingRef} className="flex flex-col gap-1">
          {lines.map((line, i) => (
            <div key={i} className="overflow-hidden" style={{ lineHeight: 1.05 }}>
              <h1
                className="hero-line font-display text-[clamp(2.4rem,5.2vw,4.2rem)] font-black uppercase tracking-[0.08em]"
                style={{
                  color: line.accent ? "#4ade80" : "#ffffff",
                  textShadow: line.accent
                    ? "0 0 50px rgba(74,222,128,0.65), 0 0 100px rgba(74,222,128,0.25)"
                    : "0 0 40px rgba(255,255,255,0.15), 0 2px 20px rgba(0,0,0,0.9)",
                }}
              >
                {line.text}
              </h1>
            </div>
          ))}
        </div>

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
        <span className="font-mono text-[9px] tracking-[0.4em] text-white/30 uppercase">
          Scroll
        </span>
        <div
          className="scroll-line h-10 w-[1px] origin-top"
          style={{ background: "linear-gradient(to bottom, rgba(74,222,128,0.8), transparent)" }}
        />
      </div>
    </div>
  );
}
