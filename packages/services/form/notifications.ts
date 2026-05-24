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
    <p>Hi ${owner.fullName},</p>
    <p>Someone just submitted <strong>${input.formTitle}</strong>.</p>
    <ul>
      ${input.answers
        .filter((answer) => answer.value.length > 0)
        .map((answer) => `<li><strong>${answer.label}:</strong> ${answer.value}</li>`)
        .join("")}
    </ul>
    <p><a href="${analyticsUrl}">View analytics</a></p>
  `;

  await sendEmail({ email: owner.email, subject, html, text });
}
