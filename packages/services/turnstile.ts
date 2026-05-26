const TURNSTILE_VERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

type TurnstileVerifyResponse = {
  success?: boolean;
  "error-codes"?: string[];
};

export function isTurnstileRequired(env: NodeJS.ProcessEnv = process.env) {
  return Boolean(
    env.NEXT_PUBLIC_TURNSTILE_SITE_KEY?.trim() && env.TURNSTILE_SECRET_KEY?.trim(),
  );
}

export async function verifyTurnstileToken(
  token: string,
  remoteIp?: string,
  env: NodeJS.ProcessEnv = process.env,
): Promise<boolean> {
  const secret = env.TURNSTILE_SECRET_KEY?.trim();
  if (!secret) return true;
  if (!token) return false;

  const params = new URLSearchParams({ secret, response: token });
  if (remoteIp) params.set("remoteip", remoteIp);

  try {
    const response = await fetch(TURNSTILE_VERIFY_URL, {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: params,
      cache: "no-store",
      signal: AbortSignal.timeout(8_000),
    });

    if (!response.ok) return false;

    const payload = (await response.json()) as TurnstileVerifyResponse;
    return payload.success === true;
  } catch {
    return false;
  }
}
