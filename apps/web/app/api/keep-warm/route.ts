import { NextResponse } from "next/server";

const API_BASE = process.env.API_INTERNAL_URL ?? "http://localhost:8000";

/** Cron pings Render so cold starts are less likely during demos. */
export async function GET() {
  try {
    const response = await fetch(`${API_BASE}/health`, {
      cache: "no-store",
      signal: AbortSignal.timeout(15_000),
    });
    return NextResponse.json({
      ok: response.ok,
      status: response.status,
    });
  } catch {
    return NextResponse.json({ ok: false }, { status: 503 });
  }
}
