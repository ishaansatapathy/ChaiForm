import { type NextRequest, NextResponse } from "next/server";

const API_BASE = process.env.API_INTERNAL_URL ?? "http://localhost:8000";

/** Proxy tRPC so auth Set-Cookie headers reach the browser (rewrites drop them). */
async function proxyTrpc(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  const { path } = await context.params;
  const pathname = path.join("/");
  const upstream = `${API_BASE}/trpc/${pathname}${request.nextUrl.search}`;

  const headers = new Headers();
  const contentType = request.headers.get("content-type");
  if (contentType) headers.set("content-type", contentType);
  const cookie = request.headers.get("cookie");
  if (cookie) headers.set("cookie", cookie);
  const accept = request.headers.get("accept");
  if (accept) headers.set("accept", accept);

  const body =
    request.method !== "GET" && request.method !== "HEAD"
      ? await request.arrayBuffer()
      : undefined;

  let upstreamRes: Response | null = null;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      upstreamRes = await fetch(upstream, {
        method: request.method,
        headers,
        body,
        redirect: "manual",
        signal: AbortSignal.timeout(25_000),
      });

      if (upstreamRes.status < 500) break;

      if (attempt < 2) {
        await new Promise((resolve) => setTimeout(resolve, 1500 * (attempt + 1)));
      }
    } catch {
      if (attempt < 2) {
        await new Promise((resolve) => setTimeout(resolve, 1500 * (attempt + 1)));
        continue;
      }
      return NextResponse.json(
        { error: { message: "API unavailable", code: -32004, data: { code: "TIMEOUT" } } },
        { status: 503 },
      );
    }
  }

  if (!upstreamRes) {
    return NextResponse.json(
      { error: { message: "API unavailable", code: -32004, data: { code: "TIMEOUT" } } },
      { status: 503 },
    );
  }

  const response = new NextResponse(upstreamRes.body, {
    status: upstreamRes.status,
    statusText: upstreamRes.statusText,
  });

  upstreamRes.headers.forEach((value, key) => {
    const lower = key.toLowerCase();
    if (lower === "set-cookie" || lower === "transfer-encoding") return;
    response.headers.set(key, value);
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
}

export async function GET(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  return proxyTrpc(request, context);
}

export async function POST(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  return proxyTrpc(request, context);
}
