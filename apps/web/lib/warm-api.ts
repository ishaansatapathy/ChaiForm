"use client";

import { useEffect } from "react";

/** Ping tRPC health via same-origin proxy to wake Render before mutations. */
export function useWarmApi() {
  useEffect(() => {
    void fetch("/trpc/health.getHealth?input=%7B%7D", { credentials: "include" }).catch(() => undefined);
  }, []);
}

export function isRetryableTrpcError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  const message = error.message.toLowerCase();
  return (
    message.includes("failed to fetch") ||
    message.includes("network") ||
    message.includes("timeout") ||
    message.includes("api unavailable") ||
    message.includes("load failed")
  );
}

export function getTrpcErrorMessage(error: unknown): string {
  if (!(error instanceof Error)) return "Something went wrong. Try again.";
  const message = error.message;
  if (isRetryableTrpcError(error)) {
    return "Server is waking up — wait a few seconds and try again.";
  }
  if (message.startsWith("[")) {
    return "Could not save. Please try again.";
  }
  return message;
}

export function sleep(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms));
}

export async function runWithRetry<T>(
  task: () => Promise<T>,
  opts?: { attempts?: number; delaysMs?: number[]; onRetry?: (attempt: number) => void },
): Promise<T> {
  const attempts = opts?.attempts ?? 3;
  const delaysMs = opts?.delaysMs ?? [0, 12_000, 8_000];
  let lastError: unknown;

  for (let attempt = 0; attempt < attempts; attempt += 1) {
    if (attempt > 0) {
      opts?.onRetry?.(attempt + 1);
      await sleep(delaysMs[attempt] ?? 8_000);
    }
    try {
      return await task();
    } catch (error) {
      lastError = error;
      if (!isRetryableTrpcError(error) || attempt === attempts - 1) {
        throw error;
      }
    }
  }

  throw lastError;
}
