"use client";

import { useParams } from "next/navigation";

import { PublicFormView } from "~/components/forms/public-form-view";
import { trpc } from "~/trpc/client";

export default function PublicFormPage() {
  const params = useParams<{ formId: string }>();
  const formId = params.formId;

  const { data: form, isLoading, isError } = trpc.forms.getPublic.useQuery({ formId });

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

  return <PublicFormView form={form} thankYouPath={`/f/${formId}/thank-you`} />;
}
