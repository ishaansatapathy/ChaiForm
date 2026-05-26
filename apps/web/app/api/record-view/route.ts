import { type NextRequest, NextResponse } from "next/server";

const API_BASE = process.env.API_INTERNAL_URL ?? "http://localhost:8000";

export async function POST(request: NextRequest) {
  let body: { formId?: string; viewerKey?: string };
  try {
    body = (await request.json()) as { formId?: string; viewerKey?: string };
  } catch {
    return NextResponse.json({ ok: true });
  }

  if (!body.formId) {
    return NextResponse.json({ ok: true });
  }

  try {
    await fetch(`${API_BASE}/trpc/forms.recordView`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "accept-encoding": "identity",
        "x-chaiform-csrf": "1",
        ...(request.headers.get("origin") ? { origin: request.headers.get("origin")! } : {}),
        ...(request.headers.get("referer") ? { referer: request.headers.get("referer")! } : {}),
      },
      body: JSON.stringify({ formId: body.formId, viewerKey: body.viewerKey }),
      cache: "no-store",
      signal: AbortSignal.timeout(8_000),
    });
  } catch {
    // best-effort
  }

  return NextResponse.json({ ok: true });
}
