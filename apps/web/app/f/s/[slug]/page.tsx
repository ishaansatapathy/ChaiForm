"use client";

import { useParams } from "next/navigation";

import { PublicFormView } from "~/components/forms/public-form-view";
import { trpc } from "~/trpc/client";

export default function PublicFormBySlugPage() {
  const params = useParams<{ slug: string }>();
  const slug = params.slug;

  const { data: form, isLoading, isError } = trpc.forms.getPublicBySlug.useQuery({ slug });

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

  return <PublicFormView form={form} thankYouPath={`/f/s/${slug}/thank-you`} />;
}
