import { type NextRequest, NextResponse } from "next/server";

import { checkRateLimit, getClientIp, readJsonBody } from "~/lib/rate-limit";
import { parseSubmitFormInput } from "~/lib/validate-submit-payload";

const API_BASE = process.env.API_INTERNAL_URL ?? "http://localhost:8000";

export const maxDuration = 15;

export async function POST(request: NextRequest) {
  const ip = getClientIp(request);
  if (!checkRateLimit(`submit:${ip}`, 30, 15 * 60 * 1000)) {
    return NextResponse.json({ error: "Too many submissions. Try again later." }, { status: 429 });
  }

  const parsed = await readJsonBody(request);
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error }, { status: parsed.status });
  }

  const validated = parseSubmitFormInput(parsed.body);
  if (!validated.success) {
    return NextResponse.json({ error: validated.message }, { status: 400 });
  }

  const { formId, answers, website, respondentKey, idempotencyKey } = validated.data;

  if (!checkRateLimit(`submit-form:${formId}:${ip}`, 10, 15 * 60 * 1000)) {
    return NextResponse.json({ error: "Too many submissions for this form." }, { status: 429 });
  }

  try {
    const cookieHeader = request.headers.get("cookie") ?? "";
    const upstreamRes = await fetch(`${API_BASE}/trpc/forms.submit`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "accept-encoding": "identity",
        ...(cookieHeader ? { cookie: cookieHeader } : {}),
      },
      body: JSON.stringify({
        formId,
        answers,
        website,
        ...(respondentKey ? { respondentKey } : {}),
        ...(idempotencyKey ? { idempotencyKey } : {}),
      }),
      cache: "no-store",
      signal: AbortSignal.timeout(12_000),
    });

    const payloadText = await upstreamRes.text();
    let payload: { error?: { message?: string }; result?: { data?: unknown } };
    try {
      payload = JSON.parse(payloadText) as typeof payload;
    } catch {
      return NextResponse.json(
        { error: "Server returned an invalid response.", retryable: true },
        { status: 502 },
      );
    }

    if (!upstreamRes.ok || payload.error) {
      return NextResponse.json(
        {
          error: payload.error?.message ?? "Could not submit form.",
          retryable: upstreamRes.status >= 500,
        },
        { status: upstreamRes.status >= 400 ? upstreamRes.status : 502 },
      );
    }

    return NextResponse.json({ submission: payload.result?.data });
  } catch {
    return NextResponse.json(
      { error: "Server is waking up — please try again.", retryable: true },
      { status: 503 },
    );
  }
}
