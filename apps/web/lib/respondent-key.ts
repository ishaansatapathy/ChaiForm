/** Ensures a signed httpOnly respondent cookie exists for single-submit forms. */
export async function ensureRespondentSession(formId: string): Promise<void> {
  if (typeof window === "undefined") return;

  await fetch("/api/respondent-session", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ formId }),
    credentials: "include",
  }).catch(() => undefined);
}

const SUBMITTED_PREFIX = "chaiform:submitted:";

export function markFormSubmitted(formId: string) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(`${SUBMITTED_PREFIX}${formId}`, "1");
}

export function hasLocalSubmission(formId: string) {
  if (typeof window === "undefined") return false;
  return window.localStorage.getItem(`${SUBMITTED_PREFIX}${formId}`) === "1";
}

export async function checkRemoteSubmission(formId: string) {
  try {
    const response = await fetch("/api/has-submitted", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ formId }),
      cache: "no-store",
      credentials: "include",
    });
    if (!response.ok) return false;
    const payload = (await response.json()) as { submitted?: boolean };
    return payload.submitted === true;
  } catch {
    return false;
  }
}
