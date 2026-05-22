import { Suspense } from "react";

import AnalyticsContent from "./analytics-content";

export default function AnalyticsPage() {
  return (
    <Suspense
      fallback={
        <div className="py-20 text-center font-mono text-[10px] tracking-[0.3em] text-white/40 uppercase">
          loading analytics…
        </div>
      }
    >
      <AnalyticsContent />
    </Suspense>
  );
}
