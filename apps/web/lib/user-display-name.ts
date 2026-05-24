type NamedUser = {
  displayName?: string | null;
  fullName: string;
};

export function getPublicDisplayName(user: NamedUser) {
  const alias = user.displayName?.trim();
  if (alias) return alias;
  return user.fullName.trim().split(/\s+/)[0] || "Hero";
}

export function getPrivateWelcomeName(fullName: string) {
  const trimmed = fullName.trim();
  if (!trimmed) return "Hero";
  return trimmed.split(/\s+/)[0] ?? trimmed;
}
