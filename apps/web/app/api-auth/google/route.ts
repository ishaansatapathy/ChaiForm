import { NextRequest, NextResponse } from "next/server";

import { fetchAuthProviders, getGoogleProvider } from "~/lib/fetch-auth-providers";

export async function GET(request: NextRequest) {
  const state = request.nextUrl.searchParams.get("state") ?? "/dashboard";
  const signInUrl = new URL("/sign-in", request.url);

  const providers = await fetchAuthProviders();
  const google = getGoogleProvider(providers);

  if (!google?.authUrl) {
    signInUrl.searchParams.set("error", "Google sign-in is not available right now.");
    return NextResponse.redirect(signInUrl);
  }

  try {
    const authUrl = new URL(google.authUrl);
    authUrl.searchParams.set("state", state);
    return NextResponse.redirect(authUrl.toString());
  } catch {
    signInUrl.searchParams.set(
      "error",
      "Auth server unavailable. If developing locally, run pnpm run dev and wait for the API on port 8000.",
    );
    return NextResponse.redirect(signInUrl);
  }
}
