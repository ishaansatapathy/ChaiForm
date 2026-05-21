"use client";

import { useMemo } from "react";

/** Page-level ambient HUD: drifting particles + marquee log strip + side scan.
 *  All non-interactive decoration. */
export function HudAmbient() {
  // Pre-computed particle positions so they don't shift between renders.
  const particles = useMemo(
    () =>
      Array.from({ length: 14 }).map((_, i) => ({
        left: `${(i * 53) % 100}%`,
        top: `${20 + ((i * 37) % 75)}%`,
        delay: `${(i * 0.7) % 6}s`,
        duration: `${6 + ((i * 1.3) % 7)}s`,
      })),
    [],
  );

  return (
    <>
      {/* Drifting lime motes — only in the right half so they don't compete with the Omnitrix dial */}
      <div className="pointer-events-none absolute inset-y-0 right-0 left-1/2 overflow-hidden">
        {particles.map((p, i) => (
          <span
            key={i}
            className="omni-particle"
            style={{
              left: p.left,
              top: p.top,
              animationDelay: p.delay,
              animationDuration: p.duration,
            }}
          />
        ))}
      </div>

      {/* Bottom log marquee */}
      <div className="pointer-events-none absolute right-0 bottom-3 left-0 overflow-hidden">
        <div className="omni-marquee font-mono text-[10px] tracking-[0.22em] text-lime-400/30 uppercase">
          <LogLine />
          <LogLine />
        </div>
      </div>

      {/* Right edge vertical scan ticks */}
      <div className="pointer-events-none absolute top-1/2 right-3 hidden -translate-y-1/2 flex-col items-end gap-3 md:flex">
        <Tick />
        <Tick wide />
        <Tick />
        <Tick />
        <Tick wide />
        <Tick />
      </div>
    </>
  );
}

function LogLine() {
  const items = [
    "// dna sequence locked",
    "// omnitrix handshake :: 0x4D9",
    "// hero database online",
    "// transmission encrypted",
    "// scanning user signature",
    "// plumber relay :: stable",
  ];
  return (
    <span className="flex shrink-0 gap-10 pr-10">
      {items.map((t) => (
        <span key={t} className="flex items-center gap-2">
          <span className="size-1 rounded-full bg-lime-400/60" />
          {t}
        </span>
      ))}
    </span>
  );
}

function Tick({ wide }: { wide?: boolean }) {
  return (
    <span
      className={`h-px ${wide ? "w-7" : "w-3"} bg-lime-400/60 shadow-[0_0_4px_rgba(74,222,128,0.6)]`}
    />
  );
}
