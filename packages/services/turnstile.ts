const TURNSTILE_VERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

type TurnstileVerifyResponse = {
  success?: boolean;
  "error-codes"?: string[];
};

function isProductionEnv(env: NodeJS.ProcessEnv) {
  const nodeEnv = String(env.NODE_ENV ?? "");
  return nodeEnv === "production" || nodeEnv === "prod";
}

export function isTurnstileRequired(env: NodeJS.ProcessEnv = process.env) {
  return Boolean(env.TURNSTILE_SECRET_KEY?.trim());
}

/** When true, production rejects public submits if Turnstile secret is missing. */
export function isTurnstileMandatoryInProduction(env: NodeJS.ProcessEnv = process.env) {
  return isProductionEnv(env) && env.REQUIRE_TURNSTILE_IN_PROD === "true";
}

export async function verifyTurnstileToken(
  token: string,
  remoteIp?: string,
  env: NodeJS.ProcessEnv = process.env,
): Promise<boolean> {
  const secret = env.TURNSTILE_SECRET_KEY?.trim();
  if (!secret) {
    if (isTurnstileMandatoryInProduction(env)) return false;
    return !isTurnstileRequired(env);
  }
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
