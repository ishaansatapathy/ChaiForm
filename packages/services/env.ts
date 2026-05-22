import { z } from "zod";

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
