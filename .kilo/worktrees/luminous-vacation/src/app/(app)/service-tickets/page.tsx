import { DashboardView } from "@/components/service-tickets/dashboard/dashboard-view";
import { getDashboardData } from "@/db/queries/dashboard";
import { requireUser } from "@/lib/session";

export default async function ServiceTicketDashboardPage() {
  const current = await requireUser();
  const data = await getDashboardData({ role: current.role, id: current.id });

  return <DashboardView data={data} viewerRole={current.role} />;
}
