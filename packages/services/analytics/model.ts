import { z } from "zod";

export const analyticsSummaryInputSchema = z.object({
  formId: z.string().uuid().optional(),
});

export const analyticsSummaryOutputSchema = z.object({
  totalForms: z.number().int(),
  totalSubmissions: z.number().int(),
  submissionsLast7Days: z.number().int(),
  averageCompletionRate: z.number(),
  selectedForm: z
    .object({
      id: z.string().uuid(),
      title: z.string(),
      submissionCount: z.number().int(),
      viewCount: z.number().int(),
      completionRate: z.number(),
      fieldCount: z.number().int(),
      visibility: z.enum(["public", "unlisted", "draft"]),
    })
    .nullable(),
});

export const submissionsOverTimeInputSchema = z.object({
  formId: z.string().uuid(),
  days: z.number().int().min(1).max(90).default(30),
});

export const submissionsOverTimeOutputSchema = z.object({
  points: z.array(
    z.object({
      date: z.string(),
      count: z.number().int(),
    }),
  ),
});

export const fieldBreakdownInputSchema = z.object({
  formId: z.string().uuid(),
  fieldId: z.string().uuid(),
});

export const fieldBreakdownOutputSchema = z.object({
  fieldId: z.string().uuid(),
  label: z.string(),
  type: z.string(),
  totalResponses: z.number().int(),
  eligibleResponses: z.number().int(),
  skippedResponses: z.number().int(),
  answerRate: z.number(),
  dropOffRate: z.number(),
  averageRating: z.number().nullable(),
  optionCounts: z.array(
    z.object({
      option: z.string(),
      count: z.number().int(),
    }),
  ),
  recentValues: z.array(z.string()),
});

export const allFieldStatsInputSchema = z.object({
  formId: z.string().uuid(),
});

export const allFieldStatsOutputSchema = z.object({
  fields: z.array(fieldBreakdownOutputSchema),
});

export const formFunnelInputSchema = z.object({
  formId: z.string().uuid(),
});

export const formFunnelOutputSchema = z.object({
  formId: z.string().uuid(),
  title: z.string(),
  views: z.number().int(),
  submissions: z.number().int(),
  completionRate: z.number(),
  dropOffRate: z.number(),
  stages: z.array(
    z.object({
      label: z.string(),
      count: z.number().int(),
    }),
  ),
});
