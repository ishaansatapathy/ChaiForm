import { LiveSmoke } from "~/components/home/live-smoke";

/** Live drifting smoke only — no particles, no extra overlays. */
export function HeroAtmosphere() {
  return (
    <div className="hero-atmosphere pointer-events-none absolute inset-0 z-1" aria-hidden>
      <LiveSmoke />
    </div>
  );
}
