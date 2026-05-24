"use client";

import dynamic from "next/dynamic";
import { useCallback, useMemo, useState } from "react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { BarChart3, GitBranch, Users, X } from "lucide-react";

import type { RouterOutputs } from "@repo/trpc/client";
import {
  applySubmissionFilters,
  buildFilterableFields,
  getParticipantName,
  type ActiveFieldFilters,
} from "~/lib/analytics-filters";
import { formatCheckboxAnswerValue } from "~/lib/checkbox-value";

const AggregateFlowChart = dynamic(
  () =>
    import("~/components/analytics/aggregate-flow-chart").then((mod) => ({
      default: mod.AggregateFlowChart,
    })),
  { loading: () => <div className="h-[620px] animate-pulse rounded-[32px] bg-white/3" /> },
);

const SubmissionFlowChart = dynamic(
  () =>
    import("~/components/analytics/submission-flow-chart").then((mod) => ({
      default: mod.SubmissionFlowChart,
    })),
  { loading: () => <div className="h-64 animate-pulse rounded-3xl bg-white/3" /> },
);

type FormField = RouterOutputs["analytics"]["listFormFields"]["fields"][number];
type Submission = RouterOutputs["forms"]["listSubmissions"]["items"][number];

type AnalyticsDetailPanelProps = {
  fields: FormField[];
  submissions: Submission[];
  allSubmissionsCount: number;
  selectedSubmissionId?: string;
  onSelectSubmission: (submissionId: string) => void;
  chartsMounted: boolean;
};

export function AnalyticsDetailPanel({
  fields,
  submissions,
  allSubmissionsCount,
  selectedSubmissionId,
  onSelectSubmission,
  chartsMounted,
}: AnalyticsDetailPanelProps) {
  const [viewMode, setViewMode] = useState<"graph" | "flow">("graph");
  const [activeFilters, setActiveFilters] = useState<ActiveFieldFilters>({});

  const filterableFields = useMemo(
    () => buildFilterableFields(fields, submissions),
    [fields, submissions],
  );

  const filteredSubmissions = useMemo(
    () => applySubmissionFilters(submissions, activeFilters),
    [submissions, activeFilters],
  );

  const activeSubmission =
    filteredSubmissions.find((item) => item.id === selectedSubmissionId) ?? filteredSubmissions[0];

  const toggleFilter = useCallback((fieldId: string, value: string) => {
    setActiveFilters((prev) => {
      if (prev[fieldId] === value) {
        const next = { ...prev };
        delete next[fieldId];
        return next;
      }
      return { ...prev, [fieldId]: value };
    });
  }, []);

  const clearFilters = () => setActiveFilters({});

  const hasActiveFilters = Object.keys(activeFilters).length > 0;

  return (
    <div className="app-surface rounded-[40px] p-6 md:p-8">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="mb-2 flex items-center gap-2">
            <Users size={16} className="text-lime-400" />
            <p className="font-mono text-[9px] tracking-[0.3em] text-white/35 uppercase">Detailed analysis</p>
          </div>
          <h3 className="font-display text-2xl font-bold text-white">Participant insights</h3>
          <p className="mt-2 text-sm text-white/45">
            {filteredSubmissions.length} of {allSubmissionsCount} participants shown
            {hasActiveFilters ? " · filters active" : ""}
          </p>
        </div>

        <div className="flex rounded-2xl border border-white/10 bg-black/40 p-1">
          <button
            type="button"
            onClick={() => setViewMode("graph")}
            className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold tracking-wider uppercase transition-colors ${
              viewMode === "graph" ? "bg-lime-400 text-black" : "text-white/50 hover:text-white"
            }`}
          >
            <BarChart3 size={14} />
            Graph
          </button>
          <button
            type="button"
            onClick={() => setViewMode("flow")}
            className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold tracking-wider uppercase transition-colors ${
              viewMode === "flow" ? "bg-lime-400 text-black" : "text-white/50 hover:text-white"
            }`}
          >
            <GitBranch size={14} />
            Flowchart
          </button>
        </div>
      </div>

      {filterableFields.length > 0 ? (
        <div className="mb-6 space-y-4 rounded-3xl border border-white/8 bg-white/2 p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="font-mono text-[9px] tracking-[0.28em] text-white/35 uppercase">
              Smart filters · based on this form&apos;s fields
            </p>
            {hasActiveFilters && (
              <button
                type="button"
                onClick={clearFilters}
                className="inline-flex items-center gap-1 rounded-full border border-white/10 px-3 py-1 text-[10px] font-bold tracking-wider text-white/50 uppercase hover:border-lime-400/30 hover:text-lime-400"
              >
                <X size={12} />
                Clear filters
              </button>
            )}
          </div>

          {filterableFields.map((field) => (
            <div key={field.fieldId}>
              <p className="mb-2 text-xs font-semibold text-white/70">{field.label}</p>
              <div className="flex flex-wrap gap-2">
                {field.options.map((option) => {
                  const active = activeFilters[field.fieldId] === option.value;
                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => toggleFilter(field.fieldId, option.value)}
                      className={`rounded-full border px-3 py-1.5 text-[11px] font-bold transition-colors ${
                        active
                          ? "border-lime-400 bg-lime-400/15 text-lime-300"
                          : "border-white/10 bg-black/30 text-white/55 hover:border-lime-400/25 hover:text-lime-300"
                      }`}
                    >
                      {option.label}
                      <span className="ml-1.5 font-mono text-[10px] text-white/35">({option.count})</span>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="mb-6 text-sm text-white/40">
          Add rating, select, or checkbox fields to unlock smart filters for this form.
        </p>
      )}

      {viewMode === "graph" ? (
        <div className="space-y-6">
          {filterableFields.length > 0 && chartsMounted && (
            <div className="grid gap-4 lg:grid-cols-2">
              {filterableFields.map((field) => (
                <div key={field.fieldId} className="rounded-3xl border border-white/8 bg-black/25 p-4">
                  <p className="mb-3 text-sm font-semibold text-white">{field.label}</p>
                  <div className="h-48">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={field.options}>
                        <CartesianGrid stroke="rgba(255,255,255,0.06)" />
                        <XAxis dataKey="label" tick={{ fill: "rgba(255,255,255,0.35)", fontSize: 9 }} />
                        <YAxis allowDecimals={false} tick={{ fill: "rgba(255,255,255,0.35)", fontSize: 10 }} />
                        <Tooltip
                          contentStyle={{ background: "#111", border: "1px solid rgba(255,255,255,0.1)" }}
                        />
                        <Bar dataKey="count" fill="#4ade80" radius={[6, 6, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              ))}
            </div>
          )}

          <ParticipantList
            submissions={filteredSubmissions}
            activeSubmissionId={activeSubmission?.id}
            onSelect={onSelectSubmission}
          />
        </div>
      ) : (
        <div className="space-y-6">
          <p className="text-sm text-white/45">
            Click any option in the flow to filter participants — e.g. tap ⭐ 1 to see critical reviews only.
          </p>
          <AggregateFlowChart
            fields={filterableFields}
            participantCount={filteredSubmissions.length}
            activeFilters={activeFilters}
            onFilterSelect={toggleFilter}
          />

          {activeSubmission ? (
            <SubmissionFlowChart
              answers={activeSubmission.answers}
              participantLabel={`${getParticipantName(activeSubmission, 0)} · ${activeSubmission.submittedAt ? new Date(activeSubmission.submittedAt).toLocaleString() : "—"}`}
            />
          ) : (
            <p className="text-sm text-white/40">No participants match the current filters.</p>
          )}

          <ParticipantList
            submissions={filteredSubmissions}
            activeSubmissionId={activeSubmission?.id}
            onSelect={onSelectSubmission}
          />
        </div>
      )}
    </div>
  );
}

function ParticipantList({
  submissions,
  activeSubmissionId,
  onSelect,
}: {
  submissions: Submission[];
  activeSubmissionId?: string;
  onSelect: (id: string) => void;
}) {
  if (submissions.length === 0) {
    return <p className="text-sm text-white/40">No participants match these filters.</p>;
  }

  return (
    <div>
      <p className="font-mono mb-3 text-[9px] tracking-[0.28em] text-white/35 uppercase">
        Participant responses
      </p>
      <div className="space-y-3">
        {submissions.map((submission, index) => {
          const active = submission.id === activeSubmissionId;
          return (
            <button
              key={submission.id}
              type="button"
              onClick={() => onSelect(submission.id)}
              className={`w-full rounded-3xl border px-4 py-4 text-left transition-colors ${
                active
                  ? "border-lime-400/35 bg-lime-400/8"
                  : "border-white/8 bg-white/2 hover:border-white/15 hover:bg-white/4"
              }`}
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-bold text-white">{getParticipantName(submission, index)}</p>
                  <p className="mt-1 font-mono text-[10px] text-white/35">
                    {submission.submittedAt ? new Date(submission.submittedAt).toLocaleString() : "—"}
                  </p>
                </div>
                <span className="rounded-full border border-white/10 px-2 py-0.5 font-mono text-[9px] tracking-wider text-white/40 uppercase">
                  {submission.answers.filter((answer) => answer.value.trim()).length} answers
                </span>
              </div>

              <div className="mt-3 space-y-1">
                {submission.answers
                  .filter((answer) => answer.value.trim().length > 0)
                  .map((answer) => (
                    <p key={answer.fieldId} className="text-xs text-white/55">
                      <span className="text-white/75">{answer.label}:</span>{" "}
                      {answer.type === "rating"
                        ? `⭐ ${answer.value}`
                        : answer.type === "checkbox"
                          ? formatCheckboxAnswerValue(answer.value)
                          : answer.value}
                    </p>
                  ))}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
