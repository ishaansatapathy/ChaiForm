import { z } from "zod";

import FormService, { FormError } from "@repo/services/form";
import {
  createFormInputSchema,
  formOutputSchema,
  paginatedFormsOutputSchema,
  paginatedPublicFormsOutputSchema,
  paginatedSubmissionsOutputSchema,
  paginationInputSchema,
  publicFormOutputSchema,
  submissionOutputSchema,
  submitFormInputSchema,
  updateFormInputSchema,
} from "@repo/services/form/model";
import { TRPCError } from "@trpc/server";

import { publicProcedure, router, verifiedProcedure } from "../../trpc";
import { generatePath } from "../../utils/path-generator";

const formService = new FormService();
const TAGS = ["Forms"];
const getPath = generatePath("/forms");

function mapFormError(error: unknown): never {
  if (error instanceof FormError) {
    const codeMap = {
      NOT_FOUND: "NOT_FOUND",
      FORBIDDEN: "FORBIDDEN",
      BAD_REQUEST: "BAD_REQUEST",
    } as const;
    throw new TRPCError({ code: codeMap[error.code], message: error.message });
  }
  throw error;
}

export const formsRouter = router({
  create: verifiedProcedure
    .meta({ openapi: { method: "POST", path: getPath("/"), tags: TAGS, protect: true } })
    .input(createFormInputSchema)
    .output(formOutputSchema)
    .mutation(async ({ ctx, input }) => {
      try {
        return await formService.createForm(ctx.user.id, input);
      } catch (error) {
        mapFormError(error);
      }
    }),

  update: verifiedProcedure
    .meta({ openapi: { method: "PATCH", path: getPath("/{formId}"), tags: TAGS, protect: true } })
    .input(updateFormInputSchema)
    .output(formOutputSchema)
    .mutation(async ({ ctx, input }) => {
      try {
        return await formService.updateForm(ctx.user.id, input);
      } catch (error) {
        mapFormError(error);
      }
    }),

  delete: verifiedProcedure
    .meta({ openapi: { method: "DELETE", path: getPath("/{formId}"), tags: TAGS, protect: true } })
    .input(z.object({ formId: z.string().uuid() }))
    .output(z.object({ success: z.literal(true) }))
    .mutation(async ({ ctx, input }) => {
      try {
        return await formService.deleteForm(ctx.user.id, input.formId);
      } catch (error) {
        mapFormError(error);
      }
    }),

  getById: verifiedProcedure
    .meta({ openapi: { method: "GET", path: getPath("/{formId}"), tags: TAGS, protect: true } })
    .input(z.object({ formId: z.string().uuid() }))
    .output(formOutputSchema)
    .query(async ({ ctx, input }) => {
      try {
        return await formService.getFormById(ctx.user.id, input.formId);
      } catch (error) {
        mapFormError(error);
      }
    }),

  list: verifiedProcedure
    .meta({ openapi: { method: "GET", path: getPath("/"), tags: TAGS, protect: true } })
    .input(paginationInputSchema)
    .output(paginatedFormsOutputSchema)
    .query(async ({ ctx, input }) => {
      try {
        return await formService.listForms(ctx.user.id, input ?? { limit: 20 });
      } catch (error) {
        mapFormError(error);
      }
    }),

  listPublic: publicProcedure
    .meta({ openapi: { method: "GET", path: getPath("/public"), tags: TAGS } })
    .input(paginationInputSchema)
    .output(paginatedPublicFormsOutputSchema)
    .query(async ({ input }) => {
      try {
        return await formService.listPublicForms(input ?? { limit: 20 });
      } catch (error) {
        mapFormError(error);
      }
    }),

  getPublic: publicProcedure
    .meta({ openapi: { method: "GET", path: getPath("/public/{formId}"), tags: TAGS } })
    .input(z.object({ formId: z.string().uuid() }))
    .output(publicFormOutputSchema)
    .query(async ({ input }) => {
      try {
        return await formService.getPublicForm(input.formId);
      } catch (error) {
        mapFormError(error);
      }
    }),

  getPublicBySlug: publicProcedure
    .meta({ openapi: { method: "GET", path: getPath("/public/slug/{slug}"), tags: TAGS } })
    .input(z.object({ slug: z.string().min(1) }))
    .output(publicFormOutputSchema)
    .query(async ({ input }) => {
      try {
        return await formService.getPublicFormBySlug(input.slug);
      } catch (error) {
        mapFormError(error);
      }
    }),

  recordView: publicProcedure
    .meta({ openapi: { method: "POST", path: getPath("/views"), tags: TAGS } })
    .input(z.object({ formId: z.string().uuid() }))
    .output(z.object({ success: z.literal(true) }))
    .mutation(async ({ input }) => {
      try {
        return await formService.recordView(input.formId);
      } catch (error) {
        mapFormError(error);
      }
    }),

  submit: publicProcedure
    .meta({ openapi: { method: "POST", path: getPath("/submit"), tags: TAGS } })
    .input(submitFormInputSchema)
    .output(submissionOutputSchema)
    .mutation(async ({ ctx, input }) => {
      try {
        return await formService.submitForm(input, ctx.user?.id ?? null);
      } catch (error) {
        mapFormError(error);
      }
    }),

  hasSubmitted: publicProcedure
    .meta({ openapi: { method: "GET", path: getPath("/submitted/{formId}"), tags: TAGS } })
    .input(
      z.object({
        formId: z.string().uuid(),
        respondentKey: z.string().uuid().optional(),
      }),
    )
    .output(z.object({ submitted: z.boolean() }))
    .query(async ({ ctx, input }) => {
      try {
        return await formService.hasSubmitted(
          input.formId,
          input.respondentKey,
          ctx.user?.id ?? null,
        );
      } catch (error) {
        mapFormError(error);
      }
    }),

  listSubmissions: verifiedProcedure
    .meta({ openapi: { method: "GET", path: getPath("/{formId}/submissions"), tags: TAGS, protect: true } })
    .input(
      z.object({
        formId: z.string().uuid(),
        limit: z.number().int().min(1).max(100).default(20).optional(),
        cursor: z.string().uuid().optional(),
        search: z.string().max(200).optional(),
      }),
    )
    .output(paginatedSubmissionsOutputSchema)
    .query(async ({ ctx, input }) => {
      try {
        return await formService.listSubmissions(ctx.user.id, input.formId, {
          limit: input.limit ?? 20,
          cursor: input.cursor,
          search: input.search,
        });
      } catch (error) {
        mapFormError(error);
      }
    }),

  getSubmission: verifiedProcedure
    .meta({ openapi: { method: "GET", path: getPath("/submissions/{submissionId}"), tags: TAGS, protect: true } })
    .input(z.object({ submissionId: z.string().uuid() }))
    .output(submissionOutputSchema)
    .query(async ({ ctx, input }) => {
      try {
        return await formService.getSubmission(ctx.user.id, input.submissionId);
      } catch (error) {
        mapFormError(error);
      }
    }),
});
