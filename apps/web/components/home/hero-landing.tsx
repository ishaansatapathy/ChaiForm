"use client";

import gsap from "gsap";
import Link from "next/link";
import { useEffect, useRef } from "react";

import { HeroAtmosphere } from "~/components/home/hero-atmosphere";
import { HeroCopy } from "~/components/home/hero-copy";

const WALLPAPER = "/images/ben10/landing-wallpaper.png";

export function HeroLanding() {
  const rootRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.fromTo(
        ".hero-sign-in",
        { opacity: 0, y: -10 },
        { opacity: 1, y: 0, duration: 0.55, ease: "power3.out", delay: 0.15 },
      );
      gsap.fromTo(
        ".hero-wallpaper",
        { opacity: 0 },
        { opacity: 1, duration: 1.1, ease: "power2.out" },
      );

      gsap.fromTo(
        ".hero-copy-item",
        { opacity: 0, y: 22 },
        {
          opacity: 1,
          y: 0,
          duration: 0.75,
          ease: "power3.out",
          stagger: 0.12,
          delay: 0.35,
        },
      );

      gsap.fromTo(
        ".hero-scroll-hint",
        { opacity: 0, y: 10 },
        { opacity: 1, y: 0, duration: 0.6, ease: "power3.out", delay: 0.9 },
      );

      const line = rootRef.current?.querySelector(".hero-scroll-line");
      if (line) {
        gsap.to(line, {
          scaleY: 0.35,
          transformOrigin: "top center",
          repeat: -1,
          yoyo: true,
          duration: 1.2,
          ease: "sine.inOut",
        });
      }
    }, rootRef);

    return () => ctx.revert();
  }, []);

  return (
    <section
      ref={rootRef}
      className="hero-section relative z-1 min-h-dvh w-full overflow-hidden bg-(--landing-bg)"
    >
      <img
        src={WALLPAPER}
        alt=""
        width={1024}
        height={682}
        className="hero-wallpaper pointer-events-none select-none"
        draggable={false}
      />

      <div className="hero-seam-blend pointer-events-none absolute inset-x-0 bottom-0 z-2" aria-hidden="true">
        <div className="hero-seam-blur" />
        <div className="hero-seam-fade" />
      </div>

      <div className="hero-edge-fade pointer-events-none absolute inset-y-0 right-0 z-3 w-[min(12vw,120px)]" aria-hidden="true" />

      <div
        className="pointer-events-none absolute inset-y-0 left-0 z-1 w-[min(72vw,680px)]"
        style={{
          background: "linear-gradient(to right, rgb(2 2 2 / 0.48) 0%, rgb(2 2 2 / 0.12) 42%, transparent 100%)",
        }}
        aria-hidden="true"
      />

      <div className="hero-smoke-layer absolute inset-0 opacity-0 pointer-events-none" aria-hidden="true">
        <HeroAtmosphere />
      </div>

      <div className="landing-copy hero-copy absolute inset-y-0 left-0 z-20 flex w-full max-w-[min(600px,58vw)] flex-col justify-center px-[clamp(1.25rem,5vw,4.5rem)] pt-16 pb-24 sm:pt-20">
        <HeroCopy />
      </div>

      <Link
        href="/sign-in"
        className="landing-copy hero-sign-in font-mono absolute top-[max(1.25rem,env(safe-area-inset-top))] right-[max(1.25rem,env(safe-area-inset-right))] z-20 border border-[#70b404]/45 bg-black/50 px-6 py-3 text-[11px] tracking-[0.32em] text-white uppercase backdrop-blur-sm transition-colors hover:border-[#70b404] hover:bg-[#70b404]/10 sm:top-8 sm:right-8"
      >
        Sign In
      </Link>

      <div className="landing-copy hero-scroll-hint absolute bottom-10 left-1/2 z-20 flex -translate-x-1/2 flex-col items-center gap-3">
        <span className="landing-label text-[10px] tracking-[0.5em]">Scroll</span>
        <div
          className="hero-scroll-line h-16 w-px origin-top"
          style={{ background: "linear-gradient(to bottom, #70b404, transparent)" }}
        />
      </div>
    </section>
  );
}
