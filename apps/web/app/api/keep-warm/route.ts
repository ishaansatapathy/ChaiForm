import { NextResponse } from "next/server";

const API_BASE = process.env.API_INTERNAL_URL ?? "http://localhost:8000";

/** Cron pings API health and purges expired forms when CRON_SECRET is set. */
export async function GET() {
  const health: { ok: boolean; status: number; purge?: { deleted?: number; error?: string } } = {
    ok: false,
    status: 503,
  };

  try {
    const response = await fetch(`${API_BASE}/health`, {
      cache: "no-store",
      signal: AbortSignal.timeout(15_000),
    });
    health.ok = response.ok;
    health.status = response.status;
  } catch {
    return NextResponse.json(health, { status: 503 });
  }

  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    try {
      const purgeRes = await fetch(`${API_BASE}/internal/purge-expired-forms`, {
        method: "POST",
        headers: { "x-cron-secret": cronSecret },
        cache: "no-store",
        signal: AbortSignal.timeout(30_000),
      });
      const purgeBody = (await purgeRes.json()) as { deleted?: number; error?: string };
      health.purge = purgeRes.ok ? { deleted: purgeBody.deleted ?? 0 } : { error: purgeBody.error ?? "Purge failed" };
    } catch {
      health.purge = { error: "Purge request failed" };
    }
  }

  return NextResponse.json(health, { status: health.ok ? 200 : 503 });
}
