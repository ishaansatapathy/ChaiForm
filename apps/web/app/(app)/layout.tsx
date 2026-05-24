import type { ReactNode } from "react";

import { AppShell } from "~/components/app/app-shell";
import {
  fetchAnalyticsSummary,
  fetchFormsList,
  fetchSessionUser,
} from "~/lib/fetch-session";

export const maxDuration = 60;

export default async function AppLayout({ children }: { children: ReactNode }) {
  const initialUser = await fetchSessionUser();
  const [initialForms, initialAnalytics] = initialUser
    ? await Promise.all([fetchFormsList(100), fetchAnalyticsSummary()])
    : [null, null];

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
