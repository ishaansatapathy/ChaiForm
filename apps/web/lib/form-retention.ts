export const FORM_RETENTION_OPTIONS = [
  { value: "forever", label: "Keep forever" },
  { value: "7d", label: "7 days" },
  { value: "30d", label: "30 days" },
  { value: "90d", label: "90 days" },
  { value: "180d", label: "6 months" },
  { value: "365d", label: "1 year" },
] as const;

export type FormRetentionOption = (typeof FORM_RETENTION_OPTIONS)[number]["value"];

export function presetFromExpiresAt(expiresAt: string | null | undefined): FormRetentionOption {
  if (!expiresAt) return "forever";

  const daysLeft = Math.ceil((new Date(expiresAt).getTime() - Date.now()) / 86_400_000);
  if (daysLeft <= 7) return "7d";
  if (daysLeft <= 30) return "30d";
  if (daysLeft <= 90) return "90d";
  if (daysLeft <= 180) return "180d";
  return "365d";
}

export function formatExpiresAt(expiresAt: string | null | undefined) {
  if (!expiresAt) return null;
  return new Date(expiresAt).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function isFormExpired(expiresAt: string | null | undefined) {
  if (!expiresAt) return false;
  return new Date(expiresAt).getTime() <= Date.now();
}

export function retentionHint(preset: FormRetentionOption) {
  if (preset === "forever") {
    return "This form stays active until you delete it.";
  }
  const label = FORM_RETENTION_OPTIONS.find((option) => option.value === preset)?.label ?? preset;
  return `Form auto-deletes after ${label.toLowerCase()}. You'll get an email when it's removed.`;
}
