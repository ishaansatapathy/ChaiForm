import { httpLink, httpBatchStreamLink } from "@repo/trpc/client";
import { env } from "~/env.js";

interface CreateTRPCHttpBatchClientClientOpts {
  enableStreaming?: boolean;
}

export const createTRPCHttpBatchClientClient = (opts?: CreateTRPCHttpBatchClientClientOpts) => {
  const c = opts?.enableStreaming ? httpBatchStreamLink : httpLink;
  return c({
    url: env.NEXT_PUBLIC_API_URL ?? "/trpc",
    fetch(url, options) {
      const timeoutSignal = AbortSignal.timeout(90_000);
      const signal =
        options?.signal && typeof AbortSignal.any === "function"
          ? AbortSignal.any([options.signal, timeoutSignal])
          : timeoutSignal;

      return fetch(url, {
        ...options,
        credentials: "include",
        signal,
      });
    },
  });
};
