import { type NextRequest, NextResponse } from "next/server";

const API_BASE = process.env.API_INTERNAL_URL ?? "http://localhost:8000";

/** Proxy Google OAuth callback so Set-Cookie headers reach the browser on :3000. */
export async function GET(request: NextRequest) {
  const upstream = `${API_BASE}/auth/google/callback${request.nextUrl.search}`;

  const upstreamRes = await fetch(upstream, {
    redirect: "manual",
    headers: {
      cookie: request.headers.get("cookie") ?? "",
    },
  });

  const location = upstreamRes.headers.get("location");
  const response = location
    ? NextResponse.redirect(location)
    : new NextResponse(upstreamRes.body, { status: upstreamRes.status });

  const setCookies =
    typeof upstreamRes.headers.getSetCookie === "function"
      ? upstreamRes.headers.getSetCookie()
      : [];

  if (setCookies.length > 0) {
    for (const cookie of setCookies) {
      response.headers.append("set-cookie", cookie);
    }
  } else {
    const single = upstreamRes.headers.get("set-cookie");
    if (single) response.headers.set("set-cookie", single);
  }

  return response;
}
