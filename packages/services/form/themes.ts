import { z } from "zod";

export const formThemeIds = ["default", "ben10", "anime", "startup", "gaming", "tech"] as const;

export type FormThemeId = (typeof formThemeIds)[number];

export const formThemeSchema = z.enum(formThemeIds);

export const FORM_THEME_CATALOG: {
  id: FormThemeId;
  label: string;
  description: string;
  category: string;
}[] = [
  { id: "default", label: "Classic", description: "Clean lime-on-black ChaiForm look", category: "Default" },
  { id: "ben10", label: "Ben 10", description: "Omnitrix green hero energy", category: "Anime" },
  { id: "anime", label: "Sakura", description: "Soft pink-purple anime vibes", category: "Anime" },
  { id: "startup", label: "Startup", description: "Bold blue founder feedback", category: "Startups" },
  { id: "gaming", label: "Arcade", description: "Neon red-orange gaming pulse", category: "Games" },
  { id: "tech", label: "Terminal", description: "Cyan tech-company aesthetic", category: "Tech" },
];
