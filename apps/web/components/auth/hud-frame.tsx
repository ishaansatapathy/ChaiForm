"use client";

/** Minimal frame above/below the auth card — ChaiPoll-style, no brackets or glow. */
export function HudFrame({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <span className="size-1.5 rounded-full bg-lime-400" />
          <span className="font-display text-[10px] font-bold tracking-[0.32em] text-lime-400/90 uppercase">
            Omnitrix
          </span>
          <span className="font-mono text-[9px] tracking-[0.18em] text-white/30 uppercase">
            {"// protocol 4D-9"}
          </span>
        </div>
        <span className="font-mono text-[9px] tracking-[0.18em] text-white/30 uppercase">
          v3.1.0
        </span>
      </div>

      {children}
    </div>
  );
}
