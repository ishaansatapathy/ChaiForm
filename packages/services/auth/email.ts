import { logger } from "@repo/logger";

import { env, isEmailConfigured } from "../env";

type SendEmailInput = {
  email: string;
  subject: string;
  html: string;
  text: string;
};

const RESEND_API_URL = "https://api.resend.com/emails";
const BREVO_API_URL = "https://api.brevo.com/v3/smtp/email";

function isProduction() {
  const nodeEnv = String(env.NODE_ENV ?? "");
  return nodeEnv === "production" || nodeEnv === "prod";
}

function parseSenderAddress(from: string) {
  const trimmed = from.trim();
  const bracketMatch = trimmed.match(/^(.+?)\s*<([^>]+)>$/);
  if (bracketMatch) {
    return { name: bracketMatch[1]!.trim(), email: bracketMatch[2]!.trim() };
  }
  return {
    name: env.EMAIL_SENDER_NAME?.trim() || "ChaiForm",
    email: trimmed,
  };
}

async function sendViaBrevo(input: SendEmailInput) {
  const apiKey = env.BREVO_API_KEY?.trim();
  if (!apiKey) return false;

  const sender = parseSenderAddress(env.EMAIL_FROM!);
  const response = await fetch(BREVO_API_URL, {
    method: "POST",
    headers: {
      "api-key": apiKey,
      "Content-Type": "application/json",
      accept: "application/json",
    },
    body: JSON.stringify({
      sender,
      to: [{ email: input.email.trim() }],
      subject: input.subject,
      htmlContent: input.html,
      textContent: input.text,
    }),
  });

  if (!response.ok) {
    const detail = await response.text();
    logger.error("Brevo email failed", { status: response.status, detail, to: input.email });
    throw new Error("Failed to send email. Please try again later.");
  }

  logger.info("Email sent via Brevo", { to: input.email, subject: input.subject });
  return true;
}

async function sendViaResend(input: SendEmailInput) {
  const apiKey = env.RESEND_API_KEY?.trim();
  if (!apiKey) return false;

  const response = await fetch(RESEND_API_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
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

  logger.info("Email sent via Resend", { to: input.email, subject: input.subject });
  return true;
}

/** Sends to any recipient address — no per-user allowlist. */
export async function sendEmail(input: SendEmailInput): Promise<void> {
  if (!isEmailConfigured()) {
    if (isProduction()) {
      logger.error("Email provider is not configured in production", {
        to: input.email,
        subject: input.subject,
      });
      throw new Error("Email delivery is not configured. Please contact support.");
    }

    logger.warn("DEV EMAIL — set BREVO_API_KEY (or RESEND_API_KEY) + EMAIL_FROM to send real mail", {
      to: input.email,
      subject: input.subject,
      text: input.text,
    });
    return;
  }

  const provider = env.EMAIL_PROVIDER?.toLowerCase();
  const preferBrevo = provider === "brevo" || (!provider && env.BREVO_API_KEY?.trim());
  const preferResend = provider === "resend" || (!preferBrevo && env.RESEND_API_KEY?.trim());

  if (preferBrevo) {
    await sendViaBrevo(input);
    return;
  }

  if (preferResend) {
    await sendViaResend(input);
    return;
  }

  throw new Error("Email delivery is not configured. Please contact support.");
}

export function isDevEmailLogging(): boolean {
  return !isEmailConfigured() && !isProduction();
}
