"use client";

import { useEffect } from "react";

/** Ping tRPC health via same-origin proxy to wake Render before mutations. */
export function useWarmApi() {
  useEffect(() => {
    const ping = () => {
      void fetch("/trpc/health.getHealth?input=%7B%7D", { credentials: "include" }).catch(
        () => undefined,
      );
    };
    ping();
    const interval = setInterval(ping, 25_000);
    return () => clearInterval(interval);
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
    message.includes("load failed") ||
    message.includes("waking up") ||
    message.includes("could not save") ||
    message.includes("could not complete")
  );
}

export function getTrpcErrorMessage(error: unknown): string {
  if (!(error instanceof Error)) return "Something went wrong. Try again.";
  const message = error.message;
  if (isRetryableTrpcError(error)) {
    return "Could not reach the server. Please wait a moment and try again.";
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
  opts?: {
    attempts?: number;
    delaysMs?: number[];
    onRetry?: (attempt: number) => void;
    isRetryable?: (error: unknown) => boolean;
  },
): Promise<T> {
  const attempts = opts?.attempts ?? 5;
  const delaysMs = opts?.delaysMs ?? [0, 10_000, 15_000, 15_000, 20_000];
  const canRetry = opts?.isRetryable ?? isRetryableTrpcError;
  let lastError: unknown;

  for (let attempt = 0; attempt < attempts; attempt += 1) {
    if (attempt > 0) {
      opts?.onRetry?.(attempt + 1);
      await sleep(delaysMs[attempt] ?? 15_000);
    }
    try {
      return await task();
    } catch (error) {
      lastError = error;
      if (!canRetry(error) || attempt === attempts - 1) {
        throw error;
      }
    }
  }

  throw lastError;
}
