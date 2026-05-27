"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { RotateCcw } from "lucide-react";
import { toast } from "sonner";

import { FormBuilderFields, type DraftField } from "~/components/forms/form-builder-fields";
import { FormBuilderPreview } from "~/components/forms/form-builder-preview";
import { FormThemePicker } from "~/components/forms/form-theme-picker";
import { FormRetentionPicker } from "~/components/app/form-retention-picker";
import { AllowAnonymousResponsesToggle } from "~/components/app/allow-anonymous-responses-toggle";
import { AllowMultipleResponsesToggle } from "~/components/app/allow-multiple-responses-toggle";
import { ChaiConfirmDialog } from "~/components/app/chai-confirm-dialog";
import { Highlight } from "~/components/app/highlight";
import type { FormRetentionOption } from "~/lib/form-retention";
import { FORM_TEMPLATES } from "~/lib/form-templates";
import type { FormThemeId } from "~/lib/form-themes";
import { getSaveErrorMessage, saveFormWithColdStart } from "~/lib/save-form";
import { parseCreateFormInput } from "~/lib/validate-form-payload";
import { useWarmApi } from "~/lib/warm-api";
import { trpc } from "~/trpc/client";
import type { RouterInputs } from "@repo/trpc/client";

type CreateFormFields = RouterInputs["forms"]["create"]["fields"];

const createInitialDraftFields = (): DraftField[] => [
  { id: crypto.randomUUID(), label: "Full name", type: "text", required: true },
  { id: crypto.randomUUID(), label: "Email address", type: "email", required: true },
];

const CREATE_FORM_DRAFT_KEY = "chaiform:create-form-draft";

export default function CreateFormPage() {
  const router = useRouter();
  const utils = trpc.useUtils();
  const createMutation = trpc.forms.create.useMutation();
  const [saving, setSaving] = useState(false);
  const [serverReady, setServerReady] = useState(false);

  useWarmApi();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [visibility, setVisibility] = useState<"public" | "unlisted" | "draft">("public");
  const [theme, setTheme] = useState<FormThemeId>("default");
  const [retention, setRetention] = useState<FormRetentionOption>("forever");
  const [allowMultipleSubmissions, setAllowMultipleSubmissions] = useState(true);
  const [allowAnonymousResponses, setAllowAnonymousResponses] = useState(true);
  const [fields, setFields] = useState<DraftField[]>(createInitialDraftFields);
  const [activeTemplateId, setActiveTemplateId] = useState<string | null>(null);
  const [draftRecovered, setDraftRecovered] = useState(false);
  const [resetConfirmOpen, setResetConfirmOpen] = useState(false);

  const resetForm = () => {
    window.localStorage.removeItem(CREATE_FORM_DRAFT_KEY);
    setTitle("");
    setDescription("");
    setVisibility("public");
    setTheme("default");
    setRetention("forever");
    setAllowMultipleSubmissions(true);
    setAllowAnonymousResponses(true);
    setFields(createInitialDraftFields());
    setActiveTemplateId(null);
    setDraftRecovered(false);
    toast.success("Form reset — start fresh");
  };

  useEffect(() => {
    const raw = window.localStorage.getItem(CREATE_FORM_DRAFT_KEY);
    if (!raw) return;

    try {
      const draft = JSON.parse(raw) as {
        title?: string;
        description?: string;
        visibility?: "public" | "unlisted" | "draft";
        theme?: FormThemeId;
        retention?: FormRetentionOption;
        allowMultipleSubmissions?: boolean;
        allowAnonymousResponses?: boolean;
        fields?: DraftField[];
      };
      if (draft.title) setTitle(draft.title);
      if (draft.description) setDescription(draft.description);
      if (draft.visibility) setVisibility(draft.visibility);
      if (draft.theme) setTheme(draft.theme);
      if (draft.retention) setRetention(draft.retention);
      if (typeof draft.allowMultipleSubmissions === "boolean") {
        setAllowMultipleSubmissions(draft.allowMultipleSubmissions);
      }
      if (typeof draft.allowAnonymousResponses === "boolean") {
        setAllowAnonymousResponses(draft.allowAnonymousResponses);
      }
      if (draft.fields?.length) setFields(draft.fields);
      setDraftRecovered(true);
      toast.info("Recovered your unsaved draft");
    } catch {
      window.localStorage.removeItem(CREATE_FORM_DRAFT_KEY);
    }
  }, []);

  useEffect(() => {
    const handle = window.setTimeout(() => {
      window.localStorage.setItem(
        CREATE_FORM_DRAFT_KEY,
        JSON.stringify({
          title,
          description,
          visibility,
          theme,
          retention,
          allowMultipleSubmissions,
          allowAnonymousResponses,
          fields,
        }),
      );
    }, 500);

    return () => window.clearTimeout(handle);
  }, [title, description, visibility, theme, retention, allowMultipleSubmissions, allowAnonymousResponses, fields]);

  const applyTemplate = (templateId: string) => {
    const template = FORM_TEMPLATES.find((item) => item.id === templateId);
    if (!template) return;

    setTitle(template.title);
    setDescription(template.formDescription);
    setTheme(template.theme);
    setFields(
      template.fields.map((field) => ({
        ...field,
        id: crypto.randomUUID(),
      })),
    );
    setActiveTemplateId(templateId);
    toast.success(`${template.label} template loaded — edit and save when ready`);
  };

  const handlePublish = async () => {
    if (!title.trim()) {
      toast.error("Add a form title first");
      return;
    }

    setSaving(true);

    const payload = {
      title: title.trim(),
      description: description.trim() || undefined,
      visibility,
      theme,
      retention,
      allowMultipleSubmissions,
      requireAuthentication: !allowAnonymousResponses,
      fields: fields as CreateFormFields,
    };

    const parsed = parseCreateFormInput(payload);
    if (!parsed.success) {
      toast.error(parsed.message);
      setSaving(false);
      return;
    }

    try {
      const created = await saveFormWithColdStart("create", parsed.data, {
        mutate: () => createMutation.mutateAsync(parsed.data),
        onProgress: (message) => toast.message(message),
      });
      setServerReady(true);
      await utils.forms.list.invalidate();
      await utils.analytics.summary.invalidate();
      toast.success("Form published");
      window.localStorage.removeItem(CREATE_FORM_DRAFT_KEY);
      router.push(`/forms/${created.id}/edit?share=1`);
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
            <Highlight>Create</Highlight> Form
          </h1>
          <p className="mt-3 text-sm text-white/45">Build fields, publish, and share a public or unlisted link.</p>
        </div>
        <Link href="/dashboard" className="text-sm text-white/40 hover:text-white">
          ← Back to dashboard
        </Link>
      </div>

      {draftRecovered && (
        <div className="app-surface mb-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-lime-400/20 bg-lime-400/5 px-4 py-3">
          <p className="text-sm text-lime-100/85">
            You&apos;re editing a recovered draft. Want a clean slate instead?
          </p>
          <button
            type="button"
            onClick={() => setResetConfirmOpen(true)}
            className="rounded-full border border-lime-400/35 px-4 py-1.5 text-[10px] font-bold tracking-[0.18em] text-lime-300 uppercase hover:bg-lime-400/10"
          >
            Start new form
          </button>
        </div>
      )}

      <ChaiConfirmDialog
        open={resetConfirmOpen}
        onOpenChange={setResetConfirmOpen}
        title="Start a blank form?"
        description="Discard this draft and start fresh. Unsaved changes will be lost."
        confirmLabel="Reset form"
        badge="Omnitrix reset"
        icon={<RotateCcw size={22} />}
        onConfirm={resetForm}
      />

      <div className="grid gap-8 lg:grid-cols-2">
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
            <div className="mb-6">
              <FormRetentionPicker value={retention} onChange={setRetention} />
            </div>
            <div className="mb-6">
              <AllowMultipleResponsesToggle
                value={allowMultipleSubmissions}
                onChange={setAllowMultipleSubmissions}
              />
            </div>
            <div className="mb-6">
              <AllowAnonymousResponsesToggle
                value={allowAnonymousResponses}
                onChange={setAllowAnonymousResponses}
              />
            </div>
            <button
              type="button"
              onClick={handlePublish}
              disabled={saving}
              className="btn-omni font-display w-full rounded-2xl py-3.5 text-sm font-black tracking-[0.18em] uppercase disabled:opacity-50"
            >
              {saving ? "Saving…" : "Save Form"}
            </button>
            {!serverReady && !saving && (
              <p className="mt-2 text-center text-[11px] text-white/35">
                First save may take up to 60s while the server wakes up.
              </p>
            )}

            <div className="mt-6 border-t border-white/8 pt-6">
              <p className="font-mono mb-1 text-[9px] tracking-[0.28em] text-white/35 uppercase">Need inspiration?</p>
              <p className="mb-3 text-xs text-white/40">Use a starter template — fields load into the builder.</p>
              <div className="space-y-2">
                {FORM_TEMPLATES.map((template) => {
                  const active = activeTemplateId === template.id;
                  return (
                    <button
                      key={template.id}
                      type="button"
                      onClick={() => applyTemplate(template.id)}
                      className={`w-full rounded-2xl border px-4 py-3 text-left transition-colors ${
                        active
                          ? "border-lime-400/40 bg-lime-400/10"
                          : "border-white/8 bg-white/2 hover:border-white/15 hover:bg-white/4"
                      }`}
                    >
                      <p className="text-sm font-semibold text-white">{template.label}</p>
                      <p className="mt-0.5 text-[11px] leading-snug text-white/45">{template.description}</p>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        <aside className="lg:sticky lg:top-10 lg:self-start">
          <FormBuilderPreview title={title} description={description} themeId={theme} fields={fields} />
        </aside>
      </div>
    </section>
  );
}
