"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
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
import { downloadSubmissionsCsv } from "~/lib/export-csv";
import { trpc } from "~/trpc/client";

const SubmissionFlowChart = dynamic(
  () =>
    import("~/components/analytics/submission-flow-chart").then((mod) => ({
      default: mod.SubmissionFlowChart,
    })),
  {
    loading: () => <div className="app-surface h-64 animate-pulse rounded-3xl bg-white/3" />,
  },
);

export default function AnalyticsContent() {
  const searchParams = useSearchParams();
  const initialFormId = searchParams.get("form") ?? undefined;
  const [chartsMounted, setChartsMounted] = useState(false);

  useEffect(() => {
    setChartsMounted(true);
  }, []);

  const { data: formsPage, isLoading: formsLoading } = trpc.forms.list.useQuery({ limit: 100 });
  const forms = formsPage?.items ?? [];
  const [selectedFormId, setSelectedFormId] = useState<string | undefined>(initialFormId);
  const [selectedSubmissionId, setSelectedSubmissionId] = useState<string | undefined>();
  const [selectedFieldId, setSelectedFieldId] = useState<string | undefined>();

  const activeFormId = selectedFormId ?? forms[0]?.id;

  const { data: summary } = trpc.analytics.summary.useQuery(
    { formId: activeFormId },
    { enabled: Boolean(activeFormId) },
  );

  const { data: overTime } = trpc.analytics.submissionsOverTime.useQuery(
    { formId: activeFormId!, days: 30 },
    { enabled: Boolean(activeFormId) },
  );

  const { data: formFields } = trpc.analytics.listFormFields.useQuery(
    { formId: activeFormId! },
    { enabled: Boolean(activeFormId) },
  );

  const activeFieldId = selectedFieldId ?? formFields?.fields[0]?.id;

  const { data: fieldBreakdown } = trpc.analytics.fieldBreakdown.useQuery(
    { formId: activeFormId!, fieldId: activeFieldId! },
    { enabled: Boolean(activeFormId && activeFieldId) },
  );

  const { data: submissionsPage, isLoading: submissionsLoading } = trpc.forms.listSubmissions.useQuery(
    { formId: activeFormId!, limit: 100 },
    { enabled: Boolean(activeFormId) },
  );
  const submissions = submissionsPage?.items ?? [];

  const activeSubmissionId = selectedSubmissionId ?? submissions[0]?.id;

  const { data: submission, isLoading: submissionLoading } = trpc.forms.getSubmission.useQuery(
    { submissionId: activeSubmissionId! },
    { enabled: Boolean(activeSubmissionId) },
  );

  const activeForm = forms.find((form) => form.id === activeFormId);

  const handleExportCsv = () => {
    if (!activeForm || submissions.length === 0) return;
    downloadSubmissionsCsv(activeForm.title, submissions);
  };

  const participantLabel = useMemo(() => {
    if (!submission?.submittedAt) return undefined;
    return `Submission · ${new Date(submission.submittedAt).toLocaleString()}`;
  }, [submission?.submittedAt]);

  if (formsLoading) {
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

      <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total forms" value={summary?.totalForms ?? 0} loading={formsLoading} />
        <StatCard label="Total responses" value={summary?.totalSubmissions ?? 0} loading={formsLoading} />
        <StatCard label="Last 7 days" value={summary?.submissionsLast7Days ?? 0} loading={formsLoading} />
        <StatCard
          label="Completion rate"
          value={summary?.selectedForm?.completionRate ?? summary?.averageCompletionRate ?? 0}
          suffix="%"
          loading={formsLoading}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-[260px_1fr]">
        <aside className="space-y-6">
          <div className="app-surface rounded-3xl p-4">
            <p className="font-mono mb-3 px-2 text-[9px] tracking-[0.3em] text-white/35 uppercase">Forms</p>
            <div className="space-y-1">
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
                  {form.title}
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
                disabled={submissions.length === 0}
                className="font-mono rounded-lg border border-lime-400/25 px-2 py-1 text-[9px] tracking-widest text-lime-400/90 uppercase transition-colors hover:bg-lime-400/10 disabled:opacity-40"
              >
                Export CSV
              </button>
            </div>
            {submissionsLoading ? (
              <p className="px-2 text-sm text-white/40">Loading…</p>
            ) : submissions.length === 0 ? (
              <p className="px-2 text-sm text-white/40">No submissions yet.</p>
            ) : (
              <div className="max-h-72 space-y-1 overflow-y-auto">
                {submissions.map((item, index) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setSelectedSubmissionId(item.id)}
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
            )}
          </div>
        </aside>

        <div className="space-y-6">
          <div className="app-surface rounded-3xl p-6">
            <h3 className="font-display mb-4 text-lg font-bold text-white">Submissions over time</h3>
            <div className="h-56">
              {!chartsMounted || !overTime ? (
                <ChartSkeleton />
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={overTime.points}>
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
              )}
            </div>
          </div>

          {formFields && formFields.fields.length > 0 && (
            <div className="app-surface rounded-3xl p-6">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <h3 className="font-display text-lg font-bold text-white">Field breakdown</h3>
                <select
                  value={activeFieldId ?? ""}
                  onChange={(e) => setSelectedFieldId(e.target.value)}
                  className="rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm text-white outline-none"
                >
                  {formFields.fields.map((field) => (
                    <option key={field.id} value={field.id}>
                      {field.label}
                    </option>
                  ))}
                </select>
              </div>

              {!chartsMounted || !fieldBreakdown ? (
                <ChartSkeleton />
              ) : (
                <div className="space-y-4">
                  <div className="flex flex-wrap gap-4 text-sm text-white/50">
                    <span>{fieldBreakdown.totalResponses} responses</span>
                    {fieldBreakdown.averageRating !== null && (
                      <span>Avg rating: {fieldBreakdown.averageRating}</span>
                    )}
                  </div>

                  {fieldBreakdown.optionCounts.length > 0 && (
                    <div className="h-56">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={fieldBreakdown.optionCounts}>
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
                  )}
                </div>
              )}
            </div>
          )}

          {submissions.length === 0 ? (
            <div className="text-center">
              <p className="text-white/50">Share your form link to collect the first submission.</p>
              {activeFormId && (
                <Link
                  href={`/f/${activeFormId}`}
                  className="font-annotate mt-4 inline-block text-xl text-lime-400"
                  target="_blank"
                >
                  Open form →
                </Link>
              )}
            </div>
          ) : submissionLoading || !submission ? (
            <p className="text-white/40">Loading submission flow…</p>
          ) : (
            <SubmissionFlowChart answers={submission.answers} participantLabel={participantLabel} />
          )}
        </div>
      </div>
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
  return <div className="h-full animate-pulse rounded-2xl bg-white/4" />;
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
      <p className="mt-3 text-sm text-white/45">Aggregate metrics, trends, and per-submission flow views.</p>
    </div>
  );
}
