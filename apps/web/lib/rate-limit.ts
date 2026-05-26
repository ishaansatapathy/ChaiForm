import { checkDistributedRateLimit } from "@repo/services/cache/rate-limit";

type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();

/** Sync in-memory fallback for edge paths that cannot await Redis. */
export function checkRateLimit(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const bucket = buckets.get(key);

  if (!bucket || now >= bucket.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }

  if (bucket.count >= limit) {
    return false;
  }

  bucket.count += 1;
  return true;
}

export async function checkRateLimitAsync(
  key: string,
  limit: number,
  windowMs: number,
): Promise<boolean> {
  if (process.env.VITEST === "true") {
    return checkRateLimit(key, limit, windowMs);
  }

  const result = await checkDistributedRateLimit(key, limit, windowMs);
  return result.allowed;
}

export function getClientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]?.trim() ?? "unknown";
  return request.headers.get("x-real-ip") ?? "unknown";
}

const MAX_BODY_BYTES = 256 * 1024;

export async function readJsonBody(
  request: Request,
): Promise<{ ok: true; body: unknown } | { ok: false; status: number; error: string }> {
  const contentLength = Number(request.headers.get("content-length") ?? 0);
  if (contentLength > MAX_BODY_BYTES) {
    return { ok: false, status: 413, error: "Request body too large." };
  }

  const raw = await request.text();
  if (raw.length > MAX_BODY_BYTES) {
    return { ok: false, status: 413, error: "Request body too large." };
  }

  try {
    return { ok: true, body: JSON.parse(raw) as unknown };
  } catch {
    return { ok: false, status: 400, error: "Invalid request body." };
  }
}
