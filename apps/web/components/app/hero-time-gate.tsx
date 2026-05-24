"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { RouterOutputs } from "@repo/trpc/client";
import { toast } from "sonner";

import { HeroTimeCard } from "~/components/auth/hero-time-card";
import { clearHeroTimePending } from "~/lib/hero-time";
import { getPrivateWelcomeName } from "~/lib/user-display-name";
import { trpc } from "~/trpc/client";

type AppUser = NonNullable<RouterOutputs["auth"]["me"]>;

function HeroTimeGateContent({ user }: { user: AppUser }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const utils = trpc.useUtils();
  const [showHero, setShowHero] = useState(false);

  const cleanPath = useCallback(() => {
    clearHeroTimePending();
    const nextParams = new URLSearchParams(searchParams.toString());
    nextParams.delete("hero");
    const query = nextParams.toString();
    const pathname = window.location.pathname;
    router.replace(query ? `${pathname}?${query}` : pathname);
  }, [router, searchParams]);

  const setupProfile = trpc.auth.setupProfile.useMutation({
    onSuccess: async () => {
      await utils.auth.me.invalidate();
      toast.success("It's Hero Time!");
      setShowHero(false);
      cleanPath();
    },
    onError: (err) => toast.error(err.message),
  });

  useEffect(() => {
    setShowHero(!user.displayName?.trim());
  }, [user.displayName]);

  if (!showHero) return null;

  return (
    <HeroTimeCard
      welcomeName={getPrivateWelcomeName(user.fullName)}
      saving={setupProfile.isPending}
      onSubmit={(displayName) => setupProfile.mutate({ displayName })}
    />
  );
}

export function HeroTimeGate({ user }: { user: AppUser }) {
  return (
    <Suspense fallback={null}>
      <HeroTimeGateContent user={user} />
    </Suspense>
  );
}
