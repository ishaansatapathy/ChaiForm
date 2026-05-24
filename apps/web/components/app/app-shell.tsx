"use client";

import { useEffect } from "react";
import type { ReactNode } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { TRPCClientError } from "@repo/trpc/client";

import { AppMobileNav } from "~/components/app/app-mobile-nav";
import { AppSidebar } from "~/components/app/app-sidebar";
import { HeroTimeGate } from "~/components/app/hero-time-gate";
import { prefetchAppRoutes } from "~/lib/prefetch-app-routes";
import { trpc } from "~/trpc/client";

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

export function AppShell({ children }: { children: ReactNode }) {
  const router = useRouter();
  const { data: user, isLoading, isError, error } = trpc.auth.me.useQuery(undefined, {
    retry: false,
    refetchOnWindowFocus: false,
    staleTime: 5 * 60 * 1000,
  });

  useEffect(() => {
    prefetchAppRoutes(router);
  }, [router]);

  useEffect(() => {
    if (!isError) return;
    const unauthorized =
      error instanceof TRPCClientError && error.data?.code === "UNAUTHORIZED";
    if (unauthorized) {
      router.replace("/sign-in");
    }
  }, [isError, error, router]);

  if (isLoading) {
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

  if (!user) return null;

  return (
    <div className="relative min-h-screen">
      <AppBackground />
      <HeroTimeGate user={user} />
      <div className="relative z-10 flex flex-col lg:flex-row">
        <AppSidebar />
        <main className="min-h-screen flex-1 px-4 pt-8 pb-32 sm:px-6 lg:px-8 lg:pb-10">
          <div className="relative mx-auto max-w-7xl">{children}</div>
        </main>
        <AppMobileNav />
      </div>
    </div>
  );
}
