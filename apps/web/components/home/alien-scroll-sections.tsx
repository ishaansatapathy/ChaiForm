"use client";

import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useLayoutEffect, useRef } from "react";

import { LandingUiPanel } from "~/components/home/landing-ui-panel";
import { ALIEN_GLOW_FILTER, ALIEN_SCROLL_SECTIONS } from "~/lib/alien-scroll-config";

gsap.registerPlugin(ScrollTrigger);

export function AlienScrollSections() {
  const rootRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const ctx = gsap.context(() => {
      const sections = gsap.utils.toArray<HTMLElement>(".alien-section");

      sections.forEach((section) => {
        const char = section.querySelector<HTMLElement>(".alien-char");
        const ui = section.querySelector<HTMLElement>(".alien-ui");
        const copy = section.querySelector<HTMLElement>(".alien-copy");
        const lines = copy?.querySelectorAll<HTMLElement>(".alien-copy-line") ?? [];
        const from = section.dataset.from === "left" ? "left" : "right";
        const charStart = from === "left" ? "-110%" : "110%";
        const uiStart = from === "left" ? "40%" : "-40%";

        if (char) {
          gsap.fromTo(
            char,
            { x: charStart, opacity: 0 },
            {
              x: "0%",
              opacity: 1,
              ease: "power2.out",
              scrollTrigger: {
                trigger: section,
                start: "top 92%",
                end: "top 28%",
                scrub: 0.65,
              },
            },
          );
        }

        if (ui) {
          gsap.fromTo(
            ui,
            { x: uiStart, opacity: 0 },
            {
              x: "0%",
              opacity: 1,
              ease: "power2.out",
              scrollTrigger: {
                trigger: section,
                start: "top 88%",
                end: "top 32%",
                scrub: 0.55,
              },
            },
          );
        }

        if (copy) {
          gsap.fromTo(
            copy,
            { opacity: 0, y: 28 },
            {
              opacity: 1,
              y: 0,
              ease: "power2.out",
              scrollTrigger: {
                trigger: section,
                start: "top 85%",
                end: "top 40%",
                scrub: 0.5,
              },
            },
          );
        }

        lines.forEach((line, i) => {
          gsap.fromTo(
            line,
            { opacity: 0, y: 16 },
            {
              opacity: 1,
              y: 0,
              ease: "power2.out",
              scrollTrigger: {
                trigger: section,
                start: "top 82%",
                end: "top 38%",
                scrub: 0.45,
              },
              delay: i * 0.02,
            },
          );
        });
      });

      ScrollTrigger.refresh();
    }, root);

    return () => ctx.revert();
  }, []);

  return (
    <div ref={rootRef} className="alien-scroll relative z-1">
      {ALIEN_SCROLL_SECTIONS.map((section) => {
        const isLeft = section.from === "left";

        return (
          <section
            key={section.id}
            className="alien-section relative flex min-h-dvh w-full items-center overflow-hidden px-[clamp(1.25rem,5vw,5rem)] py-12 md:px-[5%]"
            data-from={section.from}
          >
            <div className="mx-auto grid w-full max-w-[1440px] grid-cols-1 items-center gap-10 lg:grid-cols-12 lg:gap-8">
              {/* Copy */}
              <div
                className={`landing-copy alien-copy flex flex-col gap-6 lg:col-span-4 ${
                  isLeft ? "lg:order-3 lg:col-start-9" : "lg:order-1 lg:col-start-1"
                }`}
              >
                <div className="flex items-center gap-4">
                  <span className="landing-label text-[11px] tracking-[0.4em]">{section.index}</span>
                  <span className="h-px w-14 bg-[#70b404]/35" />
                  <span className="landing-label text-[11px] tracking-[0.28em]">{section.eyebrow}</span>
                </div>
                <h2 className="alien-copy-line font-display text-[clamp(2.4rem,4.8vw,3.75rem)] font-normal leading-[1.05] tracking-[-0.03em] whitespace-pre-line text-white">
                  {section.heading}
                </h2>
                <p className="alien-copy-line landing-body max-w-[36ch] text-[clamp(1rem,1.15vw,1.125rem)] leading-[1.7]">
                  {section.body}
                </p>
                <span className="alien-copy-line inline-flex w-fit items-center gap-2.5 border border-[#70b404]/30 px-4 py-1.5 font-mono text-[11px] tracking-[0.28em] text-white uppercase">
                  <span className="size-1.5 rounded-full bg-[#70b404]" />
                  {section.tag}
                </span>
              </div>

              {/* UI panel — fills the empty middle space */}
              <div
                className={`alien-ui flex h-[min(380px,52vh)] min-h-[320px] lg:col-span-4 lg:h-[min(440px,58vh)] ${
                  isLeft ? "lg:order-2 lg:col-start-5" : "lg:order-2 lg:col-start-5"
                }`}
              >
                <LandingUiPanel type={section.uiPanel} />
              </div>

              {/* Alien character — slides in from side */}
              <div
                className={`alien-char flex items-center justify-center lg:col-span-4 ${
                  isLeft
                    ? "lg:order-1 lg:col-start-1 lg:justify-start"
                    : "lg:order-3 lg:col-start-9 lg:justify-end"
                }`}
              >
                <div className="relative flex h-[clamp(300px,58vh,580px)] w-full max-w-[min(620px,95vw)] items-center justify-center">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={section.image}
                    alt=""
                    className={`alien-char-img max-h-full max-w-full object-contain${
                      section.blendMode === "screen" ? " alien-char-img--screen" : ""
                    }`}
                    style={{
                      filter: ALIEN_GLOW_FILTER,
                      transform: `scale(${section.scale ?? 1})`,
                    }}
                    draggable={false}
                  />
                </div>
              </div>
            </div>
          </section>
        );
      })}
    </div>
  );
}
