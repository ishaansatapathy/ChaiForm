import type { RouterOutputs } from "@repo/trpc/client";

type FormField = RouterOutputs["analytics"]["listFormFields"]["fields"][number];
type Submission = RouterOutputs["forms"]["listSubmissions"]["items"][number];

export type FilterableField = {
  fieldId: string;
  label: string;
  type: "rating" | "select" | "checkbox";
  options: { value: string; label: string; count: number }[];
};

export type ActiveFieldFilters = Record<string, string>;

export function buildFilterableFields(
  fields: FormField[],
  submissions: Submission[],
): FilterableField[] {
  return fields
    .map((field) => {
      const counts = new Map<string, number>();

      for (const submission of submissions) {
        const answer = submission.answers.find((item) => item.fieldId === field.id);
        const value = answer?.value?.trim();
        if (!value) continue;
        counts.set(value, (counts.get(value) ?? 0) + 1);
      }

      if (counts.size === 0) return null;

      let options = Array.from(counts.entries())
        .map(([value, count]) => ({
          value,
          label: formatFilterLabel(field, value),
          count,
        }))
        .sort((a, b) => {
          if (field.type === "rating") return Number(a.value) - Number(b.value);
          return b.count - a.count;
        });

      if (field.type === "rating") {
        const max = field.config?.maxRating ?? 5;
        const existing = new Set(options.map((option) => option.value));
        for (let star = 1; star <= max; star += 1) {
          const value = String(star);
          if (!existing.has(value)) {
            options.push({ value, label: formatFilterLabel(field, value), count: 0 });
          }
        }
        options.sort((a, b) => Number(a.value) - Number(b.value));
      }

      if (field.type === "select" && field.config?.options) {
        const configured = field.config.options;
        const existing = new Map(options.map((option) => [option.value, option]));
        options = configured.map((value) => existing.get(value) ?? {
          value,
          label: value,
          count: 0,
        });
      }

      if (!isFilterableType(field.type)) return null;

      return {
        fieldId: field.id,
        label: field.label,
        type: field.type,
        options,
      } satisfies FilterableField;
    })
    .filter((field): field is FilterableField => field !== null);
}

function isFilterableType(type: string): type is FilterableField["type"] {
  return type === "rating" || type === "select" || type === "checkbox";
}

function formatFilterLabel(field: FormField, value: string) {
  if (field.type === "rating") {
    const star = Number(value);
    if (star <= 2) return `⭐ ${value} · Critical`;
    if (star >= 4) return `⭐ ${value} · Positive`;
    return `⭐ ${value}`;
  }
  if (field.type === "checkbox") {
    return value === "true" ? "Checked" : "Unchecked";
  }
  return value;
}

export function applySubmissionFilters(
  submissions: Submission[],
  filters: ActiveFieldFilters,
): Submission[] {
  const entries = Object.entries(filters).filter(([, value]) => value.length > 0);
  if (entries.length === 0) return submissions;

  return submissions.filter((submission) =>
    entries.every(([fieldId, expected]) => {
      const answer = submission.answers.find((item) => item.fieldId === fieldId);
      return answer?.value === expected;
    }),
  );
}

export function getParticipantName(submission: Submission, index: number) {
  const nameAnswer = submission.answers.find((answer) =>
    /name|username|codename|gamertag|founder/i.test(answer.label),
  );
  return nameAnswer?.value?.trim() || `Participant ${index + 1}`;
}

export function getAnswerPreview(submission: Submission, max = 3) {
  return submission.answers
    .filter((answer) => answer.value.trim().length > 0)
    .slice(0, max)
    .map((answer) => `${answer.label}: ${formatAnswerValue(answer.type, answer.value)}`);
}

function formatAnswerValue(type: string, value: string) {
  if (type === "rating") return `⭐ ${value}`;
  if (type === "checkbox") return value === "true" ? "Yes" : "No";
  return value;
}
