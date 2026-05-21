"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";

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
          headingRef.current!.querySelectorAll(".hero-word"),
          { opacity: 0, y: 48, skewY: 4 },
          { opacity: 1, y: 0, skewY: 0, duration: 0.85, stagger: 0.08 },
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

      // Scroll indicator pulse
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

  const words = ["Build", "Forms.", "Like", "a Hero."];

  return (
    <div
      ref={rootRef}
      className="relative flex h-screen w-full flex-col items-center justify-center overflow-hidden"
    >
      {/* Background — the hero image */}
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: "url(/images/ben10/bg-hero.png)" }}
      />

      {/* Dark vignette — keeps text readable */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 70% 80% at 50% 50%, rgba(0,0,0,0.08) 0%, rgba(0,0,0,0.55) 100%)",
        }}
      />
      {/* Bottom fade to black — merges into scroll sections */}
      <div
        className="absolute bottom-0 left-0 right-0 h-40"
        style={{ background: "linear-gradient(to bottom, transparent, #000)" }}
      />

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center gap-6 px-6 text-center">
        {/* Badge */}
        <div
          ref={badgeRef}
          className="flex items-center gap-2 rounded-full border border-lime-400/30 bg-black/40 px-4 py-1.5 backdrop-blur-sm"
        >
          <span className="h-1.5 w-1.5 rounded-full bg-lime-400" />
          <span className="font-mono text-[10px] font-bold tracking-[0.4em] text-lime-400/90 uppercase">
            ChaiForm · Form Builder
          </span>
        </div>

        {/* Main heading */}
        <div ref={headingRef} className="overflow-hidden">
          <h1
            className="flex flex-wrap justify-center gap-x-[0.3em] text-[clamp(3.2rem,9vw,9rem)] font-black leading-[1] text-white"
            style={{
              fontFamily: "'Orbitron','Arial Black',sans-serif",
              textShadow: "0 0 120px rgba(74,222,128,0.35), 0 2px 40px rgba(0,0,0,0.8)",
            }}
          >
            {words.map((word, i) => (
              <span
                key={i}
                className="hero-word inline-block"
                style={{ color: word === "Hero." ? "#4ade80" : "white" }}
              >
                {word}
              </span>
            ))}
          </h1>
        </div>

        {/* Sub */}
        <p
          ref={subRef}
          className="max-w-xl text-[clamp(0.95rem,1.6vw,1.2rem)] leading-relaxed text-white/55"
        >
          Powerful forms, real-time responses, and analytics that hit different.
          <br />
          Zero code. Pure impact.
        </p>

        {/* CTA row */}
        <div ref={ctaRef} className="mt-2 flex items-center gap-4">
          <a
            href="/sign-up"
            className="rounded-full bg-lime-400 px-8 py-3.5 text-sm font-black tracking-[0.18em] text-black uppercase transition-all duration-200 hover:scale-105 hover:brightness-110 active:scale-95"
          >
            Start for Free
          </a>
          <a
            href="#features"
            className="rounded-full border border-white/20 bg-white/5 px-8 py-3.5 text-sm font-semibold tracking-wide text-white/70 backdrop-blur-sm transition-all duration-200 hover:bg-white/10 hover:text-white"
          >
            See How It Works
          </a>
        </div>
      </div>

      {/* Scroll indicator */}
      <div
        ref={scrollRef}
        className="absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 opacity-0"
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
