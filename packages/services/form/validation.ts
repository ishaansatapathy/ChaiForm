import { z } from "zod";

import type { FormField } from "./model";

function fieldValueSchema(field: FormField) {
  let schema: z.ZodString = z.string();

  switch (field.type) {
    case "email":
      schema = z.string().email("Invalid email address");
      break;
    case "number":
      schema = z.string().regex(/^-?\d+(\.\d+)?$/, "Must be a valid number");
      break;
    case "date":
      schema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Must be a valid date (YYYY-MM-DD)");
      break;
    case "rating": {
      const max = field.config?.maxRating ?? 5;
      const ratingSchema = z
        .string()
        .regex(/^\d+$/, "Rating must be a number")
        .refine((value) => {
          const n = Number(value);
          return n >= 1 && n <= max;
        }, `Rating must be between 1 and ${max}`);
      if (!field.required) {
        return z.union([z.literal(""), ratingSchema]).optional();
      }
      return ratingSchema;
    }
    case "select": {
      const options = field.config?.options ?? [];
      if (options.length === 0) {
        schema = z.string().min(1, "Select field has no options configured");
      } else {
        const selectSchema = z.enum(options as [string, ...string[]], {
          message: "Invalid option selected",
        });
        if (!field.required) {
          return z.union([z.literal(""), selectSchema]).optional();
        }
        return selectSchema;
      }
      break;
    }
    case "checkbox": {
      const checkboxSchema = z.enum(["true", "false"], {
        message: "Checkbox must be checked or unchecked",
      });
      if (!field.required) {
        return z.union([z.literal(""), checkboxSchema]).optional();
      }
      return z.literal("true", { message: `"${field.label}" must be checked` });
    }
    default:
      schema = z.string().max(5000);
  }

  if (!field.required) {
    return z.union([z.literal(""), schema]).optional();
  }

  return schema.min(1, `"${field.label}" is required`);
}

export function buildSubmissionSchema(fields: FormField[]) {
  const shape: Record<string, z.ZodType> = {};

  for (const field of fields) {
    shape[field.id] = fieldValueSchema(field);
  }

  return z.object(shape);
}

export function validateSubmissionAnswers(fields: FormField[], answers: { fieldId: string; value: string }[]) {
  const answerMap: Record<string, string> = {};
  const fieldIds = new Set(fields.map((field) => field.id));

  for (const answer of answers) {
    if (!fieldIds.has(answer.fieldId)) {
      throw new Error("Invalid field in submission");
    }
    answerMap[answer.fieldId] = answer.value?.trim() ?? "";
  }

  for (const field of fields) {
    if (!(field.id in answerMap)) {
      answerMap[field.id] = "";
    }
  }

  const schema = buildSubmissionSchema(fields);
  const parsed = schema.safeParse(answerMap);

  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    throw new Error(issue?.message ?? "Invalid submission");
  }

  return answerMap;
}
