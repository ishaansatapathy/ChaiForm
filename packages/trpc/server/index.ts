import { router } from "./trpc";

import { healthRouter } from "./routes/health/route";
import { authRouter } from "./routes/auth/route";
import { formsRouter } from "./routes/forms/route";
import { analyticsRouter } from "./routes/analytics/route";

export const serverRouter = router({
  health: healthRouter,
  auth: authRouter,
  forms: formsRouter,
  analytics: analyticsRouter,
});

export const openApiRouter = serverRouter;

export { createContext } from "./context";
export type ServerRouter = typeof serverRouter;
