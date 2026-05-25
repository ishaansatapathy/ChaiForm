"use client";

import type { RouterOutputs } from "@repo/trpc/client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { FormFieldInput } from "~/components/forms/form-field-input";
import { isMultiCheckboxConfig } from "~/lib/checkbox-value";
import { getFormTheme } from "~/lib/form-themes";
import { trpc } from "~/trpc/client";

type PublicForm = RouterOutputs["forms"]["getPublic"];

type PublicFormViewProps = {
  form: PublicForm;
  thankYouPath: string;
};

function isFieldEmpty(field: PublicForm["fields"][number], value: string) {
  const trimmed = value.trim();
  if (field.type === "checkbox") {
    if (isMultiCheckboxConfig(field.config)) {
      if (!trimmed || trimmed === "[]") return true;
      try {
        const parsed: unknown = JSON.parse(trimmed);
        return !Array.isArray(parsed) || parsed.length === 0;
      } catch {
        return true;
      }
    }
    return trimmed !== "true";
  }
  return trimmed.length === 0;
}

export function PublicFormView({ form, thankYouPath }: PublicFormViewProps) {
  const router = useRouter();
  const theme = getFormTheme(form.theme);
  const recordView = trpc.forms.recordView.useMutation();
  const submit = trpc.forms.submit.useMutation({
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(2000 * (attemptIndex + 1), 8000),
    onSuccess: () => {
      router.push(thankYouPath);
    },
    onError: (err) => {
      const raw = err.message.toLowerCase();
      const isNetwork =
        raw.includes("failed to fetch") ||
        raw.includes("network") ||
        raw.includes("timeout") ||
        raw.includes("load failed") ||
        raw.includes("waking up") ||
        raw.includes("api unavailable");
      const message = isNetwork
        ? "Could not reach the server. Please wait a moment and try again."
        : err.message.startsWith("[")
          ? "Could not submit this form. Please try again."
          : err.message;
      toast.error(message);
    },
  });

  const [values, setValues] = useState<Record<string, string>>({});
  const [step, setStep] = useState(0);
  const honeypotRef = useRef<HTMLInputElement>(null);

  const fields = form.fields;
  const currentField = fields[step];
  const isLastStep = step >= fields.length - 1;
  const progress = fields.length > 0 ? ((step + 1) / fields.length) * 100 : 0;

  useEffect(() => {
    if (honeypotRef.current) {
      honeypotRef.current.value = "";
    }
  }, []);

  useEffect(() => {
    if (form.id) {
      recordView.mutate({ formId: form.id });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.id]);

  const validateCurrentStep = () => {
    if (!currentField) return true;
    const value = values[currentField.id] ?? "";
    if (currentField.required && isFieldEmpty(currentField, value)) {
      toast.error(`"${currentField.label}" is required`);
      return false;
    }
    return true;
  };

  const handleContinue = () => {
    if (!validateCurrentStep()) return;
    if (isLastStep) {
      handleSubmit();
      return;
    }
    setStep((prev) => Math.min(prev + 1, fields.length - 1));
  };

  const handleSubmit = () => {
    if (!validateCurrentStep()) return;
    const honeypot = honeypotRef.current?.value ?? "";
    submit.mutate({
      formId: form.id,
      website: honeypot,
      answers: fields.map((field) => ({
        fieldId: field.id,
        value: values[field.id] ?? "",
      })),
    });
  };

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key !== "Enter" || event.shiftKey) return;
    if (currentField?.type === "text" && (event.target as HTMLElement).tagName === "TEXTAREA") return;
    event.preventDefault();
    handleContinue();
  };

  return (
    <div className={`relative flex min-h-screen flex-col px-4 py-12 text-white ${theme.pageBg}`}>
      <div className={`pointer-events-none absolute inset-0 ${theme.glow}`} />

      <div className="relative mx-auto flex w-full max-w-xl flex-1 flex-col">
        <div className="mb-8">
          <p className={`font-mono mb-2 text-[10px] tracking-[0.3em] uppercase opacity-70 ${theme.accentSoft}`}>
            ChaiForm · {theme.label}
          </p>
          <h1 className="font-display text-3xl font-black tracking-tight md:text-4xl">{form.title}</h1>
          {form.description && step === 0 && <p className="mt-3 text-white/50">{form.description}</p>}
        </div>

        {fields.length > 0 && (
          <div className="mb-8 h-1.5 overflow-hidden rounded-full bg-white/10">
            <div
              className="h-full rounded-full bg-lime-400 transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        )}

        {currentField && (
          <div className="flex flex-1 flex-col" onKeyDown={handleKeyDown}>
            {(() => {
              const multiCheckbox =
                currentField.type === "checkbox" && isMultiCheckboxConfig(currentField.config);
              const Wrapper = multiCheckbox ? "div" : "label";

              return (
                <Wrapper className="block space-y-3">
                  {(currentField.type !== "checkbox" || multiCheckbox) && (
                    <span className="text-lg font-medium text-white/90">
                      {currentField.label}
                      {currentField.required && <span className={theme.accentText}> *</span>}
                    </span>
                  )}
                  <FormFieldInput
                    field={currentField}
                    theme={theme}
                    value={values[currentField.id] ?? ""}
                    onChange={(value) => setValues((prev) => ({ ...prev, [currentField.id]: value }))}
                  />
                </Wrapper>
              );
            })()}

            <div className="mt-auto flex flex-wrap items-center gap-3 pt-10">
              {step > 0 && (
                <button
                  type="button"
                  onClick={() => setStep((prev) => Math.max(prev - 1, 0))}
                  className="rounded-2xl border border-white/15 px-5 py-3 text-sm font-bold tracking-wide text-white/60 uppercase transition-colors hover:border-white/30 hover:text-white"
                >
                  Back
                </button>
              )}
              <button
                type="button"
                onClick={handleContinue}
                disabled={submit.isPending}
                className="btn-omni font-display flex-1 rounded-2xl py-3.5 text-sm font-black tracking-[0.18em] uppercase disabled:opacity-50 sm:flex-none sm:px-10"
              >
                {submit.isPending ? "Submitting…" : isLastStep ? "Submit" : "Continue"}
              </button>
              <p className="w-full font-mono text-[10px] tracking-wider text-white/30 uppercase">
                Question {step + 1} of {fields.length} · Press Enter ↵
              </p>
            </div>
          </div>
        )}

        <input
          ref={honeypotRef}
          type="text"
          name="_chaiform_hp"
          defaultValue=""
          tabIndex={-1}
          autoComplete="off"
          aria-hidden="true"
          data-lpignore="true"
          data-1p-ignore
          readOnly
          onFocus={(event) => event.currentTarget.removeAttribute("readonly")}
          className="pointer-events-none absolute -left-[9999px] h-0 w-0 overflow-hidden opacity-0"
        />
      </div>
    </div>
  );
}
