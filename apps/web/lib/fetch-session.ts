import { cookies } from "next/headers";

import type { RouterOutputs } from "@repo/trpc/client";

export type SessionUser = RouterOutputs["auth"]["me"];
export type FormsListPage = RouterOutputs["forms"]["list"];
export type FormDetail = RouterOutputs["forms"]["getById"];
export type AnalyticsSummary = RouterOutputs["analytics"]["summary"];
export type SubmissionsOverTime = RouterOutputs["analytics"]["submissionsOverTime"];
export type FormFieldsList = RouterOutputs["analytics"]["listFormFields"];
export type SubmissionsPage = RouterOutputs["forms"]["listSubmissions"];

export type AnalyticsBundle = {
  summary: AnalyticsSummary | null;
  overTime: SubmissionsOverTime | null;
  formFields: FormFieldsList | null;
  submissions: SubmissionsPage | null;
  allSubmissions: SubmissionsPage | null;
};

const API_BASE = process.env.API_INTERNAL_URL ?? "http://localhost:8000";

function buildCookieHeader(
  cookieStore: Awaited<ReturnType<typeof cookies>>,
): string {
  return cookieStore
    .getAll()
    .map((cookie) => `${cookie.name}=${cookie.value}`)
    .join("; ");
}

async function fetchTrpcQuery<T>(
  procedure: string,
  input: Record<string, unknown> | undefined,
  cookieHeader: string,
): Promise<T | null> {
  const query = input ? encodeURIComponent(JSON.stringify(input)) : undefined;
  const url = query
    ? `${API_BASE}/trpc/${procedure}?input=${query}`
    : `${API_BASE}/trpc/${procedure}`;

  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      const response = await fetch(url, {
        headers: cookieHeader ? { cookie: cookieHeader } : undefined,
        cache: "no-store",
        signal: AbortSignal.timeout(25_000),
      });

      if (response.status === 401 || response.status === 403) return null;

      if (!response.ok) {
        if (response.status >= 500 && attempt < 2) {
          await new Promise((resolve) => setTimeout(resolve, 1500 * (attempt + 1)));
          continue;
        }
        return null;
      }

      const payload: unknown = await response.json();
      const data = (payload as { result?: { data?: T } }).result?.data;
      return data ?? null;
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
  return fetchTrpcQuery<SessionUser>("auth.me", undefined, cookieHeader);
}

export async function fetchFormsList(limit = 100): Promise<FormsListPage | null> {
  const cookieStore = await cookies();
  const cookieHeader = buildCookieHeader(cookieStore);
  if (!cookieHeader.includes("jwt") && !cookieHeader.includes("jwt_refresh")) {
    return null;
  }
  return fetchTrpcQuery<FormsListPage>("forms.list", { limit }, cookieHeader);
}

export async function fetchFormById(formId: string): Promise<FormDetail | null> {
  const cookieStore = await cookies();
  const cookieHeader = buildCookieHeader(cookieStore);
  if (!cookieHeader.includes("jwt") && !cookieHeader.includes("jwt_refresh")) {
    return null;
  }
  return fetchTrpcQuery<FormDetail>("forms.getById", { formId }, cookieHeader);
}

export async function fetchAnalyticsSummary(formId?: string): Promise<AnalyticsSummary | null> {
  const cookieStore = await cookies();
  const cookieHeader = buildCookieHeader(cookieStore);
  if (!cookieHeader.includes("jwt") && !cookieHeader.includes("jwt_refresh")) {
    return null;
  }
  return fetchTrpcQuery<AnalyticsSummary>(
    "analytics.summary",
    formId ? { formId } : {},
    cookieHeader,
  );
}

export async function fetchAnalyticsBundle(formId: string): Promise<AnalyticsBundle> {
  const cookieStore = await cookies();
  const cookieHeader = buildCookieHeader(cookieStore);
  if (!cookieHeader.includes("jwt") && !cookieHeader.includes("jwt_refresh")) {
    return {
      summary: null,
      overTime: null,
      formFields: null,
      submissions: null,
      allSubmissions: null,
    };
  }

  const [summary, overTime, formFields, submissions, allSubmissions] = await Promise.all([
    fetchTrpcQuery<AnalyticsSummary>("analytics.summary", { formId }, cookieHeader),
    fetchTrpcQuery<SubmissionsOverTime>(
      "analytics.submissionsOverTime",
      { formId, days: 30 },
      cookieHeader,
    ),
    fetchTrpcQuery<FormFieldsList>("analytics.listFormFields", { formId }, cookieHeader),
    fetchTrpcQuery<SubmissionsPage>("forms.listSubmissions", { formId, limit: 15 }, cookieHeader),
    fetchTrpcQuery<SubmissionsPage>("forms.listSubmissions", { formId, limit: 100 }, cookieHeader),
  ]);

  return { summary, overTime, formFields, submissions, allSubmissions };
}
