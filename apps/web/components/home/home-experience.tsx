"use client";

import { useCallback, useState } from "react";

import { LandingScroll } from "~/components/home/landing-scroll";
import { LoadingScreen } from "~/components/home/loading-screen";
import { LANDING_COPY_ENABLED, LANDING_DIAGRAMS_ENABLED } from "~/lib/landing-config";

type Phase = "loading" | "landing";

export function HomeExperience() {
  const [phase, setPhase] = useState<Phase>("loading");
  const handleLoadingComplete = useCallback(() => setPhase("landing"), []);

  return (
    <div
      className={`landing-page min-h-dvh bg-(--landing-bg)${LANDING_COPY_ENABLED ? "" : " landing-copy-off"}${LANDING_DIAGRAMS_ENABLED ? "" : " landing-diagrams-off"}`}
    >
      {phase === "loading" ? (
        <LoadingScreen onComplete={handleLoadingComplete} />
      ) : (
        <LandingScroll />
      )}
    </div>
  );
}
