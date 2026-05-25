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

/** Apply when the creator explicitly changes retention in the editor. */
export function expiresAtFromRetentionChange(preset: FormRetentionPreset): Date | null {
  return expiresAtFromRetention(preset, new Date());
}

export function isFormExpired(expiresAt: Date | null | undefined, now = new Date()): boolean {
  if (!expiresAt) return false;
  return expiresAt.getTime() <= now.getTime();
}

export function presetFromExpiresAt(
  expiresAt: Date | null | undefined,
  createdAt?: Date | null | undefined,
): FormRetentionPreset {
  if (!expiresAt) return "forever";

  const expiryMs = expiresAt.getTime();
  const referenceMs = createdAt?.getTime() ?? Date.now();
  const totalDays = Math.ceil((expiryMs - referenceMs) / 86_400_000);

  if (totalDays <= 7) return "7d";
  if (totalDays <= 30) return "30d";
  if (totalDays <= 90) return "90d";
  if (totalDays <= 180) return "180d";
  return "365d";
}
