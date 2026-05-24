export function isMultiCheckboxConfig(config?: {
  options?: string[];
  checkboxLabel?: string;
}) {
  const options = config?.options?.map((option) => option.trim()).filter(Boolean);
  return !!(options && options.length > 0);
}

export function parseMultiCheckboxValue(value: string): string[] {
  if (!value || value === "[]") return [];
  try {
    const parsed: unknown = JSON.parse(value);
    if (Array.isArray(parsed)) {
      return parsed.filter((item): item is string => typeof item === "string");
    }
  } catch {
    return [];
  }
  return [];
}

export function formatCheckboxAnswerValue(
  value: string,
  config?: { options?: string[]; checkboxLabel?: string },
) {
  if (isMultiCheckboxConfig(config) || value.startsWith("[")) {
    const selected = parseMultiCheckboxValue(value);
    return selected.length > 0 ? selected.join(", ") : "None selected";
  }
  return value === "true" ? "Yes" : "No";
}
