import { jwtVerify } from "jose";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { sanitizeRedirectPath } from "~/lib/safe-redirect";

const PROTECTED_PREFIXES = ["/dashboard", "/analytics", "/forms", "/settings"];

function getJwtSecret() {
  return process.env.JWT_SECRET?.trim() ?? "";
}

function getRefreshSecret() {
  return process.env.JWT_REFRESH_SECRET?.trim() || getJwtSecret();
}

async function hasValidSession(request: NextRequest): Promise<boolean> {
  const accessToken = request.cookies.get("jwt")?.value;
  const refreshToken = request.cookies.get("jwt_refresh")?.value;
  const jwtSecret = getJwtSecret();

  if (!jwtSecret || (!accessToken && !refreshToken)) {
    return false;
  }

  if (accessToken) {
    try {
      await jwtVerify(accessToken, new TextEncoder().encode(jwtSecret), {
        algorithms: ["HS256"],
      });
      return true;
    } catch {
      // Fall through to refresh token.
    }
  }

  if (!refreshToken) return false;

  try {
    const { payload } = await jwtVerify(refreshToken, new TextEncoder().encode(getRefreshSecret()), {
      algorithms: ["HS256"],
    });
    return payload.type === "refresh";
  } catch {
    return false;
  }
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isProtected = PROTECTED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );

  if (!isProtected) {
    return NextResponse.next();
  }

  if (!(await hasValidSession(request))) {
    const signInUrl = request.nextUrl.clone();
    signInUrl.pathname = "/sign-in";
    signInUrl.searchParams.set("next", sanitizeRedirectPath(pathname));
    return NextResponse.redirect(signInUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*", "/analytics/:path*", "/forms/:path*", "/settings/:path*"],
};
