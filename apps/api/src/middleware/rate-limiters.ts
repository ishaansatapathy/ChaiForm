import type { Request, Response, NextFunction } from "express";

import { checkDistributedRateLimit } from "@repo/services/cache/rate-limit";

const skipInTests = () => process.env.VITEST === "true";

type LimitConfig = {
  windowMs: number;
  max: number;
  message: string;
  keyGenerator?: (req: Request) => string;
};

async function applyRateLimit(req: Request, res: Response, config: LimitConfig): Promise<boolean> {
  if (skipInTests()) return true;

  const ip = req.ip ?? req.socket.remoteAddress ?? "unknown";
  const key = config.keyGenerator ? config.keyGenerator(req) : ip;
  const result = await checkDistributedRateLimit(key, config.max, config.windowMs);

  res.setHeader("RateLimit-Limit", String(config.max));
  res.setHeader("RateLimit-Remaining", String(result.remaining));

  if (!result.allowed) {
    res.status(429).json({ message: config.message });
    return false;
  }

  return true;
}

/**
 * Match a tRPC path string (e.g. "auth.signIn") against a set of expected
 * procedure identifiers using exact segment comparison, not substring search.
 *
 * A path like "auth.signIn" is tokenised as ["auth", "signIn"]. We check that
 * the full token sequence exactly matches one of the allowed identifiers —
 * this prevents "auth.signIn" accidentally matching "auth.signInWithMagicLink".
 */
export function matchesProcedure(path: string, procedures: string[]): boolean {
  const pathTokens = path.split(".");
  return procedures.some((proc) => {
    const procTokens = proc.split(".");
    if (pathTokens.length !== procTokens.length) return false;
    return pathTokens.every((token, i) => token === procTokens[i]);
  });
}

const AUTH_CREDENTIAL_PROCS = ["auth.signUp", "auth.signIn", "auth.verify2FA", "auth.refresh"];
const PASSWORD_RESET_PROCS  = ["auth.forgotPassword", "auth.verifyOtp", "auth.resetPassword"];
const FORM_SUBMIT_PROCS     = ["forms.submit"];
const FORM_VIEW_PROCS       = ["forms.recordView"];

export function normalizeProcedurePath(path: string) {
  const normalized = path.replace(/^\/+/, "");
  const restProcedureMap: Record<string, string> = {
    "authentication/sign-up": "auth.signUp",
    "authentication/sign-in": "auth.signIn",
    "authentication/verify-2fa": "auth.verify2FA",
    "authentication/refresh": "auth.refresh",
    "authentication/forgot-password": "auth.forgotPassword",
    "authentication/verify-otp": "auth.verifyOtp",
    "authentication/reset-password": "auth.resetPassword",
    "forms/submit": "forms.submit",
    "forms/views": "forms.recordView",
  };

  return restProcedureMap[normalized] ?? normalized;
}

function extractSubmitFormId(req: Request): string | null {
  const body = req.body;
  if (!body || typeof body !== "object") return null;

  if ("formId" in body && body.formId) {
    return String((body as { formId?: string }).formId);
  }

  if ("json" in body && body.json && typeof body.json === "object" && "formId" in body.json) {
    return String((body.json as { formId?: string }).formId ?? "");
  }

  for (const value of Object.values(body)) {
    if (value && typeof value === "object" && "json" in value) {
      const json = (value as { json?: { formId?: string } }).json;
      if (json?.formId) return json.formId;
    }
  }

  return null;
}

export function createTrpcRateLimitMiddleware() {
  return async (req: Request, res: Response, next: NextFunction) => {
    // tRPC path is the URL segment after /trpc/, e.g. "auth.signIn"
    const path = normalizeProcedurePath(req.path);
    const ip = req.ip ?? req.socket.remoteAddress ?? "unknown";

    if (matchesProcedure(path, AUTH_CREDENTIAL_PROCS)) {
      const ok = await applyRateLimit(req, res, {
        windowMs: 15 * 60 * 1000,
        max: 40,
        message: "Too many login or signup attempts. Try again later.",
      });
      return ok ? next() : undefined;
    }

    if (matchesProcedure(path, PASSWORD_RESET_PROCS)) {
      const ok = await applyRateLimit(req, res, {
        windowMs: 15 * 60 * 1000,
        max: 30,
        message: "Too many password reset attempts. Try again in 15 minutes.",
      });
      return ok ? next() : undefined;
    }

    if (matchesProcedure(path, FORM_VIEW_PROCS)) {
      const ok = await applyRateLimit(req, res, {
        windowMs: 15 * 60 * 1000,
        max: 120,
        keyGenerator: (request) => {
          const formId = extractSubmitFormId(request);
          return formId ? `view:${ip}:${formId}` : `view:${ip}`;
        },
        message: "Too many view requests. Try again later.",
      });
      return ok ? next() : undefined;
    }

    if (matchesProcedure(path, FORM_SUBMIT_PROCS)) {
      const formId = extractSubmitFormId(req);
      const perFormOk = await applyRateLimit(req, res, {
        windowMs: 15 * 60 * 1000,
        max: 20,
        keyGenerator: () => (formId ? `${ip}:${formId}` : ip),
        message: "Too many submissions for this form. Try again later.",
      });
      if (!perFormOk) return undefined;

      const ipOk = await applyRateLimit(req, res, {
        windowMs: 15 * 60 * 1000,
        max: 60,
        message: "Too many form submissions. Try again later.",
      });
      return ipOk ? next() : undefined;
    }

    return next();
  };
}
