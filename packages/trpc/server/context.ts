import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";

import { authService } from "./services";

export async function createContext({ req, res }: CreateExpressContextOptions) {
  const user = await authService.resolveSession(req, res);
  return { req, res, user, authService };
}

export type Context = Awaited<ReturnType<typeof createContext>>;
