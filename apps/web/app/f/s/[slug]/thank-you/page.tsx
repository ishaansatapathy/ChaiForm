import { FormThankYou } from "~/components/forms/form-thank-you";
import { fetchPublicFormBySlug } from "~/lib/fetch-public-form";

export default async function PublicFormSlugThankYouPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const form = await fetchPublicFormBySlug(slug);

  return <FormThankYou formTitle={form?.title} />;
}
