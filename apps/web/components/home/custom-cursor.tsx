"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";

export function CustomCursor() {
  const dotRef = useRef<HTMLDivElement>(null);
  const ringRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const dot = dotRef.current;
    const ring = ringRef.current;
    if (!dot || !ring) return;

    // Only activate on fine-pointer devices (mouse)
    if (!window.matchMedia("(pointer: fine)").matches) return;

    let visible = false;

    const setDotX = gsap.quickTo(dot, "x", { duration: 0, ease: "none" });
    const setDotY = gsap.quickTo(dot, "y", { duration: 0, ease: "none" });
    const setRingX = gsap.quickTo(ring, "x", { duration: 0.38, ease: "power2.out" });
    const setRingY = gsap.quickTo(ring, "y", { duration: 0.38, ease: "power2.out" });

    const onMove = (e: MouseEvent) => {
      setDotX(e.clientX);
      setDotY(e.clientY);
      setRingX(e.clientX);
      setRingY(e.clientY);
      if (!visible) {
        visible = true;
        gsap.to([dot, ring], { opacity: 1, duration: 0.3, ease: "power2.out" });
      }
    };

    const onHoverIn = () => {
      gsap.to(ring, { scale: 2, borderColor: "rgba(74,222,128,0.9)", duration: 0.25, ease: "power2.out" });
      gsap.to(dot, { scale: 0, duration: 0.2 });
    };
    const onHoverOut = () => {
      gsap.to(ring, { scale: 1, borderColor: "rgba(74,222,128,0.55)", duration: 0.25, ease: "power2.out" });
      gsap.to(dot, { scale: 1, duration: 0.2 });
    };

    const bindInteractives = () => {
      document
        .querySelectorAll("a, button, [data-cursor='hover'], [role='button']")
        .forEach((el) => {
          (el as HTMLElement).addEventListener("mouseenter", onHoverIn);
          (el as HTMLElement).addEventListener("mouseleave", onHoverOut);
        });
    };

    window.addEventListener("mousemove", onMove);
    bindInteractives();

    const observer = new MutationObserver(bindInteractives);
    observer.observe(document.body, { childList: true, subtree: true });

    return () => {
      window.removeEventListener("mousemove", onMove);
      observer.disconnect();
    };
  }, []);

  return (
    <>
      <div
        ref={dotRef}
        aria-hidden
        className="pointer-events-none fixed top-0 left-0 z-[9999] h-[7px] w-[7px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-lime-400 opacity-0"
        style={{ willChange: "transform" }}
      />
      <div
        ref={ringRef}
        aria-hidden
        className="pointer-events-none fixed top-0 left-0 z-[9998] h-8 w-8 -translate-x-1/2 -translate-y-1/2 rounded-full border border-lime-400/55 opacity-0"
        style={{ willChange: "transform" }}
      />
    </>
  );
}
