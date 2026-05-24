import type { ReactNode } from "react";



type PanelType = "fields" | "logic" | "stream" | "charts" | "deploy";



function DiagramShell({

  title,

  right,

  children,

}: {

  title: string;

  right?: ReactNode;

  children: ReactNode;

}) {

  return (

    <div className="landing-diagram flex h-full min-h-0 w-full flex-col overflow-hidden rounded-xl border border-[#70b404]/18 bg-[#70b404]/[0.03]">

      <div className="flex shrink-0 items-center justify-between border-b border-[#70b404]/15 px-5 py-3">

        <span className="landing-label text-[10px] tracking-[0.28em]">{title}</span>

        {right}

      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-hidden p-4">{children}</div>

    </div>

  );

}



export function LandingUiPanel({ type }: { type: PanelType }) {

  if (type === "fields") {

    return (

      <DiagramShell title="Form matrix" right={<span className="landing-label text-[10px] opacity-80">draft</span>}>

        {["Short text", "Email", "Multiple choice"].map((field) => (

          <div key={field} className="shrink-0 rounded-md border border-white/12 bg-black/35 p-2.5">

            <p className="landing-label mb-1.5 text-[9px] tracking-[0.18em] opacity-90">{field}</p>

            <div className="h-7 rounded border border-[#70b404]/15 bg-black/40" />

          </div>

        ))}

        <div className="mt-auto shrink-0 rounded-md border border-dashed border-[#70b404]/25 p-2.5">

          <p className="landing-label mb-1.5 text-[9px] tracking-[0.18em] opacity-75">Long answer</p>

          <div className="h-10 rounded border border-[#70b404]/12 bg-black/30" />

        </div>

      </DiagramShell>

    );

  }



  if (type === "logic") {

    return (

      <DiagramShell title="Rule map">

        {["If rating ≤ 2", "Else if email set", "Show follow-up"].map((rule, i) => (

          <div key={rule} className="flex shrink-0 items-center gap-2.5">

            <span className="flex size-6 shrink-0 items-center justify-center rounded-full border border-[#70b404]/35 font-mono text-[9px] text-[#9ed926]">

              {i + 1}

            </span>

            <div className="min-w-0 flex-1 truncate rounded-md border border-white/12 px-3 py-2 font-mono text-[10px] text-white">

              {rule}

            </div>

          </div>

        ))}

        <div className="landing-label mt-auto shrink-0 rounded-md border border-dashed border-[#70b404]/30 py-2 text-center text-[9px] tracking-[0.2em] opacity-80">

          + Add branch

        </div>

      </DiagramShell>

    );

  }



  if (type === "stream") {

    return (

      <DiagramShell

        title="Answer feed"

        right={<span className="font-mono text-[10px] text-[#70b404]">● live</span>}

      >

        {["#142 · just now", "#141 · 2s ago", "#140 · 8s ago", "#139 · 14s ago"].map((row, i) => (

          <div

            key={row}

            className="flex shrink-0 items-center gap-3 rounded-md border border-white/10 bg-black/35 px-3 py-2"

          >

            <span className={`size-1.5 shrink-0 rounded-full ${i === 0 ? "bg-[#70b404]" : "bg-white/35"}`} />

            <span className="truncate font-mono text-[10px] text-white">{row}</span>

          </div>

        ))}

      </DiagramShell>

    );

  }



  if (type === "charts") {

    return (

      <DiagramShell title="Signal readout">

        <div className="flex min-h-0 flex-1 items-end gap-1.5 pb-1">

          {[38, 62, 44, 78, 52, 68, 41].map((h, i) => (

            <div

              key={i}

              className="flex-1 rounded-t bg-[#70b404]"

              style={{ height: `${h}%`, opacity: i === 3 ? 1 : 0.45 }}

            />

          ))}

        </div>

        <div className="grid shrink-0 grid-cols-2 gap-2">

          <div className="h-8 rounded-md border border-[#70b404]/15 bg-black/35" />

          <div className="h-8 rounded-md border border-[#70b404]/15 bg-black/35" />

        </div>

      </DiagramShell>

    );

  }



  return (

    <DiagramShell title="Go live">

      <div className="shrink-0 rounded-md border border-[#70b404]/20 bg-black/40 px-3 py-2 font-mono text-[10px] text-[#9ed926]">

        chaiform.app/f/omni-7x

      </div>

      <div className="mt-auto grid shrink-0 grid-cols-2 gap-2">

        {["Embed", "QR", "Share", "Export"].map((action) => (

          <div

            key={action}

            className="landing-label rounded-md border border-[#70b404]/22 py-2 text-center text-[9px] tracking-[0.16em] opacity-90"

          >

            {action}

          </div>

        ))}

      </div>

    </DiagramShell>

  );

}



/** Sticky section previews — same diagrams, no duplicate markup. */

export function LandingStickyDiagram({ type }: { type: "builder" | "stream" | "analytics" }) {

  const map = { builder: "fields", stream: "stream", analytics: "charts" } as const;

  return <LandingUiPanel type={map[type]} />;

}


