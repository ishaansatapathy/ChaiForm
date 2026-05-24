import { NextRequest, NextResponse } from "next/server";

const API_BASE = process.env.API_INTERNAL_URL ?? "http://localhost:8000";

/** Refresh session cookies via auth.me — use when client tRPC session sync fails. */
export async function GET(request: NextRequest) {
  const cookie = request.headers.get("cookie") ?? "";

  try {
    const upstreamRes = await fetch(`${API_BASE}/trpc/auth.me`, {
      headers: cookie ? { cookie } : undefined,
      cache: "no-store",
      signal: AbortSignal.timeout(25_000),
    });

    const response = new NextResponse(upstreamRes.body, {
      status: upstreamRes.status,
      statusText: upstreamRes.statusText,
      headers: {
        "content-type": upstreamRes.headers.get("content-type") ?? "application/json",
      },
    });

    const setCookies =
      typeof upstreamRes.headers.getSetCookie === "function"
        ? upstreamRes.headers.getSetCookie()
        : [];

    if (setCookies.length > 0) {
      for (const setCookie of setCookies) {
        response.headers.append("set-cookie", setCookie);
      }
    } else {
      const single = upstreamRes.headers.get("set-cookie");
      if (single) response.headers.set("set-cookie", single);
    }

    return response;
  } catch {
    return NextResponse.json(
      { error: { message: "Auth server unavailable" } },
      { status: 503 },
    );
  }
}
