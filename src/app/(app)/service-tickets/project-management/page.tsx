import { ProjectView } from "@/components/service-tickets/project/project-view";
import { getProjectStats, listProjects } from "@/db/queries/projects";
import { listAssignableTechnicians } from "@/db/queries/users";
import { requireUser } from "@/lib/session";

export default async function ProjectManagementPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string }>;
}) {
  const current = await requireUser();
  const viewer = { role: current.role, id: current.id };
  const { view } = await searchParams;

  const [records, stats, technicians] = await Promise.all([
    listProjects({ viewer }),
    getProjectStats(viewer),
    listAssignableTechnicians(),
  ]);

  return (
    <ProjectView
      records={records}
      stats={stats}
      viewerRole={current.role}
      technicians={technicians}
      initialViewId={view}
    />
  );
}
