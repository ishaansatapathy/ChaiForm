import { cookies } from "next/headers";

import type { RouterOutputs } from "@repo/trpc/client";

export type SessionUser = RouterOutputs["auth"]["me"];

const API_BASE = process.env.API_INTERNAL_URL ?? "http://localhost:8000";

function buildCookieHeader(
  cookieStore: Awaited<ReturnType<typeof cookies>>,
): string {
  return cookieStore
    .getAll()
    .map((cookie) => `${cookie.name}=${cookie.value}`)
    .join("; ");
}

async function fetchAuthMe(cookieHeader: string): Promise<SessionUser | null> {
  const url = `${API_BASE}/trpc/auth.me`;

  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      const response = await fetch(url, {
        headers: cookieHeader ? { cookie: cookieHeader } : undefined,
        cache: "no-store",
        signal: AbortSignal.timeout(25_000),
      });

      if (response.status === 401) return null;

      if (!response.ok) {
        if (response.status >= 500 && attempt < 2) {
          await new Promise((resolve) => setTimeout(resolve, 1500 * (attempt + 1)));
          continue;
        }
        return null;
      }

      const payload: unknown = await response.json();
      const user = (payload as { result?: { data?: SessionUser } }).result?.data;
      return user ?? null;
    } catch {
      if (attempt < 2) {
        await new Promise((resolve) => setTimeout(resolve, 1500 * (attempt + 1)));
        continue;
      }
      return null;
    }
  }

  return null;
}

export async function fetchSessionUser(): Promise<SessionUser | null> {
  const cookieStore = await cookies();
  const cookieHeader = buildCookieHeader(cookieStore);
  if (!cookieHeader.includes("jwt") && !cookieHeader.includes("jwt_refresh")) {
    return null;
  }
  return fetchAuthMe(cookieHeader);
}
