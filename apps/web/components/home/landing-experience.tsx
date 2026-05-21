"use client";

import { useEffect, useRef } from "react";

import { LANDING_PLAYBACK_RATE, LANDING_VIDEO_SRC } from "~/lib/video-paths";

export function LandingExperience() {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    video.playbackRate = LANDING_PLAYBACK_RATE;
    void video.play().catch(() => undefined);
  }, []);

  return (
    <section className="relative min-h-screen overflow-hidden bg-black">
      <video
        ref={videoRef}
        src={LANDING_VIDEO_SRC}
        className="h-full min-h-screen w-full object-cover"
        autoPlay
        muted
        loop
        playsInline
        preload="auto"
      />
    </section>
  );
}
