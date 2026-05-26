import { isTurnstileRequired as isTurnstileRequiredOnServer, verifyTurnstileToken as verifyOnServer } from "@repo/services/turnstile";

const TURNSTILE_VERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

export function getTurnstileSiteKey() {
  return process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY?.trim() ?? "";
}

export function isTurnstileRequired() {
  return isTurnstileRequiredOnServer();
}

export async function verifyTurnstileToken(token: string, remoteIp?: string): Promise<boolean> {
  return verifyOnServer(token, remoteIp);
}

export { TURNSTILE_VERIFY_URL };
