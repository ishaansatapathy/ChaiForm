import { z } from "zod";

import { formThemeSchema } from "./themes";
import { formRetentionPresets } from "./retention";

export const formRetentionSchema = z.enum(formRetentionPresets);

const fieldBaseInputSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1).max(255),
  required: z.boolean(),
});

const textLikeConfigSchema = z.object({
  placeholder: z.string().max(200).optional(),
});

export const formFieldInputSchema = z.discriminatedUnion("type", [
  z.object({ ...fieldBaseInputSchema.shape, type: z.literal("text"), config: textLikeConfigSchema.optional() }),
  z.object({ ...fieldBaseInputSchema.shape, type: z.literal("textarea"), config: textLikeConfigSchema.optional() }),
  z.object({ ...fieldBaseInputSchema.shape, type: z.literal("email"), config: textLikeConfigSchema.optional() }),
  z.object({ ...fieldBaseInputSchema.shape, type: z.literal("number"), config: textLikeConfigSchema.optional() }),
  z.object({ ...fieldBaseInputSchema.shape, type: z.literal("date"), config: textLikeConfigSchema.optional() }),
  z.object({
    ...fieldBaseInputSchema.shape,
    type: z.literal("select"),
    config: z.object({
      options: z.array(z.string().min(1)).min(1),
      placeholder: z.string().max(200).optional(),
    }),
  }),
  z.object({
    ...fieldBaseInputSchema.shape,
    type: z.literal("rating"),
    config: z.object({
      maxRating: z.number().int().min(1).max(10).default(5),
    }),
  }),
  z.object({
    ...fieldBaseInputSchema.shape,
    type: z.literal("checkbox"),
    config: z
      .object({
        options: z.array(z.string().min(1).max(200)).min(1).optional(),
        checkboxLabel: z.string().max(200).optional(),
      })
      .optional(),
  }),
]);

export const formFieldSchema = z.discriminatedUnion("type", [
  z.object({ id: z.string().uuid(), label: z.string().min(1).max(255), required: z.boolean(), type: z.literal("text"), config: textLikeConfigSchema.optional() }),
  z.object({ id: z.string().uuid(), label: z.string().min(1).max(255), required: z.boolean(), type: z.literal("textarea"), config: textLikeConfigSchema.optional() }),
  z.object({ id: z.string().uuid(), label: z.string().min(1).max(255), required: z.boolean(), type: z.literal("email"), config: textLikeConfigSchema.optional() }),
  z.object({ id: z.string().uuid(), label: z.string().min(1).max(255), required: z.boolean(), type: z.literal("number"), config: textLikeConfigSchema.optional() }),
  z.object({ id: z.string().uuid(), label: z.string().min(1).max(255), required: z.boolean(), type: z.literal("date"), config: textLikeConfigSchema.optional() }),
  z.object({
    id: z.string().uuid(),
    label: z.string().min(1).max(255),
    required: z.boolean(),
    type: z.literal("select"),
    config: z.object({
      options: z.array(z.string().min(1)).min(1),
      placeholder: z.string().max(200).optional(),
    }),
  }),
  z.object({
    id: z.string().uuid(),
    label: z.string().min(1).max(255),
    required: z.boolean(),
    type: z.literal("rating"),
    config: z.object({
      maxRating: z.number().int().min(1).max(10).default(5),
    }),
  }),
  z.object({
    id: z.string().uuid(),
    label: z.string().min(1).max(255),
    required: z.boolean(),
    type: z.literal("checkbox"),
    config: z
      .object({
        options: z.array(z.string().min(1).max(200)).min(1).optional(),
        checkboxLabel: z.string().max(200).optional(),
      })
      .optional(),
  }),
]);

export const paginationInputSchema = z
  .object({
    limit: z.number().int().min(1).max(100).default(20),
    cursor: z.string().uuid().optional(),
    search: z.string().max(200).optional(),
  })
  .strict();

function assertUniqueFieldIds(fields: { id: string }[]) {
  const ids = fields.map((field) => field.id);
  if (new Set(ids).size !== ids.length) {
    throw new Error("Duplicate field IDs are not allowed");
  }
}

/** OpenAPI-safe base schema (no refinements — trpc-to-openapi cannot handle .superRefine). */
export const createFormInputBaseSchema = z
  .object({
    title: z.string().min(1).max(255),
    description: z.string().max(2000).optional(),
    visibility: z.enum(["public", "unlisted", "draft"]).default("public"),
    theme: formThemeSchema.default("default"),
    retention: formRetentionSchema.default("forever"),
    allowMultipleSubmissions: z.boolean().default(true),
    requireAuthentication: z.boolean().default(false),
    fields: z.array(formFieldInputSchema).min(1).max(50),
  })
  .strict();

export const updateFormInputBaseSchema = z
  .object({
    formId: z.string().uuid(),
    title: z.string().min(1).max(255).optional(),
    description: z.string().max(2000).optional(),
    visibility: z.enum(["public", "unlisted", "draft"]).optional(),
    theme: formThemeSchema.optional(),
    slug: z.string().min(1).max(80).optional(),
    retention: formRetentionSchema.optional(),
    allowMultipleSubmissions: z.boolean().optional(),
    requireAuthentication: z.boolean().optional(),
    fields: z.array(formFieldInputSchema).min(1).max(50).optional(),
  })
  .strict();

export function refineCreateFormInput(input: z.infer<typeof createFormInputBaseSchema>) {
  assertUniqueFieldIds(input.fields);
  return input;
}

export function refineUpdateFormInput(input: z.infer<typeof updateFormInputBaseSchema>) {
  if (input.fields) assertUniqueFieldIds(input.fields);
  return input;
}

export const createFormInputSchema = createFormInputBaseSchema;
export const updateFormInputSchema = updateFormInputBaseSchema;

export const formOutputSchema = z.object({
  id: z.string().uuid(),
  slug: z.string().nullable(),
  title: z.string(),
  description: z.string().nullable(),
  visibility: z.enum(["public", "unlisted", "draft"]),
  theme: formThemeSchema,
  fields: z.array(formFieldSchema),
  submissionCount: z.number().int(),
  viewCount: z.number().int(),
  completionRate: z.number(),
  allowMultipleSubmissions: z.boolean(),
  requireAuthentication: z.boolean(),
  expiresAt: z.string().nullable(),
  schemaVersion: z.number().int().min(1).nullable(),
  createdAt: z.string().nullable(),
  updatedAt: z.string().nullable(),
});

export const paginatedFormsOutputSchema = z.object({
  items: z.array(formOutputSchema),
  nextCursor: z.string().uuid().nullable(),
});

export const publicFormOutputSchema = z.object({
  id: z.string().uuid(),
  slug: z.string().nullable(),
  title: z.string(),
  description: z.string().nullable(),
  theme: formThemeSchema,
  allowMultipleSubmissions: z.boolean(),
  requireAuthentication: z.boolean(),
  fields: z.array(formFieldSchema),
});

export const publicFormListingItemSchema = z.object({
  id: z.string().uuid(),
  slug: z.string().nullable(),
  title: z.string(),
  description: z.string().nullable(),
  theme: formThemeSchema,
  submissionCount: z.number().int(),
  viewCount: z.number().int(),
  createdAt: z.string().nullable(),
});

export const paginatedPublicFormsOutputSchema = z.object({
  items: z.array(publicFormListingItemSchema),
  nextCursor: z.string().uuid().nullable(),
});

export const submissionAnswerSchema = z.object({
  fieldId: z.string().uuid(),
  label: z.string(),
  type: z.string(),
  value: z.string(),
});

const submitAnswerSchema = z
  .object({
    fieldId: z.string().uuid(),
    value: z.string().max(5000),
  })
  .strict();

/** OpenAPI-safe base schema (no .refine — validated in service layer). */
export const submitFormInputBaseSchema = z
  .object({
    formId: z.string().uuid(),
    respondentKey: z.string().uuid().optional(),
    idempotencyKey: z.string().uuid().optional(),
    answers: z.array(submitAnswerSchema).max(50),
    /** Honeypot — must stay empty */
    website: z.string().max(500).default(""),
  })
  .strict();

export function refineSubmitFormInput(input: z.infer<typeof submitFormInputBaseSchema>) {
  if (input.website.length > 0) {
    throw new Error("Submission rejected");
  }
  const ids = input.answers.map((answer) => answer.fieldId);
  if (new Set(ids).size !== ids.length) {
    throw new Error("Duplicate field answers are not allowed");
  }
  return input;
}

export const submitFormInputSchema = submitFormInputBaseSchema;

export const submissionOutputSchema = z.object({
  id: z.string().uuid(),
  formId: z.string().uuid(),
  formVersionId: z.string().uuid().nullable(),
  formTitle: z.string(),
  answers: z.array(submissionAnswerSchema),
  submittedAt: z.string().nullable(),
});

export const paginatedSubmissionsOutputSchema = z.object({
  items: z.array(submissionOutputSchema),
  nextCursor: z.string().uuid().nullable(),
});

export type FormFieldInput = z.infer<typeof formFieldInputSchema>;
export type FormField = z.infer<typeof formFieldSchema>;
export type CreateFormInput = z.infer<typeof createFormInputSchema>;
export type UpdateFormInput = z.infer<typeof updateFormInputSchema>;
export type SubmitFormInput = z.infer<typeof submitFormInputSchema>;
export type PaginationInput = z.infer<typeof paginationInputSchema>;
