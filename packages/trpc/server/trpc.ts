import { initTRPC, TRPCError } from "@trpc/server";
import { OpenApiMeta } from "trpc-to-openapi";
import { AuthError } from "@repo/services/auth/errors";

import { createContext } from "./context";

export const tRPCContext = initTRPC
  .meta<OpenApiMeta>()
  .context<typeof createContext>()
  .create({
    errorFormatter({ shape, error }) {
      return {
        ...shape,
        data: {
          ...shape.data,
          zodError: error.cause instanceof Error ? error.cause.message : null,
        },
      };
    },
  });

export const router = tRPCContext.router;

export const publicProcedure = tRPCContext.procedure;

export const protectedProcedure = publicProcedure.use(({ ctx, next }) => {
  if (!ctx.user) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: "Not authenticated" });
  }
  return next({
    ctx: {
      ...ctx,
      user: ctx.user,
    },
  });
});

export const verifiedProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (!ctx.user.emailVerified) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Email verification required. Check your inbox for the verification link.",
    });
  }
  return next({ ctx });
});

export function mapAuthError(error: unknown): never {
  if (error instanceof TRPCError) throw error;

  if (error instanceof AuthError) {
    const codeMap = {
      BAD_REQUEST: "BAD_REQUEST",
      UNAUTHORIZED: "UNAUTHORIZED",
      FORBIDDEN: "FORBIDDEN",
      NOT_FOUND: "NOT_FOUND",
      CONFLICT: "CONFLICT",
      INTERNAL: "INTERNAL_SERVER_ERROR",
    } as const;

    throw new TRPCError({
      code: codeMap[error.code],
      message: error.message,
    });
  }

  throw error;
}
