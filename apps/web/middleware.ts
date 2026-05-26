import { jwtVerify } from "jose";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { sanitizeRedirectPath } from "~/lib/safe-redirect";

const PROTECTED_PREFIXES = ["/dashboard", "/analytics", "/forms", "/settings"];
const AUTH_ENTRY_PATHS = new Set(["/", "/sign-in", "/sign-up"]);

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

async function resolveSession(request: NextRequest): Promise<SessionPayload | null> {
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
      return payload as SessionPayload;
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
    return session;
  } catch {
    return null;
  }
}

function isSignedIn(session: SessionPayload | null) {
  return Boolean(session?.userId);
}

/** Only block when token explicitly says unverified (legacy tokens may omit the claim). */
function isVerifiedSession(session: SessionPayload | null) {
  return isSignedIn(session) && session?.emailVerified !== false;
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

  if (!isSignedIn(session)) {
    const signInUrl = request.nextUrl.clone();
    signInUrl.pathname = "/sign-in";
    signInUrl.searchParams.set("next", sanitizeRedirectPath(pathname));
    return NextResponse.redirect(signInUrl);
  }

  if (session?.emailVerified === false) {
    const verifyUrl = request.nextUrl.clone();
    verifyUrl.pathname = "/check-email";
    verifyUrl.search = "";
    return NextResponse.redirect(verifyUrl);
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
