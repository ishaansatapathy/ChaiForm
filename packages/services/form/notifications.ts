import { eq } from "@repo/database";
import { db } from "@repo/database";
import { usersTable } from "@repo/database/schema";
import type { SubmissionAnswerJson } from "@repo/database/schema";

import { sendEmail } from "../auth/email";
import { env } from "../env";

type NotifyCreatorInput = {
  ownerUserId: string;
  formTitle: string;
  formSlug: string | null;
  formId: string;
  answers: SubmissionAnswerJson[];
};

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export async function notifyCreatorOfSubmission(input: NotifyCreatorInput): Promise<void> {
  const [owner] = await db
    .select({ email: usersTable.email, fullName: usersTable.fullName })
    .from(usersTable)
    .where(eq(usersTable.id, input.ownerUserId))
    .limit(1);

  if (!owner?.email) return;

  const answerLines = input.answers
    .filter((answer) => answer.value.length > 0)
    .map((answer) => `${answer.label}: ${answer.value}`)
    .join("\n");

  const formPath = input.formSlug ? `/f/s/${input.formSlug}` : `/f/${input.formId}`;
  const analyticsUrl = `${env.CLIENT_URL}/analytics?form=${input.formId}`;

  const subject = `New response on "${input.formTitle}"`;
  const text = [
    `Hi ${owner.fullName},`,
    "",
    `Someone just submitted your form "${input.formTitle}".`,
    "",
    answerLines || "(No answers provided)",
    "",
    `View analytics: ${analyticsUrl}`,
    `Public form: ${env.CLIENT_URL}${formPath}`,
  ].join("\n");

  const html = `
    <p>Hi ${escapeHtml(owner.fullName)},</p>
    <p>Someone just submitted <strong>${escapeHtml(input.formTitle)}</strong>.</p>
    <ul>
      ${input.answers
        .filter((answer) => answer.value.length > 0)
        .map((answer) => `<li><strong>${escapeHtml(answer.label)}:</strong> ${escapeHtml(answer.value)}</li>`)
        .join("")}
    </ul>
    <p><a href="${escapeHtml(analyticsUrl)}">View analytics</a></p>
  `;

  await sendEmail({ email: owner.email, subject, html, text });
}

type NotifyFormDeletedInput = {
  ownerUserId: string;
  formTitle: string;
  formId: string;
  submissionCount: number;
  reason: "manual" | "expired";
  expiredAt?: Date | null;
};

export async function notifyCreatorOfFormDeletion(input: NotifyFormDeletedInput): Promise<void> {
  const [owner] = await db
    .select({ email: usersTable.email, fullName: usersTable.fullName })
    .from(usersTable)
    .where(eq(usersTable.id, input.ownerUserId))
    .limit(1);

  if (!owner?.email) return;

  const dashboardUrl = `${env.CLIENT_URL}/dashboard`;
  const reasonLine =
    input.reason === "expired"
      ? `Your retention period ended${input.expiredAt ? ` on ${input.expiredAt.toLocaleDateString()}` : ""}.`
      : "You deleted it from ChaiForm.";

  const subject =
    input.reason === "expired"
      ? `Form expired and removed: "${input.formTitle}"`
      : `Form deleted: "${input.formTitle}"`;

  const text = [
    `Hi ${owner.fullName},`,
    "",
    `Your form "${input.formTitle}" has been deleted.`,
    reasonLine,
    "",
    `${input.submissionCount} response(s) were removed with the form.`,
    "",
    `Create a new form: ${dashboardUrl}`,
  ].join("\n");

  const html = `
    <p>Hi ${escapeHtml(owner.fullName)},</p>
    <p>Your form <strong>${escapeHtml(input.formTitle)}</strong> has been deleted.</p>
    <p>${escapeHtml(reasonLine)}</p>
    <p><strong>${input.submissionCount}</strong> response(s) were removed with the form.</p>
    <p><a href="${escapeHtml(dashboardUrl)}">Back to dashboard</a></p>
  `;

  await sendEmail({ email: owner.email, subject, html, text });
}
