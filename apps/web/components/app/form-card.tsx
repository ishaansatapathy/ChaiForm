"use client";

import Link from "next/link";
import { BarChart3, Copy, Eye, FileText, Globe, Link2, Lock, Pencil } from "lucide-react";
import { toast } from "sonner";

import type { RouterOutputs } from "@repo/trpc/client";

type FormListItem = RouterOutputs["forms"]["list"]["items"][number];

const VISIBILITY = {
  public: { label: "Public", icon: Globe, className: "text-lime-400 bg-lime-400/10 border-lime-400/20" },
  unlisted: { label: "Unlisted", icon: Link2, className: "text-cyan-400 bg-cyan-400/10 border-cyan-400/20" },
  draft: { label: "Draft", icon: Lock, className: "text-white/50 bg-white/5 border-white/10" },
} as const;

export function FormCard({ form }: { form: FormListItem }) {
  const vis = VISIBILITY[form.visibility];
  const sharePath = form.slug ? `/f/s/${form.slug}` : `/f/${form.id}`;
  const shareUrl = typeof window !== "undefined" ? `${window.location.origin}${sharePath}` : sharePath;

  const copyLink = async () => {
    await navigator.clipboard.writeText(shareUrl);
    toast.success("Form link copied");
  };

  return (
    <article className="app-surface group rounded-xl p-5 transition-all duration-300 hover:border-lime-400/20">
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <span
          className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[9px] font-bold tracking-[0.2em] uppercase ${vis.className}`}
        >
          <vis.icon size={10} />
          {vis.label}
        </span>
        {form.visibility !== "draft" && (
          <span className="rounded-full border border-lime-400/25 bg-lime-400/5 px-2.5 py-0.5 text-[9px] font-bold tracking-[0.2em] text-lime-400 uppercase">
            Live
          </span>
        )}
      </div>

      <h3 className="font-display text-xl font-bold tracking-tight text-white">{form.title}</h3>
      {form.description && (
        <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-white/45">{form.description}</p>
      )}

      <div className="mt-5 flex flex-wrap items-center gap-4 text-[11px] text-white/40">
        <span className="inline-flex items-center gap-1.5">
          <FileText size={13} className="text-lime-400/70" />
          {form.submissionCount} responses
        </span>
        <span className="inline-flex items-center gap-1.5">
          <Eye size={13} className="text-lime-400/70" />
          {form.fields.length} fields
        </span>
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-3 border-t border-white/5 pt-4">
        <Link
          href={`/forms/${form.id}/edit`}
          className="inline-flex items-center gap-1.5 text-[11px] font-bold tracking-wide text-white/70 uppercase transition-colors hover:text-white"
        >
          <Pencil size={14} />
          Edit
        </Link>
        <span className="text-white/15">·</span>
        <Link
          href={`/analytics?form=${form.id}`}
          className="inline-flex items-center gap-1.5 text-[11px] font-bold tracking-wide text-lime-400/90 uppercase transition-colors hover:text-lime-300"
        >
          <BarChart3 size={14} />
          Analytics
        </Link>
        <span className="text-white/15">·</span>
        <button
          type="button"
          onClick={copyLink}
          className="inline-flex items-center gap-1.5 text-[11px] font-medium text-white/45 transition-colors hover:text-white"
        >
          <Copy size={13} />
          Copy link
        </button>
        <span className="text-white/15">·</span>
        <Link
          href={sharePath}
          target="_blank"
          className="text-[11px] font-medium text-white/45 transition-colors hover:text-white"
        >
          Open form
        </Link>
      </div>
    </article>
  );
}
