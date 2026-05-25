"use client";

import { TRPCClientError } from "@repo/trpc/client";

import { isRetryableTrpcError, runWithRetry, sleep } from "~/lib/warm-api";

type SaveAction = "create" | "update";

class SaveFormError extends Error {
  retryable: boolean;

  constructor(message: string, retryable: boolean) {
    super(message);
    this.name = "SaveFormError";
    this.retryable = retryable;
  }
}

export function isSaveRetryable(error: unknown): boolean {
  if (error instanceof SaveFormError) return error.retryable;
  if (error instanceof TRPCClientError) {
    const code = error.data?.code;
    if (code === "UNAUTHORIZED" || code === "FORBIDDEN" || code === "BAD_REQUEST") return false;
    return true;
  }
  return isRetryableTrpcError(error);
}

export function getSaveErrorMessage(error: unknown): string {
  if (error instanceof SaveFormError) return error.message;
  if (error instanceof TRPCClientError) return error.message;
  if (error instanceof Error) return error.message;
  return "Could not save form. Try again.";
}

async function pingHealth(): Promise<boolean> {
  try {
    const response = await fetch("/trpc/health.getHealth?input=%7B%7D", {
      credentials: "include",
      cache: "no-store",
      signal: AbortSignal.timeout(12_000),
    });
    return response.ok;
  } catch {
    return false;
  }
}

/** Wait until server responds — skip warmup entirely if first ping succeeds. */
export async function warmApiUntilReady(
  onProgress?: (message: string) => void,
  maxAttempts = 4,
): Promise<boolean> {
  // Quick check — if the server responds immediately, skip the warmup loop.
  if (await pingHealth()) return true;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    onProgress?.(`Connecting to server (${attempt}/${maxAttempts})…`);
    if (await pingHealth()) return true;
    if (attempt < maxAttempts) {
      await sleep(3_000);
    }
  }
  return false;
}

async function saveViaApi(action: SaveAction, input: Record<string, unknown>) {
  const response = await fetch("/api/save-form", {
    method: "POST",
    credentials: "include",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ action, input }),
    cache: "no-store",
    signal: AbortSignal.timeout(30_000),
  });

  let payload: { error?: string; retryable?: boolean; form?: unknown } = {};
  try {
    payload = (await response.json()) as typeof payload;
  } catch {
    throw new SaveFormError("Server did not respond. Try again.", true);
  }

  if (!response.ok || payload.error) {
    const retryable = payload.retryable ?? (response.status >= 500 || response.status === 503);
    throw new SaveFormError(payload.error ?? "Could not save form.", retryable);
  }

  return payload.form;
}

export async function saveFormWithColdStart<T>(
  action: SaveAction,
  input: Record<string, unknown>,
  opts?: {
    mutate?: () => Promise<T>;
    onProgress?: (message: string) => void;
  },
): Promise<T> {
  const onProgress = opts?.onProgress;

  const ready = await warmApiUntilReady(undefined, 4);
  if (!ready) {
    onProgress?.("Waking server…");
    const retryReady = await warmApiUntilReady(onProgress, 4);
    if (!retryReady) {
      throw new SaveFormError(
        "Server is not responding. Check that the API is running and try again.",
        true,
      );
    }
  }

  const totalAttempts = 3;

  return runWithRetry(
    async () => {
      if (opts?.mutate) {
        return opts.mutate();
      }
      return (await saveViaApi(action, input)) as T;
    },
    {
      attempts: totalAttempts,
      delaysMs: [0, 3_000, 5_000],
      onRetry: (attempt) => onProgress?.(`Saving… retry ${attempt}/${totalAttempts}`),
      isRetryable: isSaveRetryable,
    },
  );
}
