import { jwtVerify } from "jose";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { appendProxiedSetCookies } from "~/lib/proxied-set-cookie";
import { sanitizeRedirectPath } from "~/lib/safe-redirect";

const PROTECTED_PREFIXES = ["/dashboard", "/analytics", "/forms", "/settings"];
const AUTH_ENTRY_PATHS = new Set(["/", "/sign-in", "/sign-up"]);
const API_BASE = process.env.API_INTERNAL_URL ?? "http://localhost:8000";

function getJwtSecret() {
  return process.env.JWT_SECRET?.trim() ?? "";
}

function getRefreshSecret() {
  return process.env.JWT_REFRESH_SECRET?.trim() || getJwtSecret();
}

type SessionPayload = {
  userId?: string;
  emailVerified?: boolean;
  type?: string;
};

type ResolvedSession = {
  payload: SessionPayload;
  source: "access" | "refresh";
};

async function resolveSession(request: NextRequest): Promise<ResolvedSession | null> {
  const accessToken = request.cookies.get("jwt")?.value;
  const refreshToken = request.cookies.get("jwt_refresh")?.value;
  const jwtSecret = getJwtSecret();

  if (!jwtSecret || (!accessToken && !refreshToken)) {
    return null;
  }

  if (accessToken) {
    try {
      const { payload } = await jwtVerify(accessToken, new TextEncoder().encode(jwtSecret), {
        algorithms: ["HS256"],
      });
      return { payload: payload as SessionPayload, source: "access" };
    } catch {
      // Fall through to refresh token.
    }
  }

  if (!refreshToken) return null;

  try {
    const { payload } = await jwtVerify(refreshToken, new TextEncoder().encode(getRefreshSecret()), {
      algorithms: ["HS256"],
    });
    const session = payload as SessionPayload;
    if (session.type !== "refresh") return null;
    return { payload: session, source: "refresh" };
  } catch {
    return null;
  }
}

function isSignedIn(session: ResolvedSession | null) {
  return Boolean(session?.payload.userId);
}

/** Only block when token explicitly says unverified (legacy tokens may omit the claim). */
function isVerifiedSession(session: ResolvedSession | null) {
  return isSignedIn(session) && session?.payload.emailVerified !== false;
}

async function validateRefreshSession(request: NextRequest): Promise<NextResponse | null> {
  try {
    const upstream = await fetch(`${API_BASE}/trpc/auth.me?input=%7B%7D`, {
      headers: {
        cookie: request.headers.get("cookie") ?? "",
        "accept-encoding": "identity",
      },
      cache: "no-store",
      signal: AbortSignal.timeout(8_000),
    });

    if (!upstream.ok) return null;

    const response = NextResponse.next();
    appendProxiedSetCookies(response.headers, upstream.headers);
    return response;
  } catch {
    return null;
  }
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const session = await resolveSession(request);

  if (AUTH_ENTRY_PATHS.has(pathname)) {
    if (isVerifiedSession(session)) {
      const destination =
        pathname === "/sign-in"
          ? sanitizeRedirectPath(request.nextUrl.searchParams.get("next"))
          : "/dashboard";
      const dashboardUrl = request.nextUrl.clone();
      dashboardUrl.pathname = destination;
      dashboardUrl.search = "";
      return NextResponse.redirect(dashboardUrl);
    }
    return NextResponse.next();
  }

  const isProtected = PROTECTED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );

  if (!isProtected) {
    return NextResponse.next();
  }

  if (!session?.payload.userId) {
    const signInUrl = request.nextUrl.clone();
    signInUrl.pathname = "/sign-in";
    signInUrl.searchParams.set("next", sanitizeRedirectPath(pathname));
    return NextResponse.redirect(signInUrl);
  }

  const activeSession = session;

  if (activeSession.payload.emailVerified === false) {
    const verifyUrl = request.nextUrl.clone();
    verifyUrl.pathname = "/check-email";
    verifyUrl.search = "";
    return NextResponse.redirect(verifyUrl);
  }

  if (activeSession.source === "refresh") {
    const refreshed = await validateRefreshSession(request);
    if (refreshed) return refreshed;

    const signInUrl = request.nextUrl.clone();
    signInUrl.pathname = "/sign-in";
    signInUrl.searchParams.set("next", sanitizeRedirectPath(pathname));
    return NextResponse.redirect(signInUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/",
    "/sign-in",
    "/sign-up",
    "/dashboard/:path*",
    "/analytics/:path*",
    "/forms/:path*",
    "/settings/:path*",
  ],
};
