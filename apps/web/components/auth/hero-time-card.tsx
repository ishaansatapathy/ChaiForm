"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import gsap from "gsap";
import Image from "next/image";

import { AuthSubmitButton } from "~/components/auth/auth-field";

const OMNITRIX_LOGO = "/images/ben10/omnitrix-symbol.png";

type HeroTimeCardProps = {
  welcomeName: string;
  saving?: boolean;
  onSubmit: (displayName: string) => void;
};

export function HeroTimeCard({ welcomeName, saving = false, onSubmit }: HeroTimeCardProps) {
  const [mounted, setMounted] = useState(false);
  const [displayName, setDisplayName] = useState("");
  const [error, setError] = useState("");

  const overlayRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;

    const overlay = overlayRef.current;
    const card = cardRef.current;
    if (!overlay || !card) return;

    gsap.fromTo(overlay, { opacity: 0 }, { opacity: 1, duration: 0.35, ease: "power2.out" });
    gsap.fromTo(
      card,
      { opacity: 0, scale: 0.94, y: 24 },
      { opacity: 1, scale: 1, y: 0, duration: 0.65, ease: "back.out(1.25)" },
    );
  }, [mounted]);

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    const trimmed = displayName.trim();
    if (trimmed.length < 2) {
      setError("Display name must be at least 2 characters");
      return;
    }
    setError("");
    onSubmit(trimmed);
  };

  if (!mounted) return null;

  return createPortal(
    <div
      ref={overlayRef}
      className="fixed inset-0 z-9999 flex items-start justify-center bg-black/95 px-4 pt-[max(2.5rem,8vh)] backdrop-blur-sm sm:items-center sm:pt-0"
      role="dialog"
      aria-modal="true"
      aria-labelledby="quick-setup-title"
    >
      <div
        ref={cardRef}
        className="quick-setup-card relative w-full max-w-[460px] overflow-hidden rounded-[1.85rem] bg-[#050505] px-7 py-8 sm:px-9 sm:py-10"
      >
        <div className="pointer-events-none absolute inset-x-10 top-0 h-px bg-linear-to-r from-transparent via-[#70b404]/35 to-transparent" />
        <div className="pointer-events-none absolute top-4 left-4 size-3 border-t border-l border-[#70b404]/25" />
        <div className="pointer-events-none absolute top-4 right-4 size-3 border-t border-r border-[#70b404]/25" />
        <div className="pointer-events-none absolute bottom-4 left-4 size-3 border-b border-l border-[#70b404]/25" />
        <div className="pointer-events-none absolute right-4 bottom-4 size-3 border-r border-b border-[#70b404]/25" />

        <div className="mb-5 flex justify-center">
          <Image
            src={OMNITRIX_LOGO}
            alt=""
            width={80}
            height={80}
            priority
            className="size-20 object-contain"
          />
        </div>

        <p className="font-mono text-center text-[10px] tracking-[0.38em] text-[#70b404]/65 uppercase">
          {"// omnitrix sync · quick setup"}
        </p>

        <h2 id="quick-setup-title" className="mt-4 text-center">
          <span className="font-display block text-[clamp(1.5rem,3.8vw,2rem)] font-black tracking-[0.08em] text-white uppercase">
            It&apos;s{" "}
            <span className="text-[#b8f038]">Hero Time</span>,
          </span>
          <span className="font-display mt-1 block text-[clamp(1.65rem,4vw,2.2rem)] font-black tracking-tight text-white/45 italic">
            {welcomeName}.
          </span>
        </h2>

        <p className="font-annotate mx-auto mt-5 max-w-[320px] text-center text-lg leading-relaxed text-white/55">
          Pick a display name — this is how others will see you on ChaiForm.
        </p>

        <form onSubmit={handleSubmit} className="mt-8 space-y-4">
          <input
            id="display-name"
            value={displayName}
            onChange={(event) => {
              setDisplayName(event.target.value);
              setError("");
            }}
            placeholder="Your display name..."
            autoFocus
            maxLength={40}
            suppressHydrationWarning
            className="auth-input ben10-input rounded-2xl border-white/8 bg-[#0a0a0a] px-4 py-3.5 text-base"
          />
          {error ? (
            <p className="font-mono text-center text-[10px] tracking-wide text-red-400 uppercase">{error}</p>
          ) : null}

          <AuthSubmitButton
            disabled={saving}
            className="btn-omni font-display w-full rounded-2xl py-3.5 text-sm font-black tracking-[0.16em] uppercase disabled:opacity-60"
          >
            {saving ? "Activating…" : "Set up profile →"}
          </AuthSubmitButton>
        </form>

        <p className="font-mono mt-6 text-center text-[9px] tracking-[0.28em] text-[#70b404]/70 uppercase">
          Stay anonymous · build loud
        </p>
      </div>
    </div>,
    document.body,
  );
}
