import FormService, { FormError } from "@repo/services/form";
import { formFieldSchema } from "@repo/services/form/model";
import AnalyticsService from "@repo/services/analytics";
import {
  allFieldStatsInputSchema,
  allFieldStatsOutputSchema,
  analyticsSummaryInputSchema,
  analyticsSummaryOutputSchema,
  fieldBreakdownInputSchema,
  fieldBreakdownOutputSchema,
  submissionsOverTimeInputSchema,
  submissionsOverTimeOutputSchema,
} from "@repo/services/analytics/model";
import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { sanitizeTrpcError } from "../../error-handler";
import { router, verifiedProcedure } from "../../trpc";
import { generatePath } from "../../utils/path-generator";

const analyticsService = new AnalyticsService();
const formService = new FormService();
const TAGS = ["Analytics"];
const getPath = generatePath("/analytics");

function mapError(error: unknown): never {
  if (error instanceof FormError) {
    const codeMap = {
      NOT_FOUND: "NOT_FOUND",
      FORBIDDEN: "FORBIDDEN",
      BAD_REQUEST: "BAD_REQUEST",
    } as const;
    throw new TRPCError({ code: codeMap[error.code], message: error.message });
  }
  sanitizeTrpcError(error);
}

export const analyticsRouter = router({
  summary: verifiedProcedure
    .meta({ openapi: { method: "GET", path: getPath("/summary"), tags: TAGS, protect: true } })
    .input(analyticsSummaryInputSchema)
    .output(analyticsSummaryOutputSchema)
    .query(async ({ ctx, input }) => {
      try {
        return await analyticsService.getSummary(ctx.user.id, input.formId);
      } catch (error) {
        mapError(error);
      }
    }),

  submissionsOverTime: verifiedProcedure
    .meta({ openapi: { method: "GET", path: getPath("/submissions-over-time"), tags: TAGS, protect: true } })
    .input(submissionsOverTimeInputSchema)
    .output(submissionsOverTimeOutputSchema)
    .query(async ({ ctx, input }) => {
      try {
        return await analyticsService.getSubmissionsOverTime(ctx.user.id, input.formId, input.days);
      } catch (error) {
        mapError(error);
      }
    }),

  fieldBreakdown: verifiedProcedure
    .meta({ openapi: { method: "GET", path: getPath("/field-breakdown"), tags: TAGS, protect: true } })
    .input(fieldBreakdownInputSchema)
    .output(fieldBreakdownOutputSchema)
    .query(async ({ ctx, input }) => {
      try {
        return await analyticsService.getFieldBreakdown(ctx.user.id, input.formId, input.fieldId);
      } catch (error) {
        mapError(error);
      }
    }),

  allFieldStats: verifiedProcedure
    .meta({ openapi: { method: "GET", path: getPath("/all-field-stats"), tags: TAGS, protect: true } })
    .input(allFieldStatsInputSchema)
    .output(allFieldStatsOutputSchema)
    .query(async ({ ctx, input }) => {
      try {
        return await analyticsService.getAllFieldStats(ctx.user.id, input.formId);
      } catch (error) {
        mapError(error);
      }
    }),

  listFormFields: verifiedProcedure
    .meta({ openapi: { method: "GET", path: getPath("/form-fields"), tags: TAGS, protect: true } })
    .input(z.object({ formId: z.string().uuid() }))
    .output(z.object({ fields: z.array(formFieldSchema) }))
    .query(async ({ ctx, input }) => {
      try {
        const form = await formService.getFormById(ctx.user.id, input.formId, ctx.user.role);
        return { fields: form.fields };
      } catch (error) {
        mapError(error);
      }
    }),
});
