import { OAuth2Client } from "google-auth-library";

import { env, isGoogleOAuthConfigured } from "../env";

let googleOAuth2Client: OAuth2Client | null = null;

export function getGoogleOAuth2Client(): OAuth2Client {
  if (!isGoogleOAuthConfigured()) {
    throw new Error("Google OAuth is not configured");
  }

  if (!googleOAuth2Client) {
    googleOAuth2Client = new OAuth2Client({
      clientId: env.GOOGLE_OAUTH_CLIENT_ID,
      clientSecret: env.GOOGLE_OAUTH_CLIENT_SECRET,
      redirectUri: env.GOOGLE_OAUTH_REDIRECT_URI,
    });
  }

  return googleOAuth2Client;
}

export function generateGoogleAuthUrl(state?: string) {
  const client = getGoogleOAuth2Client();
  return client.generateAuthUrl({
    access_type: "offline",
    scope: ["openid", "email", "profile"],
    prompt: "consent",
    state,
  });
}

export { isGoogleOAuthConfigured };
