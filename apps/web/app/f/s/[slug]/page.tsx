"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";

import { FormFieldInput } from "~/components/forms/form-field-input";
import { trpc } from "~/trpc/client";

export default function PublicFormBySlugPage() {
  const params = useParams<{ slug: string }>();
  const router = useRouter();
  const slug = params.slug;

  const { data: form, isLoading, isError } = trpc.forms.getPublicBySlug.useQuery({ slug });
  const recordView = trpc.forms.recordView.useMutation();
  const submit = trpc.forms.submit.useMutation({
    onSuccess: () => {
      router.push(`/f/s/${slug}/thank-you`);
    },
    onError: (err) => toast.error(err.message),
  });

  const [values, setValues] = useState<Record<string, string>>({});

  useEffect(() => {
    if (form?.id) {
      recordView.mutate({ formId: form.id });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form?.id]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-black text-white/50">
        Loading form…
      </div>
    );
  }

  if (isError || !form) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-black text-white/50">
        Form not found.
      </div>
    );
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    submit.mutate({
      formId: form.id,
      answers: form.fields.map((field) => ({
        fieldId: field.id,
        value: values[field.id] ?? "",
      })),
    });
  };

  return (
    <div className="relative min-h-screen bg-black px-4 py-16 text-white">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(74,222,128,0.08),transparent_40%)]" />
      <form onSubmit={handleSubmit} className="relative mx-auto max-w-xl space-y-6">
        <div>
          <p className="font-mono mb-2 text-[10px] tracking-[0.3em] text-lime-400/70 uppercase">ChaiForm</p>
          <h1 className="font-display text-4xl font-black tracking-tight">{form.title}</h1>
          {form.description && <p className="mt-3 text-white/50">{form.description}</p>}
        </div>

        {form.fields.map((field) => (
          <label key={field.id} className="block space-y-2">
            <span className="text-sm font-medium text-white/80">
              {field.label}
              {field.required && <span className="text-lime-400"> *</span>}
            </span>
            <FormFieldInput
              field={field}
              value={values[field.id] ?? ""}
              onChange={(value) => setValues((prev) => ({ ...prev, [field.id]: value }))}
            />
          </label>
        ))}

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
