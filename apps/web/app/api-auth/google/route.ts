import { NextRequest, NextResponse } from "next/server";

import { fetchAuthProviders, getGoogleProvider } from "~/lib/fetch-auth-providers";
import { sanitizeRedirectPath } from "@repo/services/auth/safe-redirect";

export async function GET(request: NextRequest) {
  const returnTo = sanitizeRedirectPath(request.nextUrl.searchParams.get("state"));
  const signInUrl = new URL("/sign-in", request.url);

  const providers = await fetchAuthProviders();
  const google = getGoogleProvider(providers);

  if (!google?.authUrl) {
    signInUrl.searchParams.set("error", "Google sign-in is not available right now.");
    return NextResponse.redirect(signInUrl);
  }

  try {
    const nonce = crypto.randomUUID();
    const state = Buffer.from(JSON.stringify({ nonce, returnTo }), "utf8").toString("base64url");
    const authUrl = new URL(google.authUrl);
    authUrl.searchParams.set("state", state);
    const response = NextResponse.redirect(authUrl.toString());
    response.cookies.set("chaiform_oauth_state", nonce, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 10 * 60,
    });
    return response;
  } catch {
    signInUrl.searchParams.set(
      "error",
      "Auth server unavailable. If developing locally, run pnpm run dev and wait for the API on port 8000.",
    );
    return NextResponse.redirect(signInUrl);
  }
}
