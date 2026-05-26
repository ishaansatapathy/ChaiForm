import type { FormField } from "./model";

export type FieldVisibilityRule = {
  fieldId: string;
  operator: "eq" | "neq";
  value: string;
};

export function getFieldShowWhen(field: FormField): FieldVisibilityRule | undefined {
  const rule = field.config?.showWhen;
  if (!rule?.fieldId) return undefined;
  return rule;
}

export function isFieldVisible(
  field: FormField,
  values: Record<string, string>,
): boolean {
  const rule = getFieldShowWhen(field);
  if (!rule) return true;

  const actual = (values[rule.fieldId] ?? "").trim();
  const expected = rule.value.trim();

  if (rule.operator === "neq") {
    return actual !== expected;
  }

  return actual === expected;
}

export function getVisibleFields(fields: FormField[], values: Record<string, string>): FormField[] {
  return fields.filter((field) => isFieldVisible(field, values));
}
