"use client";

import { useCallback, useEffect, useState } from "react";
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

const FORMS_PER_PAGE = 6;

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
  const { data: formsPage, isLoading: formsLoading } = trpc.forms.list.useQuery(
    { limit: 100 },
    {
      initialData: initialForms ?? undefined,
      enabled: Boolean(user),
      ...QUERY_OPTS,
    },
  );

  const [selectedFormId, setSelectedFormId] = useState<string | undefined>(initialFormId);
  const [selectedSubmissionId, setSelectedSubmissionId] = useState<string | undefined>();
  const [selectedFieldId, setSelectedFieldId] = useState<string | undefined>();
  const [submissionSearch, setSubmissionSearch] = useState("");
  const [submissionCursor, setSubmissionCursor] = useState<string | undefined>();
  const [loadedSubmissions, setLoadedSubmissions] = useState<SubmissionItem[]>(
    initialBundle?.submissions?.items ?? [],
  );
  const [apiForms, setApiForms] = useState<FormsListPage | null>(initialForms ?? null);
  const [apiBundle, setApiBundle] = useState<AnalyticsBundle | null>(initialBundle ?? null);
  const [bundleFormId, setBundleFormId] = useState<string | undefined>(initialFormId);
  const [apiSummary, setApiSummary] = useState<SummaryData | null>(
    initialSummary ?? initialBundle?.summary ?? null,
  );
  const [formsListPage, setFormsListPage] = useState(0);
  const [formBundleLoading, setFormBundleLoading] = useState(false);

  const forms = apiForms?.items ?? formsPage?.items ?? initialForms?.items ?? [];

  const loadFormBundle = useCallback(
    async (formId: string) => {
      setFormBundleLoading(true);
      try {
        const response = await fetch(`/api/analytics?formId=${formId}`, { cache: "no-store" });
        if (response.ok) {
          const data = (await response.json()) as { bundle?: AnalyticsBundle };
          if (data.bundle) {
            setApiBundle(data.bundle);
            setBundleFormId(formId);
            if (data.bundle.summary) setApiSummary(data.bundle.summary);
            if (data.bundle.submissions?.items) {
              setLoadedSubmissions(data.bundle.submissions.items);
            }
            return;
          }
        }

        const [summaryRes, overTimeRes, fieldsRes, subsRes, allSubsRes] = await Promise.all([
          utils.analytics.summary.fetch({ formId }).catch(() => null),
          utils.analytics.submissionsOverTime.fetch({ formId, days: 30 }).catch(() => null),
          utils.analytics.listFormFields.fetch({ formId }).catch(() => null),
          utils.forms.listSubmissions.fetch({ formId, limit: 15 }).catch(() => null),
          utils.forms.listSubmissions.fetch({ formId, limit: 100 }).catch(() => null),
        ]);

        const firstFieldId = fieldsRes?.fields[0]?.id;
        const breakdownRes = firstFieldId
          ? await utils.analytics.fieldBreakdown
              .fetch({ formId, fieldId: firstFieldId })
              .catch(() => null)
          : null;

        setApiBundle({
          summary: summaryRes,
          overTime: overTimeRes,
          formFields: fieldsRes,
          fieldBreakdown: breakdownRes,
          submissions: subsRes,
          allSubmissions: allSubsRes,
        });
        setBundleFormId(formId);
        if (summaryRes) setApiSummary(summaryRes);
        if (subsRes?.items) setLoadedSubmissions(subsRes.items);
      } catch {
        toast.error("Could not load analytics for this form");
      } finally {
        setFormBundleLoading(false);
      }
    },
    [utils],
  );

  const activeFormId = selectedFormId ?? forms[0]?.id;
  const isInitialForm = activeFormId === initialFormId && !submissionCursor && !submissionSearch.trim();

  useEffect(() => {
    setSubmissionCursor(undefined);
    setSelectedSubmissionId(undefined);
    setSelectedFieldId(undefined);
    setLoadedSubmissions([]);
  }, [activeFormId]);

  useEffect(() => {
    setSubmissionCursor(undefined);
  }, [submissionSearch]);

  useEffect(() => {
    let cancelled = false;
    void fetch("/api/analytics", { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) return null;
        return response.json() as Promise<{ forms?: FormsListPage; summary?: SummaryData }>;
      })
      .then((data) => {
        if (cancelled || !data) return;
        if (data.forms) setApiForms(data.forms);
        if (data.summary) setApiSummary(data.summary);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!activeFormId) return;
    void loadFormBundle(activeFormId);
  }, [activeFormId, loadFormBundle]);

  useEffect(() => {
    if (!activeFormId || forms.length === 0) return;
    const index = forms.findIndex((form) => form.id === activeFormId);
    if (index >= 0) {
      setFormsListPage(Math.floor(index / FORMS_PER_PAGE));
    }
  }, [activeFormId, forms]);

  const {
    data: summary,
    isError: summaryError,
    refetch: refetchSummary,
  } = trpc.analytics.summary.useQuery(
    { formId: activeFormId },
    {
      enabled: Boolean(activeFormId),
      initialData: isInitialForm ? (initialBundle?.summary ?? undefined) : undefined,
      ...QUERY_OPTS,
    },
  );

  const { data: overTime, isLoading: overTimeLoading, isError: overTimeError } =
    trpc.analytics.submissionsOverTime.useQuery(
    { formId: activeFormId!, days: 30 },
    {
      enabled: Boolean(activeFormId),
      initialData: isInitialForm ? (initialBundle?.overTime ?? undefined) : undefined,
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
  const allSubmissions =
    allSubmissionsPage?.items ??
    (bundleFormId === activeFormId ? apiBundle?.allSubmissions?.items : undefined) ??
    (isInitialForm ? initialBundle?.allSubmissions?.items : undefined) ??
    [];

  useEffect(() => {
    if (!submissionsPage || submissionsLoading) return;
    setLoadedSubmissions((prev) =>
      submissionCursor ? [...prev, ...submissionsPage.items] : submissionsPage.items,
    );
  }, [submissionsPage, submissionCursor, submissionsLoading]);

  const activeForm = forms.find((form) => form.id === activeFormId);
  const activeApiBundle = bundleFormId === activeFormId ? apiBundle : null;
  const submissionItemsForChart =
    allSubmissionsPage?.items ??
    (bundleFormId === activeFormId ? apiBundle?.allSubmissions?.items : undefined) ??
    submissionsPage?.items ??
    loadedSubmissions;
  const fallbackOverTime =
    submissionItemsForChart.length > 0
      ? buildOverTimeFromSubmissions(submissionItemsForChart)
      : null;
  const resolvedSummary =
    summary ??
    activeApiBundle?.summary ??
    (forms.length > 0 ? buildFallbackSummary(forms, activeForm) : null);
  const resolvedOverTime = activeApiBundle?.overTime ?? overTime ?? fallbackOverTime;
  const resolvedFormFields = activeApiBundle?.formFields ?? formFields;
  const resolvedActiveFieldId = selectedFieldId ?? resolvedFormFields?.fields[0]?.id;
  const apiFieldBreakdown =
    activeApiBundle?.fieldBreakdown?.fieldId === resolvedActiveFieldId
      ? activeApiBundle?.fieldBreakdown
      : undefined;
  const resolvedFieldBreakdown = apiFieldBreakdown ?? fieldBreakdown;

  const submissions =
    loadedSubmissions.length > 0 ? loadedSubmissions : (submissionsPage?.items ?? []);
  const activeSubmissionId = selectedSubmissionId;

  const statsLoading = formsLoading && forms.length === 0;
  const showSubmissionsLoading =
    submissionsLoading && submissions.length === 0 && !submissionsError;
  const chartLoading = (overTimeLoading || formBundleLoading) && !resolvedOverTime;
  const chartHasData = resolvedOverTime ? chartHasActivity(resolvedOverTime.points) : false;

  const totalFormPages = Math.max(1, Math.ceil(forms.length / FORMS_PER_PAGE));
  const safeFormsPage = Math.min(formsListPage, totalFormPages - 1);
  const visibleForms = forms.slice(
    safeFormsPage * FORMS_PER_PAGE,
    safeFormsPage * FORMS_PER_PAGE + FORMS_PER_PAGE,
  );

  const handleExportCsv = async () => {
    if (!activeForm || !activeFormId) return;
    setExporting(true);
    try {
      const allRows: SubmissionItem[] = [];
      let cursor: string | undefined;
      do {
        const page = await utils.forms.listSubmissions.fetch({
          formId: activeFormId,
          limit: 100,
          cursor,
          search: submissionSearch.trim() || undefined,
        });
        allRows.push(...page.items);
        cursor = page.nextCursor ?? undefined;
      } while (cursor);

      if (allRows.length === 0) {
        toast.error("No submissions to export");
        return;
      }

      downloadSubmissionsCsv(activeForm.title, allRows);
      toast.success(`Exported ${allRows.length} submissions`);
    } catch {
      toast.error("Could not export submissions");
    } finally {
      setExporting(false);
    }
  };

  if (formsLoading && forms.length === 0) {
    return <p className="text-white/40">Loading forms…</p>;
  }

  if (forms.length === 0) {
    return (
      <section className="py-4">
        <Header />
        <div className="text-center">
          <p className="text-white/50">No analytics yet — create a form and collect responses first.</p>
          <Link href="/forms/new" className="font-annotate mt-4 inline-block text-xl text-lime-400">
            Create a form →
          </Link>
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
            onClick={() => {
              void refetchSummary();
              void loadFormBundle(activeFormId);
            }}
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

      <div className="grid gap-6 lg:grid-cols-[minmax(0,240px)_minmax(0,1fr)]">
        <aside className="min-w-0 space-y-4 lg:sticky lg:top-8 lg:self-start lg:max-h-[calc(100vh-6rem)] lg:overflow-hidden">
          <div className="app-surface rounded-3xl p-4">
            <div className="mb-3 flex items-center justify-between gap-2 px-2">
              <p className="font-mono text-[9px] tracking-[0.3em] text-white/35 uppercase">Forms</p>
              <span className="font-mono text-[9px] text-white/25">
                {forms.length} · p{safeFormsPage + 1}/{totalFormPages}
              </span>
            </div>
            <div
              className="analytics-scroll-panel space-y-1 pr-1"
              style={{ height: "11rem", maxHeight: "11rem", overflowY: "scroll" }}
            >
              {visibleForms.map((form) => (
                <button
                  key={form.id}
                  type="button"
                  disabled={formBundleLoading && form.id === activeFormId}
                  onClick={() => {
                    setSelectedFormId(form.id);
                    setSelectedSubmissionId(undefined);
                    setSelectedFieldId(undefined);
                  }}
                  className={`block w-full rounded-xl px-3 py-2.5 text-left text-sm transition-colors disabled:opacity-60 ${
                    form.id === activeFormId
                      ? "bg-lime-400/10 text-lime-400"
                      : "text-white/45 hover:bg-white/5 hover:text-white"
                  }`}
                >
                  <span className="block truncate">{form.title}</span>
                  <span className="mt-0.5 block font-mono text-[9px] text-white/30">
                    {form.submissionCount} responses
                    {form.createdAt
                      ? ` · ${new Date(form.createdAt).toLocaleDateString(undefined, { month: "short", day: "numeric" })}`
                      : ""}
                    {formBundleLoading && form.id === activeFormId ? " · loading…" : ""}
                  </span>
                </button>
              ))}
            </div>
            {totalFormPages > 1 ? (
              <div className="mt-3 flex items-center justify-between gap-2 px-1">
                <button
                  type="button"
                  disabled={safeFormsPage === 0}
                  onClick={() => setFormsListPage((page) => Math.max(0, page - 1))}
                  className="rounded-lg border border-white/10 px-2 py-1 font-mono text-[9px] tracking-wider text-white/45 uppercase transition-colors hover:border-lime-400/30 hover:text-lime-400 disabled:opacity-30"
                >
                  Prev
                </button>
                <span className="font-mono text-[9px] text-white/30">
                  {safeFormsPage + 1} / {totalFormPages}
                </span>
                <button
                  type="button"
                  disabled={safeFormsPage >= totalFormPages - 1}
                  onClick={() =>
                    setFormsListPage((page) => Math.min(totalFormPages - 1, page + 1))
                  }
                  className="rounded-lg border border-white/10 px-2 py-1 font-mono text-[9px] tracking-wider text-white/45 uppercase transition-colors hover:border-lime-400/30 hover:text-lime-400 disabled:opacity-30"
                >
                  Next
                </button>
              </div>
            ) : null}
          </div>

          <div className="app-surface rounded-3xl p-4">
            <div className="mb-3 flex items-center justify-between gap-2 px-2">
              <p className="font-mono text-[9px] tracking-[0.3em] text-white/35 uppercase">Submissions</p>
              <button
                type="button"
                onClick={handleExportCsv}
                disabled={submissions.length === 0 || exporting}
                className="font-mono rounded-lg border border-lime-400/25 px-2 py-1 text-[9px] tracking-widest text-lime-400/90 uppercase transition-colors hover:bg-lime-400/10 disabled:opacity-40"
              >
                {exporting ? "Exporting…" : "Export CSV"}
              </button>
            </div>
            <input
              value={submissionSearch}
              onChange={(e) => setSubmissionSearch(e.target.value)}
              placeholder="Filter by answer…"
              className="mb-3 w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm text-white outline-none placeholder:text-white/25"
            />
            <div className="analytics-scroll-panel analytics-scroll-panel--submissions pr-1">
            {showSubmissionsLoading ? (
              <p className="px-2 text-sm text-white/40">Loading…</p>
            ) : submissionsError && submissions.length === 0 ? (
              <div className="px-2 text-center">
                <p className="text-sm text-white/50">Could not load submissions.</p>
                <button
                  type="button"
                  onClick={() => refetchSubmissions()}
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
                        setSelectedSubmissionId(
                          item.id === activeSubmissionId ? undefined : item.id,
                        )
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
                    onClick={() => setSubmissionCursor(submissionsPage.nextCursor ?? undefined)}
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
        </aside>

        <div className="space-y-6">
          <div className="app-surface rounded-3xl p-6">
            <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
              <h3 className="font-display text-lg font-bold text-white">Submissions over time</h3>
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
                    onClick={() => void utils.analytics.submissionsOverTime.invalidate({ formId: activeFormId!, days: 30 })}
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
                      ? `${activeForm?.submissionCount ?? 0} responses exist, but none in the last 30 days.`
                      : "No submission data for this period yet."}
                </p>
              )}
            </div>
          </div>

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
            chartsMounted={chartsMounted}
          />
        </div>
      )}
    </section>
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
