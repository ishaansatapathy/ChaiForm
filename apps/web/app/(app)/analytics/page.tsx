import AnalyticsContent from "./analytics-content";
import {
  fetchAnalyticsBundle,
  fetchAnalyticsSummary,
  fetchFormsList,
  type AnalyticsBundle,
} from "~/lib/fetch-session";

export default async function AnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<{ form?: string }>;
}) {
  const { form: formParam } = await searchParams;
  const [formsPage, globalSummary] = await Promise.all([
    fetchFormsList(100),
    fetchAnalyticsSummary(),
  ]);
  const forms = formsPage?.items ?? [];
  const activeFormId =
    formParam && forms.some((form) => form.id === formParam) ? formParam : forms[0]?.id;

  let initialBundle: AnalyticsBundle | null = null;
  if (activeFormId) {
    initialBundle = await fetchAnalyticsBundle(activeFormId);
    if (globalSummary && !initialBundle.summary) {
      initialBundle = { ...initialBundle, summary: globalSummary };
    }
  }

  return (
    <AnalyticsContent
      initialForms={formsPage}
      initialFormId={activeFormId}
      initialBundle={initialBundle}
      initialSummary={globalSummary}
    />
  );
}
