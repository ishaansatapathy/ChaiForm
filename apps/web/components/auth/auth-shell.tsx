"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";
import Image from "next/image";
import Link from "next/link";

import { Suspense } from "react";

import { AuthCard } from "~/components/auth/auth-card";
import { AuthErrorToast } from "~/components/auth/auth-error-toast";
import { HudFrame } from "~/components/auth/hud-frame";

type AuthShellProps = {
  mode: "sign-in" | "sign-up";
  googleEnabled?: boolean;
  demoLoginEnabled?: boolean;
};

export function AuthShell({ mode, googleEnabled = false, demoLoginEnabled = false }: AuthShellProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const badgeRef = useRef<HTMLDivElement>(null);
  const taglineRef = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.fromTo(
        badgeRef.current,
        { opacity: 0, y: -12 },
        { opacity: 1, y: 0, duration: 0.7, ease: "power3.out" },
      );
      gsap.fromTo(
        taglineRef.current,
        { opacity: 0, y: 12 },
        { opacity: 1, y: 0, duration: 0.8, delay: 0.1, ease: "power3.out" },
      );
      gsap.fromTo(
        cardRef.current,
        { opacity: 0, y: 12 },
        { opacity: 1, y: 0, duration: 0.6, delay: 0.15, ease: "power2.out" },
      );
    });
    return () => ctx.revert();
  }, [mode]);

  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-black font-sans selection:bg-lime-400 selection:text-black">
      <AuthErrorToast path={mode === "sign-in" ? "/sign-in" : "/sign-up"} />
      {/* Background image */}
      <Image
        src="/images/ben10/bg-signup.png"
        alt=""
        fill
        priority
        className="object-cover object-center"
        sizes="100vw"
      />
      {/* Right-side darkening so the card pops without dimming the Omnitrix dial */}
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,rgba(0,0,0,0)_45%,rgba(0,0,0,0.55)_100%)]" />

      {/* Top-right status */}
      <div
        ref={badgeRef}
        className="absolute top-6 right-6 z-20 hidden items-center gap-2 sm:flex"
      >
        <span className="size-1.5 rounded-full bg-lime-400" />
        <span className="font-mono text-[10px] tracking-[0.28em] text-lime-400/80 uppercase">
          link · stable
        </span>
      </div>

      {/* Main content */}
      <div className="relative z-10 flex min-h-screen items-center justify-center p-6 sm:justify-end sm:p-10 lg:pr-[10%] xl:pr-[14%]">
        <div className="flex w-full max-w-[400px] flex-col gap-6">
          {/* Mobile-only brand */}
          <Link
            href="/"
            className="font-display inline-block text-xs font-bold tracking-[0.35em] text-lime-400/80 uppercase transition-colors hover:text-lime-400 sm:hidden"
          >
            ChaiForm
          </Link>

          {/* Tagline above frame */}
          <p
            ref={taglineRef}
            className="font-display text-[11px] font-bold tracking-[0.35em] text-white/55 uppercase"
          >
            <span className="text-lime-400">It&apos;s</span> hero time —
            <span className="text-white/85"> build forms.</span>
          </p>

          <div ref={cardRef}>
            <HudFrame>
              <Suspense fallback={<div className="h-[420px] animate-pulse rounded-[1.8rem] bg-white/5" />}>
                <AuthCard mode={mode} googleEnabled={googleEnabled} demoLoginEnabled={demoLoginEnabled} />
              </Suspense>
            </HudFrame>
          </div>

          <p className="font-mono text-center text-[9px] tracking-[0.28em] text-white/25 uppercase">
            by continuing you agree to the{" "}
            <Link href="/terms" className="text-white/45 underline-offset-2 hover:text-lime-400">
              terms
            </Link>{" "}
            · {" "}
            <Link href="/privacy" className="text-white/45 underline-offset-2 hover:text-lime-400">
              privacy
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
