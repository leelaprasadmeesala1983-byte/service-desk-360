import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { CustomerReportsView } from "@/components/service-tickets/customer-reports/customer-reports-view";
import { getCustomerReports } from "@/db/queries/customer-reports";
import { requireAdmin } from "@/lib/session";

export const metadata: Metadata = {
  title: "Customer Reports & Analytics | Service Desk 360",
  description:
    "Admin reporting module for customer-wise metrics, service desk histories, and 360-degree analytics.",
};

export default async function CustomerReportsPage() {
  const user = await requireAdmin();

  const viewer = { role: user.role, id: user.id };
  const initialData = await getCustomerReports(
    {
      page: 1,
      perPage: 10,
    },
    viewer,
  );

  return <CustomerReportsView initialData={initialData} />;
}
