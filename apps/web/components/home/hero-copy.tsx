import Link from "next/link";

/** Option 6 — no brush fonts: ghost outline fills left, crisp mono copy (active) */
export function HeroCopyV6() {
  return (
    <div className="hero-copy-item relative opacity-0">
      <p
        className="pointer-events-none absolute -left-1 -top-10 font-display text-[clamp(4.5rem,15vw,10rem)] font-bold leading-[0.85] tracking-[-0.06em] text-transparent select-none sm:-top-14"
        style={{ WebkitTextStroke: "1px rgb(112 180 4 / 0.16)" }}
        aria-hidden="true"
      >
        HERO
        <br />
        TIME
      </p>

      <div className="relative z-10 pt-6 sm:pt-10">
        <div className="mb-8 flex items-center gap-3">
          <span className="size-1.5 shrink-0 rounded-full bg-[#70b404] shadow-[0_0_12px_#70b404]" />
          <p className="landing-label text-[11px] tracking-[0.38em]">ChaiForm · it&apos;s hero time</p>
        </div>

        <p className="font-mono text-[clamp(0.72rem,1.1vw,0.82rem)] leading-[2] tracking-[0.22em] text-white/55 uppercase">
          Build your form
          <br />
          Send one link
          <br />
          Catch every answer
        </p>

        <p className="landing-body mt-8 max-w-[28ch] text-[clamp(1rem,1.25vw,1.125rem)] leading-relaxed text-white/78">
          No maze. No noise. Just build and go.
        </p>

        <div className="mt-9 flex flex-wrap items-center gap-3">
          <Link
            href="/sign-up"
            className="landing-btn-primary px-9 py-3.5 font-mono text-[11px] tracking-[0.28em] uppercase"
          >
            Start free
          </Link>
          <Link
            href="/sign-in"
            className="font-mono text-[11px] tracking-[0.24em] text-[#9ed926] uppercase transition-opacity hover:opacity-80"
          >
            Sign in →
          </Link>
        </div>
      </div>
    </div>
  );
}

export function HeroCopy() {
  return <HeroCopyV6 />;
}
