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

const QUERY_OPTS = {
  retry: 2,
  staleTime: 30_000,
} as const;

type AnalyticsContentProps = {
  initialForms?: FormsListPage | null;
  initialFormId?: string;
  initialBundle?: AnalyticsBundle | null;
};

export default function AnalyticsContent({
  initialForms: initialFormsProp,
  initialFormId,
  initialBundle,
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
  const [apiRefreshing, setApiRefreshing] = useState(false);

  const forms = apiForms?.items ?? formsPage?.items ?? initialForms?.items ?? [];

  const activeFormId = selectedFormId ?? forms[0]?.id;
  const isInitialForm = activeFormId === initialFormId && !submissionCursor && !submissionSearch.trim();

  useEffect(() => {
    setSubmissionCursor(undefined);
    setSelectedSubmissionId(undefined);
  }, [activeFormId, submissionSearch]);

  useEffect(() => {
    let cancelled = false;
    void fetch("/api/analytics", { cache: "no-store" })
      .then((response) => response.json())
      .then((data: { forms?: FormsListPage }) => {
        if (!cancelled && data.forms) setApiForms(data.forms);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!activeFormId) return;
    let cancelled = false;
    setApiRefreshing(true);
    void fetch(`/api/analytics?formId=${activeFormId}`, { cache: "no-store" })
      .then((response) => response.json())
      .then((data: { bundle?: AnalyticsBundle }) => {
        if (cancelled || !data.bundle) return;
        setApiBundle(data.bundle);
        if (data.bundle.submissions?.items && !submissionCursor && !submissionSearch.trim()) {
          setLoadedSubmissions(data.bundle.submissions.items);
        }
      })
      .catch(() => undefined)
      .finally(() => {
        if (!cancelled) setApiRefreshing(false);
      });
    return () => {
      cancelled = true;
    };
  }, [activeFormId, submissionCursor, submissionSearch]);

  const {
    data: summary,
    isLoading: summaryLoading,
    isError: summaryError,
    refetch: refetchSummary,
  } = trpc.analytics.summary.useQuery(
    { formId: activeFormId },
    {
      enabled: Boolean(user && activeFormId),
      initialData: isInitialForm ? (initialBundle?.summary ?? undefined) : undefined,
      ...QUERY_OPTS,
    },
  );

  const { data: overTime, isLoading: overTimeLoading } = trpc.analytics.submissionsOverTime.useQuery(
    { formId: activeFormId!, days: 30 },
    {
      enabled: Boolean(user && activeFormId),
      initialData: isInitialForm ? (initialBundle?.overTime ?? undefined) : undefined,
      ...QUERY_OPTS,
    },
  );

  const { data: formFields } = trpc.analytics.listFormFields.useQuery(
    { formId: activeFormId! },
    {
      enabled: Boolean(user && activeFormId),
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
      enabled: Boolean(user && activeFormId && activeFieldId),
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
      enabled: Boolean(user && activeFormId),
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
      enabled: Boolean(user && activeFormId),
      initialData: isInitialForm ? (initialBundle?.allSubmissions ?? undefined) : undefined,
      ...QUERY_OPTS,
    },
  );
  const allSubmissions = allSubmissionsPage?.items ?? apiBundle?.allSubmissions?.items ?? initialBundle?.allSubmissions?.items ?? [];

  useEffect(() => {
    if (!submissionsPage) return;
    setLoadedSubmissions((prev) =>
      submissionCursor ? [...prev, ...submissionsPage.items] : submissionsPage.items,
    );
  }, [submissionsPage, submissionCursor]);

  const resolvedSummary = apiBundle?.summary ?? summary;
  const resolvedOverTime = apiBundle?.overTime ?? overTime;
  const resolvedFormFields = apiBundle?.formFields ?? formFields;
  const resolvedActiveFieldId = selectedFieldId ?? resolvedFormFields?.fields[0]?.id;
  const apiFieldBreakdown =
    apiBundle?.fieldBreakdown?.fieldId === resolvedActiveFieldId
      ? apiBundle?.fieldBreakdown
      : undefined;
  const resolvedFieldBreakdown = apiFieldBreakdown ?? fieldBreakdown;

  const submissions = loadedSubmissions;
  const activeSubmissionId = selectedSubmissionId;
  const activeForm = forms.find((form) => form.id === activeFormId);

  const statsLoading =
    apiRefreshing || formsLoading || (summaryLoading && !resolvedSummary && !apiBundle?.summary);
  const showSubmissionsLoading =
    (submissionsLoading || apiRefreshing) && submissions.length === 0 && !submissionsError;

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
              if (activeFormId) {
                void fetch(`/api/analytics?formId=${activeFormId}`, { cache: "no-store" })
                  .then((response) => response.json())
                  .then((data: { bundle?: AnalyticsBundle }) => {
                    if (data.bundle) setApiBundle(data.bundle);
                  });
              }
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
        <aside className="min-w-0 space-y-4 lg:sticky lg:top-8 lg:self-start">
          <div className="app-surface rounded-3xl p-4">
            <p className="font-mono mb-3 px-2 text-[9px] tracking-[0.3em] text-white/35 uppercase">Forms</p>
            <div className="max-h-60 space-y-1 overflow-y-auto overscroll-contain">
              {forms.map((form) => (
                <button
                  key={form.id}
                  type="button"
                  onClick={() => {
                    setSelectedFormId(form.id);
                    setSelectedSubmissionId(undefined);
                    setSelectedFieldId(undefined);
                  }}
                  className={`block w-full rounded-xl px-3 py-2.5 text-left text-sm transition-colors ${
                    form.id === activeFormId
                      ? "bg-lime-400/10 text-lime-400"
                      : "text-white/45 hover:bg-white/5 hover:text-white"
                  }`}
                >
                  <span className="block truncate">{form.title}</span>
                  <span className="mt-0.5 block font-mono text-[9px] text-white/30">
                    {form.submissionCount} responses
                  </span>
                </button>
              ))}
            </div>
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
                <div className="max-h-72 space-y-1 overflow-y-auto">
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
        </aside>

        <div className="space-y-6">
          <div className="app-surface rounded-3xl p-6">
            <h3 className="font-display mb-4 text-lg font-bold text-white">Submissions over time</h3>
            <div className="h-56">
              {!chartsMounted || (overTimeLoading && !resolvedOverTime) ? (
                <ChartSkeleton />
              ) : resolvedOverTime && resolvedOverTime.points.length > 0 ? (
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
              ) : (
                <p className="flex h-full items-center justify-center text-sm text-white/40">
                  No submission data for this period yet.
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
