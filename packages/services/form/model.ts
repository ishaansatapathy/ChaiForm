import { z } from "zod";

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
]);

export const formFieldSchema = z.discriminatedUnion("type", [
  z.object({ id: z.string().uuid(), label: z.string().min(1).max(255), required: z.boolean(), type: z.literal("text"), config: textLikeConfigSchema.optional() }),
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
]);

export const paginationInputSchema = z.object({
  limit: z.number().int().min(1).max(100).default(20),
  cursor: z.string().uuid().optional(),
});

export const createFormInputSchema = z.object({
  title: z.string().min(1).max(255),
  description: z.string().max(2000).optional(),
  visibility: z.enum(["public", "unlisted", "draft"]).default("public"),
  fields: z.array(formFieldInputSchema).min(1),
});

export const updateFormInputSchema = z.object({
  formId: z.string().uuid(),
  title: z.string().min(1).max(255).optional(),
  description: z.string().max(2000).optional(),
  visibility: z.enum(["public", "unlisted", "draft"]).optional(),
  slug: z.string().min(1).max(80).optional(),
  fields: z.array(formFieldInputSchema).min(1).optional(),
});

export const formOutputSchema = z.object({
  id: z.string().uuid(),
  slug: z.string().nullable(),
  title: z.string(),
  description: z.string().nullable(),
  visibility: z.enum(["public", "unlisted", "draft"]),
  fields: z.array(formFieldSchema),
  submissionCount: z.number().int(),
  viewCount: z.number().int(),
  completionRate: z.number(),
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
  fields: z.array(formFieldSchema),
});

export const submissionAnswerSchema = z.object({
  fieldId: z.string().uuid(),
  label: z.string(),
  type: z.string(),
  value: z.string(),
});

export const submitFormInputSchema = z.object({
  formId: z.string().uuid(),
  answers: z.array(
    z.object({
      fieldId: z.string().uuid(),
      value: z.string(),
    }),
  ),
});

export const submissionOutputSchema = z.object({
  id: z.string().uuid(),
  formId: z.string().uuid(),
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
