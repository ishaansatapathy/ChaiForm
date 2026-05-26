import { config } from "dotenv";
import fs from "node:fs";
import path from "node:path";

import { z } from "zod";

function loadRootEnv() {
  let dir = __dirname;
  for (let i = 0; i < 6; i++) {
    const envPath = path.join(dir, ".env");
    if (fs.existsSync(envPath)) {
      config({ path: envPath });
      return;
    }
    dir = path.dirname(dir);
  }
}

loadRootEnv();

const envSchema = z.object({
  JWT_SECRET: z.string().min(16),
  JWT_REFRESH_SECRET: z.string().min(16).optional(),
  CLIENT_URL: z.string().default("http://localhost:3000"),
  NODE_ENV: z.enum(["development", "production", "prod", "test"]).default("development"),
  JWT_COOKIE_SAMESITE: z.string().optional(),
  JWT_COOKIE_SECURE: z.enum(["true", "false"]).optional(),
  GOOGLE_OAUTH_CLIENT_ID: z.string().optional(),
  GOOGLE_OAUTH_CLIENT_SECRET: z.string().optional(),
  GOOGLE_OAUTH_REDIRECT_URI: z.string().optional(),
  RESEND_API_KEY: z.string().optional(),
  EMAIL_FROM: z.string().optional(),
  TURNSTILE_SECRET_KEY: z.string().optional(),
  NEXT_PUBLIC_TURNSTILE_SITE_KEY: z.string().optional(),
});

function createEnv(env: NodeJS.ProcessEnv) {
  const safeParseResult = envSchema.safeParse(env);
  if (!safeParseResult.success) throw new Error(safeParseResult.error.message);
  return safeParseResult.data;
}

export const env = createEnv(process.env);

export function isGoogleOAuthConfigured() {
  return !!(env.GOOGLE_OAUTH_CLIENT_ID && env.GOOGLE_OAUTH_CLIENT_SECRET && env.GOOGLE_OAUTH_REDIRECT_URI);
}

export function isEmailConfigured() {
  return !!(env.RESEND_API_KEY && env.EMAIL_FROM);
}
