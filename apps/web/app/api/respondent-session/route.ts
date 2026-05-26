import { type NextRequest, NextResponse } from "next/server";

import { createRespondentToken } from "@repo/services/respondent-key";

export async function POST(request: NextRequest) {
  let formId: string | undefined;
  try {
    const body = (await request.json()) as { formId?: string };
    formId = body.formId;
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  if (!formId || !/^[0-9a-f-]{36}$/i.test(formId)) {
    return NextResponse.json({ error: "Valid formId is required." }, { status: 400 });
  }

  const existing = request.cookies.get(`chaiform_rk_${formId}`)?.value;
  if (existing) {
    return NextResponse.json({ ok: true });
  }

  const token = createRespondentToken(formId);
  const response = NextResponse.json({ ok: true });
  response.cookies.set(`chaiform_rk_${formId}`, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 365 * 24 * 60 * 60,
  });
  return response;
}
