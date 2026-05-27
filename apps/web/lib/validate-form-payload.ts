import {
  parseCreateFormInput as parseCreateFormInputModel,
  parseUpdateFormInput as parseUpdateFormInputModel,
  type CreateFormInput,
  type UpdateFormInput,
} from "@repo/services/form/model";

export function parseCreateFormInput(input: unknown):
  | { success: true; data: CreateFormInput }
  | { success: false; message: string } {
  return parseCreateFormInputModel(input);
}

export function parseUpdateFormInput(input: unknown):
  | { success: true; data: UpdateFormInput }
  | { success: false; message: string } {
  return parseUpdateFormInputModel(input);
}
