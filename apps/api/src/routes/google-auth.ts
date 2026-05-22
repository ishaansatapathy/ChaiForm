import { Router } from "express";
import { logger } from "@repo/logger";
import AuthService from "@repo/services/auth";
import { toAuthError } from "@repo/services/auth/errors";
import { env } from "../env";

const authService = new AuthService();

export const googleAuthRouter = Router();

googleAuthRouter.get("/google/callback", async (req, res) => {
  const code = typeof req.query.code === "string" ? req.query.code : null;
  const state = typeof req.query.state === "string" ? req.query.state : "/dashboard";
  const oauthError = typeof req.query.error === "string" ? req.query.error : null;

  if (oauthError) {
    const description =
      typeof req.query.error_description === "string"
        ? req.query.error_description
        : "Google sign-in was cancelled or denied.";
    return res.redirect(
      `${env.CLIENT_URL}/sign-in?error=${encodeURIComponent(description)}`,
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
