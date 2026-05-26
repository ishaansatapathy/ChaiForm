import {
  refineSubmitFormInput,
  submitFormInputSchema,
  type SubmitFormInput,
} from "@repo/services/form/model";

export function parseSubmitFormInput(input: unknown):
  | { success: true; data: SubmitFormInput }
  | { success: false; message: string } {
  const normalized =
    typeof input === "object" && input !== null
      ? { website: "", ...(input as Record<string, unknown>) }
      : input;
  const parsed = submitFormInputSchema.safeParse(normalized);
  if (!parsed.success) {
    return { success: false, message: parsed.error.issues[0]?.message ?? "Invalid submission" };
  }
  try {
    return { success: true, data: refineSubmitFormInput(parsed.data) };
  } catch (error) {
    return { success: false, message: error instanceof Error ? error.message : "Invalid submission" };
  }
}
