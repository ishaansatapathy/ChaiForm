import { z } from "zod";

import type { FormField } from "./model";
import { sanitizeSubmissionValue } from "./sanitize";

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
      schema = z
        .string()
        .regex(/^\d{4}-\d{2}-\d{2}$/, "Must be a valid date (YYYY-MM-DD)")
        .refine((value) => {
          if (!value) return true;
          const parts = value.split("-").map(Number);
          if (parts.length !== 3 || parts.some((part) => Number.isNaN(part))) return false;
          const [year, month, day] = parts as [number, number, number];
          const date = new Date(Date.UTC(year, month - 1, day));
          return (
            date.getUTCFullYear() === year &&
            date.getUTCMonth() === month - 1 &&
            date.getUTCDate() === day
          );
        }, "Must be a valid calendar date");
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
      const options = field.config?.options?.map((option) => option.trim()).filter(Boolean) ?? [];
      if (options.length > 0) {
        const multiCheckboxSchema = z.string().refine(
          (value) => {
            if (!value || value === "[]") return !field.required;
            try {
              const parsed: unknown = JSON.parse(value);
              if (!Array.isArray(parsed)) return false;
              if (parsed.length === 0) return !field.required;
              return parsed.every(
                (item) => typeof item === "string" && options.includes(item),
              );
            } catch {
              return false;
            }
          },
          field.required
            ? `Select at least one option for "${field.label}"`
            : "Invalid checkbox selection",
        );
        return multiCheckboxSchema;
      }

      const checkboxSchema = z.enum(["true", "false"], {
        message: "Checkbox must be checked or unchecked",
      });
      if (!field.required) {
        return z.union([z.literal(""), checkboxSchema]).optional();
      }
      return z.literal("true", { message: `"${field.label}" must be checked` });
    }
    case "text":
      schema = z.string().max(5000);
      break;
    case "textarea":
      schema = z.string().max(10000);
      break;
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

  return z.object(shape).strict();
}

export function validateSubmissionAnswers(fields: FormField[], answers: { fieldId: string; value: string }[]) {
  const answerMap: Record<string, string> = {};
  const fieldIds = new Set(fields.map((field) => field.id));
  const seenFieldIds = new Set<string>();

  for (const answer of answers) {
    if (!fieldIds.has(answer.fieldId)) {
      throw new Error("Invalid field in submission");
    }
    if (seenFieldIds.has(answer.fieldId)) {
      throw new Error("Duplicate field in submission");
    }
    seenFieldIds.add(answer.fieldId);
    answerMap[answer.fieldId] = sanitizeSubmissionValue(answer.value ?? "");
  }

  for (const field of fields) {
    if (!(field.id in answerMap)) {
      answerMap[field.id] = "";
    }
  }

  const schema = buildSubmissionSchema(fields);
  const parsed = schema.safeParse(answerMap);

  if (!parsed.success) {
    throw parsed.error;
  }

  return answerMap;
}
