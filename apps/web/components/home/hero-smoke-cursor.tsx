"use client";

import { useEffect, useRef, type RefObject } from "react";
import gsap from "gsap";

const SMOKE_LAYERS = [
  {
    size: 460,
    opacity: 0.16,
    lag: 0.42,
    background:
      "radial-gradient(circle, rgba(74,222,128,0.55) 0%, rgba(74,222,128,0.12) 38%, transparent 72%)",
  },
  {
    size: 320,
    opacity: 0.11,
    lag: 0.62,
    background:
      "radial-gradient(circle, rgba(120,130,125,0.4) 0%, rgba(60,70,65,0.14) 42%, transparent 74%)",
  },
  {
    size: 220,
    opacity: 0.14,
    lag: 0.82,
    background:
      "radial-gradient(circle, rgba(0,0,0,0.55) 0%, rgba(20,30,24,0.22) 45%, transparent 76%)",
  },
] as const;

type HeroSmokeCursorProps = {
  containerRef: RefObject<HTMLElement | null>;
};

export function HeroSmokeCursor({ containerRef }: HeroSmokeCursorProps) {
  const layerRef = useRef<HTMLDivElement>(null);
  const blobRefs = useRef<(HTMLDivElement | null)[]>([]);
  const xToFnsRef = useRef<gsap.QuickToFunc[]>([]);
  const yToFnsRef = useRef<gsap.QuickToFunc[]>([]);
  const activeRef = useRef(false);
  const fadeTweenRef = useRef<gsap.core.Tween | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    const layer = layerRef.current;
    if (!container || !layer) return;

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reducedMotion) return;

    const xToFns: gsap.QuickToFunc[] = [];
    const yToFns: gsap.QuickToFunc[] = [];

    blobRefs.current.forEach((blob, i) => {
      if (!blob) return;

      gsap.set(blob, {
        xPercent: -50,
        yPercent: -50,
        opacity: 0,
        scale: 0.72,
      });

      const duration = SMOKE_LAYERS[i]?.lag ?? 0.5;
      xToFns.push(gsap.quickTo(blob, "x", { duration, ease: "power3.out" }));
      yToFns.push(gsap.quickTo(blob, "y", { duration, ease: "power3.out" }));
    });

    xToFnsRef.current = xToFns;
    yToFnsRef.current = yToFns;

    const showSmoke = () => {
      fadeTweenRef.current?.kill();
      blobRefs.current.forEach((blob, i) => {
        if (!blob) return;
        gsap.to(blob, {
          opacity: SMOKE_LAYERS[i]?.opacity ?? 0.1,
          scale: 1,
          duration: 0.55,
          ease: "power2.out",
          overwrite: true,
        });
      });
    };

    const hideSmoke = () => {
      activeRef.current = false;
      fadeTweenRef.current?.kill();
      fadeTweenRef.current = gsap.to(blobRefs.current, {
        opacity: 0,
        scale: 0.78,
        duration: 0.9,
        ease: "power2.inOut",
        stagger: 0.06,
      });
    };

    const onMove = (event: MouseEvent) => {
      const rect = container.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;

      if (x < 0 || y < 0 || x > rect.width || y > rect.height) {
        if (activeRef.current) hideSmoke();
        return;
      }

      if (!activeRef.current) {
        activeRef.current = true;
        showSmoke();
      }

      blobRefs.current.forEach((blob, i) => {
        const xTo = xToFnsRef.current[i];
        const yTo = yToFnsRef.current[i];
        if (!blob || !xTo || !yTo) return;
        xTo(x);
        yTo(y);
      });
    };

    const onLeave = () => hideSmoke();

    window.addEventListener("mousemove", onMove);
    container.addEventListener("mouseleave", onLeave);

    return () => {
      window.removeEventListener("mousemove", onMove);
      container.removeEventListener("mouseleave", onLeave);
      fadeTweenRef.current?.kill();
      xToFnsRef.current = [];
      yToFnsRef.current = [];
    };
  }, [containerRef]);

  return (
    <div
      ref={layerRef}
      aria-hidden
      className="pointer-events-none absolute inset-0 z-3 overflow-hidden mix-blend-screen"
    >
      {SMOKE_LAYERS.map((layer, i) => (
        <div
          key={i}
          ref={(el) => {
            blobRefs.current[i] = el;
          }}
          className="hero-smoke-blob absolute top-0 left-0 will-change-transform"
          style={{
            width: layer.size,
            height: layer.size,
            background: layer.background,
            filter: "blur(42px)",
          }}
        />
      ))}
    </div>
  );
}
