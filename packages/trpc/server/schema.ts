import { z } from "zod";

/** tRPC clients often send `{}` for no-input procedures — accept both. */
export const zodUndefinedModel = z
  .union([z.undefined(), z.object({}).strict()])
  .transform(() => undefined);
export { z };
