import type { Metadata } from "next";
import { TechnicianReportsView } from "@/components/service-tickets/reports/technician-reports-view";
import { getMonthlyTechnicianSummary } from "@/db/queries/technician-reports";
import { listAssignableTechnicians } from "@/db/queries/users";
import { requireUser } from "@/lib/session";

export const metadata: Metadata = {
  title: "Technician Productivity Reports | Service Desk 360",
  description:
    "Track and analyze technician worked days across projects, installations, and services.",
};

export default async function TechnicianReportsPage() {
  const user = await requireUser();

  const now = new Date();
  const currentMonth = now.getMonth() + 1;
  const currentYear = now.getFullYear();

  const [initialReport, techniciansList] = await Promise.all([
    getMonthlyTechnicianSummary({
      month: currentMonth,
      year: currentYear,
      viewer: { role: user.role, id: user.id },
    }),
    user.role === "ADMIN"
      ? listAssignableTechnicians({ role: user.role, id: user.id })
      : Promise.resolve([]),
  ]);

  return (
    <TechnicianReportsView
      initialReport={initialReport}
      user={user}
      techniciansList={techniciansList}
    />
  );
}
