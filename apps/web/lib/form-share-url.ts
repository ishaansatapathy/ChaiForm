/** Prefer pretty slug URLs when available. */
export function getFormSharePath(form: { id: string; slug?: string | null }) {
  const slug = form.slug?.trim();
  return slug ? `/f/s/${slug}` : `/f/${form.id}`;
}

export function getFormShareUrl(
  form: { id: string; slug?: string | null },
  origin = typeof window !== "undefined" ? window.location.origin : "",
) {
  return `${origin}${getFormSharePath(form)}`;
}
