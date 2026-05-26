import { Router } from "express";
import { z } from "zod";
import { logger } from "@repo/logger";
import AuthService from "@repo/services/auth";
import { toAuthError } from "@repo/services/auth/errors";
import { env } from "../env";

const authService = new AuthService();

export const googleAuthRouter = Router();

const googleCallbackQuerySchema = z.object({
  code: z.string().min(1).optional(),
  state: z.string().default("/dashboard"),
  error: z.string().optional(),
  error_description: z.string().optional(),
});

googleAuthRouter.get("/google/callback", async (req, res) => {
  const parsed = googleCallbackQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    return res.redirect(
      `${env.CLIENT_URL}/sign-in?error=${encodeURIComponent("Invalid Google sign-in callback.")}`,
    );
  }

  const { code, state, error: oauthError, error_description: errorDescription } = parsed.data;

  if (oauthError) {
    return res.redirect(
      `${env.CLIENT_URL}/sign-in?error=${encodeURIComponent(errorDescription ?? "Google sign-in was cancelled or denied.")}`,
    );
  }

  if (!code) {
    return res.redirect(
      `${env.CLIENT_URL}/sign-in?error=${encodeURIComponent("Start sign-in from the sign-in page — do not open the callback URL directly.")}`,
    );
  }

  try {
    const redirectUrl = await authService.handleGoogleCallback(code, res, state);
    return res.redirect(redirectUrl);
  } catch (error) {
    const authError = toAuthError(error, "Google sign-in failed. Please try again.");

    logger.error("Google OAuth callback failed", {
      message: authError.message,
      stack: authError.stack,
    });

    return res.redirect(`${env.CLIENT_URL}/sign-in?error=${encodeURIComponent(authError.message)}`);
  }
});
