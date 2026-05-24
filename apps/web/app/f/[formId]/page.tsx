import { PublicFormView } from "~/components/forms/public-form-view";
import { fetchPublicFormById } from "~/lib/fetch-public-form";

export default async function PublicFormPage({
  params,
}: {
  params: Promise<{ formId: string }>;
}) {
  const { formId } = await params;
  const form = await fetchPublicFormById(formId);

  if (!form) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-black px-4 text-center text-white/50">
        <div>
          <p>Form not found.</p>
          <p className="mt-2 text-xs text-white/35">This link may be invalid or the form is no longer available.</p>
        </div>
      </div>
    );
  }

  const thankYouPath = form.slug ? `/f/s/${form.slug}/thank-you` : `/f/${form.id}/thank-you`;

  return <PublicFormView form={form} thankYouPath={thankYouPath} />;
}
