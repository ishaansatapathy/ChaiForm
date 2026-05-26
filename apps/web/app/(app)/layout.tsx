import type { ReactNode } from "react";
import { redirect } from "next/navigation";

import { AppShell } from "~/components/app/app-shell";
import {
  fetchAnalyticsSummary,
  fetchFormsList,
  fetchSessionUser,
} from "~/lib/fetch-session";

export const maxDuration = 60;

export default async function AppLayout({ children }: { children: ReactNode }) {
  const initialUser = await fetchSessionUser();
  if (!initialUser) {
    redirect("/sign-in");
  }

  const [initialForms, initialAnalytics] = await Promise.all([
    fetchFormsList(100),
    fetchAnalyticsSummary(),
  ]);

  return (
    <AppShell
      initialUser={initialUser}
      initialForms={initialForms}
      initialAnalytics={initialAnalytics}
    >
      {children}
    </AppShell>
  );
}
