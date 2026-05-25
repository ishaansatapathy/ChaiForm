const RESPONDENT_PREFIX = "chaiform:respondent:";
const SUBMITTED_PREFIX = "chaiform:submitted:";

export function getRespondentKey(formId: string): string {
  if (typeof window === "undefined") return "";

  const storageKey = `${RESPONDENT_PREFIX}${formId}`;
  const existing = window.localStorage.getItem(storageKey);
  if (existing) return existing;

  const created = crypto.randomUUID();
  window.localStorage.setItem(storageKey, created);
  return created;
}

export function markFormSubmitted(formId: string) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(`${SUBMITTED_PREFIX}${formId}`, "1");
}

export function hasLocalSubmission(formId: string) {
  if (typeof window === "undefined") return false;
  return window.localStorage.getItem(`${SUBMITTED_PREFIX}${formId}`) === "1";
}

export async function checkRemoteSubmission(formId: string, respondentKey: string) {
  if (!respondentKey) return false;

  try {
    const input = encodeURIComponent(JSON.stringify({ formId, respondentKey }));
    const response = await fetch(`/trpc/forms.hasSubmitted?input=${input}`, {
      cache: "no-store",
    });
    if (!response.ok) return false;
    const payload = (await response.json()) as { result?: { data?: { submitted?: boolean } } };
    return payload.result?.data?.submitted === true;
  } catch {
    return false;
  }
}
