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

  const upstreamRes = await fetch(upstream, {
    method: request.method,
    headers,
    body: request.method !== "GET" && request.method !== "HEAD" ? await request.arrayBuffer() : undefined,
    redirect: "manual",
  });

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
