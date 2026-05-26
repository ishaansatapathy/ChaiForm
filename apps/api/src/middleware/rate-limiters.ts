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

const AUTH_CREDENTIAL_PATHS = ["auth.signUp", "auth.signIn", "auth.verify2FA", "auth.refresh"];
const PASSWORD_RESET_PATHS = ["auth.forgotPassword", "auth.verifyOtp", "auth.resetPassword"];
const FORM_SUBMIT_PATHS = ["forms.submit"];
const FORM_VIEW_PATHS = ["forms.recordView"];

function extractSubmitFormId(req: Request): string | null {
  const body = req.body;
  if (!body || typeof body !== "object") return null;

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
    const path = req.path.replace(/^\//, "");
    const ip = req.ip ?? req.socket.remoteAddress ?? "unknown";

    if (AUTH_CREDENTIAL_PATHS.some((p) => path.includes(p))) {
      const ok = await applyRateLimit(req, res, {
        windowMs: 15 * 60 * 1000,
        max: 40,
        message: "Too many login or signup attempts. Try again later.",
      });
      return ok ? next() : undefined;
    }

    if (PASSWORD_RESET_PATHS.some((p) => path.includes(p))) {
      const ok = await applyRateLimit(req, res, {
        windowMs: 15 * 60 * 1000,
        max: 30,
        message: "Too many password reset attempts. Try again in 15 minutes.",
      });
      return ok ? next() : undefined;
    }

    if (FORM_VIEW_PATHS.some((p) => path.includes(p))) {
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

    if (FORM_SUBMIT_PATHS.some((p) => path.includes(p))) {
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
