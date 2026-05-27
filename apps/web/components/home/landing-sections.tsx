"use client";



import Link from "next/link";



import { Highlight } from "~/components/app/highlight";

import { LandingStickyDiagram } from "~/components/home/landing-ui-panel";



const WORKFLOW = [
  { id: 1, label: "Shape your form", description: "Sketch questions and lay out your fields" },
  { id: 2, label: "Lock your rules", description: "Decide what must be answered before submit" },
  { id: 3, label: "Send it live", description: "One link to share anywhere you need" },
  { id: 4, label: "Catch every answer", description: "Submissions land the moment they arrive" },
  { id: 5, label: "Read the signal", description: "Turn responses into your next move" },
];

const STICKY_SLIDES = [
  {
    tag: "Phase 01",
    title: "Build your form matrix",
    body: "Drop in questions, preview the layout, lock your rules — your form takes shape in minutes.",
    preview: "builder",
  },
  {
    tag: "Phase 02",
    title: "Live answer stream",
    body: "Watch submissions roll in without refreshing. Every answer lands clean and ready to read.",
    preview: "stream",
  },
  {
    tag: "Phase 03",
    title: "Decode the responses",
    body: "See what people chose, what they skipped, and export what matters — no guesswork.",
    preview: "analytics",
  },
];

const BEN10_PRICING = [
  {
    tier: "Ben 10 Classic",
    price: "₹0",
    cadence: "starter hero kit",
    signal: "10 forms",
    copy: "For solo creators testing forms, themes, and public links.",
    features: ["Public + unlisted links", "Basic analytics", "Classic green themes"],
  },
  {
    tier: "Ben 10 Alien Force",
    price: "₹499",
    cadence: "per month",
    signal: "Unlimited forms",
    copy: "For teams collecting serious responses with stronger workflows.",
    features: ["Conditional logic", "CSV exports", "Creator email alerts"],
    featured: true,
  },
  {
    tier: "Ben 10 Omniverse",
    price: "₹1,499",
    cadence: "per month",
    signal: "Scale mode",
    copy: "For high-volume campaigns, launches, communities, and events.",
    features: ["Advanced analytics", "Priority limits", "Retention + export controls"],
  },
];



function PreviewPanel({ type }: { type: string }) {

  if (type === "builder" || type === "stream" || type === "analytics") {

    return <LandingStickyDiagram type={type} />;

  }

  return null;

}



export function LandingSections({ part = "all" }: { part?: "all" | "workflow" | "rest" }) {

  const showWorkflow = part === "all" || part === "workflow";

  const showRest = part === "all" || part === "rest";



  return (

    <div className="relative z-1">

      {showWorkflow && (

      <section className="workflow-section relative min-h-[220vh]">

        <div className="workflow-seam-top pointer-events-none absolute inset-x-0 top-0 z-1" aria-hidden="true" />

        <div className="workflow-pin sticky top-0 flex h-dvh items-center overflow-hidden px-[clamp(1.25rem,5vw,5rem)] md:px-[5%]">

          <div className="mx-auto grid w-full max-w-[1440px] grid-cols-1 items-center gap-14 md:grid-cols-2 md:gap-20">

            <div className="landing-copy workflow-copy">

              <p className="landing-label mb-8 text-[11px] tracking-[0.36em]">Hero sequence</p>
              <h2 className="font-display text-[clamp(2.6rem,5.5vw,4.5rem)] font-normal leading-[1.06] tracking-[-0.04em] text-white">
                A path that
                <br />
                feels like{" "}
                <span className="landing-accent-text underline decoration-[#70b404]/35 underline-offset-[0.2em]">
                  hero time.
                </span>
              </h2>
              <p className="landing-body mt-10 max-w-lg text-[clamp(1rem,1.2vw,1.125rem)] leading-relaxed">
                From your first field to the last answer, every step stays{" "}
                <Highlight className="landing-highlight">clear and fast</Highlight>.
              </p>

            </div>



            <div className="workflow-steps flex flex-col gap-2">

              {WORKFLOW.map((step, index) => (

                <div

                  key={step.id}

                  className="workflow-step group relative flex items-center gap-5 py-4"

                  data-index={index}

                >

                  <div className="workflow-step-num flex size-14 shrink-0 items-center justify-center rounded-full border border-white/25 bg-black/40 font-mono text-lg text-white">

                    {step.id}

                  </div>

                  <div>

                    <h3 className="text-xl font-medium text-white">{step.label}</h3>

                    <p className="landing-muted text-sm md:text-base">{step.description}</p>

                  </div>

                  {index < WORKFLOW.length - 1 && (

                    <div className="absolute top-14 left-7 h-[calc(100%)] w-px border-l border-dashed border-[#70b404]/20" />

                  )}

                </div>

              ))}

            </div>

          </div>

        </div>

      </section>

      )}



      {showRest && (

      <>

      {/* Sticky feature scroll */}

      <section className="sticky-scroll-section relative min-h-[280vh]">

        <div className="sticky-scroll-pin sticky top-0 flex h-dvh w-full items-center overflow-hidden px-[clamp(1.25rem,5vw,5rem)] md:px-[5%]">

          <div className="mx-auto grid w-full max-w-[1440px] grid-cols-1 items-center gap-12 md:grid-cols-2 md:gap-16">

            <div className="landing-copy relative h-[340px] md:h-[420px]">

              {STICKY_SLIDES.map((slide, index) => (

                <div

                  key={slide.tag}

                  className={`sticky-slide absolute inset-0 flex flex-col justify-center ${index === 0 ? "is-active" : ""}`}

                  data-index={index}

                >

                  <span className="landing-label mb-4 text-[11px] tracking-[0.28em]">{slide.tag}</span>

                  <h2 className="mb-6 font-display text-[clamp(2.2rem,4.2vw,3.4rem)] font-normal leading-tight text-white">

                    {slide.title}

                  </h2>

                  <p className="landing-body max-w-lg text-[clamp(1rem,1.15vw,1.125rem)] leading-relaxed">{slide.body}</p>

                </div>

              ))}

            </div>



            <div className="landing-diagram relative h-[min(360px,48vh)] w-full min-h-[300px] md:h-[min(400px,52vh)]">

              {STICKY_SLIDES.map((slide, index) => (

                <div

                  key={slide.preview}

                  className={`sticky-preview absolute inset-0 h-full w-full ${index === 0 ? "is-active" : ""}`}

                  data-index={index}

                >

                  <PreviewPanel type={slide.preview} />

                </div>

              ))}

            </div>

          </div>

        </div>

      </section>



      {/* Typography stack */}

      <section className="landing-section px-[clamp(1.25rem,5vw,5rem)] py-32 md:px-[5%] md:py-48">

        <div className="landing-copy landing-reveal mx-auto max-w-5xl space-y-20 text-center md:space-y-28">

          <h2 className="font-display text-[clamp(2.4rem,6vw,4.75rem)] font-normal leading-[1.08] tracking-[-0.04em] text-white">

            Built for <span className="landing-accent-text">forms</span> that transform on demand.
          </h2>
          <h2 className="font-display text-[clamp(2.1rem,5vw,3.75rem)] font-normal leading-[1.05] tracking-[-0.04em] text-white/85">
            Because nobody likes
            <br />
            <span className="text-white line-through decoration-[#70b404]/25">boring paper trails.</span>
          </h2>
          <h2 className="font-display text-[clamp(2rem,4.5vw,3.5rem)] font-normal leading-[1.05] tracking-[-0.04em] text-white underline decoration-[#70b404]/30 underline-offset-[0.3em]">
            Modern forms for modern heroes.

          </h2>

        </div>

      </section>



      {/* Pricing */}

      <section id="pricing" className="landing-section border-t border-[#70b404]/15 px-[clamp(1.25rem,5vw,5rem)] py-28 md:px-[5%]">

        <div className="landing-copy landing-reveal mx-auto max-w-[1440px]">

          <div className="mb-12 flex flex-col justify-between gap-6 md:flex-row md:items-end">

            <div>

              <p className="landing-label mb-4 text-[11px] tracking-[0.36em]">Fake pricing · demo mode</p>
              <h2 className="font-display text-[clamp(2.35rem,5vw,4rem)] font-normal leading-tight tracking-[-0.04em] text-white">
                Choose your <span className="landing-accent-text">Omnitrix</span> loadout.
              </h2>

            </div>

          </div>

          <div className="grid gap-4 lg:grid-cols-3">

            {BEN10_PRICING.map((plan) => (

              <div
                key={plan.tier}
                className={`group relative overflow-hidden rounded-[34px] border p-6 backdrop-blur-md transition-colors ${
                  plan.featured
                    ? "border-[#70b404]/55 bg-[#70b404]/12"
                    : "border-white/10 bg-white/3 hover:border-[#70b404]/35 hover:bg-[#70b404]/6"
                }`}
              >

                <div
                  className="pointer-events-none absolute -top-20 -right-16 size-44 rounded-full border border-[#70b404]/20 bg-[#70b404]/8 transition-transform duration-500 group-hover:scale-110"
                  aria-hidden="true"
                />

                <div className="relative">

                  <div className="mb-6 flex items-start justify-between gap-4">

                    <div>

                      <p className="font-mono mb-2 text-[10px] tracking-[0.28em] text-[#9eea1a]/80 uppercase">
                        {plan.signal}
                      </p>
                      <h3 className="font-display text-2xl font-bold tracking-tight text-white">{plan.tier}</h3>

                    </div>

                    {plan.featured && (
                      <span className="rounded-full border border-[#70b404]/40 bg-[#70b404]/15 px-3 py-1 font-mono text-[9px] font-black tracking-[0.22em] text-[#b8f038] uppercase">
                        Hero pick
                      </span>
                    )}

                  </div>

                  <div className="mb-6">

                    <span className="font-display text-5xl font-black tracking-[-0.06em] text-white">{plan.price}</span>
                    <span className="ml-3 font-mono text-[10px] tracking-[0.2em] text-white/35 uppercase">{plan.cadence}</span>

                  </div>

                  <p className="mb-6 min-h-12 text-sm leading-relaxed text-white/55">{plan.copy}</p>

                  <div className="space-y-3 border-t border-white/8 pt-6">

                    {plan.features.map((feature) => (
                      <div key={feature} className="flex items-center gap-3 text-sm text-white/70">
                        <span className="size-1.5 rounded-full bg-[#70b404]" />
                        {feature}
                      </div>
                    ))}

                  </div>

                  <Link
                    href="/sign-up"
                    className={`mt-8 inline-flex w-full items-center justify-center rounded-2xl px-5 py-3 font-mono text-[11px] font-black tracking-[0.22em] uppercase transition-colors ${
                      plan.featured
                        ? "bg-[#b8f038] text-black hover:bg-white"
                        : "border border-[#70b404]/35 text-[#b8f038] hover:bg-[#70b404]/10"
                    }`}
                  >
                    Activate plan
                  </Link>

                </div>

              </div>

            ))}

          </div>

        </div>

      </section>



      {/* CTA */}

      <section className="landing-section border-t border-[#70b404]/15 px-[clamp(1.25rem,5vw,5rem)] py-28 md:px-[5%]">

        <div className="landing-copy landing-reveal mx-auto flex max-w-2xl flex-col items-center gap-8 text-center">

          <p className="landing-label text-[11px] tracking-[0.36em]">It&apos;s hero time</p>
          <h2 className="font-display text-[clamp(2.2rem,4.5vw,3.25rem)] font-normal leading-tight tracking-[-0.03em] text-white">
            Activate your <Highlight className="landing-highlight">Omnitrix</Highlight>
          </h2>
          <p className="landing-body max-w-lg font-mono text-base leading-relaxed">
            Spin up your first form in under a minute. Free to start — built for anyone who moves fast.
          </p>

          <div className="mt-2 flex flex-wrap justify-center gap-4">

            <Link

              href="/sign-up"

              className="landing-btn-primary px-10 py-3.5 font-mono text-[12px] tracking-[0.28em] uppercase"

            >

              Create account

            </Link>

            <Link

              href="/sign-in"

              className="landing-btn-ghost px-10 py-3.5 font-mono text-[12px] tracking-[0.28em] uppercase"

            >

              Sign In

            </Link>

          </div>

          <div className="mt-8 w-full max-w-md overflow-hidden rounded-[24px] border border-lime-400/20 bg-lime-400/5 p-6 backdrop-blur-md transition-all hover:border-lime-400/30 hover:bg-lime-400/10">
            <h3 className="font-display text-lg font-bold text-white mb-2">Try the Live Demo</h3>
            <p className="text-xs text-white/60 mb-4 leading-relaxed">
              Experience the respondent flow right now. No account needed — just answer and submit.
            </p>
            <Link
              href="/f/s/product-feedback"
              className="inline-flex w-full items-center justify-center rounded-xl bg-lime-400 px-5 py-2.5 text-center font-mono text-[11px] font-black tracking-[0.2em] text-black uppercase transition-opacity hover:opacity-90"
            >
              Launch Demo Form
            </Link>
          </div>

        </div>

      </section>



      <footer className="landing-copy border-t border-[#70b404]/12 px-[clamp(1.25rem,5vw,5rem)] py-14 md:px-[5%]">

        <div className="mx-auto flex max-w-[1440px] flex-col items-center justify-between gap-6 md:flex-row">

          <p className="font-display text-sm tracking-[0.35em] text-white uppercase">Chai<span className="text-[#70b404]">Form</span></p>

          <p className="landing-label text-[10px] tracking-[0.32em]">© 2026 ChaiForm</p>

        </div>

      </footer>

      </>

      )}

    </div>

  );

}


