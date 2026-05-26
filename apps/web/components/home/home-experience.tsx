"use client";

import { useCallback, useEffect, useState } from "react";

import { LandingScroll } from "~/components/home/landing-scroll";
import { LoadingScreen } from "~/components/home/loading-screen";
import { LANDING_COPY_ENABLED, LANDING_DIAGRAMS_ENABLED } from "~/lib/landing-config";

const INTRO_SEEN_KEY = "chaiform-intro-seen";

type Phase = "loading" | "landing";

function prefersReducedMotion() {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function HomeExperience() {
  const [phase, setPhase] = useState<Phase>("landing");

  useEffect(() => {
    if (prefersReducedMotion()) return;
    if (sessionStorage.getItem(INTRO_SEEN_KEY) === "1") return;
    setPhase("loading");
  }, []);

  const handleLoadingComplete = useCallback(() => {
    sessionStorage.setItem(INTRO_SEEN_KEY, "1");
    setPhase("landing");
  }, []);

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
