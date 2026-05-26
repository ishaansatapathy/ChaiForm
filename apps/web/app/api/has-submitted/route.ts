import { type NextRequest, NextResponse } from "next/server";

import { parseRespondentToken } from "@repo/services/respondent-key";

const API_BASE = process.env.API_INTERNAL_URL ?? "http://localhost:8000";

export async function POST(request: NextRequest) {
  let formId: string | undefined;
  try {
    const body = (await request.json()) as { formId?: string };
    formId = body.formId;
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  if (!formId) {
    return NextResponse.json({ error: "formId is required." }, { status: 400 });
  }

  const cookieToken = request.cookies.get(`chaiform_rk_${formId}`)?.value;
  const respondentKey = cookieToken ? parseRespondentToken(cookieToken, formId) : undefined;

  try {
    const input = encodeURIComponent(
      JSON.stringify({
        formId,
        ...(respondentKey ? { respondentKey } : {}),
      }),
    );
    const cookieHeader = request.headers.get("cookie") ?? "";
    const upstream = await fetch(`${API_BASE}/trpc/forms.hasSubmitted?input=${input}`, {
      cache: "no-store",
      headers: cookieHeader ? { cookie: cookieHeader } : undefined,
    });

    if (!upstream.ok) {
      return NextResponse.json({ submitted: false });
    }

    const payload = (await upstream.json()) as { result?: { data?: { submitted?: boolean } } };
    return NextResponse.json({ submitted: payload.result?.data?.submitted === true });
  } catch {
    return NextResponse.json({ submitted: false }, { status: 503 });
  }
}
