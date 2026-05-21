"use client";

import { useEffect, useRef } from "react";
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

  useEffect(() => {
    const video = videoRef.current;
    const wrapper = wrapperRef.current;
    const videoBox = videoBoxRef.current;
    const text = textRef.current;
    if (!video || !wrapper || !videoBox || !text) return;

    const startedAt = Date.now();
    let maxTimer: ReturnType<typeof window.setTimeout> | undefined;

    // Animate progress bar as video plays
    const onTimeUpdate = () => {
      if (!progressRef.current || !video.duration) return;
      progressRef.current.style.width = `${(video.currentTime / video.duration) * 100}%`;
    };

    const finish = () => {
      if (finishedRef.current) return;
      finishedRef.current = true;

      // Cappen-style exit:
      // 1. Text fades up
      // 2. Video box expands to fill screen (clip expands)
      // 3. Box goes dark → onComplete
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
        .to(videoBox, { backgroundColor: "#000", duration: 0.25 }, 0.62)
        .to(wrapper, { opacity: 0, duration: 0.22 }, 0.72);
    };

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

    maxTimer = window.setTimeout(finish, LOADING_MAX_MS);

    // Entrance animation — text slides up
    gsap.fromTo(
      text,
      { opacity: 0, y: 22 },
      { opacity: 1, y: 0, duration: 0.8, ease: "power3.out", delay: 0.2 },
    );

    return () => {
      if (maxTimer) window.clearTimeout(maxTimer);
      video.removeEventListener("ended", tryFinish);
      video.removeEventListener("timeupdate", onTimeUpdate);
    };
  }, [onComplete]);

  return (
    <div
      ref={wrapperRef}
      className="fixed inset-0 z-50 flex flex-col items-center justify-center"
      style={{ background: "#f0ede8" }}
    >
      {/* Video box — starts small, expands on finish */}
      <div
        ref={videoBoxRef}
        className="relative overflow-hidden rounded-2xl border-2 border-black/90"
        style={{
          width: "min(620px, 86vw)",
          height: "min(400px, 55vw)",
          boxShadow: "0 40px 80px -20px rgba(0,0,0,0.35)",
        }}
      >
        <video
          ref={videoRef}
          src={LOADING_VIDEO_SRC}
          className="h-full w-full object-cover"
          muted
          playsInline
          preload="auto"
          aria-label="ChaiForm loading intro"
        />

        {/* Progress bar at bottom of video box */}
        <div className="absolute right-0 bottom-0 left-0 h-[2px] bg-black/10">
          <div
            ref={progressRef}
            className="h-full transition-none"
            style={{ width: "0%", background: "#4ade80" }}
          />
        </div>
      </div>

      {/* Branding text */}
      <div ref={textRef} className="mt-7 text-center opacity-0">
        <p
          className="text-[clamp(1.15rem,3vw,1.5rem)] font-black tracking-[0.32em] text-black uppercase"
          style={{ fontFamily: "'Orbitron', 'Arial Black', sans-serif" }}
        >
          ChaiForm
        </p>
        <p className="mt-1.5 font-mono text-[10px] tracking-[0.55em] text-black/45 uppercase">
          It&apos;s Hero Time
        </p>
      </div>
    </div>
  );
}
