export const HERO_TIME_STORAGE_KEY = "chaiform:show-hero";

export function markHeroTimePending() {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(HERO_TIME_STORAGE_KEY, "1");
}

export function consumeHeroTimePending() {
  if (typeof window === "undefined") return false;
  const pending = sessionStorage.getItem(HERO_TIME_STORAGE_KEY) === "1";
  if (pending) sessionStorage.removeItem(HERO_TIME_STORAGE_KEY);
  return pending;
}

export function peekHeroTimePending() {
  if (typeof window === "undefined") return false;
  return sessionStorage.getItem(HERO_TIME_STORAGE_KEY) === "1";
}

export function clearHeroTimePending() {
  if (typeof window === "undefined") return;
  sessionStorage.removeItem(HERO_TIME_STORAGE_KEY);
}

export function withHeroTimeParam(path: string) {
  const separator = path.includes("?") ? "&" : "?";
  return `${path}${separator}hero=1`;
}
