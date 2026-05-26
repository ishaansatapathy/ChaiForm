import { type NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

import { checkRateLimit, getClientIp } from "~/lib/rate-limit";
import { parseCreateFormInput, parseUpdateFormInput } from "~/lib/validate-form-payload";

export const maxDuration = 30;

type SaveAction = "create" | "update";

async function postTrpcMutation(
  procedure: string,
  input: Record<string, unknown>,
  cookieHeader: string,
) {
  const API_BASE = process.env.API_INTERNAL_URL ?? "http://localhost:8000";
  const response = await fetch(`${API_BASE}/trpc/${procedure}`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "accept-encoding": "identity",
      ...(cookieHeader ? { cookie: cookieHeader } : {}),
    },
    body: JSON.stringify(input),
    cache: "no-store",
    signal: AbortSignal.timeout(25_000),
  });

  const payload: unknown = await response.json();
  const errorMessage = (payload as { error?: { message?: string } }).error?.message;
  const data = (payload as { result?: { data?: unknown } }).result?.data;

  if (response.status === 401) {
    return { ok: false as const, status: 401, error: "Please sign in again." };
  }
  if (response.status === 403) {
    return {
      ok: false as const,
      status: 403,
      error: errorMessage ?? "Email verification required. Check your inbox.",
    };
  }
  if (!response.ok || errorMessage) {
    return {
      ok: false as const,
      status: response.status,
      error: errorMessage ?? "Could not save form.",
      retryable: response.status >= 500 || response.status === 503,
    };
  }
  if (data === undefined) {
    return { ok: false as const, status: 502, error: "Invalid server response.", retryable: true };
  }

  return { ok: true as const, form: data };
}

export async function POST(request: NextRequest) {
  const ip = getClientIp(request);
  if (!checkRateLimit(`save-form:${ip}`, 40, 15 * 60 * 1000)) {
    return NextResponse.json({ error: "Too many save requests. Try again later." }, { status: 429 });
  }

  const cookieStore = await cookies();
  const cookieHeader = cookieStore
    .getAll()
    .map((cookie) => `${cookie.name}=${cookie.value}`)
    .join("; ");

  if (!cookieStore.has("jwt") && !cookieStore.has("jwt_refresh")) {
    return NextResponse.json({ error: "Please sign in again." }, { status: 401 });
  }

  let body: { action?: SaveAction; input?: unknown };
  try {
    body = (await request.json()) as { action?: SaveAction; input?: unknown };
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const { action, input } = body;
  if (!action || input === undefined || (action !== "create" && action !== "update")) {
    return NextResponse.json({ error: "Invalid save request." }, { status: 400 });
  }

  const parsed =
    action === "create" ? parseCreateFormInput(input) : parseUpdateFormInput(input);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.message }, { status: 400 });
  }

  const procedure = action === "create" ? "forms.create" : "forms.update";
  const result = await postTrpcMutation(
    procedure,
    parsed.data as Record<string, unknown>,
    cookieHeader,
  );

  if (!result.ok) {
    return NextResponse.json(
      { error: result.error, retryable: result.retryable ?? false },
      { status: result.status >= 400 ? result.status : 503 },
    );
  }

  return NextResponse.json({ form: result.form });
}
