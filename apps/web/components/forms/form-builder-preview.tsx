"use client";

import { useEffect, useState } from "react";

import type { FormThemeId } from "~/lib/form-themes";
import { getFormTheme } from "~/lib/form-themes";
import { FormFieldInput } from "~/components/forms/form-field-input";
import type { DraftField } from "~/components/forms/form-builder-fields";

type FormBuilderPreviewProps = {
  title: string;
  description: string;
  themeId: FormThemeId;
  fields: DraftField[];
};

export function FormBuilderPreview({ title, description, themeId, fields }: FormBuilderPreviewProps) {
  const theme = getFormTheme(themeId);
  const [step, setStep] = useState(0);

  useEffect(() => {
    setStep(0);
  }, [fields.length]);

  const previewField = fields[step];
  const progress = fields.length > 0 ? ((step + 1) / fields.length) * 100 : 0;
  const isLastStep = fields.length > 0 && step >= fields.length - 1;

  return (
    <div className={`overflow-hidden rounded-[32px] border border-white/10 ${theme.pageBg}`}>
      <div className="border-b border-white/10 px-5 py-3">
        <p className="font-mono text-[9px] tracking-[0.28em] text-white/40 uppercase">Live preview</p>
        <p className="mt-1 text-xs text-white/50">
          One-question flow · {fields.length || 0} question{fields.length === 1 ? "" : "s"}
        </p>
      </div>
      <div className={`relative px-5 py-8 ${theme.glow}`}>
        <p className={`font-mono mb-2 text-[9px] tracking-[0.3em] uppercase opacity-70 ${theme.accentSoft}`}>
          ChaiForm · {theme.label}
        </p>
        <h2 className="font-display text-2xl font-black tracking-tight text-white">
          {title.trim() || "Untitled form"}
        </h2>
        {description.trim() && <p className="mt-2 text-sm text-white/50">{description}</p>}

        {previewField ? (
          <div className="mt-8 space-y-3">
            <div className="h-1 overflow-hidden rounded-full bg-white/10">
              <div
                className="h-full rounded-full bg-lime-400 transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="font-mono text-[9px] tracking-[0.22em] text-white/35 uppercase">
              Question {step + 1} of {fields.length}
            </p>
            <p className="text-sm font-medium text-white/80">
              {previewField.label}
              {previewField.required && <span className={theme.accentText}> *</span>}
            </p>
            <FormFieldInput
              field={previewField as Parameters<typeof FormFieldInput>[0]["field"]}
              theme={theme}
              value=""
              onChange={() => undefined}
            />
            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setStep((current) => Math.max(0, current - 1))}
                disabled={step === 0}
                className="rounded-xl border border-white/15 px-4 py-2 text-[10px] font-bold tracking-[0.15em] text-white/60 uppercase disabled:opacity-30"
              >
                Back
              </button>
              <button
                type="button"
                onClick={() => setStep((current) => Math.min(fields.length - 1, current + 1))}
                disabled={isLastStep}
                className="btn-omni font-display inline-flex rounded-xl px-5 py-2.5 text-xs font-black tracking-[0.15em] uppercase disabled:opacity-50"
              >
                {isLastStep ? "Submit" : "Continue"}
              </button>
            </div>
          </div>
        ) : (
          <p className="mt-6 text-sm text-white/40">Add at least one field to preview.</p>
        )}
      </div>
    </div>
  );
}
