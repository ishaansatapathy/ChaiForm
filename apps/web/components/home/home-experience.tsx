"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { Ben10Scroll } from "~/components/home/ben10-scroll";
import { HeroSection } from "~/components/home/hero-section";
import { LoadingScreen } from "~/components/home/loading-screen";

type Phase = "loading" | "main";

export function HomeExperience() {
  const [mounted, setMounted] = useState(false);
  const [phase, setPhase] = useState<Phase>("loading");
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleLoadingComplete = useCallback(() => {
    setPhase("main");
  }, []);

  const handleScrollDown = useCallback(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  if (!mounted) {
    return <div className="fixed inset-0 bg-black" aria-hidden />;
  }

  if (phase === "loading") {
    return <LoadingScreen onComplete={handleLoadingComplete} />;
  }

  return (
    <main className="bg-black">
      <HeroSection onScrollDown={handleScrollDown} />
      <div ref={scrollRef} />
      <Ben10Scroll />
    </main>
  );
}
