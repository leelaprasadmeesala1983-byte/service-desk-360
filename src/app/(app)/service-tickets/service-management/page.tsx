import { ServiceView } from "@/components/service-tickets/service/service-view";
import {
  getServiceRequestStats,
  listServiceRequests,
} from "@/db/queries/service-requests";
import { listAssignableTechnicians } from "@/db/queries/users";
import { requireUser } from "@/lib/session";

export default async function ServiceManagementPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string }>;
}) {
  const current = await requireUser();
  const viewer = { role: current.role, id: current.id };
  const { view } = await searchParams;

  const [records, stats, technicians] = await Promise.all([
    listServiceRequests({ viewer }),
    getServiceRequestStats(viewer),
    listAssignableTechnicians(viewer),
  ]);

  return (
    <ServiceView
      records={records}
      stats={stats}
      viewerRole={current.role}
      technicians={technicians}
      initialViewId={view}
    />
  );
}
