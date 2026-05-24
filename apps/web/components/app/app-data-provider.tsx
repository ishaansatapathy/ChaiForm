"use client";

import { createContext, useContext } from "react";

import type { AnalyticsSummary, FormsListPage } from "~/lib/fetch-session";

type AppDataContextValue = {
  initialForms: FormsListPage | null;
  initialAnalytics: AnalyticsSummary | null;
};

const AppDataContext = createContext<AppDataContextValue>({
  initialForms: null,
  initialAnalytics: null,
});

export function AppDataProvider({
  initialForms,
  initialAnalytics,
  children,
}: {
  initialForms: FormsListPage | null;
  initialAnalytics: AnalyticsSummary | null;
  children: React.ReactNode;
}) {
  return (
    <AppDataContext.Provider value={{ initialForms, initialAnalytics }}>
      {children}
    </AppDataContext.Provider>
  );
}

export function useAppData() {
  return useContext(AppDataContext);
}
