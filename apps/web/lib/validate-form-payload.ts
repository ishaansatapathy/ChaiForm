import {
  createFormInputSchema,
  updateFormInputSchema,
  type CreateFormInput,
  type UpdateFormInput,
} from "@repo/services/form/model";

export function parseCreateFormInput(input: unknown):
  | { success: true; data: CreateFormInput }
  | { success: false; message: string } {
  const parsed = createFormInputSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, message: parsed.error.issues[0]?.message ?? "Invalid form data" };
  }
  return { success: true, data: parsed.data };
}

export function parseUpdateFormInput(input: unknown):
  | { success: true; data: UpdateFormInput }
  | { success: false; message: string } {
  const parsed = updateFormInputSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, message: parsed.error.issues[0]?.message ?? "Invalid form data" };
  }
  return { success: true, data: parsed.data };
}
