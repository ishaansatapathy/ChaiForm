"use client";

import { useCallback, useEffect, useState } from "react";

import { Ben10Scroll } from "~/components/home/ben10-scroll";
import { CustomCursor } from "~/components/home/custom-cursor";
import { LoadingScreen } from "~/components/home/loading-screen";

type Phase = "loading" | "main";

export function HomeExperience() {
  const [mounted, setMounted] = useState(false);
  const [phase, setPhase] = useState<Phase>("loading");

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleLoadingComplete = useCallback(() => {
    setPhase("main");
  }, []);

  if (!mounted) {
    return <div className="fixed inset-0 bg-black" aria-hidden />;
  }

  if (phase === "loading") {
    return <LoadingScreen onComplete={handleLoadingComplete} />;
  }

  return (
    <>
      <CustomCursor />
      <Ben10Scroll />
    </>
  );
}
