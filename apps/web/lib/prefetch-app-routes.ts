import type { AppRouterInstance } from "next/dist/shared/lib/app-router-context.shared-runtime";

export const APP_ROUTES = ["/dashboard", "/forms/new", "/analytics", "/settings"] as const;

export function prefetchAppRoutes(router: AppRouterInstance) {
  for (const href of APP_ROUTES) {
    router.prefetch(href);
  }
}
