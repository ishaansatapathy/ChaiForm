type SubmissionAnswer = {
  fieldId: string;
  label: string;
  type: string;
  value: string;
};

type SubmissionRow = {
  id: string;
  submittedAt: string | null;
  answers: SubmissionAnswer[];
};

type ExportField = {
  id: string;
  label: string;
};

function escapeCsv(value: string) {
  if (/[",\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export function downloadSubmissionsCsv(
  formTitle: string,
  submissions: SubmissionRow[],
  fields?: ExportField[],
) {
  if (submissions.length === 0) return;

  const columns = fields?.length
    ? fields
    : (submissions[0]?.answers.map((answer) => ({
        id: answer.fieldId,
        label: answer.label,
      })) ?? []);
  const headers = ["Submission ID", "Submitted At", ...columns.map((field) => field.label)];

  const rows = submissions.map((submission) => {
    const answerByField = new Map(submission.answers.map((a) => [a.fieldId, a.value]));
    return [
      submission.id,
      submission.submittedAt ?? "",
      ...columns.map((field) => answerByField.get(field.id) ?? ""),
    ];
  });

  const csv = [headers, ...rows].map((row) => row.map((cell) => escapeCsv(String(cell))).join(",")).join("\n");

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `${formTitle.replace(/[^a-z0-9-_]+/gi, "-").toLowerCase()}-responses.csv`;
  anchor.click();
  URL.revokeObjectURL(url);
}
