import { cookies } from "next/headers";

import type { RouterInputs, RouterOutputs } from "@repo/trpc/client";

export type SessionUser = RouterOutputs["auth"]["me"];
export type FormsListPage = RouterOutputs["forms"]["list"];
export type FormDetail = RouterOutputs["forms"]["getById"];
export type AnalyticsSummary = RouterOutputs["analytics"]["summary"];
export type SubmissionsOverTime = RouterOutputs["analytics"]["submissionsOverTime"];
export type FormFieldsList = RouterOutputs["analytics"]["listFormFields"];
export type SubmissionsPage = RouterOutputs["forms"]["listSubmissions"];
export type FieldBreakdown = RouterOutputs["analytics"]["fieldBreakdown"];
export type FormCreateInput = RouterInputs["forms"]["create"];
export type FormUpdateInput = RouterInputs["forms"]["update"];

export type AnalyticsBundle = {
  summary: AnalyticsSummary | null;
  overTime: SubmissionsOverTime | null;
  formFields: FormFieldsList | null;
  fieldBreakdown: FieldBreakdown | null;
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
        headers: {
          "accept-encoding": "identity",
          ...(cookieHeader ? { cookie: cookieHeader } : {}),
        },
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

function sleep(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms));
}

/** Wake Render free-tier instance before heavy mutations (quick ping only). */
export async function wakeRenderApi(maxAttempts = 2): Promise<boolean> {
  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    try {
      const response = await fetch(`${API_BASE}/health`, {
        cache: "no-store",
        signal: AbortSignal.timeout(8_000),
      });
      if (response.ok) return true;
    } catch {
      // keep retrying
    }
    if (attempt < maxAttempts - 1) {
      await sleep(2000);
    }
  }
  return false;
}

async function fetchTrpcMutation<T>(
  procedure: string,
  input: Record<string, unknown>,
  cookieHeader: string,
): Promise<T> {
  const url = `${API_BASE}/trpc/${procedure}`;

  for (let attempt = 0; attempt < 5; attempt += 1) {
    try {
      const response = await fetch(url, {
        method: "POST",
      headers: {
          "content-type": "application/json",
          "accept-encoding": "identity",
          ...(cookieHeader ? { cookie: cookieHeader } : {}),
        },
        body: JSON.stringify(input),
        cache: "no-store",
        signal: AbortSignal.timeout(45_000),
      });

      const payload: unknown = await response.json();
      const errorMessage = (payload as { error?: { message?: string } }).error?.message;

      if (response.status === 401) {
        throw new Error("Please sign in again.");
      }
      if (response.status === 403) {
        throw new Error(errorMessage ?? "Email verification required.");
      }
      if (!response.ok || errorMessage) {
        if (response.status >= 500 && attempt < 4) {
          await sleep(3000 * (attempt + 1));
          continue;
        }
        throw new Error(errorMessage ?? "Could not complete request.");
      }

      const data = (payload as { result?: { data?: T } }).result?.data;
      if (data === undefined) {
        throw new Error("Invalid server response.");
      }
      return data;
    } catch (error) {
      if (attempt < 4 && error instanceof Error && !error.message.includes("sign in")) {
        await sleep(3000 * (attempt + 1));
        continue;
      }
      throw error instanceof Error ? error : new Error("Could not complete request.");
    }
  }

  throw new Error("Server is waking up — wait 30 seconds and try again.");
}

export async function createFormOnServer(input: FormCreateInput) {
  await wakeRenderApi();
  const cookieStore = await cookies();
  const cookieHeader = buildCookieHeader(cookieStore);
  if (!cookieHeader.includes("jwt") && !cookieHeader.includes("jwt_refresh")) {
    throw new Error("Please sign in again.");
  }
  return fetchTrpcMutation<FormDetail>(
    "forms.create",
    input as Record<string, unknown>,
    cookieHeader,
  );
}

export async function updateFormOnServer(input: FormUpdateInput) {
  await wakeRenderApi();
  const cookieStore = await cookies();
  const cookieHeader = buildCookieHeader(cookieStore);
  if (!cookieHeader.includes("jwt") && !cookieHeader.includes("jwt_refresh")) {
    throw new Error("Please sign in again.");
  }
  return fetchTrpcMutation<FormDetail>(
    "forms.update",
    input as Record<string, unknown>,
    cookieHeader,
  );
}

export async function fetchSessionUser(): Promise<SessionUser | null> {
  const cookieStore = await cookies();
  const cookieHeader = buildCookieHeader(cookieStore);
  if (!cookieHeader.includes("jwt") && !cookieHeader.includes("jwt_refresh")) {
    return null;
  }
  return fetchTrpcQuery<SessionUser>("auth.me", {}, cookieHeader);
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
      fieldBreakdown: null,
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

  const firstFieldId = formFields?.fields[0]?.id;
  const fieldBreakdown = firstFieldId
    ? await fetchTrpcQuery<FieldBreakdown>(
        "analytics.fieldBreakdown",
        { formId, fieldId: firstFieldId },
        cookieHeader,
      )
    : null;

  return { summary, overTime, formFields, fieldBreakdown, submissions, allSubmissions };
}
