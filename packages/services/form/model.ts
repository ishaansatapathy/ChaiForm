import { z } from "zod";

import { formThemeSchema } from "./themes";
import { formRetentionPresets } from "./retention";

export const formRetentionSchema = z.enum(formRetentionPresets);

export const fieldVisibilityRuleSchema = z
  .object({
    fieldId: z.string().min(1),
    operator: z.enum(["eq", "neq"]).default("eq"),
    value: z.string().max(500),
  })
  .strict();

const fieldValidationConfigSchema = z
  .object({
    minLength: z.number().int().min(0).max(5000).optional(),
    maxLength: z.number().int().min(1).max(10000).optional(),
    pattern: z.string().max(500).optional(),
    minValue: z.number().optional(),
    maxValue: z.number().optional(),
  })
  .strict();

const textLikeConfigSchema = z.object({
  placeholder: z.string().max(200).optional(),
  validation: fieldValidationConfigSchema.optional(),
  showWhen: fieldVisibilityRuleSchema.optional(),
});

// ---------------------------------------------------------------------------
// Named config schemas — defined once, shared between formFieldInputSchema
// and formFieldSchema so config shape is not duplicated per union member.
// ---------------------------------------------------------------------------

const selectConfigSchema = z.object({
  options: z.array(z.string().min(1).max(200)).min(1).max(100),
  placeholder: z.string().max(200).optional(),
  showWhen: fieldVisibilityRuleSchema.optional(),
});

const ratingConfigSchema = z.object({
  maxRating: z.number().int().min(1).max(10).default(5),
  lowLabel: z.string().max(80).optional(),
  highLabel: z.string().max(80).optional(),
  showWhen: fieldVisibilityRuleSchema.optional(),
});

const checkboxConfigSchema = z
  .object({
    options: z.array(z.string().min(1).max(200)).min(1).max(100).optional(),
    checkboxLabel: z.string().max(200).optional(),
    showWhen: fieldVisibilityRuleSchema.optional(),
  })
  .optional();

const descriptionConfigSchema = z.object({
  style: z.enum(["heading", "body"]).default("body"),
  showWhen: fieldVisibilityRuleSchema.optional(),
});

/**
 * Type-specific shape additions shared between formFieldInputSchema and
 * formFieldSchema. The only difference between those two schemas is the `id`
 * field (string.min(1) for client input vs string.uuid() for stored records).
 * All config shapes are defined here exactly once.
 */
const fieldTypeShapes = {
  text:        { type: z.literal("text"),        config: textLikeConfigSchema.optional() },
  textarea:    { type: z.literal("textarea"),    config: textLikeConfigSchema.optional() },
  email:       { type: z.literal("email"),       config: textLikeConfigSchema.optional() },
  number:      { type: z.literal("number"),      config: textLikeConfigSchema.optional() },
  date:        { type: z.literal("date"),        config: textLikeConfigSchema.optional() },
  select:      { type: z.literal("select"),      config: selectConfigSchema },
  rating:      { type: z.literal("rating"),      config: ratingConfigSchema },
  checkbox:    { type: z.literal("checkbox"),    config: checkboxConfigSchema },
  /** Non-answerable section divider / heading rendered as static text in the public form. */
  description: { type: z.literal("description"), config: descriptionConfigSchema.optional() },
} as const;

// ---------------------------------------------------------------------------
// Base shapes
// ---------------------------------------------------------------------------

const fieldBaseInputSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1).max(255),
  required: z.boolean(),
});

const fieldBaseStoredShape = {
  id: z.string().uuid(),
  label: z.string().min(1).max(255),
  required: z.boolean(),
} as const;

// ---------------------------------------------------------------------------
// Public schemas
// ---------------------------------------------------------------------------

export const formFieldInputSchema = z.discriminatedUnion("type", [
  z.object({ ...fieldBaseInputSchema.shape, ...fieldTypeShapes.text }),
  z.object({ ...fieldBaseInputSchema.shape, ...fieldTypeShapes.textarea }),
  z.object({ ...fieldBaseInputSchema.shape, ...fieldTypeShapes.email }),
  z.object({ ...fieldBaseInputSchema.shape, ...fieldTypeShapes.number }),
  z.object({ ...fieldBaseInputSchema.shape, ...fieldTypeShapes.date }),
  z.object({ ...fieldBaseInputSchema.shape, ...fieldTypeShapes.select }),
  z.object({ ...fieldBaseInputSchema.shape, ...fieldTypeShapes.rating }),
  z.object({ ...fieldBaseInputSchema.shape, ...fieldTypeShapes.checkbox }),
  z.object({ ...fieldBaseInputSchema.shape, ...fieldTypeShapes.description }),
]);

export const formFieldSchema = z.discriminatedUnion("type", [
  z.object({ ...fieldBaseStoredShape, ...fieldTypeShapes.text }),
  z.object({ ...fieldBaseStoredShape, ...fieldTypeShapes.textarea }),
  z.object({ ...fieldBaseStoredShape, ...fieldTypeShapes.email }),
  z.object({ ...fieldBaseStoredShape, ...fieldTypeShapes.number }),
  z.object({ ...fieldBaseStoredShape, ...fieldTypeShapes.date }),
  z.object({ ...fieldBaseStoredShape, ...fieldTypeShapes.select }),
  z.object({ ...fieldBaseStoredShape, ...fieldTypeShapes.rating }),
  z.object({ ...fieldBaseStoredShape, ...fieldTypeShapes.checkbox }),
  z.object({ ...fieldBaseStoredShape, ...fieldTypeShapes.description }),
]);

export const paginationInputSchema = z
  .object({
    limit: z.number().int().min(1).max(100).default(20),
    cursor: z.string().uuid().optional(),
    search: z.string().max(200).optional(),
  })
  .strict();

export const submissionPaginationInputSchema = z
  .object({
    limit: z.number().int().min(1).max(100).default(20),
    cursor: z.string().uuid().optional(),
    search: z.string().max(200).optional(),
    submittedFrom: z.string().max(40).optional(),
    submittedTo: z.string().max(40).optional(),
  })
  .strict();

function assertUniqueFieldIds(fields: { id: string }[]) {
  const ids = fields.map((field) => field.id);
  if (new Set(ids).size !== ids.length) {
    throw new Error("Duplicate field IDs are not allowed");
  }
}

function assertUniqueOptions(fields: z.infer<typeof formFieldInputSchema>[]) {
  for (const field of fields) {
    const options =
      field.config && "options" in field.config ? field.config.options : undefined;
    if (!options?.length) continue;
    const normalized = options.map((option) => option.trim().toLowerCase());
    if (new Set(normalized).size !== normalized.length) {
      throw new Error(`"${field.label}" has duplicate options`);
    }
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
  assertUniqueOptions(input.fields);
  return input;
}

export function refineUpdateFormInput(input: z.infer<typeof updateFormInputBaseSchema>) {
  if (input.fields) {
    assertUniqueFieldIds(input.fields);
    assertUniqueOptions(input.fields);
  }
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
    value: z.string().max(10000),
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
    /** Cloudflare Turnstile — verified server-side when configured */
    turnstileToken: z.string().max(4096).optional(),
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

export const exportSubmissionsOutputSchema = z.object({
  formTitle: z.string(),
  fields: z.array(
    z.object({
      id: z.string().uuid(),
      label: z.string(),
      type: z.string(),
    }),
  ),
  items: z.array(submissionOutputSchema),
});

export type FormFieldInput = z.infer<typeof formFieldInputSchema>;
export type FormField = z.infer<typeof formFieldSchema>;
export type CreateFormInput = z.infer<typeof createFormInputSchema>;
export type UpdateFormInput = z.infer<typeof updateFormInputSchema>;
export type SubmitFormInput = z.infer<typeof submitFormInputSchema>;
export type PaginationInput = z.infer<typeof paginationInputSchema>;
export type SubmissionPaginationInput = z.infer<typeof submissionPaginationInputSchema>;
