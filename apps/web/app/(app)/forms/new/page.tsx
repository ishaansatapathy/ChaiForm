"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { FormBuilderFields, type DraftField } from "~/components/forms/form-builder-fields";
import { Highlight } from "~/components/app/highlight";
import { trpc } from "~/trpc/client";
import type { RouterInputs } from "@repo/trpc/client";

type CreateFormFields = RouterInputs["forms"]["create"]["fields"];

export default function CreateFormPage() {
  const router = useRouter();
  const createForm = trpc.forms.create.useMutation({
    onSuccess: () => {
      toast.success("Form saved");
      router.push("/dashboard");
    },
    onError: (err) => toast.error(err.message),
  });

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [visibility, setVisibility] = useState<"public" | "unlisted" | "draft">("public");
  const [fields, setFields] = useState<DraftField[]>([
    { id: crypto.randomUUID(), label: "Full name", type: "text", required: true },
    { id: crypto.randomUUID(), label: "Email address", type: "email", required: true },
  ]);

  const handlePublish = () => {
    if (!title.trim()) {
      toast.error("Add a form title first");
      return;
    }
    createForm.mutate({
      title: title.trim(),
      description: description.trim() || undefined,
      visibility,
      fields: fields as CreateFormFields,
    });
  };

  return (
    <section className="py-4">
      <div className="mb-10 flex flex-wrap items-end justify-between gap-4 pb-8">
        <div>
          <div className="mb-2 flex items-center gap-3">
            <span className="h-px w-8 bg-lime-400" />
            <p className="text-[10px] font-bold tracking-[0.3em] text-white/30 uppercase">Builder</p>
          </div>
          <h1 className="font-display text-5xl tracking-tight text-white md:text-6xl">
            <Highlight>Create</Highlight> Form
          </h1>
          <p className="mt-3 text-sm text-white/45">Build fields, publish, and share a public or unlisted link.</p>
        </div>
        <Link href="/dashboard" className="text-sm text-white/40 hover:text-white">
          ← Back to dashboard
        </Link>
      </div>

      <div className="grid gap-8 lg:grid-cols-[1fr_320px]">
        <div className="space-y-6">
          <div className="app-surface rounded-[40px] p-8">
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Form title"
              className="font-display w-full border-0 border-b border-white/10 bg-transparent pb-3 text-3xl text-white outline-none placeholder:text-white/20"
            />
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Description (optional)"
              rows={3}
              className="mt-6 w-full resize-none rounded-2xl border border-white/5 bg-white/[0.02] p-4 text-sm text-white/70 outline-none placeholder:text-white/25"
            />
          </div>

          <FormBuilderFields fields={fields} onChange={setFields} />
        </div>

        <aside className="lg:sticky lg:top-10 lg:self-start">
          <div className="app-surface rounded-[40px] p-6">
            <h3 className="font-display mb-4 text-lg font-bold text-white">Publish</h3>
            <label className="mb-2 block text-[10px] font-bold tracking-[0.25em] text-white/40 uppercase">
              Visibility
            </label>
            <select
              value={visibility}
              onChange={(e) => setVisibility(e.target.value as "public" | "unlisted" | "draft")}
              className="mb-6 w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2.5 text-sm text-white outline-none"
            >
              <option value="public">Public — anyone with link</option>
              <option value="unlisted">Unlisted — link only</option>
              <option value="draft">Draft — hidden from respondents</option>
            </select>
            <button
              type="button"
              onClick={handlePublish}
              disabled={createForm.isPending}
              className="btn-omni font-display w-full rounded-2xl py-3.5 text-sm font-black tracking-[0.18em] uppercase disabled:opacity-50"
            >
              {createForm.isPending ? "Saving…" : "Save Form"}
            </button>
          </div>
        </aside>
      </div>
    </section>
  );
}
