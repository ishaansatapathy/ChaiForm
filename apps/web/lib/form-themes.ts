export type FormThemeId = "default" | "ben10" | "anime" | "startup" | "gaming" | "tech";

export type FormThemeStyle = {
  id: FormThemeId;
  label: string;
  description: string;
  category: string;
  pageBg: string;
  glow: string;
  accent: string;
  accentSoft: string;
  accentText: string;
  badge: string;
};

export const FORM_THEMES: FormThemeStyle[] = [
  {
    id: "default",
    label: "Classic",
    description: "Clean lime-on-black ChaiForm look",
    category: "Default",
    pageBg: "bg-black",
    glow: "bg-[radial-gradient(circle_at_50%_0%,rgba(74,222,128,0.08),transparent_40%)]",
    accent: "border-lime-400 bg-lime-400/20 text-lime-300",
    accentSoft: "text-lime-400",
    accentText: "text-lime-400",
    badge: "bg-lime-400/10 text-lime-400 border-lime-400/20",
  },
  {
    id: "ben10",
    label: "Ben 10",
    description: "Omnitrix green hero energy",
    category: "Anime",
    pageBg: "bg-[#050505]",
    glow: "bg-[radial-gradient(circle_at_50%_0%,rgba(112,180,4,0.12),transparent_42%)]",
    accent: "border-[#70b404] bg-[#70b404]/20 text-[#b8ff4a]",
    accentSoft: "text-[#70b404]",
    accentText: "text-[#70b404]",
    badge: "bg-[#70b404]/10 text-[#70b404] border-[#70b404]/25",
  },
  {
    id: "anime",
    label: "Sakura",
    description: "Soft pink-purple anime vibes",
    category: "Anime",
    pageBg: "bg-[#0a0612]",
    glow: "bg-[radial-gradient(circle_at_50%_0%,rgba(244,114,182,0.12),transparent_42%)]",
    accent: "border-fuchsia-400 bg-fuchsia-400/20 text-fuchsia-200",
    accentSoft: "text-fuchsia-400",
    accentText: "text-fuchsia-400",
    badge: "bg-fuchsia-400/10 text-fuchsia-300 border-fuchsia-400/20",
  },
  {
    id: "startup",
    label: "Startup",
    description: "Bold blue founder feedback",
    category: "Startups",
    pageBg: "bg-[#030712]",
    glow: "bg-[radial-gradient(circle_at_50%_0%,rgba(59,130,246,0.12),transparent_42%)]",
    accent: "border-blue-400 bg-blue-400/20 text-blue-200",
    accentSoft: "text-blue-400",
    accentText: "text-blue-400",
    badge: "bg-blue-400/10 text-blue-300 border-blue-400/20",
  },
  {
    id: "gaming",
    label: "Arcade",
    description: "Neon red-orange gaming pulse",
    category: "Games",
    pageBg: "bg-[#0c0505]",
    glow: "bg-[radial-gradient(circle_at_50%_0%,rgba(251,113,133,0.12),transparent_42%)]",
    accent: "border-rose-400 bg-rose-400/20 text-rose-200",
    accentSoft: "text-rose-400",
    accentText: "text-rose-400",
    badge: "bg-rose-400/10 text-rose-300 border-rose-400/20",
  },
  {
    id: "tech",
    label: "Terminal",
    description: "Cyan tech-company aesthetic",
    category: "Tech",
    pageBg: "bg-[#020617]",
    glow: "bg-[radial-gradient(circle_at_50%_0%,rgba(34,211,238,0.12),transparent_42%)]",
    accent: "border-cyan-400 bg-cyan-400/20 text-cyan-200",
    accentSoft: "text-cyan-400",
    accentText: "text-cyan-400",
    badge: "bg-cyan-400/10 text-cyan-300 border-cyan-400/20",
  },
];

export function getFormTheme(themeId?: string | null): FormThemeStyle {
  return FORM_THEMES.find((theme) => theme.id === themeId) ?? FORM_THEMES[0]!;
}
