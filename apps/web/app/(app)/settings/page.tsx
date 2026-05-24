import dynamic from "next/dynamic";

import { PageSkeleton } from "~/components/app/page-skeleton";

const SettingsContent = dynamic(() => import("./settings-content"), {
  loading: () => <PageSkeleton label="Loading settings" />,
});

export default function SettingsPage() {
  return <SettingsContent />;
}
