"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";

import { HeroAnnotations } from "~/components/home/hero-annotations";
import { HeroSmokeCursor } from "~/components/home/hero-smoke-cursor";

interface HeroSectionProps {
  onScrollDown?: () => void;
}

export function HeroSection({ onScrollDown }: HeroSectionProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const headlineRef = useRef<HTMLHeadingElement>(null);
  const eyebrowRef = useRef<HTMLParagraphElement>(null);
  const subRef = useRef<HTMLParagraphElement>(null);
  const badgeRef = useRef<HTMLDivElement>(null);
  const ctaRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
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
      <HeroAnnotations />

      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 z-2"
        style={{
          background:
            "linear-gradient(to left, rgba(0,0,0,0.78) 0%, rgba(0,0,0,0.32) 42%, transparent 68%)",
        }}
      />

      <div
        aria-hidden
        className="pointer-events-none absolute right-0 bottom-0 left-0 z-2 h-40"
        style={{ background: "linear-gradient(to bottom, transparent, #000)" }}
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
          it&apos;s hero time
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

        <p
          ref={eyebrowRef}
          className="font-mono -mb-1 flex items-center gap-2 text-[10px] tracking-[0.32em] text-white/40 uppercase"
        >
          <span className="inline-block h-px w-5 bg-lime-400/70" />
          chapter 01 — initiate
        </p>

        <h1
          ref={headlineRef}
          className="font-hand max-w-[13ch] origin-left text-[clamp(3rem,8.5vw,5.75rem)] leading-[1.12] tracking-[0.01em] text-[#e8e8e8] opacity-0"
          style={{ transform: "skewX(-3deg)" }}
        >
          Build <span className="text-lime-400/95">forms</span> like a{" "}
          <span className="text-lime-400/95">hero.</span>
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
            className="btn-omni font-display rounded-full px-7 py-3 text-xs font-black tracking-[0.18em] uppercase"
          >
            Start for Free
          </a>
          <a
            href="#features"
            className="font-accent group flex cursor-pointer items-center gap-2 rounded-full border border-white/20 bg-white/5 px-6 py-3 text-xs font-medium tracking-wide text-white/70 backdrop-blur-sm transition-all duration-200 hover:border-lime-400/40 hover:bg-white/10 hover:text-white"
          >
            See How It Works
            <span className="text-lime-400/80 transition-transform duration-200 group-hover:translate-x-0.5">
              →
            </span>
          </a>
        </div>
      </div>

      <div
        ref={hudBotRef}
        className="pointer-events-none absolute right-0 bottom-5 left-0 z-20 flex items-end justify-between px-[clamp(1.25rem,4vw,3rem)]"
      >
        <div className="font-mono flex items-center gap-3 text-[9px] tracking-[0.28em] text-white/30 uppercase">
          <span className="size-1 rounded-full bg-lime-400/80 shadow-[0_0_6px_rgba(74,222,128,0.7)]" />
          dna · locked
          <span className="text-white/15">·</span>
          plumber relay · stable
        </div>
        <div className="font-mono hidden items-center gap-3 text-[9px] tracking-[0.28em] text-white/30 uppercase md:flex">
          <span>scroll to engage</span>
          <span className="size-1 rounded-full bg-lime-400/80 shadow-[0_0_6px_rgba(74,222,128,0.7)]" />
        </div>
      </div>

      <div
        ref={scrollRef}
        className="absolute bottom-16 left-1/2 z-10 flex -translate-x-1/2 flex-col items-center gap-2 opacity-0"
        onClick={onScrollDown}
        style={{ cursor: "pointer" }}
      >
        <span className="font-mono text-[9px] tracking-[0.4em] text-white/40 uppercase">
          Scroll
        </span>
        <div
          className="scroll-line h-10 w-px origin-top"
          style={{ background: "linear-gradient(to bottom, rgba(74,222,128,0.85), transparent)" }}
        />
        <div className="-mt-1 flex flex-col items-center text-lime-400/70">
          <svg className="chev-1 size-3" viewBox="0 0 12 12" fill="none">
            <path d="M2 4l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
          <svg className="chev-2 -mt-2 size-3" viewBox="0 0 12 12" fill="none">
            <path d="M2 4l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
          <svg className="chev-3 -mt-2 size-3" viewBox="0 0 12 12" fill="none">
            <path d="M2 4l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </div>
      </div>
    </div>
  );
}
