"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { FormBuilderFields, type DraftField } from "~/components/forms/form-builder-fields";
import { FormBuilderPreview } from "~/components/forms/form-builder-preview";
import { FormThemePicker } from "~/components/forms/form-theme-picker";
import { Highlight } from "~/components/app/highlight";
import type { FormThemeId } from "~/lib/form-themes";
import { getSaveErrorMessage, saveFormWithColdStart } from "~/lib/save-form";
import { useWarmApi } from "~/lib/warm-api";
import type { FormDetail } from "~/lib/fetch-session";
import { trpc } from "~/trpc/client";
import type { RouterInputs } from "@repo/trpc/client";

type UpdateFormFields = NonNullable<RouterInputs["forms"]["update"]["fields"]>;

type EditFormContentProps = {
  formId: string;
  initialForm: FormDetail | null;
};

export default function EditFormContent({ formId, initialForm }: EditFormContentProps) {
  const router = useRouter();
  const utils = trpc.useUtils();
  const [saving, setSaving] = useState(false);
  const { data: user } = trpc.auth.me.useQuery({});

  useWarmApi();

  const {
    data: form,
    isLoading,
    isError,
    refetch,
  } = trpc.forms.getById.useQuery(
    { formId },
    {
      initialData: initialForm ?? undefined,
      enabled: Boolean(user),
      retry: 2,
      staleTime: 30_000,
    },
  );

  const deleteForm = trpc.forms.delete.useMutation({
    onSuccess: async () => {
      await utils.forms.list.invalidate();
      await utils.analytics.summary.invalidate();
      toast.success("Form deleted");
      router.push("/dashboard");
    },
    onError: (err) => toast.error(err.message),
  });

  const [title, setTitle] = useState(initialForm?.title ?? "");
  const [description, setDescription] = useState(initialForm?.description ?? "");
  const [slug, setSlug] = useState(initialForm?.slug ?? "");
  const [visibility, setVisibility] = useState<"public" | "unlisted" | "draft">(
    initialForm?.visibility ?? "public",
  );
  const [theme, setTheme] = useState<FormThemeId>((initialForm?.theme as FormThemeId) ?? "default");
  const [fields, setFields] = useState<DraftField[]>((initialForm?.fields as DraftField[]) ?? []);
  const [hydratedFormId, setHydratedFormId] = useState<string | null>(initialForm?.id ?? null);

  useEffect(() => {
    if (!form || form.id === hydratedFormId) return;
    setTitle(form.title);
    setDescription(form.description ?? "");
    setSlug(form.slug ?? "");
    setVisibility(form.visibility);
    setTheme(form.theme as FormThemeId);
    setFields(form.fields as DraftField[]);
    setHydratedFormId(form.id);
  }, [form, hydratedFormId]);

  const resolvedForm = form ?? initialForm;
  const loading = isLoading && !resolvedForm;

  if (loading) {
    return <p className="text-white/40">Loading form…</p>;
  }

  if (!resolvedForm) {
    return (
      <div className="app-surface mx-auto max-w-xl rounded-3xl border border-white/10 p-10 text-center">
        <p className="font-display text-xl font-bold text-white">Could not load form</p>
        <p className="mt-3 text-sm text-white/50">
          {isError
            ? "The server may be waking up. Wait a few seconds and try again."
            : "This form may not exist or you do not have access."}
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          {isError && (
            <button
              type="button"
              onClick={() => refetch()}
              className="btn-omni font-display inline-flex rounded-2xl px-6 py-3 text-sm font-black tracking-wide uppercase"
            >
              Retry
            </button>
          )}
          <Link
            href="/dashboard"
            className="inline-flex rounded-2xl border border-white/15 px-6 py-3 text-sm font-bold text-white/70 hover:text-white"
          >
            Back to dashboard
          </Link>
        </div>
      </div>
    );
  }

  const handleSave = async () => {
    if (!title.trim()) {
      toast.error("Add a form title first");
      return;
    }

    setSaving(true);

    const payload = {
      formId,
      title: title.trim(),
      description: description.trim() || undefined,
      slug: slug.trim() !== (resolvedForm.slug ?? "") ? slug.trim() : undefined,
      visibility,
      theme,
      fields: fields as UpdateFormFields,
    };

    try {
      await saveFormWithColdStart("update", payload, {
        onProgress: (message) => toast.message(message),
      });
      await utils.forms.list.invalidate();
      await utils.forms.getById.invalidate({ formId });
      await utils.analytics.summary.invalidate();
      toast.success("Form updated");
      router.push("/dashboard");
    } catch (error) {
      toast.error(getSaveErrorMessage(error));
    } finally {
      setSaving(false);
    }
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
            <Highlight>Edit</Highlight> Form
          </h1>
          {resolvedForm.slug && (
            <p className="mt-3 font-mono text-xs text-white/40">Slug: /f/s/{resolvedForm.slug}</p>
          )}
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
              className="mt-6 w-full resize-none rounded-2xl border border-white/5 bg-white/2 p-4 text-sm text-white/70 outline-none placeholder:text-white/25"
            />
          </div>

          <FormBuilderFields fields={fields} onChange={setFields} />
        </div>

        <aside className="space-y-4 lg:sticky lg:top-10 lg:self-start">
          <div className="app-surface rounded-[40px] p-6">
            <h3 className="font-display mb-4 text-lg font-bold text-white">Publish</h3>
            <FormThemePicker value={theme} onChange={setTheme} />
            <label className="mb-2 mt-6 block text-[10px] font-bold tracking-[0.25em] text-white/40 uppercase">
              Visibility
            </label>
            <select
              value={visibility}
              onChange={(e) => setVisibility(e.target.value as "public" | "unlisted" | "draft")}
              className="form-select mb-6 w-full rounded-xl border border-white/10 bg-[#0a0a0a] px-3 py-2.5 text-sm text-white outline-none"
            >
              <option value="public">Public — listed on Explore</option>
              <option value="unlisted">Unlisted — link only</option>
              <option value="draft">Private — hidden from respondents</option>
            </select>
            <label className="mb-6 block space-y-2">
              <span className="font-mono text-[9px] tracking-[0.28em] text-white/35 uppercase">Share slug</span>
              <input
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                placeholder="product-feedback"
                className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2.5 font-mono text-sm text-white outline-none placeholder:text-white/25"
              />
              {slug && <span className="block font-mono text-[10px] text-white/35">/f/s/{slug}</span>}
            </label>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="btn-omni font-display w-full rounded-2xl py-3.5 text-sm font-black tracking-[0.18em] uppercase disabled:opacity-50"
            >
              {saving ? "Saving…" : "Save Changes"}
            </button>
          </div>

          <FormBuilderPreview title={title} description={description} themeId={theme} fields={fields} />

          <button
            type="button"
            onClick={() => {
              if (window.confirm("Delete this form and all submissions?")) {
                deleteForm.mutate({ formId });
              }
            }}
            disabled={deleteForm.isPending}
            className="w-full rounded-2xl border border-red-400/30 py-3 text-sm font-bold text-red-300 hover:bg-red-400/10 disabled:opacity-50"
          >
            Delete form
          </button>
        </aside>
      </div>
    </section>
  );
}
