import { type NextRequest, NextResponse } from "next/server";

import {
  fetchAnalyticsBundle,
  fetchAnalyticsSummary,
  fetchFormsList,
} from "~/lib/fetch-session";

export const maxDuration = 30;

export async function GET(request: NextRequest) {
  const formId = request.nextUrl.searchParams.get("formId");

  try {
    if (formId) {
      const bundle = await fetchAnalyticsBundle(formId);
      return NextResponse.json({ bundle });
    }

    const [forms, summary] = await Promise.all([
      fetchFormsList(100),
      fetchAnalyticsSummary(),
    ]);
    return NextResponse.json({ forms, summary });
  } catch {
    return NextResponse.json({ error: "Could not load analytics." }, { status: 503 });
  }
}
