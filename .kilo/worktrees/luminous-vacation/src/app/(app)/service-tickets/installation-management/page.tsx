import { InstallationView } from "@/components/service-tickets/installation/installation-view";
import {
  getInstallationStats,
  listInstallations,
} from "@/db/queries/installations";
import { listAssignableTechnicians } from "@/db/queries/users";
import { requireUser } from "@/lib/session";

export default async function InstallationManagementPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string }>;
}) {
  const current = await requireUser();
  const viewer = { role: current.role, id: current.id };
  const { view } = await searchParams;

  const [records, stats, technicians] = await Promise.all([
    listInstallations({ viewer }),
    getInstallationStats(viewer),
    listAssignableTechnicians(),
  ]);

  return (
    <InstallationView
      records={records}
      stats={stats}
      viewerRole={current.role}
      technicians={technicians}
      initialViewId={view}
    />
  );
}
