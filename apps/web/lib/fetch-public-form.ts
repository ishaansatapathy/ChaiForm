import type { RouterOutputs } from "@repo/trpc/client";

type PublicForm = RouterOutputs["forms"]["getPublic"];

const API_BASE = process.env.API_INTERNAL_URL ?? "http://localhost:8000";

async function fetchTrpcQuery<T>(procedure: string, input: Record<string, unknown>): Promise<T | null> {
  const query = encodeURIComponent(JSON.stringify(input));
  const url = `${API_BASE}/trpc/${procedure}?input=${query}`;

  try {
    const response = await fetch(url, { cache: "no-store" });
    if (!response.ok) return null;

    const payload: unknown = await response.json();
    if (!payload || typeof payload !== "object") return null;

    const result = (payload as { result?: { data?: T }; error?: unknown }).result;
    if (!result?.data) return null;

    return result.data;
  } catch {
    return null;
  }
}

export async function fetchPublicFormById(formId: string): Promise<PublicForm | null> {
  const trimmed = formId.trim();
  if (!trimmed) return null;
  return fetchTrpcQuery<PublicForm>("forms.getPublic", { formId: trimmed });
}

export async function fetchPublicFormBySlug(slug: string): Promise<PublicForm | null> {
  const trimmed = decodeURIComponent(slug).trim().toLowerCase();
  if (!trimmed) return null;
  return fetchTrpcQuery<PublicForm>("forms.getPublicBySlug", { slug: trimmed });
}
