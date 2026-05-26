import { cacheIncr } from "./kv-store";

export type RateLimitResult = {
  allowed: boolean;
  remaining: number;
  limit: number;
};

export async function checkDistributedRateLimit(
  key: string,
  limit: number,
  windowMs: number,
): Promise<RateLimitResult> {
  const count = await cacheIncr(`rl:${key}`, windowMs);
  const remaining = Math.max(0, limit - count);
  return {
    allowed: count <= limit,
    remaining,
    limit,
  };
}
