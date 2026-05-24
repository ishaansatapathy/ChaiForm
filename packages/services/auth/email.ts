import { logger } from "@repo/logger";

import { env, isEmailConfigured } from "../env";

type SendEmailInput = {
  email: string;
  subject: string;
  html: string;
  text: string;
};

const RESEND_API_URL = "https://api.resend.com/emails";

export async function sendEmail(input: SendEmailInput): Promise<void> {
  if (isEmailConfigured()) {
    const response = await fetch(RESEND_API_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: env.EMAIL_FROM,
        to: [input.email],
        subject: input.subject,
        html: input.html,
        text: input.text,
      }),
    });

    if (!response.ok) {
      const detail = await response.text();
      logger.error("Resend email failed", { status: response.status, detail, to: input.email });
      throw new Error("Failed to send email. Please try again later.");
    }

    logger.info("Email sent", { to: input.email, subject: input.subject });
    return;
  }

  logger.warn("DEV EMAIL — set RESEND_API_KEY to send real mail", {
    to: input.email,
    subject: input.subject,
    text: input.text,
  });
}

export function isDevEmailLogging(): boolean {
  return !isEmailConfigured();
}
