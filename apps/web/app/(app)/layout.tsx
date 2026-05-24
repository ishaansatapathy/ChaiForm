import type { ReactNode } from "react";

import { AppShell } from "~/components/app/app-shell";
import { fetchSessionUser } from "~/lib/fetch-session";

export default async function AppLayout({ children }: { children: ReactNode }) {
  const initialUser = await fetchSessionUser();

  return <AppShell initialUser={initialUser}>{children}</AppShell>;
}
