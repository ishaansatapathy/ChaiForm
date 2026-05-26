"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { Highlight } from "~/components/app/highlight";
import { useAppData } from "~/components/app/app-data-provider";
import { AnalyticsDetailPanel } from "~/components/analytics/analytics-detail-panel";
import { downloadSubmissionsCsv } from "~/lib/export-csv";
import type { AnalyticsBundle, FormsListPage } from "~/lib/fetch-session";
import { trpc } from "~/trpc/client";
import type { RouterOutputs } from "@repo/trpc/client";
import { toast } from "sonner";

type SubmissionItem = RouterOutputs["forms"]["listSubmissions"]["items"][number];
type FormListItem = FormsListPage["items"][number];
type SummaryData = RouterOutputs["analytics"]["summary"];
type OverTimeData = RouterOutputs["analytics"]["submissionsOverTime"];

const QUERY_OPTS = {
  retry: 2,
  staleTime: 30_000,
} as const;

function buildOverTimeFromSubmissions(
  items: { submittedAt: string | null }[],
  days = 30,
): OverTimeData {
  const since = new Date();
  since.setDate(since.getDate() - days + 1);
  since.setHours(0, 0, 0, 0);

  const countByDate = new Map<string, number>();
  for (const item of items) {
    if (!item.submittedAt) continue;
    const key = item.submittedAt.slice(0, 10);
    countByDate.set(key, (countByDate.get(key) ?? 0) + 1);
  }

  const points: OverTimeData["points"] = [];
  for (let i = 0; i < days; i += 1) {
    const date = new Date(since);
    date.setDate(since.getDate() + i);
    const key = date.toISOString().slice(0, 10);
    points.push({ date: key, count: countByDate.get(key) ?? 0 });
  }

  return { points };
}

function chartHasActivity(points: OverTimeData["points"]) {
  return points.some((point) => point.count > 0);
}

function buildFallbackSummary(
  forms: FormListItem[],
  activeForm?: FormListItem,
): SummaryData {
  return {
    totalForms: forms.length,
    totalSubmissions: forms.reduce((sum, form) => sum + (form.submissionCount ?? 0), 0),
    submissionsLast7Days: 0,
    averageCompletionRate: 0,
    selectedForm: activeForm
      ? {
          id: activeForm.id,
          title: activeForm.title,
          submissionCount: activeForm.submissionCount,
          viewCount: activeForm.viewCount,
          completionRate: activeForm.completionRate,
          fieldCount: activeForm.fields.length,
          visibility: activeForm.visibility,
        }
      : null,
  };
}

type AnalyticsContentProps = {
  initialForms?: FormsListPage | null;
  initialFormId?: string;
  initialBundle?: AnalyticsBundle | null;
  initialSummary?: SummaryData | null;
};

export default function AnalyticsContent({
  initialForms: initialFormsProp,
  initialFormId,
  initialBundle,
  initialSummary,
}: AnalyticsContentProps) {
  const { initialForms: contextForms } = useAppData();
  const initialForms = initialFormsProp ?? contextForms;
  const [chartsMounted, setChartsMounted] = useState(false);

  useEffect(() => {
    setChartsMounted(true);
  }, []);

  const { data: user } = trpc.auth.me.useQuery({});
  const utils = trpc.useUtils();
  const [exporting, setExporting] = useState(false);
  const deleteSubmissionMutation = trpc.forms.deleteSubmission.useMutation();
  const { data: formsPage, isLoading: formsLoading, isError: formsListError } = trpc.forms.list.useQuery(
    { limit: 100 },
    {
      initialData: initialForms ?? undefined,
      enabled: Boolean(user),
      ...QUERY_OPTS,
    },
  );

  const [selectedFormId, setSelectedFormId] = useState<string | undefined>(initialFormId);
  const [chartDays, setChartDays] = useState(30);
  const [selectedSubmissionId, setSelectedSubmissionId] = useState<string | undefined>();
  const [selectedFieldId, setSelectedFieldId] = useState<string | undefined>();
  const [submissionSearch, setSubmissionSearch] = useState("");
  const [submittedFrom, setSubmittedFrom] = useState("");
  const [submittedTo, setSubmittedTo] = useState("");
  const [submissionCursor, setSubmissionCursor] = useState<string | undefined>();
  const [loadedSubmissions, setLoadedSubmissions] = useState<SubmissionItem[]>(
    initialBundle?.submissions?.items ?? [],
  );

  const forms = formsPage?.items ?? initialForms?.items ?? [];

  const activeFormId = selectedFormId ?? forms[0]?.id;
  const isInitialForm =
    activeFormId === initialFormId &&
    !submissionCursor &&
    !submissionSearch.trim() &&
    !submittedFrom &&
    !submittedTo;

  useEffect(() => {
    setSubmissionCursor(undefined);
    setSelectedSubmissionId(undefined);
    setSelectedFieldId(undefined);
    setLoadedSubmissions([]);
  }, [activeFormId]);

  useEffect(() => {
    setSubmissionCursor(undefined);
  }, [submissionSearch, submittedFrom, submittedTo]);

  const {
    data: summary,
    isError: summaryError,
    isFetching: summaryFetching,
    refetch: refetchSummary,
  } = trpc.analytics.summary.useQuery(
    { formId: activeFormId },
    {
      enabled: Boolean(activeFormId),
      initialData: isInitialForm ? (initialBundle?.summary ?? undefined) : undefined,
      // Show the previous form's summary while the new form's data loads,
      // eliminating the empty-state flash when switching forms in the sidebar.
      placeholderData: (prev) => prev,
      ...QUERY_OPTS,
    },
  );

  const { data: overTime, isLoading: overTimeLoading, isError: overTimeError } =
    trpc.analytics.submissionsOverTime.useQuery(
    { formId: activeFormId!, days: chartDays },
    {
      enabled: Boolean(activeFormId),
      initialData: isInitialForm ? (initialBundle?.overTime ?? undefined) : undefined,
      // Show previous chart data while the new form's data fetches.
      placeholderData: (prev) => prev,
      ...QUERY_OPTS,
    },
  );

  const { data: formFields } = trpc.analytics.listFormFields.useQuery(
    { formId: activeFormId! },
    {
      enabled: Boolean(activeFormId),
      initialData: isInitialForm ? (initialBundle?.formFields ?? undefined) : undefined,
      ...QUERY_OPTS,
    },
  );

  const { data: allFieldStats } = trpc.analytics.allFieldStats.useQuery(
    { formId: activeFormId! },
    {
      enabled: Boolean(activeFormId),
      ...QUERY_OPTS,
    },
  );

  const { data: funnel } = trpc.analytics.funnel.useQuery(
    { formId: activeFormId! },
    {
      enabled: Boolean(activeFormId),
      ...QUERY_OPTS,
    },
  );

  const activeFieldId = selectedFieldId ?? formFields?.fields[0]?.id;
  const isInitialField =
    isInitialForm && activeFieldId === initialBundle?.formFields?.fields[0]?.id;

  const {
    data: fieldBreakdown,
    isLoading: fieldBreakdownLoading,
    isError: fieldBreakdownError,
    refetch: refetchFieldBreakdown,
  } = trpc.analytics.fieldBreakdown.useQuery(
    { formId: activeFormId!, fieldId: activeFieldId! },
    {
      enabled: Boolean(activeFormId && activeFieldId),
      initialData: isInitialField ? (initialBundle?.fieldBreakdown ?? undefined) : undefined,
      ...QUERY_OPTS,
    },
  );

  const {
    data: submissionsPage,
    isLoading: submissionsLoading,
    isError: submissionsError,
    refetch: refetchSubmissions,
  } = trpc.forms.listSubmissions.useQuery(
    {
      formId: activeFormId!,
      limit: 15,
      cursor: submissionCursor,
      search: submissionSearch.trim() || undefined,
      submittedFrom: submittedFrom || undefined,
      submittedTo: submittedTo || undefined,
    },
    {
      enabled: Boolean(activeFormId),
      initialData:
        isInitialForm && !submissionCursor
          ? (initialBundle?.submissions ?? undefined)
          : undefined,
      ...QUERY_OPTS,
    },
  );

  const { data: allSubmissionsPage } = trpc.forms.listSubmissions.useQuery(
    { formId: activeFormId!, limit: 100 },
    {
      enabled: Boolean(activeFormId),
      initialData: isInitialForm ? (initialBundle?.allSubmissions ?? undefined) : undefined,
      ...QUERY_OPTS,
    },
  );
  const allSubmissions = allSubmissionsPage?.items ?? (isInitialForm ? initialBundle?.allSubmissions?.items : undefined) ?? [];

  useEffect(() => {
    if (!submissionsPage || submissionsLoading) return;
    setLoadedSubmissions((prev) =>
      submissionCursor ? [...prev, ...submissionsPage.items] : submissionsPage.items,
    );
  }, [submissionsPage, submissionCursor, submissionsLoading]);

  const activeForm = forms.find((form) => form.id === activeFormId);
  const submissionItemsForChart =
    allSubmissionsPage?.items ?? submissionsPage?.items ?? loadedSubmissions;
  const fallbackOverTime =
    submissionItemsForChart.length > 0
      ? buildOverTimeFromSubmissions(submissionItemsForChart)
      : null;
  const resolvedSummary =
    summary ?? (forms.length > 0 ? buildFallbackSummary(forms, activeForm) : null);
  const resolvedOverTime = overTime ?? fallbackOverTime;
  const resolvedFormFields = formFields;
  const resolvedActiveFieldId = selectedFieldId ?? resolvedFormFields?.fields[0]?.id;
  const resolvedFieldBreakdown = fieldBreakdown;

  const submissions =
    loadedSubmissions.length > 0 ? loadedSubmissions : (submissionsPage?.items ?? []);
  const activeSubmissionId = selectedSubmissionId;

  const statsLoading = formsLoading && forms.length === 0;
  const formBundleLoading =
    Boolean(activeFormId) && (summaryFetching || overTimeLoading);
  const showSubmissionsLoading =
    submissionsLoading && submissions.length === 0 && !submissionsError;
  const chartLoading = (overTimeLoading || formBundleLoading) && !resolvedOverTime;
  const chartHasData = resolvedOverTime ? chartHasActivity(resolvedOverTime.points) : false;

  const handleExportCsv = async () => {
    if (!activeForm || !activeFormId) return;
    setExporting(true);
    try {
      const exportData = await utils.forms.exportSubmissions.fetch({
        formId: activeFormId,
        search: submissionSearch.trim() || undefined,
        submittedFrom: submittedFrom || undefined,
        submittedTo: submittedTo || undefined,
      });

      if (exportData.items.length === 0) {
        toast.error("No submissions to export");
        return;
      }

      downloadSubmissionsCsv(exportData.formTitle, exportData.items, exportData.fields);
      toast.success(`Exported ${exportData.items.length} submissions`);
    } catch {
      toast.error("Could not export submissions");
    } finally {
      setExporting(false);
    }
  };

  const handleDeleteSubmission = async (submissionId: string) => {
    if (!activeFormId) return;
    const confirmed = window.confirm("Delete this response? This cannot be undone.");
    if (!confirmed) return;

    try {
      await deleteSubmissionMutation.mutateAsync({ submissionId });
      setSelectedSubmissionId(undefined);
      setLoadedSubmissions((items) => items.filter((item) => item.id !== submissionId));
      await utils.forms.listSubmissions.invalidate({ formId: activeFormId });
      await utils.forms.exportSubmissions.invalidate({ formId: activeFormId });
      await utils.analytics.summary.invalidate({ formId: activeFormId });
      await utils.analytics.allFieldStats.invalidate({ formId: activeFormId });
      await utils.analytics.fieldBreakdown.invalidate();
      toast.success("Response deleted");
    } catch {
      toast.error("Could not delete response");
    }
  };

  if (formsLoading && forms.length === 0) {
    return <p className="text-white/40">Loading forms…</p>;
  }

  if (forms.length === 0) {
    const serverFormCount =
      resolvedSummary?.totalForms ?? initialSummary?.totalForms ?? 0;
    const serverSubmissionCount =
      resolvedSummary?.totalSubmissions ?? initialSummary?.totalSubmissions ?? 0;
    const listBroken =
      formsListError || serverFormCount > 0 || serverSubmissionCount > 0;

    return (
      <section className="py-4">
        <Header />
        <div className="text-center">
          {listBroken ? (
            <>
              <p className="text-white/70">
                {serverFormCount > 0
                  ? `Found ${serverFormCount} form(s) in the database, but the list could not load.`
                  : serverSubmissionCount > 0
                    ? `Found ${serverSubmissionCount} response(s), but your forms list could not load.`
                    : "Could not load your forms list."}
              </p>
              <p className="mt-2 text-sm text-white/45">
                Analytics could not load. Please retry in a moment. If this keeps happening, contact support.
              </p>
            </>
          ) : (
            <>
              <p className="text-white/50">No analytics yet — create a form and collect responses first.</p>
              <Link href="/forms/new" className="font-annotate mt-4 inline-block text-xl text-lime-400">
                Create a form →
              </Link>
            </>
          )}
        </div>
      </section>
    );
  }

  return (
    <section className="py-4">
      <Header />

      {summaryError && !resolvedSummary ? (
        <div className="app-surface mb-8 rounded-2xl border border-red-400/20 p-5 text-center">
          <p className="text-sm text-white/70">Could not load analytics summary.</p>
          <button
            type="button"
            onClick={() => void refetchSummary()}
            className="btn-omni font-display mt-4 inline-flex rounded-xl px-5 py-2 text-xs font-black tracking-wide uppercase"
          >
            Retry
          </button>
        </div>
      ) : (
        <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="Total forms" value={resolvedSummary?.totalForms ?? 0} loading={statsLoading} />
          <StatCard
            label="Total responses"
            value={resolvedSummary?.totalSubmissions ?? activeForm?.submissionCount ?? 0}
            loading={statsLoading}
          />
          <StatCard
            label="Last 7 days"
            value={resolvedSummary?.submissionsLast7Days ?? 0}
            loading={statsLoading}
          />
          <StatCard
            label="Completion rate"
            value={
              resolvedSummary?.selectedForm?.completionRate ??
              resolvedSummary?.averageCompletionRate ??
              0
            }
            suffix="%"
            loading={statsLoading}
          />
        </div>
      )}

      <div className="mb-6 lg:hidden">
        <FormsPanel
          forms={forms}
          activeFormId={activeFormId}
          formBundleLoading={formBundleLoading}
          onSelectForm={(formId) => {
            setSelectedFormId(formId);
            setSelectedSubmissionId(undefined);
            setSelectedFieldId(undefined);
          }}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,240px)_minmax(0,1fr)]">
        <aside className="hidden min-w-0 flex-col gap-4 overflow-hidden lg:sticky lg:top-8 lg:flex lg:max-h-[calc(100vh-6rem)] lg:self-start">
          <FormsPanel
            forms={forms}
            activeFormId={activeFormId}
            formBundleLoading={formBundleLoading}
            fillSidebar
            onSelectForm={(formId) => {
              setSelectedFormId(formId);
              setSelectedSubmissionId(undefined);
              setSelectedFieldId(undefined);
            }}
          />
          <SubmissionsPanel
            submissions={submissions}
            activeSubmissionId={activeSubmissionId}
            submissionSearch={submissionSearch}
            submittedFrom={submittedFrom}
            submittedTo={submittedTo}
            showSubmissionsLoading={showSubmissionsLoading}
            submissionsError={submissionsError}
            submissionsLoading={submissionsLoading}
            submissionsPage={submissionsPage}
            exporting={exporting}
            onSearchChange={setSubmissionSearch}
            onSubmittedFromChange={setSubmittedFrom}
            onSubmittedToChange={setSubmittedTo}
            onSelectSubmission={setSelectedSubmissionId}
            onExportCsv={handleExportCsv}
            onLoadMore={() => setSubmissionCursor(submissionsPage?.nextCursor ?? undefined)}
            onRetry={() => refetchSubmissions()}
          />
        </aside>

        <div className="min-w-0 space-y-6">
          <div className="app-surface rounded-3xl p-6">
            <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
              <h3 className="font-display text-lg font-bold text-white">Submissions over time</h3>
              <div className="flex flex-wrap items-center gap-2">
                {[7, 30, 90].map((days) => (
                  <button
                    key={days}
                    type="button"
                    onClick={() => setChartDays(days)}
                    className={`rounded-full px-3 py-1 text-[10px] font-bold tracking-wider uppercase ${
                      chartDays === days
                        ? "bg-lime-400 text-black"
                        : "border border-white/10 text-white/45"
                    }`}
                  >
                    {days}d
                  </button>
                ))}
              </div>
              {activeForm ? (
                <p className="font-mono text-[10px] tracking-wider text-white/35 uppercase">
                  {activeForm.title} · {activeForm.submissionCount} responses
                </p>
              ) : null}
            </div>
            <div className="h-56">
              {!chartsMounted || chartLoading ? (
                <ChartSkeleton />
              ) : resolvedOverTime && chartHasData ? (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={resolvedOverTime.points}>
                    <CartesianGrid stroke="rgba(255,255,255,0.06)" />
                    <XAxis dataKey="date" tick={{ fill: "rgba(255,255,255,0.35)", fontSize: 10 }} />
                    <YAxis allowDecimals={false} tick={{ fill: "rgba(255,255,255,0.35)", fontSize: 10 }} />
                    <Tooltip
                      contentStyle={{ background: "#111", border: "1px solid rgba(255,255,255,0.1)" }}
                      labelStyle={{ color: "#fff" }}
                    />
                    <Line type="monotone" dataKey="count" stroke="#4ade80" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              ) : overTimeError && (activeForm?.submissionCount ?? 0) > 0 && !fallbackOverTime ? (
                <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
                  <p className="text-sm text-white/50">Could not load chart data.</p>
                  <button
                    type="button"
                    onClick={() => void utils.analytics.submissionsOverTime.invalidate({ formId: activeFormId!, days: chartDays })}
                    className="text-xs font-bold tracking-wider text-lime-400 uppercase"
                  >
                    Retry
                  </button>
                </div>
              ) : (
                <p className="flex h-full items-center justify-center text-center text-sm text-white/40">
                  {(activeForm?.submissionCount ?? 0) === 0
                    ? `No submissions on “${activeForm?.title ?? "this form"}” yet. Share the link to collect responses.`
                    : resolvedOverTime && !chartHasData
                      ? `${activeForm?.submissionCount ?? 0} responses exist, but none in the last ${chartDays} days.`
                      : "No submission data for this period yet."}
                </p>
              )}
            </div>
          </div>

          {funnel && (
            <div className="app-surface rounded-3xl p-6">
              <h3 className="font-display mb-4 text-lg font-bold text-white">Response funnel</h3>
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-2xl border border-white/10 bg-black/30 px-4 py-3">
                  <p className="text-xs text-white/45">Views</p>
                  <p className="font-display mt-1 text-2xl text-white">{funnel.views}</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-black/30 px-4 py-3">
                  <p className="text-xs text-white/45">Submissions</p>
                  <p className="font-display mt-1 text-2xl text-white">{funnel.submissions}</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-black/30 px-4 py-3">
                  <p className="text-xs text-white/45">Completion</p>
                  <p className="font-display mt-1 text-2xl text-lime-400">{funnel.completionRate}%</p>
                </div>
              </div>
              <p className="mt-3 text-xs text-white/40">
                Drop-off: {funnel.dropOffRate}% of viewers did not submit.
              </p>
            </div>
          )}

          {allFieldStats && allFieldStats.fields.length > 0 && (
            <div className="app-surface rounded-3xl p-6">
              <h3 className="font-display mb-4 text-lg font-bold text-white">All field stats</h3>
              <div className="grid gap-3 sm:grid-cols-2">
                {allFieldStats.fields.map((field) => (
                  <button
                    key={field.fieldId}
                    type="button"
                    onClick={() => setSelectedFieldId(field.fieldId)}
                    className="rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-left transition-colors hover:border-lime-400/30"
                  >
                    <p className="text-sm font-medium text-white">{field.label}</p>
                    <p className="mt-1 text-xs text-white/45">
                      {field.totalResponses} responses
                      {field.averageRating != null ? ` · avg ${field.averageRating}` : ""}
                    </p>
                    <p className="mt-1 text-[11px] text-white/35">
                      {field.answerRate}% answered · {field.dropOffRate}% skipped
                    </p>
                  </button>
                ))}
              </div>
            </div>
          )}

          {resolvedFormFields && resolvedFormFields.fields.length > 0 && (
            <div className="app-surface rounded-3xl p-6">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <h3 className="font-display text-lg font-bold text-white">Field breakdown</h3>
                <select
                  value={resolvedActiveFieldId ?? ""}
                  onChange={(e) => setSelectedFieldId(e.target.value)}
                  className="form-select rounded-xl border border-white/10 bg-[#0a0a0a] px-3 py-2 text-sm text-white outline-none"
                >
                  {resolvedFormFields.fields.map((field) => (
                    <option key={field.id} value={field.id}>
                      {field.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="min-h-56">
              {!chartsMounted || (fieldBreakdownLoading && !resolvedFieldBreakdown) ? (
                <ChartSkeleton />
              ) : fieldBreakdownError && !resolvedFieldBreakdown ? (
                <div className="text-center">
                  <p className="text-sm text-white/50">Could not load field breakdown.</p>
                  <button
                    type="button"
                    onClick={() => refetchFieldBreakdown()}
                    className="mt-3 text-xs font-bold tracking-wider text-lime-400 uppercase"
                  >
                    Retry
                  </button>
                </div>
              ) : resolvedFieldBreakdown ? (
                <div className="space-y-4">
                  <div className="flex flex-wrap gap-4 text-sm text-white/50">
                    <span>{resolvedFieldBreakdown.totalResponses} responses</span>
                    <span>{resolvedFieldBreakdown.answerRate}% answer rate</span>
                    <span>{resolvedFieldBreakdown.skippedResponses} skipped</span>
                    {resolvedFieldBreakdown.averageRating !== null && (
                      <span>Avg rating: {resolvedFieldBreakdown.averageRating}</span>
                    )}
                  </div>

                  {resolvedFieldBreakdown.optionCounts.length > 0 ? (
                    <div className="h-56">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={resolvedFieldBreakdown.optionCounts.slice(0, 12)}>
                          <CartesianGrid stroke="rgba(255,255,255,0.06)" />
                          <XAxis dataKey="option" tick={{ fill: "rgba(255,255,255,0.35)", fontSize: 10 }} />
                          <YAxis allowDecimals={false} tick={{ fill: "rgba(255,255,255,0.35)", fontSize: 10 }} />
                          <Tooltip
                            contentStyle={{ background: "#111", border: "1px solid rgba(255,255,255,0.1)" }}
                          />
                          <Bar dataKey="count" fill="#4ade80" radius={[6, 6, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  ) : resolvedFieldBreakdown.recentValues.length > 0 ? (
                    <div className="space-y-2">
                      <p className="text-xs text-white/40">Recent answers</p>
                      {resolvedFieldBreakdown.recentValues.map((value, index) => (
                        <div
                          key={`${value}-${index}`}
                          className="rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-white/75"
                        >
                          {value}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-white/40">No answers for this field yet.</p>
                  )}
                </div>
              ) : (
                <p className="flex min-h-56 items-center justify-center text-sm text-white/40">
                  Select a field to view breakdown.
                </p>
              )}
              </div>
            </div>
          )}

          {!showSubmissionsLoading &&
          submissions.length === 0 &&
          (activeForm?.submissionCount ?? 0) === 0 ? (
            <div className="text-center">
              <p className="text-white/50">Share your form link to collect the first submission.</p>
              {activeFormId && (
                <Link
                  href={activeForm?.slug ? `/f/s/${activeForm.slug}` : `/f/${activeFormId}`}
                  className="font-annotate mt-4 inline-block text-xl text-lime-400"
                  target="_blank"
                >
                  Open form →
                </Link>
              )}
            </div>
          ) : null}
        </div>
      </div>

      <div className="mt-6 lg:hidden">
        <SubmissionsPanel
          submissions={submissions}
          activeSubmissionId={activeSubmissionId}
          submissionSearch={submissionSearch}
          submittedFrom={submittedFrom}
          submittedTo={submittedTo}
          showSubmissionsLoading={showSubmissionsLoading}
          submissionsError={submissionsError}
          submissionsLoading={submissionsLoading}
          submissionsPage={submissionsPage}
          exporting={exporting}
          onSearchChange={setSubmissionSearch}
          onSubmittedFromChange={setSubmittedFrom}
          onSubmittedToChange={setSubmittedTo}
          onSelectSubmission={setSelectedSubmissionId}
          onExportCsv={handleExportCsv}
          onLoadMore={() => setSubmissionCursor(submissionsPage?.nextCursor ?? undefined)}
          onRetry={() => refetchSubmissions()}
        />
      </div>

      {allSubmissions.length > 0 && resolvedFormFields && (
        <div className="mt-8">
          <AnalyticsDetailPanel
            key={activeFormId}
            formTitle={activeForm?.title ?? "Form"}
            fields={resolvedFormFields.fields}
            submissions={allSubmissions}
            allSubmissionsCount={
              resolvedSummary?.selectedForm?.submissionCount ?? allSubmissions.length
            }
            selectedSubmissionId={activeSubmissionId}
            onSelectSubmission={setSelectedSubmissionId}
            onDeleteSubmission={handleDeleteSubmission}
            chartsMounted={chartsMounted}
          />
        </div>
      )}
    </section>
  );
}

function FormsPanel({
  forms,
  activeFormId,
  formBundleLoading,
  fillSidebar = false,
  onSelectForm,
}: {
  forms: FormListItem[];
  activeFormId?: string;
  formBundleLoading: boolean;
  fillSidebar?: boolean;
  onSelectForm: (formId: string) => void;
}) {
  const hasMany = forms.length > 5;
  return (
    <div className={`app-surface rounded-3xl p-4 ${fillSidebar ? "flex min-h-0 flex-1 flex-col" : ""}`}>
      <div className="mb-3 flex items-center justify-between gap-2 px-1">
        <p className="font-mono text-[9px] tracking-[0.3em] text-white/35 uppercase">Forms</p>
        <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 font-mono text-[9px] text-white/40">
          {forms.length}
        </span>
      </div>
      <div className={`relative ${fillSidebar ? "flex min-h-0 flex-1 flex-col" : ""}`}>
        <div
          className={`analytics-scroll-panel analytics-scroll-panel--forms space-y-0.5 pr-1 ${
            fillSidebar ? "flex-1" : ""
          }`}
        >
          {forms.map((form) => (
            <button
              key={form.id}
              type="button"
              disabled={formBundleLoading && form.id === activeFormId}
              onClick={() => onSelectForm(form.id)}
              className={`group flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left transition-all disabled:opacity-60 ${
                form.id === activeFormId
                  ? "bg-lime-400/10 ring-1 ring-lime-400/20"
                  : "hover:bg-white/5"
              }`}
            >
              <span
                className={`mt-px h-1.5 w-1.5 shrink-0 rounded-full ${
                  form.id === activeFormId ? "bg-lime-400" : "bg-white/20 group-hover:bg-white/40"
                }`}
              />
              <span className="min-w-0 flex-1">
                <span
                  className={`block truncate text-xs font-medium ${
                    form.id === activeFormId ? "text-lime-400" : "text-white/55 group-hover:text-white/80"
                  }`}
                >
                  {form.title}
                </span>
                <span className="mt-0.5 block font-mono text-[9px] text-white/25">
                  {form.submissionCount ?? 0} responses
                  {form.createdAt
                    ? ` · ${new Date(form.createdAt).toLocaleDateString(undefined, { month: "short", day: "numeric" })}`
                    : ""}
                  {formBundleLoading && form.id === activeFormId ? " · loading…" : ""}
                </span>
              </span>
              {(form.submissionCount ?? 0) > 0 && (
                <span
                  className={`shrink-0 rounded-full px-1.5 py-0.5 font-mono text-[8px] ${
                    form.id === activeFormId
                      ? "bg-lime-400/15 text-lime-400"
                      : "bg-white/5 text-white/30"
                  }`}
                >
                  {form.submissionCount}
                </span>
              )}
            </button>
          ))}
        </div>
        {hasMany && (
          <div className="pointer-events-none absolute right-1 bottom-0 left-0 h-8 rounded-b-xl bg-linear-to-t from-black/60 to-transparent" />
        )}
      </div>
    </div>
  );
}

function SubmissionsPanel({
  submissions,
  activeSubmissionId,
  submissionSearch,
  submittedFrom,
  submittedTo,
  showSubmissionsLoading,
  submissionsError,
  submissionsLoading,
  submissionsPage,
  exporting,
  onSearchChange,
  onSubmittedFromChange,
  onSubmittedToChange,
  onSelectSubmission,
  onExportCsv,
  onLoadMore,
  onRetry,
}: {
  submissions: SubmissionItem[];
  activeSubmissionId?: string;
  submissionSearch: string;
  submittedFrom: string;
  submittedTo: string;
  showSubmissionsLoading: boolean;
  submissionsError: boolean;
  submissionsLoading: boolean;
  submissionsPage?: { nextCursor: string | null };
  exporting: boolean;
  onSearchChange: (value: string) => void;
  onSubmittedFromChange: (value: string) => void;
  onSubmittedToChange: (value: string) => void;
  onSelectSubmission: (id: string | undefined) => void;
  onExportCsv: () => void;
  onLoadMore: () => void;
  onRetry: () => void;
}) {
  return (
    <div className="app-surface rounded-3xl p-4">
      <div className="mb-3 flex items-center justify-between gap-2 px-2">
        <p className="font-mono text-[9px] tracking-[0.3em] text-white/35 uppercase">Submissions</p>
        <button
          type="button"
          onClick={onExportCsv}
          disabled={submissions.length === 0 || exporting}
          className="font-mono rounded-lg border border-lime-400/25 px-2 py-1 text-[9px] tracking-widest text-lime-400/90 uppercase transition-colors hover:bg-lime-400/10 disabled:opacity-40"
        >
          {exporting ? "Exporting…" : "Export CSV"}
        </button>
      </div>
      <input
        value={submissionSearch}
        onChange={(e) => onSearchChange(e.target.value)}
        placeholder="Filter by answer…"
        className="mb-2 w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm text-white outline-none placeholder:text-white/25"
      />
      <div className="mb-3 grid gap-2 sm:grid-cols-2">
        <label className="block text-[9px] tracking-widest text-white/35 uppercase">
          From
          <input
            type="date"
            value={submittedFrom}
            onChange={(event) => onSubmittedFromChange(event.target.value)}
            className="mt-1 w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-xs text-white outline-none"
          />
        </label>
        <label className="block text-[9px] tracking-widest text-white/35 uppercase">
          To
          <input
            type="date"
            value={submittedTo}
            onChange={(event) => onSubmittedToChange(event.target.value)}
            className="mt-1 w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-xs text-white outline-none"
          />
        </label>
      </div>
      <div className="analytics-scroll-panel analytics-scroll-panel--submissions pr-1">
        {showSubmissionsLoading ? (
          <p className="px-2 text-sm text-white/40">Loading…</p>
        ) : submissionsError && submissions.length === 0 ? (
          <div className="px-2 text-center">
            <p className="text-sm text-white/50">Could not load submissions.</p>
            <button
              type="button"
              onClick={onRetry}
              className="mt-3 text-xs font-bold tracking-wider text-lime-400 uppercase"
            >
              Retry
            </button>
          </div>
        ) : submissions.length === 0 ? (
          <p className="px-2 text-sm text-white/40">No submissions yet.</p>
        ) : (
          <>
            <div className="space-y-1">
              {submissions.map((item, index) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() =>
                    onSelectSubmission(item.id === activeSubmissionId ? undefined : item.id)
                  }
                  className={`block w-full rounded-xl px-3 py-2.5 text-left text-sm transition-colors ${
                    item.id === activeSubmissionId
                      ? "bg-lime-400/10 text-lime-400"
                      : "text-white/45 hover:bg-white/5 hover:text-white"
                  }`}
                >
                  Participant {submissions.length - index}
                  <span className="mt-0.5 block font-mono text-[9px] text-white/30">
                    {item.submittedAt ? new Date(item.submittedAt).toLocaleString() : "—"}
                  </span>
                </button>
              ))}
            </div>
            {submissionsPage?.nextCursor && (
              <button
                type="button"
                onClick={onLoadMore}
                disabled={submissionsLoading}
                className="mt-3 w-full rounded-xl border border-white/10 py-2 text-xs font-bold tracking-wider text-white/50 uppercase transition-colors hover:border-lime-400/30 hover:text-lime-400 disabled:opacity-40"
              >
                {submissionsLoading ? "Loading…" : "Load more"}
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  suffix = "",
  loading = false,
}: {
  label: string;
  value: number;
  suffix?: string;
  loading?: boolean;
}) {
  return (
    <div className="app-surface rounded-2xl p-5">
      <p className="text-[10px] font-bold tracking-[0.25em] text-white/35 uppercase">{label}</p>
      {loading ? (
        <div className="mt-3 h-10 w-20 animate-pulse rounded-lg bg-white/10" />
      ) : (
        <p className="font-display mt-2 text-4xl text-white">
          {value}
          {suffix}
        </p>
      )}
    </div>
  );
}

function ChartSkeleton() {
  return <div className="h-56 animate-pulse rounded-2xl bg-white/4" />;
}

function Header() {
  return (
    <div className="mb-10 pb-8">
      <div className="mb-2 flex items-center gap-3">
        <span className="h-px w-8 bg-lime-400" />
        <p className="text-[10px] font-bold tracking-[0.3em] text-white/30 uppercase">Insights</p>
      </div>
      <h1 className="font-display text-5xl tracking-tight text-white md:text-6xl">
        <Highlight>Analytics</Highlight> Hub
      </h1>
      <p className="mt-3 text-sm text-white/45">Trends, smart filters, graph & flowchart views for every response.</p>
    </div>
  );
}
