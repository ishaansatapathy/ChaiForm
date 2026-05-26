"use client";

import { useState } from "react";
import Link from "next/link";
import { BarChart3, Eye, FileText, Globe, Link2, Lock, Pencil, Share2 } from "lucide-react";

import type { RouterOutputs } from "@repo/trpc/client";

import { DeleteFormButton } from "~/components/app/delete-form-button";
import { ShareFormModal } from "~/components/app/share-form-modal";
import { formatExpiresAt, isFormExpired } from "~/lib/form-retention";
import { getFormSharePath, getFormShareUrl } from "~/lib/form-share-url";

type FormListItem = RouterOutputs["forms"]["list"]["items"][number];

const VISIBILITY = {
  public: { label: "Public", icon: Globe, className: "text-lime-400 bg-lime-400/10 border-lime-400/20" },
  unlisted: { label: "Unlisted", icon: Link2, className: "text-cyan-400 bg-cyan-400/10 border-cyan-400/20" },
  draft: { label: "Draft", icon: Lock, className: "text-white/50 bg-white/5 border-white/10" },
} as const;

export function FormCard({ form }: { form: FormListItem }) {
  const vis = VISIBILITY[form.visibility];
  const sharePath = getFormSharePath(form);
  const shareUrl = getFormShareUrl(form);
  const [shareOpen, setShareOpen] = useState(false);
  const expiryLabel = formatExpiresAt(form.expiresAt);
  const expired = isFormExpired(form.expiresAt);

  return (
    <article className="app-surface group rounded-xl p-5 transition-all duration-300 hover:border-lime-400/20">
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <span
          className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[9px] font-bold tracking-[0.2em] uppercase ${vis.className}`}
        >
          <vis.icon size={10} />
          {vis.label}
        </span>
        {form.visibility !== "draft" && !expired && (
          <span className="rounded-full border border-lime-400/25 bg-lime-400/5 px-2.5 py-0.5 text-[9px] font-bold tracking-[0.2em] text-lime-400 uppercase">
            Live
          </span>
        )}
        {expiryLabel ? (
          <span className="rounded-full border border-amber-400/20 bg-amber-400/5 px-2.5 py-0.5 text-[9px] font-bold tracking-[0.2em] text-amber-300 uppercase">
            {expired ? "Expired" : `Until ${expiryLabel}`}
          </span>
        ) : null}
        {!form.allowMultipleSubmissions ? (
          <span className="rounded-full border border-cyan-400/20 bg-cyan-400/5 px-2.5 py-0.5 text-[9px] font-bold tracking-[0.2em] text-cyan-300 uppercase">
            1 response only
          </span>
        ) : null}
        {form.requireAuthentication ? (
          <span className="rounded-full border border-violet-400/20 bg-violet-400/5 px-2.5 py-0.5 text-[9px] font-bold tracking-[0.2em] text-violet-300 uppercase">
            Sign-in required
          </span>
        ) : null}
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

      <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-white/5 pt-4">
        <div className="flex flex-wrap items-center gap-3">
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
            onClick={() => setShareOpen(true)}
            className="inline-flex items-center gap-1.5 text-[11px] font-bold tracking-wide text-lime-400/90 uppercase transition-colors hover:text-lime-300"
          >
            <Share2 size={13} />
            Share
          </button>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href={sharePath}
            target="_blank"
            className="text-[11px] font-medium text-white/45 transition-colors hover:text-white"
          >
            Open form
          </Link>
          <span className="text-white/15">·</span>
          <DeleteFormButton
            formId={form.id}
            formTitle={form.title}
            stayOnPage
            label="Delete"
            className="inline-flex items-center gap-1.5 text-[11px] font-bold tracking-wide text-red-300 uppercase transition-colors hover:text-red-200 disabled:opacity-50"
          />
        </div>
      </div>

      <ShareFormModal
        open={shareOpen}
        onClose={() => setShareOpen(false)}
        shareUrl={shareUrl}
        formTitle={form.title}
      />
    </article>
  );
}
