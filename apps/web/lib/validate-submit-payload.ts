import {
  parseSubmitFormInput as parseSubmitFormInputModel,
  type SubmitFormInput,
} from "@repo/services/form/model";

export function parseSubmitFormInput(input: unknown):
  | { success: true; data: SubmitFormInput }
  | { success: false; message: string } {
  return parseSubmitFormInputModel(input);
}
