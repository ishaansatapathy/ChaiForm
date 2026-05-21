"use client";

import { ClientRoughNotation } from "~/components/ui/client-rough-notation";

const LIME = "#4ade80";

/** ChaiPoll-style floating handwritten callouts on the hero left side. */
export function HeroAnnotations() {
  return (
    <div className="pointer-events-none absolute inset-0 z-10 hidden md:block">
      <div className="absolute top-[18%] left-[8%] lg:left-[10%]">
        <ClientRoughNotation type="underline" show color="#ffffff" strokeWidth={1.5} padding={6}>
          <span className="font-annotate text-[1.35rem] text-white/85 lg:text-[1.5rem]">
            drag & drop fields
          </span>
        </ClientRoughNotation>
      </div>

      <div className="absolute top-[52%] left-[6%] lg:left-[8%]">
        <ClientRoughNotation type="box" show color={LIME} strokeWidth={2} padding={10}>
          <span className="font-annotate text-[1.35rem] text-white/90 lg:text-[1.5rem]">
            live feedback
          </span>
        </ClientRoughNotation>
      </div>

      <div className="absolute bottom-[22%] left-[14%] lg:left-[18%]">
        <ClientRoughNotation type="circle" show color={LIME} strokeWidth={2} padding={12}>
          <span className="font-annotate text-[1.35rem] text-white/90 lg:text-[1.5rem]">
            hero time
          </span>
        </ClientRoughNotation>
      </div>
    </div>
  );
}
