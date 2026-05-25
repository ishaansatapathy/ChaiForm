"use client";

import { useEffect } from "react";
import type { ReactNode } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { TRPCClientError } from "@repo/trpc/client";

import type { RouterOutputs } from "@repo/trpc/client";

import { AppMobileNav } from "~/components/app/app-mobile-nav";
import { AppDataProvider } from "~/components/app/app-data-provider";
import { AppSidebar } from "~/components/app/app-sidebar";
import { HeroTimeGate } from "~/components/app/hero-time-gate";
import { prefetchAppRoutes } from "~/lib/prefetch-app-routes";
import type { AnalyticsSummary, FormsListPage } from "~/lib/fetch-session";
import { trpc } from "~/trpc/client";

type SessionUser = RouterOutputs["auth"]["me"];

function AppBackground() {
  return (
    <div className="pointer-events-none fixed inset-0 z-0">
      <Image
        src="/images/dashboard-hero.png"
        alt=""
        fill
        priority
        className="object-cover object-center"
        sizes="100vw"
      />
      <div className="absolute inset-0 bg-black/62" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_35%,rgba(74,222,128,0.08),transparent_45%)]" />
    </div>
  );
}

export function AppShell({
  children,
  initialUser,
  initialForms,
  initialAnalytics,
}: {
  children: ReactNode;
  initialUser?: SessionUser | null;
  initialForms?: FormsListPage | null;
  initialAnalytics?: AnalyticsSummary | null;
}) {
  const router = useRouter();
  const { data: user, isLoading, isError, error, refetch, isFetching } = trpc.auth.me.useQuery({}, {
    initialData: initialUser ?? undefined,
    retry: 2,
    refetchOnWindowFocus: true,
    staleTime: 5 * 60 * 1000,
  });

  useEffect(() => {
    prefetchAppRoutes(router);
  }, [router]);

  useEffect(() => {
    if (initialUser) return;
    void fetch("/api-auth/session", { credentials: "include", cache: "no-store" })
      .then((response) => {
        if (response.ok) void refetch();
      })
      .catch(() => undefined);
  }, [initialUser, refetch]);

  useEffect(() => {
    if (!isError) return;
    const unauthorized =
      error instanceof TRPCClientError && error.data?.code === "UNAUTHORIZED";
    if (unauthorized) {
      router.replace("/sign-in?next=" + encodeURIComponent(window.location.pathname));
    }
  }, [isError, error, router]);

  const resolvedUser = user ?? initialUser ?? null;
  const waitingForSession =
    !resolvedUser && (isLoading || isFetching) && !isError;

  if (waitingForSession) {
    return (
      <div className="relative flex min-h-screen items-center justify-center">
        <AppBackground />
        <div className="relative z-10 flex flex-col items-center gap-4">
          <div className="size-10 animate-pulse rounded-full bg-lime-400/20 ring-2 ring-lime-400/40" />
          <p className="font-mono text-[10px] tracking-[0.35em] text-white/40 uppercase">
            syncing session…
          </p>
        </div>
      </div>
    );
  }

  if (!resolvedUser) {
    const unauthorized =
      isError && error instanceof TRPCClientError && error.data?.code === "UNAUTHORIZED";
    const message = unauthorized
      ? "Your session expired. Please sign in again."
      : isError
        ? "Could not reach the server. Please wait a moment and retry."
        : "Please sign in to continue.";

    return (
      <div className="relative flex min-h-screen items-center justify-center px-4">
        <AppBackground />
        <div className="relative z-10 max-w-sm text-center">
          <p className="font-display text-xl font-bold text-white">Session could not be loaded</p>
          <p className="mt-2 text-sm text-white/45">{message}</p>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
            <button
              type="button"
              onClick={() => refetch()}
              className="rounded-2xl border border-lime-400/35 px-5 py-2.5 text-xs font-bold tracking-[0.18em] text-lime-400 uppercase hover:bg-lime-400/10"
            >
              Retry
            </button>
            <button
              type="button"
              onClick={() => router.replace("/sign-in")}
              className="btn-omni font-display rounded-2xl px-5 py-2.5 text-xs font-black tracking-[0.18em] uppercase"
            >
              Sign in
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <AppDataProvider initialForms={initialForms ?? null} initialAnalytics={initialAnalytics ?? null}>
      <div className="relative min-h-screen">
        <AppBackground />
        <HeroTimeGate user={resolvedUser} />
        <div className="relative z-10 flex flex-col lg:flex-row">
          <AppSidebar />
          <main className="min-h-screen flex-1 px-4 pt-8 pb-32 sm:px-6 lg:px-8 lg:pb-10">
            <div className="relative mx-auto max-w-7xl">{children}</div>
          </main>
          <AppMobileNav />
        </div>
      </div>
    </AppDataProvider>
  );
}
