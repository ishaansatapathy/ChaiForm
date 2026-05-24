"use server";

import { revalidatePath } from "next/cache";

import {
  createFormOnServer,
  updateFormOnServer,
  type FormCreateInput,
  type FormUpdateInput,
} from "~/lib/fetch-session";

export async function createFormAction(input: FormCreateInput) {
  const form = await createFormOnServer(input);
  revalidatePath("/dashboard");
  revalidatePath("/analytics");
  return form;
}

export async function updateFormAction(input: FormUpdateInput) {
  const form = await updateFormOnServer(input);
  revalidatePath("/dashboard");
  revalidatePath("/analytics");
  revalidatePath(`/forms/${input.formId}/edit`);
  return form;
}
