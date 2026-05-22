import { logger } from "@repo/logger";

type SendEmailInput = {
  email: string;
  subject: string;
  html: string;
  text: string;
};

export async function sendEmail(input: SendEmailInput): Promise<void> {
  logger.info("Auth email (dev stub)", {
    to: input.email,
    subject: input.subject,
    text: input.text,
  });
}
