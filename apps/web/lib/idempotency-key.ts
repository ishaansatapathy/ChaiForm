/** Stable per-tab key so retries return the same submission instead of duplicates. */
export function getSubmissionIdempotencyKey(formId: string): string {
  if (typeof window === "undefined") return crypto.randomUUID();
  const storageKey = `chaiform_idempotency_${formId}`;
  const existing = sessionStorage.getItem(storageKey);
  if (existing) return existing;
  const created = crypto.randomUUID();
  sessionStorage.setItem(storageKey, created);
  return created;
}

export function clearSubmissionIdempotencyKey(formId: string) {
  if (typeof window === "undefined") return;
  sessionStorage.removeItem(`chaiform_idempotency_${formId}`);
}
