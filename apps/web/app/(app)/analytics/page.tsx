import dynamic from "next/dynamic";

import { PageSkeleton } from "~/components/app/page-skeleton";

const AnalyticsContent = dynamic(() => import("./analytics-content"), {
  loading: () => <PageSkeleton label="Loading analytics" />,
});

export default function AnalyticsPage() {
  return <AnalyticsContent />;
}
