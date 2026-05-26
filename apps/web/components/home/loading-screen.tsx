"use client";

import { useCallback, useEffect, useRef } from "react";
import gsap from "gsap";

import {
  LOADING_MAX_MS,
  LOADING_MIN_MS,
  LOADING_PLAYBACK_RATE,
  LOADING_VIDEO_SRC,
} from "~/lib/video-paths";

type LoadingScreenProps = {
  onComplete: () => void;
};

export function LoadingScreen({ onComplete }: LoadingScreenProps) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const videoBoxRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const textRef = useRef<HTMLDivElement>(null);
  const progressRef = useRef<HTMLDivElement>(null);
  const finishedRef = useRef(false);
  const finishRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    const video = videoRef.current;
    const wrapper = wrapperRef.current;
    const videoBox = videoBoxRef.current;
    const text = textRef.current;
    if (!video || !wrapper || !videoBox || !text) return;

    const reducedMotion =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (reducedMotion) {
      onComplete();
      return;
    }

    const startedAt = Date.now();

    const onTimeUpdate = () => {
      if (!progressRef.current || !video.duration) return;
      progressRef.current.style.width = `${(video.currentTime / video.duration) * 100}%`;
    };

    const finish = () => {
      if (finishedRef.current) return;
      finishedRef.current = true;
      finishRef.current = null;

      const tl = gsap.timeline({ onComplete });
      tl.to(text, { opacity: 0, y: -18, duration: 0.35, ease: "power3.in" }, 0)
        .to(
          videoBox,
          {
            width: "100vw",
            height: "100vh",
            borderRadius: 0,
            borderWidth: 0,
            duration: 0.72,
            ease: "expo.inOut",
          },
          0.1,
        )
        .to(videoBox, { backgroundColor: "#020202", duration: 0.25 }, 0.62)
        .to(wrapper, { opacity: 0, duration: 0.22 }, 0.72);
    };

    finishRef.current = finish;

    const tryFinish = () => {
      const elapsed = Date.now() - startedAt;
      if (elapsed < LOADING_MIN_MS) {
        window.setTimeout(finish, LOADING_MIN_MS - elapsed);
        return;
      }
      finish();
    };

    video.playbackRate = LOADING_PLAYBACK_RATE;
    video.addEventListener("ended", tryFinish);
    video.addEventListener("timeupdate", onTimeUpdate);

    void video.play().catch(() => {
      window.setTimeout(finish, LOADING_MIN_MS);
    });

    const maxTimer = window.setTimeout(finish, LOADING_MAX_MS);

    gsap.fromTo(
      text,
      { opacity: 0, y: 22 },
      { opacity: 1, y: 0, duration: 0.8, ease: "power3.out", delay: 0.2 },
    );

    return () => {
      finishRef.current = null;
      window.clearTimeout(maxTimer);
      video.removeEventListener("ended", tryFinish);
      video.removeEventListener("timeupdate", onTimeUpdate);
    };
  }, [onComplete]);

  const handleSkip = useCallback(() => {
    if (finishedRef.current) return;
    videoRef.current?.pause();
    finishRef.current?.();
  }, []);

  return (
    <div
      ref={wrapperRef}
      className="fixed inset-0 z-50 flex flex-col items-center justify-center overflow-hidden bg-(--landing-bg)"
    >
      <div
        ref={videoBoxRef}
        className="relative z-10 overflow-hidden rounded-2xl bg-(--landing-bg)"
        style={{
          width: "min(720px, 92vw)",
          height: "min(440px, 58vw)",
          border: "1px solid rgba(255,255,255,0.12)",
          boxShadow: "0 40px 80px -20px rgba(0,0,0,0.85)",
        }}
      >
        <video
          ref={videoRef}
          src={LOADING_VIDEO_SRC}
          className="h-full w-full object-contain"
          autoPlay
          muted
          playsInline
          preload="auto"
          aria-label="ChaiForm loading intro"
        />

        <div className="absolute right-0 bottom-0 left-0 h-[2px] bg-white/10">
          <div
            ref={progressRef}
            className="h-full transition-none"
            style={{ width: "0%", background: "#70b404" }}
          />
        </div>
      </div>

      <button
        type="button"
        onClick={handleSkip}
        className="relative z-10 mt-3 rounded-full border border-white/10 px-3 py-1 font-mono text-[9px] tracking-[0.32em] text-white/35 uppercase transition-colors hover:border-lime-400/30 hover:text-lime-400/80"
        aria-label="Skip loading intro"
      >
        Skip
      </button>

      <div ref={textRef} className="landing-copy relative z-10 mt-8 flex flex-col items-center gap-1.5 text-center opacity-0">
        <p
          className="text-[clamp(1rem,2.5vw,1.35rem)] font-black tracking-[0.38em] uppercase"
          style={{ fontFamily: "'Orbitron', sans-serif", color: "#f4ffe8" }}
        >
          ChaiForm
        </p>
        <p className="font-mono text-[9px] tracking-[0.6em] uppercase" style={{ color: "rgba(112,180,4,0.72)" }}>
          It&apos;s Hero Time
        </p>
      </div>
    </div>
  );
}
