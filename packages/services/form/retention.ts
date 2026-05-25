export const formRetentionPresets = ["forever", "7d", "30d", "90d", "180d", "365d"] as const;
export type FormRetentionPreset = (typeof formRetentionPresets)[number];

const RETENTION_DAYS: Record<Exclude<FormRetentionPreset, "forever">, number> = {
  "7d": 7,
  "30d": 30,
  "90d": 90,
  "180d": 180,
  "365d": 365,
};

export function expiresAtFromRetention(preset: FormRetentionPreset, from = new Date()): Date | null {
  if (preset === "forever") return null;

  const days = RETENTION_DAYS[preset];
  const expiresAt = new Date(from);
  expiresAt.setDate(expiresAt.getDate() + days);
  return expiresAt;
}

export function isFormExpired(expiresAt: Date | null | undefined, now = new Date()): boolean {
  if (!expiresAt) return false;
  return expiresAt.getTime() <= now.getTime();
}

export function presetFromExpiresAt(expiresAt: Date | null | undefined): FormRetentionPreset {
  if (!expiresAt) return "forever";

  const daysLeft = Math.ceil((expiresAt.getTime() - Date.now()) / 86_400_000);
  if (daysLeft <= 7) return "7d";
  if (daysLeft <= 30) return "30d";
  if (daysLeft <= 90) return "90d";
  if (daysLeft <= 180) return "180d";
  return "365d";
}
