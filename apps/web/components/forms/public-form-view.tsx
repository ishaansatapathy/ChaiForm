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

export function PublicFormView({ form, thankYouPath }: PublicFormViewProps) {
  const router = useRouter();
  const theme = getFormTheme(form.theme);
  const recordView = trpc.forms.recordView.useMutation();
  const submit = trpc.forms.submit.useMutation({
    onSuccess: () => {
      router.push(thankYouPath);
    },
    onError: (err) => {
      const message = err.message.startsWith("[")
        ? "Could not submit this form. Please try again."
        : err.message;
      toast.error(message);
    },
  });

  const [values, setValues] = useState<Record<string, string>>({});
  const honeypotRef = useRef<HTMLInputElement>(null);

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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const honeypot = honeypotRef.current?.value.trim() ?? "";
    submit.mutate({
      formId: form.id,
      ...(honeypot ? { website: honeypot } : {}),
      answers: form.fields.map((field) => ({
        fieldId: field.id,
        value: values[field.id] ?? "",
      })),
    });
  };

  return (
    <div className={`relative min-h-screen px-4 py-16 text-white ${theme.pageBg}`}>
      <div className={`pointer-events-none absolute inset-0 ${theme.glow}`} />
      <form onSubmit={handleSubmit} className="relative mx-auto max-w-xl space-y-6">
        <div>
          <p className={`font-mono mb-2 text-[10px] tracking-[0.3em] uppercase opacity-70 ${theme.accentSoft}`}>
            ChaiForm · {theme.label}
          </p>
          <h1 className="font-display text-4xl font-black tracking-tight">{form.title}</h1>
          {form.description && <p className="mt-3 text-white/50">{form.description}</p>}
        </div>

        {form.fields.map((field) => {
          const multiCheckbox = field.type === "checkbox" && isMultiCheckboxConfig(field.config);
          const Wrapper = multiCheckbox ? "div" : "label";

          return (
            <Wrapper key={field.id} className="block space-y-2">
              {(field.type !== "checkbox" || multiCheckbox) && (
                <span className="text-sm font-medium text-white/80">
                  {field.label}
                  {field.required && <span className={theme.accentText}> *</span>}
                </span>
              )}
              <FormFieldInput
                field={field}
                theme={theme}
                value={values[field.id] ?? ""}
                onChange={(value) => setValues((prev) => ({ ...prev, [field.id]: value }))}
              />
            </Wrapper>
          );
        })}

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

        <button
          type="submit"
          disabled={submit.isPending}
          className="btn-omni font-display w-full rounded-2xl py-3.5 text-sm font-black tracking-[0.18em] uppercase disabled:opacity-50"
        >
          {submit.isPending ? "Submitting…" : "Submit"}
        </button>
      </form>
    </div>
  );
}
