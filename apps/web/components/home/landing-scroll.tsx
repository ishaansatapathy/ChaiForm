"use client";

import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Lenis from "lenis";
import { useLayoutEffect, useRef } from "react";

import { AlienScrollSections } from "~/components/home/alien-scroll-sections";
import { HeroLanding } from "~/components/home/hero-landing";
import { LandingSections } from "~/components/home/landing-sections";
import { LANDING_ALIENS_ENABLED } from "~/lib/landing-config";

gsap.registerPlugin(ScrollTrigger);

function setupWorkflowScroll(root: HTMLElement) {
  const section = root.querySelector<HTMLElement>(".workflow-section");
  if (!section) return;

  const steps = gsap.utils.toArray<HTMLElement>(".workflow-step", section);
  if (!steps.length) return;

  gsap.set(steps, { opacity: 0.62, x: 16 });
  gsap.set(steps[0]!, { opacity: 1, x: 0 });
  steps[0]!.classList.add("is-active");

  const tl = gsap.timeline({
    scrollTrigger: {
      trigger: section,
      start: "top top",
      end: "bottom bottom",
      scrub: 0.6,
    },
  });

  steps.forEach((step, i) => {
    if (i === 0) return;
    tl.to(
      steps[i - 1]!,
      {
        opacity: 0.62,
        x: -8,
        duration: 1,
        onStart: () => {
          steps[i - 1]!.classList.remove("is-active");
        },
      },
      i,
    ).to(
      step,
      {
        opacity: 1,
        x: 0,
        duration: 1,
        onStart: () => {
          step.classList.add("is-active");
        },
      },
      i,
    );
  });
}

function setupStickyScroll(root: HTMLElement) {
  const section = root.querySelector<HTMLElement>(".sticky-scroll-section");
  if (!section) return;

  const slides = gsap.utils.toArray<HTMLElement>(".sticky-slide", section);
  const previews = gsap.utils.toArray<HTMLElement>(".sticky-preview", section);
  if (!slides.length) return;

  let lastIndex = 0;

  ScrollTrigger.create({
    trigger: section,
    start: "top top",
    end: "bottom bottom",
    scrub: 0.4,
    onUpdate: (self) => {
      const index = Math.min(slides.length - 1, Math.floor(self.progress * slides.length));
      if (index === lastIndex) return;

      slides.forEach((slide, i) => slide.classList.toggle("is-active", i === index));
      previews.forEach((preview, i) => {
        preview.classList.toggle("is-active", i === index);
        if (i !== index) gsap.set(preview, { clearProps: "opacity,transform" });
      });

      lastIndex = index;
    },
  });
}

function setupReveals(root: HTMLElement) {
  gsap.utils.toArray<HTMLElement>(".landing-reveal", root).forEach((el) => {
    gsap.fromTo(
      el,
      { opacity: 0, y: 36 },
      {
        opacity: 1,
        y: 0,
        ease: "power2.out",
        scrollTrigger: {
          trigger: el,
          start: "top 85%",
          end: "top 55%",
          scrub: 0.45,
        },
      },
    );
  });
}

export function LandingScroll() {
  const rootRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const lenis = new Lenis({
      duration: 1.35,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
      lerp: 0.085,
    });

    lenis.on("scroll", ScrollTrigger.update);

    const ticker = (time: number) => {
      lenis.raf(time * 1000);
    };
    gsap.ticker.add(ticker);
    gsap.ticker.lagSmoothing(0);

    const ctx = gsap.context(() => {
      gsap.to(".hero-wallpaper", {
        opacity: 0,
        ease: "none",
        scrollTrigger: {
          trigger: ".hero-section",
          start: "top top",
          end: "bottom top",
          scrub: true,
        },
      });

      gsap.to(".hero-smoke-layer", {
        opacity: 0,
        ease: "none",
        scrollTrigger: {
          trigger: ".hero-section",
          start: "top top",
          end: "60% top",
          scrub: true,
        },
      });

      gsap.to(".hero-sign-in", {
        y: -20,
        opacity: 0,
        ease: "none",
        scrollTrigger: {
          trigger: ".hero-section",
          start: "top top",
          end: "40% top",
          scrub: true,
        },
      });

      gsap.to(".hero-copy", {
        y: -28,
        opacity: 0,
        ease: "none",
        scrollTrigger: {
          trigger: ".hero-section",
          start: "top top",
          end: "45% top",
          scrub: true,
        },
      });

      gsap.to(".hero-scroll-hint", {
        opacity: 0,
        y: 12,
        ease: "none",
        scrollTrigger: {
          trigger: ".hero-section",
          start: "top top",
          end: "25% top",
          scrub: true,
        },
      });

      setupWorkflowScroll(root);
      setupStickyScroll(root);
      setupReveals(root);

      ScrollTrigger.refresh();
    }, root);

    return () => {
      lenis.destroy();
      gsap.ticker.remove(ticker);
      ctx.revert();
    };
  }, []);

  return (
    <div ref={rootRef} className="landing-page relative">
      <div className="landing-canvas" aria-hidden="true" />
      <HeroLanding />
      <LandingSections part="workflow" />
      {LANDING_ALIENS_ENABLED && <AlienScrollSections />}
      <LandingSections part="rest" />
    </div>
  );
}
