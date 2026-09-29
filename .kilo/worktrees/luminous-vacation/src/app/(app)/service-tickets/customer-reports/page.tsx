import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { CustomerReportsView } from "@/components/service-tickets/customer-reports/customer-reports-view";
import { getCustomerReports } from "@/db/queries/customer-reports";
import { requireUser } from "@/lib/session";

export const metadata: Metadata = {
  title: "Customer Reports & Analytics | Service Desk 360",
  description:
    "Admin reporting module for customer-wise metrics, service desk histories, and 360-degree analytics.",
};

export default async function CustomerReportsPage() {
  const user = await requireUser();

  if (user.role !== "ADMIN") {
    redirect("/service-tickets");
  }

  const initialData = await getCustomerReports({
    page: 1,
    perPage: 10,
  });

  return <CustomerReportsView initialData={initialData} />;
}
