import type { FormField } from "./model";

export type FormVersionFieldSnapshot = {
  id: string;
  label: string;
  type: string;
  required: boolean;
  config?: Record<string, unknown>;
};

export function fieldsToVersionSnapshot(fields: FormField[]): FormVersionFieldSnapshot[] {
  return fields.map((field) => ({
    id: field.id,
    label: field.label,
    type: field.type,
    required: field.required,
    config: field.config ?? undefined,
  }));
}

export function fieldsChanged(before: FormField[], after: FormField[]): boolean {
  if (before.length !== after.length) return true;
  return JSON.stringify(fieldsToVersionSnapshot(before)) !== JSON.stringify(fieldsToVersionSnapshot(after));
}
