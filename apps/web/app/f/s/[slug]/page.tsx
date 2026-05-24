import { PublicFormView } from "~/components/forms/public-form-view";
import { fetchPublicFormBySlug } from "~/lib/fetch-public-form";

export default async function PublicFormBySlugPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const form = await fetchPublicFormBySlug(slug);

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
