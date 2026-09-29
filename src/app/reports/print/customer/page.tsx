import { notFound } from "next/navigation";
import { CustomerPrintReport } from "@/components/assets/reports/print/customer-print-report";
import { getCustomerReport } from "@/db/queries/reports";
import { requireUser } from "@/lib/session";

export default async function CustomerPrintPage({
  searchParams,
}: {
  searchParams: Promise<{ id?: string; customer?: string }>;
}) {
  await requireUser();
  const params = await searchParams;
  const customerId = params.id || params.customer;

  if (!customerId) {
    return notFound();
  }

  const reportData = await getCustomerReport(decodeURIComponent(customerId), {
    limit: 1000,
  });

  if (!reportData) {
    return notFound();
  }

  return <CustomerPrintReport data={reportData} />;
}
